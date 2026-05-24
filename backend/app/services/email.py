import logging

import resend

from app.config import settings

logger = logging.getLogger(__name__)

resend.api_key = settings.RESEND_API_KEY
FROM_EMAIL = settings.EMAIL_FROM
LOGO_URL = "https://streakd.social/assets/logo.png"


def _email_wrapper(content: str) -> str:
    return f"""
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
    <body style="margin: 0; padding: 0; background-color: #111111; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #111111;">
            <tr><td align="center" style="padding: 40px 16px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 460px; background-color: #1a1a1a; border-radius: 16px; overflow: hidden;">
                    <!-- Header -->
                    <tr><td style="padding: 36px 32px 20px; text-align: center; border-bottom: 1px solid rgba(255,255,255,0.06);">
                        <img src="{LOGO_URL}" alt="streakd" width="56" height="56" style="display: block; margin: 0 auto 12px;" />
                        <span style="font-size: 22px; font-weight: 700; color: #FF6B35; letter-spacing: -0.3px;">streakd</span>
                    </td></tr>
                    <!-- Body -->
                    <tr><td style="padding: 32px 32px 36px;">
                        {content}
                    </td></tr>
                    <!-- Footer -->
                    <tr><td style="padding: 20px 32px; text-align: center; border-top: 1px solid rgba(255,255,255,0.06);">
                        <span style="font-size: 12px; color: #555;">streakd.social</span>
                    </td></tr>
                </table>
            </td></tr>
        </table>
    </body>
    </html>
    """


def send_verification_email(to_email: str, code: str) -> bool:
    content = f"""
        <p style="color: #e0e0e0; font-size: 16px; margin: 0 0 6px; font-weight: 600;">verify your email</p>
        <p style="color: #888; font-size: 14px; margin: 0 0 28px; line-height: 1.5;">enter this code in the app to verify your account.</p>
        <div style="background: rgba(255,107,53,0.08); border: 1px solid rgba(255,107,53,0.2); border-radius: 12px; padding: 24px; text-align: center; margin: 0 0 24px;">
            <span style="font-size: 36px; font-weight: 700; letter-spacing: 10px; color: #FF6B35; font-family: 'SF Mono', 'Fira Code', monospace;">{code}</span>
        </div>
        <p style="color: #666; font-size: 13px; margin: 0 0 4px;">this code expires in 10 minutes.</p>
        <p style="color: #555; font-size: 12px; margin: 20px 0 0;">if you didn't create a streakd account, you can ignore this email.</p>
    """
    try:
        resend.Emails.send({
            "from": FROM_EMAIL,
            "to": [to_email],
            "subject": "verify your streakd account",
            "html": _email_wrapper(content),
        })
        return True
    except Exception:
        logger.exception("Failed to send verification email to %s", to_email)
        return False


def send_password_reset_email(to_email: str, code: str) -> bool:
    content = f"""
        <p style="color: #e0e0e0; font-size: 16px; margin: 0 0 6px; font-weight: 600;">reset your password</p>
        <p style="color: #888; font-size: 14px; margin: 0 0 28px; line-height: 1.5;">enter this code in the app to set a new password.</p>
        <div style="background: rgba(255,107,53,0.08); border: 1px solid rgba(255,107,53,0.2); border-radius: 12px; padding: 24px; text-align: center; margin: 0 0 24px;">
            <span style="font-size: 36px; font-weight: 700; letter-spacing: 10px; color: #FF6B35; font-family: 'SF Mono', 'Fira Code', monospace;">{code}</span>
        </div>
        <p style="color: #666; font-size: 13px; margin: 0 0 4px;">this code expires in 10 minutes.</p>
        <p style="color: #555; font-size: 12px; margin: 20px 0 0;">if you didn't request a password reset, you can safely ignore this email. your password won't be changed.</p>
    """
    try:
        resend.Emails.send({
            "from": FROM_EMAIL,
            "to": [to_email],
            "subject": "reset your streakd password",
            "html": _email_wrapper(content),
        })
        return True
    except Exception:
        logger.exception("Failed to send password reset email to %s", to_email)
        return False
