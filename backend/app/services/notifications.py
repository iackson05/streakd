import json
import logging
import time

import httpx
import jwt

from app.config import settings

logger = logging.getLogger(__name__)


def _is_expo_token(token: str) -> bool:
    """Check if a token is an Expo push token (vs a raw APNs hex token)."""
    return token.startswith("ExponentPushToken[") or token.startswith("ExpoPushToken[")


# ============================================================
# Unified send function — routes to APNs or Expo based on token
# ============================================================

async def send_push_notification(token: str, title: str, body: str, data: dict) -> dict:
    """Send a push notification to the given token.

    Automatically detects whether the token is an Expo push token or a raw APNs
    device token and routes accordingly. This allows both the React Native
    (Expo) and native Swift apps to coexist during migration.
    """
    if _is_expo_token(token):
        return await _send_expo_push(token, title, body, data)
    else:
        return await _send_apns_push(token, title, body, data)


# Keep the old name as an alias so existing callers don't break
send_expo_push = send_push_notification


# ============================================================
# Expo Push (legacy — for React Native app)
# ============================================================

async def _send_expo_push(token: str, title: str, body: str, data: dict) -> dict:
    headers = {
        "Accept": "application/json",
        "Content-Type": "application/json",
    }
    if settings.EXPO_ACCESS_TOKEN:
        headers["Authorization"] = f"Bearer {settings.EXPO_ACCESS_TOKEN}"

    async with httpx.AsyncClient() as client:
        response = await client.post(
            "https://exp.host/--/api/v2/push/send",
            json={
                "to": token,
                "sound": "default",
                "title": title,
                "body": body,
                "data": data,
                "priority": "high",
            },
            headers=headers,
            timeout=10.0,
        )
        return response.json()


# ============================================================
# APNs Push (native iOS)
# ============================================================

def _build_apns_jwt() -> str:
    """Build a short-lived JWT for APNs token-based authentication.

    Requires these settings:
      APNS_KEY_ID      — 10-char key ID from Apple Developer
      APNS_TEAM_ID     — 10-char team ID
      APNS_KEY_PATH    — path to the .p8 private key file
    """
    with open(settings.APNS_KEY_PATH, "r") as f:
        private_key = f.read()

    now = int(time.time())
    payload = {
        "iss": settings.APNS_TEAM_ID,
        "iat": now,
    }
    headers = {
        "alg": "ES256",
        "kid": settings.APNS_KEY_ID,
    }
    return jwt.encode(payload, private_key, algorithm="ES256", headers=headers)


# Cache the JWT for ~50 minutes (APNs tokens are valid for 1 hour)
_apns_jwt_cache: dict = {"token": None, "expires_at": 0}


def _get_apns_jwt() -> str:
    now = int(time.time())
    if _apns_jwt_cache["token"] and now < _apns_jwt_cache["expires_at"]:
        return _apns_jwt_cache["token"]

    token = _build_apns_jwt()
    _apns_jwt_cache["token"] = token
    _apns_jwt_cache["expires_at"] = now + 3000  # 50 minutes
    return token


async def _send_apns_push(device_token: str, title: str, body: str, data: dict) -> dict:
    """Send a push notification via Apple Push Notification service (HTTP/2).

    Uses token-based authentication (.p8 key).
    """
    if not settings.APNS_KEY_PATH or not settings.APNS_KEY_ID or not settings.APNS_TEAM_ID:
        logger.warning("APNs not configured — skipping push to device token %s...", device_token[:8])
        return {"error": "APNs not configured"}

    apns_jwt = _get_apns_jwt()

    # Use production APNs by default; set APNS_USE_SANDBOX=true for development
    host = (
        "https://api.sandbox.push.apple.com"
        if settings.APNS_USE_SANDBOX
        else "https://api.push.apple.com"
    )

    url = f"{host}/3/device/{device_token}"

    apns_payload = {
        "aps": {
            "alert": {
                "title": title,
                "body": body,
            },
            "sound": "default",
            "badge": 1,
        },
        # Custom data — accessible in the notification userInfo
        **data,
    }

    headers = {
        "authorization": f"bearer {apns_jwt}",
        "apns-topic": settings.APNS_BUNDLE_ID,
        "apns-priority": "10",
        "apns-push-type": "alert",
    }

    try:
        async with httpx.AsyncClient(http2=True) as client:
            response = await client.post(
                url,
                content=json.dumps(apns_payload),
                headers=headers,
                timeout=10.0,
            )

            if response.status_code == 200:
                return {"success": True}
            else:
                error_body = response.text
                logger.error(
                    "APNs error %d for token %s...: %s",
                    response.status_code, device_token[:8], error_body,
                )
                return {"error": error_body, "status": response.status_code}

    except Exception as e:
        logger.error("APNs request failed: %s", e)
        return {"error": str(e)}
