import re
import os
import asyncio
import logging
import requests
from fastapi import APIRouter, HTTPException, BackgroundTasks
from app.schemas.feedback_schema import FeedbackRequest
from app.services.state_store import state_store, InMemoryStateStore
from app.services.email_service import send_admin_feedback_email, send_user_thank_you_email
from typing import Optional

logger = logging.getLogger(__name__)
router = APIRouter(tags=["Feedback"])

# Simple, strict email validation regex
EMAIL_REGEX = re.compile(r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$")

def is_valid_email(email: str) -> bool:
    if not email:
        return False
    return bool(EMAIL_REGEX.match(email.strip()))

# =========================================================
# 🔐 GMAIL API OAUTH2 TOKEN VERIFICATION HELPER
# =========================================================
def verify_google_token(token: str) -> Optional[dict]:
    """
    Verifies Google ID Token via Google's tokeninfo API.
    Returns decoded payload if valid, else None.
    """
    google_client_id = os.getenv("GOOGLE_CLIENT_ID")
    if not google_client_id:
        logger.error("GOOGLE_CLIENT_ID environment variable is not defined.")
        return None
        
    try:
        url = f"https://oauth2.googleapis.com/tokeninfo?id_token={token}"
        r = requests.get(url, timeout=10)
        if r.status_code == 200:
            payload = r.json()
            # Verify audience matches our Client ID
            if payload.get("aud") == google_client_id:
                return payload
            else:
                logger.error(f"Google Token audience mismatch: {payload.get('aud')} != {google_client_id}")
        else:
            logger.error(f"Google tokeninfo validation failed: {r.status_code} - {r.text}")
    except Exception as e:
        logger.error(f"Error validating Google Token: {str(e)}")
    return None

# =========================================================
# 🔄 PERIODIC TIMEOUT SWEEPER (CASE B - SILENT TIMEOUT)
# =========================================================
async def feedback_timeout_sweeper():
    """
    Background loop checking for expired pending feedback entries in InMemoryStateStore.
    Runs every 10 seconds.
    Sweeps expired sessions silently, alerting the admin but skipping user follow-up emails.
    """
    # Import email services locally to avoid circular import issues
    from app.services.email_service import send_admin_feedback_email
    
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
                    
                    # 2. User Follow-Up Email is Deprecated under Google Sign-In workflow
                    logger.info("EMAIL_STATUS: skipped (User follow-up emails on timeout are deprecated)")
                        
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
            detail="Session expired. Please make a new prediction."
        )
    
    return {
        "exists": True,
        "submitted": bool(payload.get("submitted", False)),
        "feedback": payload.get("feedback_data")
    }

# =========================================================
# 📥 FEEDBACK SUBMISSION ENDPOINT (IMMUTABLE SINGLE SUBMIT)
# =========================================================
@router.post("/feedback")
async def submit_feedback(request: FeedbackRequest, background_tasks: BackgroundTasks):
    # Verify Google ID Token
    token_payload = verify_google_token(request.google_id_token)
    if not token_payload:
        raise HTTPException(
            status_code=401,
            detail="Invalid Google Sign-In session. Please authenticate with Google to submit feedback."
        )
    
    user_name = token_payload.get("name")
    user_email = token_payload.get("email")

    if request.is_liked:
        request.dislike_reason = None

    # Handle general app feedback case separately (stateless fallback)
    if not request.prediction_id or request.prediction_id == "general-app-feedback":
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

    # Check if feedback was already submitted
    already_submitted = state_store.check_feedback_exists(request.prediction_id)
    if already_submitted:
        raise HTTPException(
            status_code=400,
            detail="You have already submitted feedback for this prediction."
        )

    # Prepare feedback details
    feedback_data = {
        "is_liked": request.is_liked,
        "dislike_reason": request.dislike_reason,
        "text_explanation": request.text_explanation.strip() if request.text_explanation else None,
        "improvement_suggestion": request.improvement_suggestion.strip() if request.improvement_suggestion else None
    }

    # Upsert feedback (binds Google Name/Email to session and extends TTL to 1 hour for status checks)
    payload = state_store.upsert_feedback(
        request.prediction_id, 
        feedback_data, 
        user_name=user_name, 
        user_email=user_email
    )
    if not payload:
        raise HTTPException(
            status_code=404,
            detail="Session expired. Please make a new prediction."
        )

    pred_data = payload.get("prediction_data", {})

    # Trigger background email dispatches
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
        is_edit=False
    )

    if user_email and is_valid_email(user_email):
        background_tasks.add_task(
            send_user_thank_you_email,
            user_email=user_email,
            user_name=user_name,
            is_edit=False
        )

    return {"status": "success", "message": "Feedback submitted successfully"}
