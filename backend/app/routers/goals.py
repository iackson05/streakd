import logging
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, func, or_, and_
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)

from app.database import get_db
from app.dependencies import get_verified_user
from app.models.user import User
from app.models.goal import Goal
from app.models.post import Post
from app.models.friendship import Friendship
from app.models.block import Block
from app.schemas.goal import GoalCreate, GoalResponse
from app.services.storage import delete_file
from app.services.revenuecat import is_subscribed

router = APIRouter(prefix="/goals", tags=["goals"])

MAX_ACTIVE_GOALS_FREE = 2


@router.get("/", response_model=list[GoalResponse])
async def get_user_goals(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_verified_user),
):
    result = await db.execute(
        select(Goal).where(Goal.user_id == current_user.id).order_by(Goal.created_at.desc())
    )
    return result.scalars().all()


@router.get("/active", response_model=list[GoalResponse])
async def get_active_goals(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_verified_user),
):
    result = await db.execute(
        select(Goal)
        .where(Goal.user_id == current_user.id, Goal.completed == False)
        .order_by(Goal.created_at.desc())
    )
    return result.scalars().all()


@router.post("/", response_model=GoalResponse, status_code=status.HTTP_201_CREATED)
async def create_goal(
    body: GoalCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_verified_user),
):
    # Enforce active goals limit for free users (use COUNT query + FOR UPDATE to prevent race conditions)
    if not current_user.is_subscribed:
        # Lock the user's active goal rows to prevent race conditions
        active_goals_result = await db.execute(
            select(Goal.id)
            .where(
                Goal.user_id == current_user.id,
                Goal.completed == False,
                Goal.archived == False,
            )
            .with_for_update()
        )
        active_count = len(active_goals_result.all())
        if active_count >= MAX_ACTIVE_GOALS_FREE:
            raise HTTPException(
                status_code=403,
                detail=f"Free users can have at most {MAX_ACTIVE_GOALS_FREE} active goals. Upgrade to Streakd+ for unlimited goals.",
            )

    goal = Goal(user_id=current_user.id, **body.model_dump())
    db.add(goal)
    await db.commit()
    await db.refresh(goal)
    return goal


@router.delete("/{goal_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_goal(
    goal_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_verified_user),
):
    result = await db.execute(select(Goal).where(Goal.id == goal_id, Goal.user_id == current_user.id))
    goal = result.scalar_one_or_none()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")

    # Get post image URLs for R2 cleanup
    posts_result = await db.execute(select(Post.image_url).where(Post.goal_id == goal_id))
    image_urls = [row[0] for row in posts_result.all() if row[0]]

    # Clean up R2 images first (orphaned files are worse than orphaned DB rows)
    for url in image_urls:
        try:
            await delete_file(url)
        except Exception as e:
            logger.error(f"Failed to delete R2 file {url} during goal cleanup: {e}")

    # Delete from DB (cascade deletes posts and reactions)
    await db.delete(goal)
    await db.commit()


@router.put("/{goal_id}/complete", response_model=GoalResponse)
async def complete_goal(
    goal_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_verified_user),
):
    result = await db.execute(select(Goal).where(Goal.id == goal_id, Goal.user_id == current_user.id))
    goal = result.scalar_one_or_none()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")

    # Free users: delete posts and R2 images to save storage
    if not current_user.is_subscribed:
        posts_result = await db.execute(select(Post).where(Post.goal_id == goal_id))
        posts = posts_result.scalars().all()
        for post in posts:
            if post.image_url:
                try:
                    await delete_file(post.image_url)
                except Exception as e:
                    logger.error(f"Failed to delete R2 file {post.image_url} during goal complete: {e}")
            await db.delete(post)

    goal.completed = True
    await db.commit()
    await db.refresh(goal)
    return goal


@router.put("/{goal_id}/archive", response_model=GoalResponse)
async def archive_goal(
    goal_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_verified_user),
):
    """
    Streakd+ only: mark a goal as archived (completed + preserved).
    The goal and all its posts remain visible in the user's Archived section.
    """
    subscribed = await is_subscribed(str(current_user.id))
    if not subscribed:
        raise HTTPException(
            status_code=403,
            detail="Archiving goals requires a Streakd+ subscription."
        )

    result = await db.execute(select(Goal).where(Goal.id == goal_id, Goal.user_id == current_user.id))
    goal = result.scalar_one_or_none()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")

    goal.completed = True
    goal.archived = True
    await db.commit()
    await db.refresh(goal)
    return goal


@router.put("/{goal_id}/streak", response_model=GoalResponse)
async def increment_streak(
    goal_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_verified_user),
):
    """Increment a goal's streak. Requires:
      - Goal ownership (verified)
      - At least one post on this goal that's newer than `last_posted_at`
        (prevents replaying the endpoint to inflate the streak without posting).

    The frontend calls this right after creating a post; this guard ensures
    the call corresponds to a real post.
    """
    from datetime import datetime, timezone

    result = await db.execute(
        select(Goal).where(Goal.id == goal_id, Goal.user_id == current_user.id).with_for_update()
    )
    goal = result.scalar_one_or_none()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")

    # Find the most recent post on this goal — must exist and be newer than last_posted_at
    latest_post_result = await db.execute(
        select(Post.created_at)
        .where(Post.goal_id == goal_id, Post.user_id == current_user.id)
        .order_by(Post.created_at.desc())
        .limit(1)
    )
    latest_post_at = latest_post_result.scalar_one_or_none()
    if latest_post_at is None:
        raise HTTPException(status_code=400, detail="No posts on this goal yet")

    # Normalize to aware UTC for comparison
    if latest_post_at.tzinfo is None:
        latest_post_at = latest_post_at.replace(tzinfo=timezone.utc)

    last_posted_at = goal.last_posted_at
    if last_posted_at is not None and last_posted_at.tzinfo is None:
        last_posted_at = last_posted_at.replace(tzinfo=timezone.utc)

    if last_posted_at is not None and latest_post_at <= last_posted_at:
        # Already counted this post toward the streak — no-op success
        return goal

    goal.streak_count += 1
    goal.last_posted_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(goal)
    return goal


@router.get("/user/{user_id}", response_model=list[GoalResponse])
async def get_user_goals_public(
    user_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_verified_user),
):
    """Get a friend's non-private, non-completed goals."""
    # Block check (either direction) — return 404 to avoid leaking the block
    block_check = await db.execute(
        select(Block).where(
            or_(
                and_(Block.blocker_id == current_user.id, Block.blocked_id == user_id),
                and_(Block.blocker_id == user_id, Block.blocked_id == current_user.id),
            )
        )
    )
    if block_check.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="User not found")

    # Verify friendship exists
    friend_check = await db.execute(
        select(Friendship).where(
            Friendship.status == "accepted",
            or_(
                and_(Friendship.user_id == current_user.id, Friendship.friend_id == user_id),
                and_(Friendship.user_id == user_id, Friendship.friend_id == current_user.id),
            ),
        )
    )
    if not friend_check.scalar_one_or_none():
        raise HTTPException(status_code=403, detail="You must be friends to view their goals")

    result = await db.execute(
        select(Goal)
        .where(
            Goal.user_id == user_id,
            Goal.privacy != "private",
            Goal.completed == False,
        )
        .order_by(Goal.created_at.desc())
    )
    return result.scalars().all()
