import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class BlockCreate(BaseModel):
    blocked_id: uuid.UUID


class BlockResponse(BaseModel):
    id: uuid.UUID
    blocker_id: uuid.UUID
    blocked_id: uuid.UUID
    created_at: datetime

    model_config = {"from_attributes": True}


class ReportCreate(BaseModel):
    reported_user_id: uuid.UUID
    post_id: uuid.UUID | None = None
    reason: str = Field(..., pattern=r'^(inappropriate|spam|harassment|other)$')
    details: str | None = Field(None, max_length=1000)


class ReportResponse(BaseModel):
    id: uuid.UUID
    message: str = "Report submitted successfully"
