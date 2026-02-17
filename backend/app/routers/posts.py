import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy import select, or_, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.models.goal import Goal
from app.models.post import Post
from app.models.friendship import Friendship
from app.schemas.post import PostResponse
from app.services.storage import upload_file, delete_file

router = APIRouter(prefix="/posts", tags=["posts"])


def _post_to_response(post: Post, user: User, goal: Goal) -> PostResponse:
    return PostResponse(
        id=post.id,
        user_id=post.user_id,
        goal_id=post.goal_id,
        image_url=post.image_url,
        caption=post.caption,
        created_at=post.created_at,
        reaction_fire=post.reaction_fire,
        reaction_fist=post.reaction_fist,
        reaction_party=post.reaction_party,
        reaction_heart=post.reaction_heart,
        username=user.username if user else None,
        profile_picture_url=user.profile_picture_url if user else None,
        goal_title=goal.title if goal else None,
        goal_privacy=goal.privacy if goal else None,
        streak_count=goal.streak_count if goal else None,
    )


@router.get("/feed", response_model=list[PostResponse])
async def get_feed_posts(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Get accepted friend IDs
    friend_result = await db.execute(
        select(Friendship).where(
            Friendship.status == "accepted",
            or_(
                Friendship.user_id == current_user.id,
                Friendship.friend_id == current_user.id,
            ),
        )
    )
    friendships = friend_result.scalars().all()
    friend_ids = set()
    for f in friendships:
        if f.user_id == current_user.id:
            friend_ids.add(f.friend_id)
        else:
            friend_ids.add(f.user_id)

    # Include self
    all_ids = list(friend_ids | {current_user.id})

    # Posts from last 24 hours
    since = datetime.now(timezone.utc) - timedelta(hours=24)
    posts_result = await db.execute(
        select(Post, User, Goal)
        .join(User, Post.user_id == User.id)
        .join(Goal, Post.goal_id == Goal.id)
        .where(Post.user_id.in_(all_ids), Post.created_at >= since)
        .order_by(Post.created_at.desc())
    )
    rows = posts_result.all()

    # Filter out private goals from friends (show all own posts)
    result = []
    for post, user, goal in rows:
        if post.user_id == current_user.id or goal.privacy != "private":
            result.append(_post_to_response(post, user, goal))

    return result


@router.get("/goal/{goal_id}", response_model=list[PostResponse])
async def get_goal_posts(
    goal_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Post, User, Goal)
        .join(User, Post.user_id == User.id)
        .join(Goal, Post.goal_id == Goal.id)
        .where(Post.goal_id == goal_id)
        .order_by(Post.created_at.desc())
    )
    return [_post_to_response(post, user, goal) for post, user, goal in result.all()]


@router.post("/", response_model=PostResponse, status_code=status.HTTP_201_CREATED)
async def create_post(
    goal_id: uuid.UUID = Form(...),
    caption: str | None = Form(None),
    image: UploadFile | None = File(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Verify goal ownership
    goal_result = await db.execute(
        select(Goal).where(Goal.id == goal_id, Goal.user_id == current_user.id)
    )
    goal = goal_result.scalar_one_or_none()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")

    image_url = None
    if image:
        contents = await image.read()
        image_url = await upload_file(contents, image.content_type or "image/jpeg", folder="posts")

    post = Post(
        user_id=current_user.id,
        goal_id=goal_id,
        image_url=image_url,
        caption=caption,
    )
    db.add(post)
    await db.commit()
    await db.refresh(post)

    return _post_to_response(post, current_user, goal)


@router.delete("/{post_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_post(
    post_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Post).where(Post.id == post_id, Post.user_id == current_user.id)
    )
    post = result.scalar_one_or_none()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    image_url = post.image_url
    await db.delete(post)
    await db.commit()

    if image_url:
        await delete_file(image_url)
