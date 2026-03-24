"""
RevenueCat server-side subscription verification.
Used only for the archive endpoint — goal creation uses client-side enforcement.
"""

from datetime import datetime, timezone

import httpx

from app.config import settings

REVENUECAT_API_BASE = "https://api.revenuecat.com/v1"
# Must match the entitlement identifier in the RevenueCat dashboard exactly
STREAKD_PLUS_ENTITLEMENT = "streakd+"


async def is_subscribed(app_user_id: str) -> bool:
    """Return True if the user has an active streakd_plus entitlement."""
    if not settings.REVENUECAT_API_KEY:
        return False

    url = f"{REVENUECAT_API_BASE}/subscribers/{app_user_id}"
    headers = {
        "Authorization": f"Bearer {settings.REVENUECAT_API_KEY}",
        "Content-Type": "application/json",
    }

    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(url, headers=headers)

        if response.status_code != 200:
            return False

        data = response.json()
        entitlements = data.get("subscriber", {}).get("entitlements", {})
        entitlement = entitlements.get(STREAKD_PLUS_ENTITLEMENT)
        if not entitlement:
            return False

        expires_date_str = entitlement.get("expires_date")

        # Null expires_date means a lifetime entitlement — always active
        if expires_date_str is None:
            return True

        # Otherwise check if the expiry is still in the future
        expires_date = datetime.fromisoformat(expires_date_str.replace("Z", "+00:00"))
        return expires_date > datetime.now(timezone.utc)

    except Exception:
        return False
