import re
from fastapi import APIRouter, HTTPException, BackgroundTasks
from app.schemas.feedback_schema import FeedbackRequest
from app.services.email_service import send_admin_feedback_email, send_user_thank_you_email

router = APIRouter(tags=["Feedback"])

# Simple, strict email validation regex
EMAIL_REGEX = re.compile(r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$")

def is_valid_email(email: str) -> bool:
    if not email:
        return False
    return bool(EMAIL_REGEX.match(email.strip()))

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

    # Queue admin notification email asynchronously in the background
    background_tasks.add_task(
        send_admin_feedback_email,
        prediction_id=request.prediction_id,
        country=request.country.strip(),
        education=request.education.strip(),
        experience=request.experience,
        predicted_salary_usd=request.predicted_salary_usd,
        is_liked=request.is_liked,
        dislike_reason=request.dislike_reason,
        text_explanation=request.text_explanation.strip() if request.text_explanation else None,
        improvement_suggestion=request.improvement_suggestion.strip() if request.improvement_suggestion else None,
        user_email=request.user_email.strip() if request.user_email else None
    )
    
    # Queue user thank-you email if a valid user email is provided
    if request.user_email and request.user_email.strip():
        user_email_clean = request.user_email.strip()
        if is_valid_email(user_email_clean):
            background_tasks.add_task(
                send_user_thank_you_email,
                user_email=user_email_clean
            )

    return {"status": "success", "message": "Feedback received and scheduled for processing"}
