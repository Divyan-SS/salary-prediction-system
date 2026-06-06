from pydantic import BaseModel, Field
from typing import Optional

class FeedbackRequest(BaseModel):
    prediction_id: Optional[str] = None
    country: str = Field(..., min_length=2)
    education: str = Field(...)
    experience: float = Field(..., ge=0, le=50)
    predicted_salary_usd: float = Field(..., ge=0)
    is_liked: bool
    dislike_reason: Optional[str] = None
    text_explanation: Optional[str] = None
    improvement_suggestion: Optional[str] = None
    user_email: Optional[str] = None

