import uuid
from datetime import datetime

from pydantic import BaseModel


class GoalCreate(BaseModel):
    title: str
    description: str | None = None
    privacy: str = "public"
    streak_interval: int | None = None


class GoalResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    title: str
    description: str | None
    completed: bool
    privacy: str
    streak_count: int
    streak_interval: int | None
    last_posted_at: datetime | None
    created_at: datetime

    model_config = {"from_attributes": True}
