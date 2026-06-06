import smtplib
import os
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

SMTP_SERVER = "smtp.gmail.com"
SMTP_PORT = 587
SMTP_USER = os.getenv("SMTP_USER", "divyansample3@gmail.com")
# Strip spaces from password
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "canymqwdhtboakfu")
SMTP_RECEIVER = os.getenv("SMTP_RECEIVER", "divyansample3@gmail.com")

def send_feedback_email(
    prediction_id: str,
    country: str,
    education: str,
    experience: float,
    predicted_salary_usd: float,
    is_liked: bool,
    dislike_reason: str = None,
    text_explanation: str = None,
    improvement_suggestion: str = None
):
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = f"New Prediction Feedback - {'Liked 👍' if is_liked else 'Disliked 👎'}"
        msg["From"] = SMTP_USER
        msg["To"] = SMTP_RECEIVER

        # Formulate HTML body
        html = f"""
        <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <h2 style="color: {'#10b981' if is_liked else '#ef4444'};">
                Prediction Feedback: {'Liked 👍' if is_liked else 'Disliked 👎'}
            </h2>
            <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
            
            <h3>Prediction Context:</h3>
            <ul>
                <li><strong>Prediction ID:</strong> {prediction_id or 'N/A'}</li>
                <li><strong>Country:</strong> {country}</li>
                <li><strong>Education Level:</strong> {education}</li>
                <li><strong>Experience:</strong> {experience} Years</li>
                <li><strong>Predicted Salary (USD):</strong> ${predicted_salary_usd:,.2f}</li>
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

        msg.attach(MIMEText(html, "html"))

        # Connect and send
        server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
        server.starttls()
        server.login(SMTP_USER, SMTP_PASSWORD)
        server.sendmail(SMTP_USER, SMTP_RECEIVER, msg.as_string())
        server.quit()
        print("Feedback email notification dispatched successfully.")
        return True
    except Exception as e:
        print(f"Failed to dispatch feedback email: {e}")
        return False
