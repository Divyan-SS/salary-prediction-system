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
                    else:
                        logger.info("EMAIL_STATUS: skipped (No valid user email provided for follow-up dispatch)")
                        
        except asyncio.CancelledError:
            logger.info("Feedback timeout sweeper task cancelled.")
            break
        except Exception as e:
            logger.error(f"Error in feedback timeout sweeper loop: {str(e)}")

@router.on_event("startup")
async def startup_event():
    asyncio.create_task(feedback_timeout_sweeper())

# =========================================================
# 🔍 FEEDBACK STATUS CHECK ENDPOINT
# =========================================================
@router.get("/feedback/status/{prediction_id}")
async def get_feedback_status(prediction_id: str):
    """
    Checks if feedback has already been submitted for a given prediction session.
    """
    if not prediction_id or prediction_id == "null" or prediction_id == "general-app-feedback":
        return {"exists": False, "submitted": False, "feedback": None}
    
    payload = state_store.get(prediction_id)
    if not payload:
        raise HTTPException(
            status_code=404, 
            detail="Session expired or invalid prediction ID. Please run a salary prediction first."
        )
    
    return {
        "exists": True,
        "submitted": bool(payload.get("submitted", False)),
        "feedback": payload.get("feedback_data")
    }

# =========================================================
# 📥 FEEDBACK SUBMISSION ENDPOINT (UPSERT LOGIC)
# =========================================================
@router.post("/feedback")
async def submit_feedback(request: FeedbackRequest, background_tasks: BackgroundTasks):
    # Dislike reason is optional
    if request.is_liked:
        request.dislike_reason = None

    # Handle general app feedback case separately (stateless fallback)
    if not request.prediction_id or request.prediction_id == "general-app-feedback":
        user_email = request.user_email.strip() if request.user_email else None
        user_name = request.user_name.strip() if request.user_name else None
        
        background_tasks.add_task(
            send_admin_feedback_email,
            prediction_id="general-app-feedback",
            country=request.country.strip(),
            education=request.education.strip(),
            experience=request.experience,
            predicted_salary_usd=request.predicted_salary_usd,
            is_liked=request.is_liked,
            dislike_reason=request.dislike_reason,
            text_explanation=request.text_explanation.strip() if request.text_explanation else None,
            improvement_suggestion=request.improvement_suggestion.strip() if request.improvement_suggestion else None,
            user_email=user_email,
            user_name=user_name,
            timeout_event=False,
            is_edit=False
        )

        if user_email and is_valid_email(user_email):
            background_tasks.add_task(
                send_user_thank_you_email,
                user_email=user_email,
                user_name=user_name,
                is_edit=False
            )

        return {"status": "success", "message": "General feedback submitted successfully"}

    # Check if feedback was already submitted (for is_edit classification)
    already_submitted = state_store.check_feedback_exists(request.prediction_id)

    # Prepare feedback details for upsert
    feedback_data = {
        "is_liked": request.is_liked,
        "dislike_reason": request.dislike_reason,
        "text_explanation": request.text_explanation.strip() if request.text_explanation else None,
        "improvement_suggestion": request.improvement_suggestion.strip() if request.improvement_suggestion else None
    }

    # Upsert feedback in state store (keeps it resolved & extends TTL to 1 hour to allow edits)
    payload = state_store.upsert_feedback(request.prediction_id, feedback_data)
    if not payload:
        # Session not found or expired
        raise HTTPException(
            status_code=404,
            detail="Session expired or invalid prediction ID. Please run a salary prediction first."
        )

    # Extract user details and prediction metadata from payload or request fallback
    user_email = payload.get("user_email") or (request.user_email.strip() if request.user_email else None)
    user_name = payload.get("user_name") or (request.user_name.strip() if request.user_name else None)
    pred_data = payload.get("prediction_data", {})

    # Trigger background tasks (non-blocking)
    # A) Admin Notification Email: sent on first submission OR final confirmed edit
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
        timeout_event=False,
        is_edit=already_submitted
    )

    # B) User Thank You Email: Send only ONE thank-you email per prediction session (no spam)
    if not already_submitted:
        if user_email and is_valid_email(user_email):
            background_tasks.add_task(
                send_user_thank_you_email,
                user_email=user_email,
                user_name=user_name,
                is_edit=False
            )
        else:
            logger.info("EMAIL_STATUS: skipped (No valid user email provided for thank-you dispatch)")
    else:
        logger.info("EMAIL_STATUS: skipped (Thank-you email already sent for this prediction session)")

    return {"status": "success", "message": "Feedback submitted successfully"}
