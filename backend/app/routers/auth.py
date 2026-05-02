import uuid

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.limiter import limiter
from app.models.user import User
from app.models.notification import NotificationSettings
from app.schemas.auth import SignUpRequest, LoginRequest, RefreshRequest, TokenResponse
from app.schemas.user import UserProfile, NameUpdate
from app.services.auth import hash_password, verify_password, create_access_token, create_refresh_token, decode_token

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/signup", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("5/hour")
async def signup(request: Request, body: SignUpRequest, db: AsyncSession = Depends(get_db)):
    # Normalize email and username before checking/storing
    email = body.email.strip().lower()
    username = body.username.strip()

    # Case-insensitive email check
    result = await db.execute(select(User).where(func.lower(User.email) == email))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")

    # Case-insensitive username check
    result = await db.execute(select(User).where(func.lower(User.username) == username.lower()))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Username already taken")

    user = User(
        id=uuid.uuid4(),
        email=email,
        username=username,
        name=body.name,
        password_hash=hash_password(body.password),
    )
    db.add(user)

    # Create default notification settings
    notif = NotificationSettings(user_id=user.id)
    db.add(notif)

    await db.commit()

    user_id_str = str(user.id)
    return TokenResponse(
        access_token=create_access_token(user_id_str),
        refresh_token=create_refresh_token(user_id_str),
    )


@router.post("/login", response_model=TokenResponse)
@limiter.limit("10/15minutes")
async def login(request: Request, body: LoginRequest, db: AsyncSession = Depends(get_db)):
    email = body.email.strip().lower()
    result = await db.execute(select(User).where(func.lower(User.email) == email))
    user = result.scalar_one_or_none()
    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    user_id_str = str(user.id)
    return TokenResponse(
        access_token=create_access_token(user_id_str),
        refresh_token=create_refresh_token(user_id_str),
    )


@router.post("/refresh", response_model=TokenResponse)
@limiter.limit("30/hour")
async def refresh(request: Request, body: RefreshRequest, db: AsyncSession = Depends(get_db)):
    payload = decode_token(body.refresh_token)
    if payload is None or payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    user_id_str = payload["sub"]
    # Verify user still exists
    result = await db.execute(select(User).where(User.id == uuid.UUID(user_id_str)))
    if result.scalar_one_or_none() is None:
        raise HTTPException(status_code=401, detail="User not found")

    return TokenResponse(
        access_token=create_access_token(user_id_str),
        refresh_token=create_refresh_token(user_id_str),
    )


@router.get("/me", response_model=UserProfile)
async def me(current_user: User = Depends(get_current_user)):
    return UserProfile(
        id=current_user.id,
        username=current_user.username,
        name=current_user.name,
        email=current_user.email,
        profile_picture_url=current_user.profile_picture_url,
        created_at=current_user.created_at,
        is_subscribed=current_user.is_subscribed,
    )
