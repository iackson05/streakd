import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class PostCreate(BaseModel):
    goal_id: uuid.UUID
    caption: str | None = Field(None, max_length=1000)


class PostResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    goal_id: uuid.UUID
    image_url: str | None
    caption: str | None
    created_at: datetime
    reaction_fire: int
    reaction_fist: int
    reaction_party: int
    reaction_heart: int
    # Joined fields
    username: str | None = None
    profile_picture_url: str | None = None
    goal_title: str | None = None
    goal_privacy: str | None = None
    streak_count: int | None = None
    post_user_is_subscribed: bool = False

    model_config = {"from_attributes": True}
