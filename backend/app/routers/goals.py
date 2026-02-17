import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.models.goal import Goal
from app.models.post import Post
from app.schemas.goal import GoalCreate, GoalResponse
from app.services.storage import delete_file

router = APIRouter(prefix="/goals", tags=["goals"])

MAX_ACTIVE_GOALS = 3


@router.get("/", response_model=list[GoalResponse])
async def get_user_goals(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Goal).where(Goal.user_id == current_user.id).order_by(Goal.created_at.desc())
    )
    return result.scalars().all()


@router.get("/active", response_model=list[GoalResponse])
async def get_active_goals(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
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
    current_user: User = Depends(get_current_user),
):
    # Check active goal limit
    result = await db.execute(
        select(func.count()).select_from(Goal).where(
            Goal.user_id == current_user.id, Goal.completed == False
        )
    )
    count = result.scalar() or 0
    if count >= MAX_ACTIVE_GOALS:
        raise HTTPException(status_code=400, detail=f"Maximum {MAX_ACTIVE_GOALS} active goals allowed")

    goal = Goal(user_id=current_user.id, **body.model_dump())
    db.add(goal)
    await db.commit()
    await db.refresh(goal)
    return goal


@router.delete("/{goal_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_goal(
    goal_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Goal).where(Goal.id == goal_id, Goal.user_id == current_user.id))
    goal = result.scalar_one_or_none()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")

    # Get post image URLs for R2 cleanup
    posts_result = await db.execute(select(Post.image_url).where(Post.goal_id == goal_id))
    image_urls = [row[0] for row in posts_result.all() if row[0]]

    # Delete from DB (cascade deletes posts and reactions)
    await db.delete(goal)
    await db.commit()

    # Clean up R2 images
    for url in image_urls:
        await delete_file(url)


@router.put("/{goal_id}/complete", response_model=GoalResponse)
async def complete_goal(
    goal_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Goal).where(Goal.id == goal_id, Goal.user_id == current_user.id))
    goal = result.scalar_one_or_none()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")

    goal.completed = True
    await db.commit()
    await db.refresh(goal)
    return goal


@router.put("/{goal_id}/streak", response_model=GoalResponse)
async def increment_streak(
    goal_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Goal).where(Goal.id == goal_id, Goal.user_id == current_user.id))
    goal = result.scalar_one_or_none()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")

    goal.streak_count += 1
    from datetime import datetime, timezone
    goal.last_posted_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(goal)
    return goal
