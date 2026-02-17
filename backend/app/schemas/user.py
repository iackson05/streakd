import uuid
from datetime import datetime

from pydantic import BaseModel


class UserProfile(BaseModel):
    id: uuid.UUID
    username: str
    email: str
    profile_picture_url: str | None
    created_at: datetime
    friend_count: int = 0

    model_config = {"from_attributes": True}


class UsernameUpdate(BaseModel):
    username: str


class NotificationSettingsSchema(BaseModel):
    friend_requests: bool = True
    reactions: bool = True
    streak_reminders: bool = True

    model_config = {"from_attributes": True}


class PushTokenUpdate(BaseModel):
    push_token: str
