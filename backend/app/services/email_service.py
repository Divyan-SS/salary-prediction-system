import os
import logging
import base64
import requests
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional

# =========================================================
# LOGGING & CONFIG SETUP
# =========================================================
logger = logging.getLogger(__name__)

# Resolve environment variables securely
SMTP_USER = os.getenv("SMTP_USER")
SMTP_RECEIVER = os.getenv("SMTP_RECEIVER") or SMTP_USER
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")
GOOGLE_REFRESH_TOKEN = os.getenv("GOOGLE_REFRESH_TOKEN")

if not SMTP_USER or not GOOGLE_CLIENT_ID or not GOOGLE_CLIENT_SECRET or not GOOGLE_REFRESH_TOKEN:
    logger.warning("Gmail API email service is not fully configured via environment variables.")

# =========================================================
# 🔐 GMAIL API OAUTH2 ACCESS TOKEN HELPER
# =========================================================
def get_gmail_access_token() -> Optional[str]:
    """
    Exchanges the refresh token for a live, short-lived access token via HTTPS.
    """
    client_id = os.getenv("GOOGLE_CLIENT_ID")
    client_secret = os.getenv("GOOGLE_CLIENT_SECRET")
    refresh_token = os.getenv("GOOGLE_REFRESH_TOKEN")
    
    if not client_id or not client_secret or not refresh_token:
        logger.error("Gmail OAuth2 credentials are not fully configured in the environment.")
        return None
        
    try:
        url = "https://oauth2.googleapis.com/token"
        payload = {
            "client_id": client_id,
            "client_secret": client_secret,
            "refresh_token": refresh_token,
            "grant_type": "refresh_token"
        }
        logger.info("Attempting OAuth2 access token refresh...")
        r = requests.post(url, data=payload, timeout=10)
        if r.status_code == 200:
            token_data = r.json()
            access_token = token_data.get("access_token")
            if access_token:
                logger.info("Successfully retrieved fresh Gmail API access token.")
                return access_token
            else:
                logger.error("OAuth2 response did not contain access_token.")
        else:
            logger.error(f"Failed to refresh access token: {r.status_code} - {r.text}")
    except Exception as e:
        logger.error(f"Error during OAuth2 token exchange: {str(e)}")
        
    return None

# =========================================================
# ✉️ REUSABLE EMAIL HELPER (GMAIL API VIA HTTPS PORT 443)
# =========================================================
def send_email(to_email: str, subject: str, html_body: str) -> bool:
    """
    Sends an HTML email to the specified address.
    Authenticates via Google OAuth2 and dispatches through the Gmail API.
    """
    sender = os.getenv("SMTP_USER")
    if not sender:
        logger.error("EMAIL_STATUS: failed (SMTP_USER/sender is not configured)")
        return False
        
    access_token = get_gmail_access_token()
    if not access_token:
        logger.error("EMAIL_STATUS: failed (Could not retrieve access token for Gmail API)")
        return False
        
    try:
        # Build standard MIME message
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = sender
        msg["To"] = to_email
        msg.attach(MIMEText(html_body, "html"))
        
        # Google Gmail API expects a base64url encoded MIME message
        raw_bytes = msg.as_bytes()
        encoded_message = base64.urlsafe_b64encode(raw_bytes).decode("utf-8")
        
        # Gmail API send message endpoint
        url = "https://gmail.googleapis.com/gmail/v1/users/me/messages/send"
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json"
        }
        payload = {
            "raw": encoded_message
        }
        
        logger.info(f"Attempting to send email to {to_email} via Gmail API")
        r = requests.post(url, json=payload, headers=headers, timeout=10)
        
        if r.status_code in (200, 201):
            logger.info(f"EMAIL_STATUS: success (Email delivered to {to_email} via Gmail API)")
            return True
        else:
            logger.error(f"EMAIL_STATUS: failed (Gmail API returned status {r.status_code}: {r.text})")
            return False
            
    except Exception as e:
        logger.error(f"EMAIL_STATUS: failed (Gmail API execution error to {to_email}: {str(e)})")
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
    is_liked: Optional[bool] = None,
    dislike_reason: str = None,
    text_explanation: str = None,
    improvement_suggestion: str = None,
    user_email: str = None,
    user_name: str = None,
    timeout_event: bool = False,
    is_edit: bool = False
) -> bool:
    """
    Formats and sends feedback submission details or timeout event warnings to the admin inbox (SMTP_RECEIVER).
    """
    if not SMTP_RECEIVER:
        logger.error("Cannot dispatch admin notification: SMTP_RECEIVER environment variable is not defined.")
        return False

    if timeout_event:
        subject = "Prediction Feedback Timeout - No Feedback Received"
        header_title = "Prediction Feedback Timeout - No Feedback Received"
        header_color = "#9ca3af"
    else:
        subject = f"New Prediction Feedback - {'Liked 👍' if is_liked else 'Disliked 👎'} ({user_name})"
        header_title = f"New Prediction Feedback: {'Liked 👍' if is_liked else 'Disliked 👎'}"
        header_color = "#10b981" if is_liked else "#ef4444"

    if timeout_event:
        details_html = f"""
        <ul>
            <li><strong>Country:</strong> {country}</li>
            <li><strong>Education Level:</strong> {education}</li>
            <li><strong>Experience:</strong> {experience} Years</li>
            <li><strong>Predicted Salary (USD):</strong> ${predicted_salary_usd:,.2f}</li>
        </ul>
        """
    else:
        details_html = f"""
        <ul>
            <li><strong>Country:</strong> {country}</li>
            <li><strong>Education Level:</strong> {education}</li>
            <li><strong>Experience:</strong> {experience} Years</li>
            <li><strong>Predicted Salary (USD):</strong> ${predicted_salary_usd:,.2f}</li>
            <li><strong>User Name:</strong> {user_name}</li>
            <li><strong>User Email:</strong> {user_email}</li>
        </ul>
        """
    
    html = f"""
    <html>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <h2 style="color: {header_color}; margin-bottom: 5px;">
            {header_title}
        </h2>
        <p style="font-size: 12px; color: #666; margin-top: 0;">ID: {prediction_id}</p>
        <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
        
        <h3>Context Details:</h3>
        {details_html}

        {f'''
        <h3>Dislike Reason:</h3>
        <p style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 10px; margin: 10px 0;">
            <strong>{dislike_reason}</strong>
        </p>
        ''' if not is_liked and dislike_reason and not timeout_event else ''}

        {f'''
        <h3>User Explanation:</h3>
        <p style="background-color: #f9fafb; border-left: 4px solid #9ca3af; padding: 10px; margin: 10px 0; font-style: italic;">
            {text_explanation}
        </p>
        ''' if text_explanation and not timeout_event else ''}

        {f'''
        <h3>Improvement Suggestion:</h3>
        <p style="background-color: #f0f9ff; border-left: 4px solid #0ea5e9; padding: 10px; margin: 10px 0;">
            {improvement_suggestion}
        </p>
        ''' if improvement_suggestion and not timeout_event else ''}
        
        <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="font-size: 11px; color: #999;">This is an automated notification from your Salary Prediction Feedback System.</p>
    </body>
    </html>
    """
    
    return send_email(SMTP_RECEIVER, subject, html)

# =========================================================
# 💖 USER THANK YOU EMAIL FORMATTER
# =========================================================
def send_user_thank_you_email(
    user_email: str, 
    user_name: str = None, 
    is_edit: bool = False,
    country: str = None,
    education: str = None,
    experience: float = None,
    predicted_salary: float = None,
    predicted_salary_usd: float = None,
    currency: str = None
) -> bool:
    """
    Sends a thank you email containing developer information and portfolio links.
    """
    subject = "Thank you for your feedback"
    header_title = "Thank You for Your Feedback!"
    header_color = "#10b981"
    recipient_name = user_name if user_name else "Developer"
    
    # Conditional Prediction Summary HTML section
    prediction_summary_html = ""
    if country and education and experience is not None and predicted_salary is not None:
        prediction_summary_html = f"""
        <div style="background-color: #f3f4f6; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0; border-radius: 4px;">
            <h4 style="margin-top: 0; color: #1e3a8a; font-size: 16px; margin-bottom: 10px;">Prediction Summary</h4>
            <ul style="list-style-type: none; padding-left: 0; margin: 0; font-size: 14px; color: #374151; line-height: 1.8;">
                <li><strong>Country:</strong> {country}</li>
                <li><strong>Education Level:</strong> {education}</li>
                <li><strong>Experience (Years):</strong> {experience}</li>
                <li><strong>Predicted Salary (Local Currency):</strong> {currency} {predicted_salary:,.2f}</li>
                <li><strong>Equivalent Salary (USD):</strong> ${predicted_salary_usd:,.2f}</li>
            </ul>
        </div>
        """
        
    html = f"""
    <html>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: {header_color};">{header_title}</h2>
        <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
        <p>Hello {recipient_name},</p>
        <p>Thank you for submitting your feedback. Your response has been recorded successfully.</p>
        <p>Your feedback helps us monitor prediction quality, enhance the overall user experience, and guide continuous system improvements.</p>
        
        {prediction_summary_html}
        
        <div style="background-color: #f9fafb; border-left: 4px solid #6366f1; padding: 15px; margin: 20px 0; border-radius: 4px;">
            <h4 style="margin-top: 0; color: #4f46e5; font-size: 16px;">About the Developer</h4>
            <p style="font-size: 14px; margin-bottom: 0;">
                <strong>Divyan S</strong><br />
                <strong>GitHub:</strong> <a href="https://github.com/Divyan-SS" target="_blank" style="color: #4f46e5; text-decoration: none;">github.com/Divyan-SS</a><br />
                <strong>LinkedIn:</strong> <a href="https://www.linkedin.com/in/divyan-s" target="_blank" style="color: #4f46e5; text-decoration: none;">linkedin.com/in/divyan-s</a>
            </p>
        </div>

        <p>We appreciate your time and support!</p>
        <br />
        <p>Best regards,<br /><strong>Project Team</strong></p>
    </body>
    </html>
    """
    
    return send_email(user_email, subject, html)
