import os
import smtplib
from email.message import EmailMessage
from dotenv import load_dotenv

load_dotenv()

def send_otp_email(to_email: str, otp: str):
    smtp_host = os.environ.get("SMTP_HOST", "smtp.gmail.com")
    smtp_port = int(os.environ.get("SMTP_PORT", 587))
    smtp_user = os.environ.get("SMTP_USER")
    smtp_pass = os.environ.get("SMTP_PASS")

    if not smtp_user or not smtp_pass:
        print(f"\n{'='*50}\nWARNING: SMTP credentials not set. Email not sent.\nOTP for {to_email}: {otp}\n{'='*50}\n")
        return None

    html_content = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb; border-radius: 8px;">
        <div style="text-align: center; margin-bottom: 20px;">
            <h2 style="color: #111827;">Welcome to ExpenseLens</h2>
        </div>
        <div style="background-color: #ffffff; padding: 30px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
            <p style="color: #4b5563; font-size: 16px; margin-bottom: 20px;">Hello,</p>
            <p style="color: #4b5563; font-size: 16px; margin-bottom: 30px;">Please use the following verification code to securely log in to your account. This code will expire in 10 minutes.</p>
            <div style="text-align: center; margin-bottom: 30px;">
                <span style="display: inline-block; font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #10b981; background-color: #ecfdf5; padding: 15px 30px; border-radius: 8px; border: 2px dashed #34d399;">
                    {otp}
                </span>
            </div>
            <p style="color: #6b7280; font-size: 14px; text-align: center;">If you didn't request this code, you can safely ignore this email.</p>
        </div>
        <div style="text-align: center; margin-top: 20px; color: #9ca3af; font-size: 12px;">
            <p>&copy; 2026 ExpenseLens. All rights reserved.</p>
        </div>
    </div>
    """

    msg = EmailMessage()
    msg['Subject'] = "Your ExpenseLens Verification Code"
    msg['From'] = f"ExpenseLens <{smtp_user}>"
    msg['To'] = to_email
    msg.set_content("Please use the following verification code: " + otp)
    msg.add_alternative(html_content, subtype='html')

    try:
        with smtplib.SMTP(smtp_host, smtp_port) as server:
            server.starttls()
            server.login(smtp_user, smtp_pass)
            server.send_message(msg)
        print(f"OTP email successfully sent to {to_email} via SMTP.")
        return True
    except Exception as e:
        error_msg = str(e)
        print(f"Failed to send email to {to_email} via SMTP: {error_msg}")
        raise e
