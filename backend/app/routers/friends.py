import uuid
import logging

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, or_, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.models.friendship import Friendship
from app.schemas.friendship import FriendRequestCreate, FriendshipResponse, FriendAccept, FriendReject
from app.services.notifications import send_expo_push

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/friends", tags=["friends"])


@router.get("/", response_model=list[FriendshipResponse])
async def get_friendships(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Single-query join to fetch friend info (avoids N+1)
    from sqlalchemy.orm import aliased
    FriendUser = aliased(User)

    result = await db.execute(
        select(Friendship, FriendUser)
        .join(
            FriendUser,
            or_(
                and_(Friendship.user_id == current_user.id, FriendUser.id == Friendship.friend_id),
                and_(Friendship.friend_id == current_user.id, FriendUser.id == Friendship.user_id),
            ),
        )
        .where(
            or_(
                Friendship.user_id == current_user.id,
                Friendship.friend_id == current_user.id,
            )
        )
        .order_by(Friendship.created_at.desc())
    )
    rows = result.all()

    response = []
    for f, other_user in rows:
        response.append(FriendshipResponse(
            id=f.id,
            user_id=f.user_id,
            friend_id=f.friend_id,
            status=f.status,
            created_at=f.created_at,
            friend_username=other_user.username if other_user else None,
            friend_profile_picture_url=other_user.profile_picture_url if other_user else None,
            friend_is_subscribed=other_user.is_subscribed if other_user else False,
        ))

    return response


@router.get("/accepted-ids")
async def get_accepted_friend_ids(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Friendship).where(
            Friendship.status == "accepted",
            or_(
                Friendship.user_id == current_user.id,
                Friendship.friend_id == current_user.id,
            ),
        )
    )
    friendships = result.scalars().all()
    ids = set()
    for f in friendships:
        if f.user_id == current_user.id:
            ids.add(str(f.friend_id))
        else:
            ids.add(str(f.user_id))
    return {"friend_ids": list(ids)}


@router.post("/request", response_model=FriendshipResponse, status_code=status.HTTP_201_CREATED)
async def send_friend_request(
    body: FriendRequestCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if body.friend_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot friend yourself")

    # Check if friendship already exists in either direction
    existing = await db.execute(
        select(Friendship).where(
            or_(
                and_(Friendship.user_id == current_user.id, Friendship.friend_id == body.friend_id),
                and_(Friendship.user_id == body.friend_id, Friendship.friend_id == current_user.id),
            )
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Friendship already exists")

    # Verify target user exists
    target = await db.execute(select(User).where(User.id == body.friend_id))
    target_user = target.scalar_one_or_none()
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")

    friendship = Friendship(
        user_id=current_user.id,
        friend_id=body.friend_id,
        status="pending",
    )
    db.add(friendship)
    await db.commit()
    await db.refresh(friendship)

    # Send push notification to the recipient
    if target_user.push_notifications_enabled and target_user.push_token:
        try:
            await send_expo_push(
                target_user.push_token,
                "👋 New Friend Request",
                f"{current_user.username} wants to be friends!",
                {"type": "friend_request", "fromUserId": str(current_user.id), "fromUsername": current_user.username},
            )
        except Exception as e:
            logger.warning("Failed to send friend request notification: %s", e)

    return FriendshipResponse(
        id=friendship.id,
        user_id=friendship.user_id,
        friend_id=friendship.friend_id,
        status=friendship.status,
        created_at=friendship.created_at,
        friend_username=target_user.username,
        friend_profile_picture_url=target_user.profile_picture_url,
        friend_is_subscribed=target_user.is_subscribed,
    )


@router.put("/accept", response_model=FriendshipResponse)
async def accept_friend_request(
    body: FriendAccept,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Friendship).where(
            Friendship.id == body.friendship_id,
            Friendship.friend_id == current_user.id,
            Friendship.status == "pending",
        )
    )
    friendship = result.scalar_one_or_none()
    if not friendship:
        raise HTTPException(status_code=404, detail="Friend request not found")

    friendship.status = "accepted"
    await db.commit()
    await db.refresh(friendship)

    # Get sender info
    sender_result = await db.execute(select(User).where(User.id == friendship.user_id))
    sender = sender_result.scalar_one_or_none()

    # Notify the original sender that their request was accepted
    if sender and sender.push_notifications_enabled and sender.push_token:
        try:
            await send_expo_push(
                sender.push_token,
                "🎉 Friend Request Accepted",
                f"{current_user.username} accepted your friend request!",
                {"type": "friend_accepted", "fromUserId": str(current_user.id), "fromUsername": current_user.username},
            )
        except Exception as e:
            logger.warning("Failed to send friend accepted notification: %s", e)

    return FriendshipResponse(
        id=friendship.id,
        user_id=friendship.user_id,
        friend_id=friendship.friend_id,
        status=friendship.status,
        created_at=friendship.created_at,
        friend_username=sender.username if sender else None,
        friend_profile_picture_url=sender.profile_picture_url if sender else None,
        friend_is_subscribed=sender.is_subscribed if sender else False,
    )


@router.delete("/reject", status_code=status.HTTP_204_NO_CONTENT)
async def reject_friend_request(
    body: FriendReject,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Friendship).where(
            Friendship.id == body.friendship_id,
            Friendship.friend_id == current_user.id,
            Friendship.status == "pending",
        )
    )
    friendship = result.scalar_one_or_none()
    if not friendship:
        raise HTTPException(status_code=404, detail="Friend request not found")

    await db.delete(friendship)
    await db.commit()


@router.delete("/{friend_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_friend(
    friend_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Friendship).where(
            or_(
                and_(Friendship.user_id == current_user.id, Friendship.friend_id == friend_id),
                and_(Friendship.user_id == friend_id, Friendship.friend_id == current_user.id),
            )
        )
    )
    friendship = result.scalar_one_or_none()
    if not friendship:
        raise HTTPException(status_code=404, detail="Friendship not found")

    await db.delete(friendship)
    await db.commit()
