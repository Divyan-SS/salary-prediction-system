import sqlite3
from pathlib import Path
from fastapi import APIRouter, HTTPException
from app.schemas.feedback_schema import FeedbackRequest

router = APIRouter(tags=["Feedback"])

DB_PATH = Path(__file__).resolve().parent.parent / "feedback.db"

# Initialize SQLite database and feedback table
def init_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS predictions_feedback (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            prediction_id TEXT UNIQUE,
            country TEXT NOT NULL,
            education TEXT NOT NULL,
            experience REAL NOT NULL,
            predicted_salary_usd REAL NOT NULL,
            is_liked BOOLEAN NOT NULL,
            dislike_reason TEXT,
            text_explanation TEXT,
            improvement_suggestion TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    """)
    conn.commit()
    conn.close()

# Run initialization
init_db()

@router.post("/feedback")
async def submit_feedback(request: FeedbackRequest):
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

    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("""
            INSERT OR REPLACE INTO predictions_feedback (
                prediction_id, country, education, experience, 
                predicted_salary_usd, is_liked, dislike_reason, 
                text_explanation, improvement_suggestion
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            request.prediction_id,
            request.country.strip(),
            request.education.strip(),
            request.experience,
            request.predicted_salary_usd,
            request.is_liked,
            request.dislike_reason,
            request.text_explanation.strip() if request.text_explanation else None,
            request.improvement_suggestion.strip() if request.improvement_suggestion else None
        ))
        conn.commit()
        conn.close()
        return {"status": "success", "message": "Feedback submitted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database transaction failure: {str(e)}")
