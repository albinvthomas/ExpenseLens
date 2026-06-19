import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

def send_otp_email(to_email: str, otp: str):
    smtp_host = os.environ.get("SMTP_HOST")
    smtp_port = os.environ.get("SMTP_PORT")
    smtp_user = os.environ.get("SMTP_USER")
    smtp_pass = os.environ.get("SMTP_PASS")
    
    if not all([smtp_host, smtp_port, smtp_user, smtp_pass]):
        print(f"\n{'='*50}\nWARNING: SMTP credentials not set. Email not sent.\nOTP for {to_email}: {otp}\n{'='*50}\n")
        return

    msg = MIMEMultipart()
    msg['From'] = smtp_user
    msg['To'] = to_email
    msg['Subject'] = "Your ExpenseLens Verification Code"

    body = f"""
    Welcome to ExpenseLens!
    
    Your email verification code is: {otp}
    
    This code will expire in 10 minutes.
    """
    msg.attach(MIMEText(body, 'plain'))

    try:
        # Set a 3 second timeout so the UI doesn't hang if Render drops the network packets
        server = smtplib.SMTP(smtp_host, int(smtp_port), timeout=3.0)
        server.starttls()
        server.login(smtp_user, smtp_pass)
        server.send_message(msg)
        server.quit()
        print(f"OTP email sent to {to_email}")
    except Exception as e:
        print(f"Failed to send email to {to_email}: {e}")
        print(f"\n{'='*50}\nOTP for {to_email}: {otp}\n{'='*50}\n")
