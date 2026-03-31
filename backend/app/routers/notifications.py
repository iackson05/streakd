import uuid
from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.config import settings
from app.database import get_db
from app.models.goal import Goal
from app.models.notification import NotificationSettings
from app.models.user import User
from app.services.notifications import send_expo_push

router = APIRouter(prefix="/internal", tags=["internal"])


def verify_secret(x_internal_secret: str = Header(...)):
    if x_internal_secret != settings.INTERNAL_API_SECRET:
        raise HTTPException(status_code=401, detail="Unauthorized")



@router.post("/send-streak-notifications")
async def send_streak_notifications(
    db: AsyncSession = Depends(get_db),
    _: str = Depends(verify_secret),
):
    now = datetime.now(timezone.utc)

    result = await db.execute(
        select(Goal)
        .options(selectinload(Goal.user).selectinload(User.notification_settings))
        .where(Goal.completed == False, Goal.last_posted_at.isnot(None))
    )
    goals = result.scalars().all()

    sent = []

    for goal in goals:
        user = goal.user
        if not user or not user.push_token or not user.push_notifications_enabled:
            continue
        if not user.notification_settings or not user.notification_settings.streak_reminders:
            continue

        # Normalise to UTC
        last_posted = goal.last_posted_at
        if last_posted.tzinfo is None:
            last_posted = last_posted.replace(tzinfo=timezone.utc)

        interval_days = goal.streak_interval or 1
        expires_at = last_posted + timedelta(days=interval_days)
        four_hr_warn = expires_at - timedelta(hours=4)
        one_hr_warn = expires_at - timedelta(hours=1)

        if now >= expires_at:
            if goal.streak_count > 0:
                goal.streak_count = 0
                await db.commit()
            continue

        should_4hr = four_hr_warn <= now < one_hr_warn
        should_1hr = one_hr_warn <= now < expires_at

        # Dedup: skip if we sent a notification recently
        if goal.notification_time:
            last_notif = goal.notification_time
            if last_notif.tzinfo is None:
                last_notif = last_notif.replace(tzinfo=timezone.utc)
            hours_since = (now - last_notif).total_seconds() / 3600
            if hours_since < 3:
                should_4hr = False
            if hours_since < 0.5:
                should_1hr = False

        notif_type = title = body = None
        if should_4hr:
            notif_type = "streak_4hr"
            title = f"⚠️ {goal.title} - 4 Hours Left!"
            body = "Your streak expires in 4 hours. Post now to keep it alive!"
        elif should_1hr:
            notif_type = "streak_1hr"
            title = f"🚨 {goal.title} - 1 Hour Left!"
            body = "Last chance! Your streak expires in 1 hour. Don't lose your progress!"

        if notif_type:
            expo_result = await send_expo_push(
                user.push_token, title, body,
                {"goalId": str(goal.id), "type": notif_type},
            )
            goal.notification_time = now
            await db.commit()
            sent.append({"goalId": str(goal.id), "type": notif_type, "result": expo_result})

    return {"success": True, "sent": len(sent), "notifications": sent}


class InstantNotificationRequest(BaseModel):
    userId: uuid.UUID
    type: str
    data: dict


@router.post("/send-instant-notification")
async def send_instant_notification(
    body: InstantNotificationRequest,
    db: AsyncSession = Depends(get_db),
    _: str = Depends(verify_secret),
):
    result = await db.execute(
        select(User).where(User.id == body.userId)
    )
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if not user.push_notifications_enabled or not user.push_token:
        return {"success": True, "sent": False, "reason": "notifications_disabled"}

    # Check per-type notification settings
    settings_result = await db.execute(
        select(NotificationSettings).where(NotificationSettings.user_id == user.id)
    )
    notif_settings = settings_result.scalar_one_or_none()

    if body.type == "friend_request":
        if notif_settings and not notif_settings.friend_requests:
            return {"success": True, "sent": False, "reason": "type_disabled"}
        title = "👋 New Friend Request"
        notif_body = f"{body.data.get('fromUsername', 'Someone')} wants to be friends!"
    elif body.type == "friend_accepted":
        if notif_settings and not notif_settings.friend_requests:
            return {"success": True, "sent": False, "reason": "type_disabled"}
        title = "🎉 Friend Request Accepted"
        notif_body = f"{body.data.get('fromUsername', 'Someone')} accepted your friend request!"
    elif body.type == "reaction":
        if notif_settings and not notif_settings.reactions:
            return {"success": True, "sent": False, "reason": "type_disabled"}
        title = "🔥 New Reaction"
        notif_body = f"{body.data.get('fromUsername', 'Someone')} reacted to your post!"
    else:
        raise HTTPException(status_code=400, detail=f"Unknown notification type: {body.type}")

    expo_result = await send_expo_push(user.push_token, title, notif_body, dict(body.data))
    return {"success": True, "sent": True, "result": expo_result}
