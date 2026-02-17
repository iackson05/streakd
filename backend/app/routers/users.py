import uuid

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy import select, func, or_, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.models.friendship import Friendship
from app.models.notification import NotificationSettings
from app.schemas.user import UserProfile, UsernameUpdate, NotificationSettingsSchema, PushTokenUpdate
from app.services.storage import upload_file, delete_file

router = APIRouter(prefix="/users", tags=["users"])


async def _get_friend_count(db: AsyncSession, user_id: uuid.UUID) -> int:
    result = await db.execute(
        select(func.count()).where(
            and_(
                Friendship.status == "accepted",
                or_(Friendship.user_id == user_id, Friendship.friend_id == user_id),
            )
        )
    )
    return result.scalar() or 0


@router.get("/profile/{user_id}", response_model=UserProfile)
async def get_user_profile(
    user_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    friend_count = await _get_friend_count(db, user_id)
    return UserProfile(
        id=user.id,
        username=user.username,
        email=user.email,
        profile_picture_url=user.profile_picture_url,
        created_at=user.created_at,
        friend_count=friend_count,
    )


@router.get("/search")
async def search_users(
    query: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(User)
        .where(User.username.ilike(f"%{query}%"))
        .where(User.id != current_user.id)
        .limit(20)
    )
    users = result.scalars().all()
    return [
        {"id": u.id, "username": u.username, "profile_picture_url": u.profile_picture_url}
        for u in users
    ]


@router.put("/username")
async def update_username(
    body: UsernameUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Check availability
    result = await db.execute(
        select(User).where(User.username == body.username).where(User.id != current_user.id)
    )
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Username already taken")

    current_user.username = body.username
    await db.commit()
    return {"username": current_user.username}


@router.get("/check-username/{username}")
async def check_username(
    username: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(User).where(User.username == username).where(User.id != current_user.id)
    )
    return {"available": result.scalar_one_or_none() is None}


@router.put("/profile-picture")
async def update_profile_picture(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Delete old picture from R2
    if current_user.profile_picture_url:
        await delete_file(current_user.profile_picture_url)

    contents = await file.read()
    url = await upload_file(contents, file.content_type or "image/jpeg", folder="profile-pictures")
    current_user.profile_picture_url = url
    await db.commit()
    return {"profile_picture_url": url}


@router.get("/notification-settings", response_model=NotificationSettingsSchema)
async def get_notification_settings(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(NotificationSettings).where(NotificationSettings.user_id == current_user.id)
    )
    settings = result.scalar_one_or_none()
    if not settings:
        settings = NotificationSettings(user_id=current_user.id)
        db.add(settings)
        await db.commit()
        await db.refresh(settings)
    return settings


@router.put("/notification-settings", response_model=NotificationSettingsSchema)
async def update_notification_settings(
    body: NotificationSettingsSchema,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(NotificationSettings).where(NotificationSettings.user_id == current_user.id)
    )
    settings = result.scalar_one_or_none()
    if not settings:
        settings = NotificationSettings(user_id=current_user.id, **body.model_dump())
        db.add(settings)
    else:
        for field, value in body.model_dump().items():
            setattr(settings, field, value)
    await db.commit()
    await db.refresh(settings)
    return settings


@router.put("/push-token")
async def update_push_token(
    body: PushTokenUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    current_user.push_token = body.push_token
    await db.commit()
    return {"push_token": current_user.push_token}
