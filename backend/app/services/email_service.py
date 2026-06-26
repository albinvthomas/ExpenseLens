import os
import requests
from dotenv import load_dotenv

load_dotenv()

def send_otp_email(to_email: str, otp: str):
    brevo_api_key = os.environ.get("BREVO_API_KEY")
    sender_email = os.environ.get("BREVO_SENDER_EMAIL", "albinvthomas089@gmail.com")
    
    if not brevo_api_key:
        print(f"\n{'='*50}\nWARNING: BREVO_API_KEY not set. Email not sent.\nOTP for {to_email}: {otp}\n{'='*50}\n")
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

    url = "https://api.brevo.com/v3/smtp/email"
    headers = {
        "accept": "application/json",
        "api-key": brevo_api_key,
        "content-type": "application/json"
    }
    payload = {
        "sender": {
            "name": "ExpenseLens",
            "email": sender_email
        },
        "to": [
            {
                "email": to_email
            }
        ],
        "subject": "Your ExpenseLens Verification Code",
        "htmlContent": html_content
    }

    try:
        response = requests.post(url, json=payload, headers=headers)
        response.raise_for_status()
        print(f"OTP email successfully sent to {to_email} via Brevo. ID: {response.json().get('messageId')}")
        return response.json()
    except requests.exceptions.RequestException as e:
        error_msg = str(e)
        if e.response is not None:
            error_msg = f"{error_msg} - {e.response.text}"
            
        print(f"Failed to send email to {to_email} via Brevo: {error_msg}")
        
        # If there's an auth error or unverified sender error, print OTP to console so dev isn't blocked
        if e.response is not None and e.response.status_code in [400, 401]:
            print(f"\n{'='*50}\nBYPASS: Brevo configuration issue detected. Email not sent.\nOTP for {to_email}: {otp}\n{'='*50}\n")
            return None
            
        raise e
