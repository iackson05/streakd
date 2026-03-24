import httpx
from app.config import settings


async def send_expo_push(token: str, title: str, body: str, data: dict) -> dict:
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
