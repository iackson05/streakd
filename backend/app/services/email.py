import logging

import resend

from app.config import settings

logger = logging.getLogger(__name__)

resend.api_key = settings.RESEND_API_KEY
FROM_EMAIL = settings.EMAIL_FROM


def send_verification_email(to_email: str, code: str) -> bool:
    try:
        resend.Emails.send({
            "from": FROM_EMAIL,
            "to": [to_email],
            "subject": "Verify your Streakd account",
            "html": f"""
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
                <h2 style="color: #FF6B35; margin-bottom: 8px;">Streakd</h2>
                <p style="color: #333; font-size: 16px;">Your verification code is:</p>
                <div style="background: #f5f5f5; border-radius: 12px; padding: 24px; text-align: center; margin: 24px 0;">
                    <span style="font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #111;">{code}</span>
                </div>
                <p style="color: #666; font-size: 14px;">This code expires in 10 minutes.</p>
                <p style="color: #999; font-size: 13px; margin-top: 32px;">If you didn't create a Streakd account, you can ignore this email.</p>
            </div>
            """,
        })
        return True
    except Exception:
        logger.exception("Failed to send verification email to %s", to_email)
        return False


def send_password_reset_email(to_email: str, code: str) -> bool:
    try:
        resend.Emails.send({
            "from": FROM_EMAIL,
            "to": [to_email],
            "subject": "Reset your Streakd password",
            "html": f"""
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
                <h2 style="color: #FF6B35; margin-bottom: 8px;">Streakd</h2>
                <p style="color: #333; font-size: 16px;">Your password reset code is:</p>
                <div style="background: #f5f5f5; border-radius: 12px; padding: 24px; text-align: center; margin: 24px 0;">
                    <span style="font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #111;">{code}</span>
                </div>
                <p style="color: #666; font-size: 14px;">This code expires in 10 minutes.</p>
                <p style="color: #999; font-size: 13px; margin-top: 32px;">If you didn't request a password reset, you can safely ignore this email. Your password won't be changed.</p>
            </div>
            """,
        })
        return True
    except Exception:
        logger.exception("Failed to send password reset email to %s", to_email)
        return False
