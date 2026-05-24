import logging
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, or_, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_verified_user
from app.models.notification import NotificationSettings
from app.models.user import User
from app.models.post import Post
from app.models.goal import Goal
from app.models.friendship import Friendship
from app.models.block import Block
from app.models.reaction import Reaction
from app.schemas.reaction import ToggleReactionRequest, ToggleReactionResponse, UserReaction
from app.services.auth import EMOJI_TO_COLUMN
from app.services.notifications import send_expo_push

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/reactions", tags=["reactions"])


@router.post("/toggle", response_model=ToggleReactionResponse)
async def toggle_reaction(
    body: ToggleReactionRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_verified_user),
):
    column_name = EMOJI_TO_COLUMN.get(body.react_emoji)
    if not column_name:
        raise HTTPException(status_code=400, detail="Invalid reaction emoji")

    # Lock the post row for atomic update
    post_result = await db.execute(
        select(Post).where(Post.id == body.post_id).with_for_update()
    )
    post = post_result.scalar_one_or_none()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    # Authorize: user must be allowed to see the post (own post, or friend's
    # non-private goal, with no block in either direction). Without this,
    # anyone with a post UUID could react and trigger notifications.
    if post.user_id != current_user.id:
        # Block check (either direction)
        block_check = await db.execute(
            select(Block).where(
                or_(
                    and_(Block.blocker_id == current_user.id, Block.blocked_id == post.user_id),
                    and_(Block.blocker_id == post.user_id, Block.blocked_id == current_user.id),
                )
            )
        )
        if block_check.scalar_one_or_none():
            raise HTTPException(status_code=404, detail="Post not found")

        # Goal must be visible (privacy != "private")
        goal_result = await db.execute(select(Goal).where(Goal.id == post.goal_id))
        goal = goal_result.scalar_one_or_none()
        if not goal or goal.privacy == "private":
            raise HTTPException(status_code=404, detail="Post not found")

        # Friendship required for "friends" privacy
        friend_check = await db.execute(
            select(Friendship).where(
                Friendship.status == "accepted",
                or_(
                    and_(Friendship.user_id == current_user.id, Friendship.friend_id == post.user_id),
                    and_(Friendship.user_id == post.user_id, Friendship.friend_id == current_user.id),
                ),
            )
        )
        if not friend_check.scalar_one_or_none():
            raise HTTPException(status_code=403, detail="Not authorized to react to this post")

    # Check if user already reacted
    existing_result = await db.execute(
        select(Reaction).where(
            Reaction.post_id == body.post_id,
            Reaction.user_id_who_reacted == current_user.id,
        )
    )
    existing = existing_result.scalar_one_or_none()

    user_reaction = None

    is_new_reaction = False

    if existing:
        if existing.react_emoji == body.react_emoji:
            # Same emoji: remove reaction (toggle off)
            old_col = EMOJI_TO_COLUMN[existing.react_emoji]
            setattr(post, old_col, max(0, getattr(post, old_col) - 1))
            await db.delete(existing)
        else:
            # Different emoji: swap reaction
            old_col = EMOJI_TO_COLUMN[existing.react_emoji]
            setattr(post, old_col, max(0, getattr(post, old_col) - 1))
            setattr(post, column_name, getattr(post, column_name) + 1)
            existing.react_emoji = body.react_emoji
            user_reaction = body.react_emoji
    else:
        # New reaction
        reaction = Reaction(
            post_id=body.post_id,
            user_id_who_reacted=current_user.id,
            react_emoji=body.react_emoji,
        )
        db.add(reaction)
        setattr(post, column_name, getattr(post, column_name) + 1)
        user_reaction = body.react_emoji
        is_new_reaction = True

    await db.commit()
    await db.refresh(post)

    # Notify the post owner on new reactions (skip if reacting to own post)
    if is_new_reaction and post.user_id != current_user.id:
        try:
            owner_result = await db.execute(
                select(User).where(User.id == post.user_id)
            )
            owner = owner_result.scalar_one_or_none()
            if owner and owner.push_notifications_enabled and owner.push_token:
                # Check reactions notification setting
                ns_result = await db.execute(
                    select(NotificationSettings).where(NotificationSettings.user_id == owner.id)
                )
                ns = ns_result.scalar_one_or_none()
                if ns is None or ns.reactions:
                    await send_expo_push(
                        owner.push_token,
                        "🔥 New Reaction",
                        f"{current_user.username} reacted to your post!",
                        {"type": "reaction", "postId": str(post.id), "fromUsername": current_user.username},
                    )
        except Exception as e:
            logger.warning("Failed to send reaction notification: %s", e)

    return ToggleReactionResponse(
        reaction_fire=post.reaction_fire,
        reaction_fist=post.reaction_fist,
        reaction_party=post.reaction_party,
        reaction_heart=post.reaction_heart,
        user_reaction=user_reaction,
    )


@router.get("/user", response_model=list[UserReaction])
async def get_user_reactions(
    post_ids: str = Query(..., description="Comma-separated post IDs"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_verified_user),
):
    try:
        ids = [uuid.UUID(pid.strip()) for pid in post_ids.split(",") if pid.strip()]
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid post ID format")

    if not ids:
        return []

    result = await db.execute(
        select(Reaction).where(
            Reaction.user_id_who_reacted == current_user.id,
            Reaction.post_id.in_(ids),
        )
    )
    reactions = result.scalars().all()
    return [UserReaction(post_id=r.post_id, react_emoji=r.react_emoji) for r in reactions]


@router.get("/post/{post_id}", response_model=list[UserReaction])
async def get_post_reactions(
    post_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_verified_user),
):
    result = await db.execute(
        select(Reaction).where(
            Reaction.post_id == post_id,
            Reaction.user_id_who_reacted == current_user.id,
        )
    )
    reactions = result.scalars().all()
    return [UserReaction(post_id=r.post_id, react_emoji=r.react_emoji) for r in reactions]
