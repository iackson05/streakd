import io
import logging
import uuid

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from PIL import Image
from sqlalchemy import select, func, or_, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.models.post import Post
from app.models.friendship import Friendship
from app.models.notification import NotificationSettings
from app.models.block import Block
from app.schemas.user import UserProfile, UsernameUpdate, NameUpdate, NotificationSettingsSchema, PushTokenUpdate, SubscriptionStatusUpdate
from app.services.storage import upload_file, delete_file

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/users", tags=["users"])

AVATAR_MAX_SIZE = (256, 256)
AVATAR_JPEG_QUALITY = 85


def _compress_profile_picture(data: bytes) -> bytes:
    img = Image.open(io.BytesIO(data))

    # Convert to RGB (handles PNG with alpha, HEIC, etc.)
    if img.mode != "RGB":
        img = img.convert("RGB")

    # Crop to square using the shorter side, then resize
    w, h = img.size
    side = min(w, h)
    left = (w - side) // 2
    top = (h - side) // 2
    img = img.crop((left, top, left + side, top + side))
    img = img.resize(AVATAR_MAX_SIZE, Image.LANCZOS)

    out = io.BytesIO()
    img.save(out, format="JPEG", quality=AVATAR_JPEG_QUALITY, optimize=True)
    return out.getvalue()


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
        name=user.name,
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
    # Get blocked user IDs (both directions)
    block_result = await db.execute(
        select(Block).where(
            or_(
                Block.blocker_id == current_user.id,
                Block.blocked_id == current_user.id,
            )
        )
    )
    blocks = block_result.scalars().all()
    blocked_ids = set()
    for b in blocks:
        if b.blocker_id == current_user.id:
            blocked_ids.add(b.blocked_id)
        else:
            blocked_ids.add(b.blocker_id)

    search_query = (
        select(User)
        .where(
            or_(
                User.username.ilike(f"%{query}%"),
                User.name.ilike(f"%{query}%"),
            )
        )
        .where(User.id != current_user.id)
    )
    if blocked_ids:
        search_query = search_query.where(User.id.not_in(blocked_ids))
    search_query = search_query.limit(20)

    result = await db.execute(search_query)
    users = result.scalars().all()
    return [
        {"id": u.id, "username": u.username, "name": u.name, "profile_picture_url": u.profile_picture_url}
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


@router.put("/name")
async def update_name(
    body: NameUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    current_user.name = body.name.strip() or None
    await db.commit()
    return {"name": current_user.name}


@router.get("/check-username/{username}")
async def check_username(
    username: str,
    db: AsyncSession = Depends(get_db),
):
    """Public endpoint — no auth required so signup flow can check availability."""
    result = await db.execute(
        select(User).where(User.username == username)
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
    contents = _compress_profile_picture(contents)
    url = await upload_file(contents, "image/jpeg", folder="profile-pictures")
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


@router.put("/subscription-status")
async def update_subscription_status(
    body: SubscriptionStatusUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    current_user.is_subscribed = body.is_subscribed
    await db.commit()
    return {"is_subscribed": current_user.is_subscribed}


@router.put("/push-token")
async def update_push_token(
    body: PushTokenUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    current_user.push_token = body.push_token
    await db.commit()
    return {"push_token": current_user.push_token}


@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT)
async def delete_account(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Permanently delete the current user's account and all associated data.
    Cleans up R2 images for posts and profile picture before removing DB rows.
    """
    # Collect all image URLs for R2 cleanup
    image_urls = []

    # Profile picture
    if current_user.profile_picture_url:
        image_urls.append(current_user.profile_picture_url)

    # All post images
    posts_result = await db.execute(
        select(Post.image_url).where(Post.user_id == current_user.id)
    )
    for row in posts_result.all():
        if row[0]:
            image_urls.append(row[0])

    # Best-effort R2 cleanup before DB deletion
    for url in image_urls:
        try:
            await delete_file(url)
        except Exception as e:
            logger.warning("Failed to delete R2 file %s during account deletion: %s", url, e)

    # Delete user (cascade deletes goals, posts, reactions, notification_settings)
    await db.delete(current_user)
    await db.commit()
