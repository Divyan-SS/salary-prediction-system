import sqlite3
from pathlib import Path
from fastapi import APIRouter, HTTPException, BackgroundTasks
from app.schemas.feedback_schema import FeedbackRequest
from app.services.email_service import send_admin_feedback_email, send_user_thank_you_email

router = APIRouter(tags=["Feedback"])

DB_PATH = Path(__file__).resolve().parent.parent / "feedback.db"

# Initialize SQLite database and feedback table (with safe migrations)
def init_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Create the base table if it doesn't exist yet
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

    # Idempotent database schema migration to add 'user_email' column if missing
    try:
        cursor.execute("PRAGMA table_info(predictions_feedback);")
        columns = [row[1] for row in cursor.fetchall()]
        if "user_email" not in columns:
            cursor.execute("ALTER TABLE predictions_feedback ADD COLUMN user_email TEXT;")
            conn.commit()
    except Exception:
        # Ignore exceptions (e.g. locks or columns already added concurrently)
        pass

    conn.close()

# Run database setup/migration
init_db()

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

    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("""
            INSERT OR REPLACE INTO predictions_feedback (
                prediction_id, country, education, experience, 
                predicted_salary_usd, is_liked, dislike_reason, 
                text_explanation, improvement_suggestion, user_email
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            request.prediction_id,
            request.country.strip(),
            request.education.strip(),
            request.experience,
            request.predicted_salary_usd,
            request.is_liked,
            request.dislike_reason,
            request.text_explanation.strip() if request.text_explanation else None,
            request.improvement_suggestion.strip() if request.improvement_suggestion else None,
            request.user_email.strip() if request.user_email else None
        ))
        conn.commit()
        conn.close()
        
        # Dispatch admin notification email asynchronously in the background
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
        
        # Dispatch user thank-you email if a user email was provided
        if request.user_email and request.user_email.strip():
            background_tasks.add_task(
                send_user_thank_you_email,
                user_email=request.user_email.strip()
            )
        
        return {"status": "success", "message": "Feedback submitted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database transaction failure: {str(e)}")
