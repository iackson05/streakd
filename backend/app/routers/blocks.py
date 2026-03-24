import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, or_, and_, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.models.block import Block
from app.models.report import Report
from app.models.friendship import Friendship
from app.schemas.block import BlockCreate, BlockResponse, ReportCreate, ReportResponse

router = APIRouter(prefix="/blocks", tags=["blocks"])


@router.post("/", response_model=BlockResponse, status_code=status.HTTP_201_CREATED)
async def block_user(
    body: BlockCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if body.blocked_id == current_user.id:
        raise HTTPException(status_code=400, detail="You cannot block yourself")

    # Check if already blocked
    existing = await db.execute(
        select(Block).where(
            Block.blocker_id == current_user.id,
            Block.blocked_id == body.blocked_id,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="User already blocked")

    # Create block record
    block = Block(blocker_id=current_user.id, blocked_id=body.blocked_id)
    db.add(block)

    # Remove any existing friendship between the two users
    await db.execute(
        delete(Friendship).where(
            or_(
                and_(Friendship.user_id == current_user.id, Friendship.friend_id == body.blocked_id),
                and_(Friendship.user_id == body.blocked_id, Friendship.friend_id == current_user.id),
            )
        )
    )

    await db.commit()
    await db.refresh(block)
    return block


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def unblock_user(
    user_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Block).where(
            Block.blocker_id == current_user.id,
            Block.blocked_id == user_id,
        )
    )
    block = result.scalar_one_or_none()
    if not block:
        raise HTTPException(status_code=404, detail="Block not found")

    await db.delete(block)
    await db.commit()


@router.get("/")
async def list_blocked_users(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Block, User)
        .join(User, Block.blocked_id == User.id)
        .where(Block.blocker_id == current_user.id)
    )
    rows = result.all()
    return [
        {
            "id": user.id,
            "username": user.username,
            "profile_picture_url": user.profile_picture_url,
        }
        for block, user in rows
    ]


@router.post("/report", response_model=ReportResponse, status_code=status.HTTP_201_CREATED)
async def report_user(
    body: ReportCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if body.reported_user_id == current_user.id:
        raise HTTPException(status_code=400, detail="You cannot report yourself")

    report = Report(
        reporter_id=current_user.id,
        reported_user_id=body.reported_user_id,
        post_id=body.post_id,
        reason=body.reason,
        details=body.details,
    )
    db.add(report)
    await db.commit()
    await db.refresh(report)
    return ReportResponse(id=report.id)
