import os
import resend

def send_otp_email(to_email: str, otp: str):
    resend.api_key = os.environ.get("RESEND_API_KEY")
    
    if not resend.api_key:
        print(f"\n{'='*50}\nWARNING: RESEND_API_KEY not set. Email not sent.\nOTP for {to_email}: {otp}\n{'='*50}\n")
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

    try:
        # Note: 'onboarding@resend.dev' allows sending emails to the registered Resend account email for testing.
        params = {
            "from": "ExpenseLens <onboarding@resend.dev>",
            "to": [to_email],
            "subject": "Your ExpenseLens Verification Code",
            "html": html_content,
        }

        response = resend.Emails.send(params)
        print(f"OTP email successfully sent to {to_email} via Resend. ID: {response}")
        return response
    except Exception as e:
        error_msg = str(e)
        print(f"Failed to send email to {to_email} via Resend: {error_msg}")
        if "You can only send testing emails to your own email address" in error_msg:
            print(f"\n{'='*50}\nBYPASS: Resend test mode detected. Email not sent.\nOTP for {to_email}: {otp}\n{'='*50}\n")
            return None
        raise e
