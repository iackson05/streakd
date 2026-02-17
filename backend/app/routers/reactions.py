import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.models.post import Post
from app.models.reaction import Reaction
from app.schemas.reaction import ToggleReactionRequest, ToggleReactionResponse, UserReaction
from app.services.auth import EMOJI_TO_COLUMN

router = APIRouter(prefix="/reactions", tags=["reactions"])


@router.post("/toggle", response_model=ToggleReactionResponse)
async def toggle_reaction(
    body: ToggleReactionRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
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

    # Check if user already reacted
    existing_result = await db.execute(
        select(Reaction).where(
            Reaction.post_id == body.post_id,
            Reaction.user_id_who_reacted == current_user.id,
        )
    )
    existing = existing_result.scalar_one_or_none()

    user_reaction = None

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

    await db.commit()
    await db.refresh(post)

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
    current_user: User = Depends(get_current_user),
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
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Reaction).where(
            Reaction.post_id == post_id,
            Reaction.user_id_who_reacted == current_user.id,
        )
    )
    reactions = result.scalars().all()
    return [UserReaction(post_id=r.post_id, react_emoji=r.react_emoji) for r in reactions]
