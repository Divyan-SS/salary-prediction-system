import re
import asyncio
import logging
from fastapi import APIRouter, HTTPException, BackgroundTasks
from app.schemas.feedback_schema import FeedbackRequest
from app.services.state_store import state_store, InMemoryStateStore
from app.services.email_service import send_admin_feedback_email, send_user_thank_you_email

logger = logging.getLogger(__name__)
router = APIRouter(tags=["Feedback"])

# Simple, strict email validation regex
EMAIL_REGEX = re.compile(r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$")

def is_valid_email(email: str) -> bool:
    if not email:
        return False
    return bool(EMAIL_REGEX.match(email.strip()))

# =========================================================
# 🔄 PERIODIC TIMEOUT SWEEPER (CASE B)
# =========================================================
async def feedback_timeout_sweeper():
    """
    Background loop checking for expired pending feedback entries in InMemoryStateStore.
    Runs every 10 seconds.
    """
    # Import email services locally to avoid circular import issues
    from app.services.email_service import send_admin_feedback_email, send_user_follow_up_email
    
    logger.info("Feedback timeout sweeper background loop started.")
    while True:
        try:
            await asyncio.sleep(10)
            
            # Sweeper is ONLY executed in InMemory mode.
            # Redis mode handles key expiration via Redis native TTL rules automatically.
            if isinstance(state_store, InMemoryStateStore):
                expired_entries = state_store.scan_expired()
                for prediction_id, payload in expired_entries:
                    user_email = payload.get("user_email")
                    user_name = payload.get("user_name")
                    pred_data = payload.get("prediction_data", {})
                    
                    logger.info(f"Sweeper processing timeout event for prediction {prediction_id}")
                    
                    # 1. Dispatch Admin Notification ("User did not respond")
                    send_admin_feedback_email(
                        prediction_id=prediction_id,
                        country=pred_data.get("country"),
                        education=pred_data.get("education"),
                        experience=pred_data.get("experience"),
                        predicted_salary_usd=pred_data.get("predicted_salary_usd"),
                        timeout_event=True,
                        user_email=user_email,
                        user_name=user_name
                    )
                    
                    # 2. Dispatch User Follow-Up Email (if valid email is provided)
                    if user_email and is_valid_email(user_email):
                        send_user_follow_up_email(
                            user_email=user_email,
                            user_name=user_name
                        )
                        
        except asyncio.CancelledError:
            logger.info("Feedback timeout sweeper task cancelled.")
            break
        except Exception as e:
            logger.error(f"Error in feedback timeout sweeper loop: {str(e)}")

@router.on_event("startup")
async def startup_event():
    asyncio.create_task(feedback_timeout_sweeper())

# =========================================================
# 📥 FEEDBACK SUBMISSION ENDPOINT (CASE A)
# =========================================================
@router.post("/feedback")
async def submit_feedback(request: FeedbackRequest, background_tasks: BackgroundTasks):
    # Perform strict dislikes validation
    if not request.is_liked:
        allowed_reasons = {'Too High', 'Too Low', 'Incorrect Data Mapping', 'Other'}
        if request.dislike_reason not in allowed_reasons:
            raise HTTPException(
                status_code=400, 
                detail=f"Dislike reason is mandatory and must be one of: {list(allowed_reasons)}"
            )
    else:
        # If liked, reason must be null
        request.dislike_reason = None

    # Retrieve and atomically transition status from pending to resolved
    # This prevents duplicate email dispatches under all conditions
    payload = state_store.transition_to_resolved(request.prediction_id)
    if not payload:
        # State already resolved - silently ignore as per rules
        logger.info(f"Feedback ignored or already resolved for prediction ID: {request.prediction_id}")
        return {"status": "success", "message": "Feedback already processed"}

    # Extract user details and prediction metadata from payload or request fallback
    if payload.get("status") == "not_cached":
        user_email = request.user_email.strip() if request.user_email else None
        user_name = request.user_name.strip() if request.user_name else None
        pred_data = {
            "country": request.country.strip(),
            "education": request.education.strip(),
            "experience": request.experience,
            "predicted_salary_usd": request.predicted_salary_usd
        }
    else:
        user_email = payload.get("user_email") or (request.user_email.strip() if request.user_email else None)
        user_name = payload.get("user_name") or (request.user_name.strip() if request.user_name else None)
        pred_data = payload.get("prediction_data", {})

    # Trigger background tasks (non-blocking)
    # A) Admin Notification Email (always)
    background_tasks.add_task(
        send_admin_feedback_email,
        prediction_id=request.prediction_id,
        country=pred_data.get("country") or request.country.strip(),
        education=pred_data.get("education") or request.education.strip(),
        experience=pred_data.get("experience") or request.experience,
        predicted_salary_usd=pred_data.get("predicted_salary_usd") or request.predicted_salary_usd,
        is_liked=request.is_liked,
        dislike_reason=request.dislike_reason,
        text_explanation=request.text_explanation.strip() if request.text_explanation else None,
        improvement_suggestion=request.improvement_suggestion.strip() if request.improvement_suggestion else None,
        user_email=user_email,
        user_name=user_name,
        timeout_event=False
    )

    # B) User Thank You Email (only if user_email exists and is valid)
    if user_email and is_valid_email(user_email):
        background_tasks.add_task(
            send_user_thank_you_email,
            user_email=user_email,
            user_name=user_name
        )

    return {"status": "success", "message": "Feedback submitted successfully"}
