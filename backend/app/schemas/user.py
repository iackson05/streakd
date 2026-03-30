import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class UserProfile(BaseModel):
    id: uuid.UUID
    username: str
    name: str | None = None
    email: str
    profile_picture_url: str | None
    created_at: datetime
    friend_count: int = 0
    post_count: int = 0
    completed_goals_count: int = 0
    is_subscribed: bool = False

    model_config = {"from_attributes": True}


class SubscriptionStatusUpdate(BaseModel):
    is_subscribed: bool


class UsernameUpdate(BaseModel):
    username: str = Field(..., min_length=3, max_length=50, pattern=r'^[a-zA-Z0-9_]+$')


class NameUpdate(BaseModel):
    name: str = Field(..., max_length=100)


class NotificationSettingsSchema(BaseModel):
    friend_requests: bool = False
    reactions: bool = False
    streak_reminders: bool = False

    model_config = {"from_attributes": True}


class PushTokenUpdate(BaseModel):
    push_token: str = Field(..., min_length=1, max_length=500)
