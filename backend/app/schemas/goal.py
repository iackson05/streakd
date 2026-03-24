import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class GoalCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    description: str | None = Field(None, max_length=1000)
    privacy: Literal["friends", "private"] = "friends"
    streak_interval: int | None = None


class GoalResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    title: str
    description: str | None
    completed: bool
    archived: bool
    privacy: str
    streak_count: int
    streak_interval: int | None
    last_posted_at: datetime | None
    created_at: datetime

    model_config = {"from_attributes": True}
