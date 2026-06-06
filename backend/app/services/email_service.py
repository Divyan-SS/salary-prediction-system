import smtplib
import os
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

# =========================================================
# LOGGING & SMTP SETUP
# =========================================================
logger = logging.getLogger(__name__)

SMTP_SERVER = "smtp.gmail.com"
SMTP_PORT = 587

# Enforce environment variables only (no hardcoded fallback values for safety)
SMTP_USER = os.getenv("SMTP_USER")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")
SMTP_RECEIVER = os.getenv("SMTP_RECEIVER")

if SMTP_PASSWORD:
    SMTP_PASSWORD = SMTP_PASSWORD.replace(" ", "")

if not SMTP_USER or not SMTP_PASSWORD or not SMTP_RECEIVER:
    logger.warning("SMTP email service is not fully configured via environment variables.")

# =========================================================
# ✉️ REUSABLE EMAIL HELPER (WITH RETRIES)
# =========================================================
def send_email(to_email: str, subject: str, html_body: str) -> bool:
    """
    Sends an HTML email to the specified address.
    Includes a single retry attempt for transient SMTP failures.
    """
    if not SMTP_USER or not SMTP_PASSWORD:
        logger.error("SMTP sending aborted: SMTP credentials are not configured in the environment.")
        return False

    for attempt in range(1, 3):
        try:
            logger.info(f"Attempting to send email to {to_email} (Attempt {attempt}/2)...")
            
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = SMTP_USER
            msg["To"] = to_email

            msg.attach(MIMEText(html_body, "html"))

            # Connect to SMTP server with timeout
            server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT, timeout=10)
            server.starttls()
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.sendmail(SMTP_USER, to_email, msg.as_string())
            server.quit()

            logger.info(f"Email sent successfully to {to_email} on attempt {attempt}.")
            return True

        except Exception as e:
            # Mask credentials and print/log exception safely
            logger.error(f"SMTP execution error on attempt {attempt} for {to_email}: {str(e)}")
            if attempt == 2:
                logger.error(f"Failed to deliver email to {to_email} after maximum attempts.")
                return False

    return False

# =========================================================
# 📢 ADMIN FEEDBACK NOTIFICATION FORMATTER
# =========================================================
def send_admin_feedback_email(
    prediction_id: str,
    country: str,
    education: str,
    experience: float,
    predicted_salary_usd: float,
    is_liked: bool,
    dislike_reason: str = None,
    text_explanation: str = None,
    improvement_suggestion: str = None,
    user_email: str = None
) -> bool:
    """
    Formats and sends feedback submission details to the admin inbox (SMTP_RECEIVER).
    """
    if not SMTP_RECEIVER:
        logger.error("Cannot dispatch admin notification: SMTP_RECEIVER environment variable is not defined.")
        return False

    subject = f"New Prediction Feedback - {'Liked 👍' if is_liked else 'Disliked 👎'}"
    
    html = f"""
    <html>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <h2 style="color: {'#10b981' if is_liked else '#ef4444'};">
            Prediction Feedback Received: {'Liked 👍' if is_liked else 'Disliked 👎'}
        </h2>
        <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
        
        <h3>Context Details:</h3>
        <ul>
            <li><strong>Prediction ID:</strong> {prediction_id or 'N/A'}</li>
            <li><strong>Country:</strong> {country}</li>
            <li><strong>Education Level:</strong> {education}</li>
            <li><strong>Experience:</strong> {experience} Years</li>
            <li><strong>Predicted Salary (USD):</strong> ${predicted_salary_usd:,.2f}</li>
            <li><strong>User Email:</strong> {user_email or 'Not Provided'}</li>
        </ul>

        {f'''
        <h3>Dislike Reason:</h3>
        <p style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 10px; margin: 10px 0;">
            <strong>{dislike_reason}</strong>
        </p>
        ''' if not is_liked else ''}

        {f'''
        <h3>User Explanation:</h3>
        <p style="background-color: #f9fafb; border-left: 4px solid #9ca3af; padding: 10px; margin: 10px 0; font-style: italic;">
            {text_explanation}
        </p>
        ''' if text_explanation else ''}

        {f'''
        <h3>Improvement Suggestion:</h3>
        <p style="background-color: #f0f9ff; border-left: 4px solid #0ea5e9; padding: 10px; margin: 10px 0;">
            {improvement_suggestion}
        </p>
        ''' if improvement_suggestion else ''}
        
        <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="font-size: 11px; color: #999;">This is an automated notification from your Salary Prediction Feedback System.</p>
    </body>
    </html>
    """
    
    return send_email(SMTP_RECEIVER, subject, html)

# =========================================================
# 💖 USER THANK YOU EMAIL FORMATTER
# =========================================================
def send_user_thank_you_email(user_email: str) -> bool:
    """
    Sends a simple, professional thank you email to the user.
    """
    subject = "Thank you for your feedback"
    
    html = f"""
    <html>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <h2>Thank You for Your Feedback!</h2>
        <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
        <p>Hello,</p>
        <p>Thank you for submitting feedback on the Salary Prediction System. Your response has been successfully recorded.</p>
        <p>We use feedback from users like you to continually train and refine our machine learning models, improving prediction accuracy and overall system performance.</p>
        <p>We appreciate your time and contribution.</p>
        <br />
        <p>Best regards,</p>
        <p><strong>Salary Prediction Team</strong></p>
        <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="font-size: 11px; color: #999;">This is an automated message. Please do not reply directly to this email.</p>
    </body>
    </html>
    """
    
    return send_email(user_email, subject, html)
