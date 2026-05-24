import secrets
import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select, func, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.limiter import limiter
from app.models.user import User
from app.models.notification import NotificationSettings
from app.models.verification_code import VerificationCode
from app.schemas.auth import (
    SignUpRequest, LoginRequest, RefreshRequest, TokenResponse,
    VerifyEmailRequest, ForgotPasswordRequest, ResetPasswordRequest,
)
from app.schemas.user import UserProfile
from app.services.auth import hash_password, verify_password, create_access_token, create_refresh_token, decode_token
from app.services.email import send_verification_email, send_password_reset_email

router = APIRouter(prefix="/auth", tags=["auth"])

VERIFICATION_CODE_EXPIRY_MINUTES = 10


def _generate_code() -> str:
    return f"{secrets.randbelow(1000000):06d}"


async def _create_verification_code(db: AsyncSession, user_id: uuid.UUID, code_type: str) -> str:
    await db.execute(
        delete(VerificationCode).where(
            VerificationCode.user_id == user_id,
            VerificationCode.type == code_type,
        )
    )
    code = _generate_code()
    db.add(VerificationCode(
        user_id=user_id,
        code=code,
        type=code_type,
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=VERIFICATION_CODE_EXPIRY_MINUTES),
    ))
    await db.flush()
    return code


@router.post("/signup", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("5/hour")
async def signup(request: Request, body: SignUpRequest, db: AsyncSession = Depends(get_db)):
    email = body.email.strip().lower()
    username = body.username.strip()

    result = await db.execute(select(User).where(func.lower(User.email) == email))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")

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

    notif = NotificationSettings(user_id=user.id)
    db.add(notif)

    code = await _create_verification_code(db, user.id, "email_verification")
    await db.commit()

    send_verification_email(email, code)

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
        email_verified=current_user.email_verified,
    )


@router.post("/verify-email", status_code=status.HTTP_200_OK)
@limiter.limit("10/hour")
async def verify_email(
    request: Request,
    body: VerifyEmailRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if current_user.email_verified:
        return {"detail": "Email already verified"}

    result = await db.execute(
        select(VerificationCode).where(
            VerificationCode.user_id == current_user.id,
            VerificationCode.type == "email_verification",
            VerificationCode.used == False,
            VerificationCode.expires_at > datetime.now(timezone.utc),
        )
    )
    vc = result.scalar_one_or_none()

    if vc is None or vc.code != body.code:
        raise HTTPException(status_code=400, detail="Invalid or expired verification code")

    vc.used = True
    current_user.email_verified = True
    await db.commit()

    return {"detail": "Email verified successfully"}


@router.post("/resend-verification", status_code=status.HTTP_200_OK)
@limiter.limit("3/hour")
async def resend_verification(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if current_user.email_verified:
        return {"detail": "Email already verified"}

    code = await _create_verification_code(db, current_user.id, "email_verification")
    await db.commit()

    sent = send_verification_email(current_user.email, code)
    if not sent:
        raise HTTPException(status_code=500, detail="Failed to send verification email")

    return {"detail": "Verification code sent"}


@router.post("/forgot-password", status_code=status.HTTP_200_OK)
@limiter.limit("5/hour")
async def forgot_password(
    request: Request,
    body: ForgotPasswordRequest,
    db: AsyncSession = Depends(get_db),
):
    email = body.email.strip().lower()
    result = await db.execute(select(User).where(func.lower(User.email) == email))
    user = result.scalar_one_or_none()

    if user:
        code = await _create_verification_code(db, user.id, "password_reset")
        await db.commit()
        send_password_reset_email(email, code)

    return {"detail": "If an account with that email exists, a reset code has been sent"}


@router.post("/reset-password", status_code=status.HTTP_200_OK)
@limiter.limit("5/hour")
async def reset_password(
    request: Request,
    body: ResetPasswordRequest,
    db: AsyncSession = Depends(get_db),
):
    email = body.email.strip().lower()
    result = await db.execute(select(User).where(func.lower(User.email) == email))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=400, detail="Invalid or expired reset code")

    result = await db.execute(
        select(VerificationCode).where(
            VerificationCode.user_id == user.id,
            VerificationCode.type == "password_reset",
            VerificationCode.used == False,
            VerificationCode.expires_at > datetime.now(timezone.utc),
        )
    )
    vc = result.scalar_one_or_none()

    if vc is None or vc.code != body.code:
        raise HTTPException(status_code=400, detail="Invalid or expired reset code")

    vc.used = True
    user.password_hash = hash_password(body.new_password)
    await db.commit()

    return {"detail": "Password reset successfully"}
