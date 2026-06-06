import smtplib
import os
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional


# =========================================================
# LOGGING & SMTP SETUP
# =========================================================
logger = logging.getLogger(__name__)

SMTP_SERVER = "smtp.gmail.com"
SMTP_PORT = 587

# Resolve environment variables securely with fallbacks
SMTP_USER = os.getenv("SMTP_USER") or os.getenv("EMAIL_USER")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD") or os.getenv("EMAIL_PASS")
SMTP_RECEIVER = os.getenv("SMTP_RECEIVER") or os.getenv("EMAIL_RECEIVER") or SMTP_USER

if SMTP_PASSWORD:
    SMTP_PASSWORD = SMTP_PASSWORD.replace(" ", "")

if not SMTP_USER or not SMTP_PASSWORD or not SMTP_RECEIVER:
    logger.warning("SMTP email service is not fully configured via environment variables.")

# =========================================================
# ✉️ REUSABLE EMAIL HELPER (WITH NETWORK EXCEPTION LOGS)
# =========================================================
def send_email(to_email: str, subject: str, html_body: str) -> bool:
    """
    Sends an HTML email to the specified address.
    Attempts Port 587 (STARTTLS) first, falling back to Port 465 (SSL/TLS) if blocked or timed out,
    using resolved IPv4 addresses to bypass IPv6 container network limitations.
    """
    if not SMTP_USER or not SMTP_PASSWORD:
        logger.warning("EMAIL_STATUS: skipped (SMTP credentials are not configured in the environment)")
        return False

    server = None
    connected = False
    connection_error = None
    
    # Try Port 587 (STARTTLS) first, then Port 465 (Implicit SSL/TLS)
    connection_configs = [(587, False), (465, True)]

    for port, use_ssl in connection_configs:
        try:
            import socket
            # Resolve to all available IPv4 addresses for this combination
            addr_info = socket.getaddrinfo(SMTP_SERVER, port, family=socket.AF_INET, type=socket.SOCK_STREAM)
            
            for res in addr_info:
                ip_address = res[4][0]
                try:
                    logger.info(f"Attempting SMTP connection to {ip_address}:{port} (SSL: {use_ssl})")
                    if use_ssl:
                        server = smtplib.SMTP_SSL(timeout=5)
                        server._host = SMTP_SERVER
                        server.connect(ip_address, port)
                    else:
                        server = smtplib.SMTP(ip_address, port, timeout=5)
                        server.server_hostname = SMTP_SERVER
                        server.starttls()
                    
                    connected = True
                    break
                except Exception as e:
                    logger.warning(f"Connection attempt failed to {ip_address}:{port} - {str(e)}")
                    connection_error = e
                    if server:
                        try:
                            server.quit()
                        except:
                            pass
                        server = None
                    continue
            
            if connected:
                break
        except Exception as e:
            logger.warning(f"DNS resolution or socket setup failed for port {port}: {str(e)}")
            connection_error = e
            continue

    if not connected or not server:
        logger.error(f"EMAIL_STATUS: failed (SMTP connection could not be established on ports 587 or 465: {str(connection_error)})")
        return False

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = SMTP_USER
        msg["To"] = to_email
        msg.attach(MIMEText(html_body, "html"))

        server.login(SMTP_USER, SMTP_PASSWORD)
        server.sendmail(SMTP_USER, to_email, msg.as_string())
        server.quit()

        logger.info(f"EMAIL_STATUS: success (Email delivered to {to_email})")
        return True

    except Exception as e:
        logger.error(f"EMAIL_STATUS: failed (SMTP execution error to {to_email}: {str(e)})")
        if server:
            try:
                server.quit()
            except:
                pass
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
        subject = f"Prediction Feedback Timeout - User did not respond ({prediction_id[:8]})"
        header_title = "User Did Not Respond"
        header_color = "#9ca3af"
    else:
        prefix = "UPDATED" if is_edit else "New"
        subject = f"{prefix} Prediction Feedback - {'Liked 👍' if is_liked else 'Disliked 👎'} ({prediction_id[:8]})"
        header_title = f"{prefix} Prediction Feedback: {'Liked 👍' if is_liked else 'Disliked 👎'}"
        header_color = "#10b981" if is_liked else "#ef4444"
    
    html = f"""
    <html>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <h2 style="color: {header_color}; margin-bottom: 5px;">
            {header_title}
        </h2>
        <p style="font-size: 12px; color: #666; margin-top: 0;">ID: {prediction_id}</p>
        <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
        
        <h3>Context Details:</h3>
        <ul>
            <li><strong>Country:</strong> {country}</li>
            <li><strong>Education Level:</strong> {education}</li>
            <li><strong>Experience:</strong> {experience} Years</li>
            <li><strong>Predicted Salary (USD):</strong> ${predicted_salary_usd:,.2f}</li>
            <li><strong>User Name:</strong> {user_name or 'Anonymous'}</li>
            <li><strong>User Email:</strong> {user_email or 'Not Provided'}</li>
        </ul>

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
# 💖 USER THANK YOU EMAIL FORMATTER (CASE A)
# =========================================================
def send_user_thank_you_email(user_email: str, user_name: str = None, is_edit: bool = False) -> bool:
    """
    Sends a thank you email containing developer information and portfolio links (Case A).
    """
    subject = "Updated: Thank you for your feedback" if is_edit else "Thank you for your feedback"
    header_title = "Your Updated Feedback!" if is_edit else "Thank You for Your Feedback!"
    header_color = "#4f46e5" if is_edit else "#10b981"
    recipient_name = user_name if user_name else "Developer"
    
    html = f"""
    <html>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: {header_color};">{header_title}</h2>
        <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
        <p>Hello {recipient_name},</p>
        <p>Thank you for submitting feedback on the Salary Prediction System. Your response has been recorded.</p>
        <p>Feedback like yours is essential to help continuously train and refine our machine learning models, leading to better predictions and overall system performance.</p>
        
        <div style="background-color: #f9fafb; border-left: 4px solid #6366f1; padding: 15px; margin: 20px 0; border-radius: 4px;">
            <h4 style="margin-top: 0; color: #4f46e5; font-size: 16px;">About the Developer</h4>
            <p style="font-size: 14px; margin-bottom: 15px;">
                <strong>Name:</strong> Divyan S<br />
                <strong>GitHub:</strong> <a href="https://github.com/Divyan-SS" target="_blank" style="color: #4f46e5; text-decoration: none;">github.com/Divyan-SS</a><br />
                <strong>LinkedIn:</strong> <a href="https://www.linkedin.com/in/divyan-s" target="_blank" style="color: #4f46e5; text-decoration: none;">linkedin.com/in/divyan-s</a>
            </p>
            <p style="font-size: 13px; color: #555; line-height: 1.5; font-style: italic; margin-bottom: 0;">
                Divyan S is a passionate Software Developer specializing in building scalable web applications and integrating advanced machine learning pipelines. Committed to open-source contributions and continuous architecture improvement.
            </p>
        </div>

        <p>We appreciate your time and support!</p>
        <br />
        <p>Best regards,<br /><strong>Salary Prediction Team</strong></p>
        <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="font-size: 11px; color: #999;">This is an automated message. Please do not reply directly to this email.</p>
    </body>
    </html>
    """
    
    return send_email(user_email, subject, html)

# =========================================================
# 🧭 USER FOLLOW-UP EMAIL FORMATTER (CASE B)
# =========================================================
def send_user_follow_up_email(user_email: str, user_name: str = None) -> bool:
    """
    Sends a follow-up email requesting feedback and encouraging page exploration (Case B).
    """
    subject = "Thanks for visiting"
    recipient_name = user_name if user_name else "there"
    
    html = f"""
    <html>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #4f46e5;">Thanks for visiting!</h2>
        <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
        <p>Hello {recipient_name},</p>
        <p>We noticed you explored our Salary Prediction System today! We hope the prediction results were helpful and interesting.</p>
        <p>If you have a moment, we would love to know what you think. Giving a quick **Like** or **Dislike** on the prediction card helps us optimize our regression engine and correct data mapping irregularities.</p>
        
        <p style="margin: 20px 0;">
            Please consider returning to the page to share your feedback. It takes only two clicks and motivates active development!
        </p>
        
        <p>Thank you again for your time and exploration.</p>
        <br />
        <p>Best regards,<br /><strong>Salary Prediction Team</strong></p>
        <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="font-size: 11px; color: #999;">This is an automated message. Please do not reply directly to this email.</p>
    </body>
    </html>
    """
    
    return send_email(user_email, subject, html)
