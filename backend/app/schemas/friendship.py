import uuid
from datetime import datetime

from pydantic import BaseModel


class FriendRequestCreate(BaseModel):
    friend_id: uuid.UUID


class FriendshipResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    friend_id: uuid.UUID
    status: str
    created_at: datetime
    # Joined user info
    friend_username: str | None = None
    friend_profile_picture_url: str | None = None

    model_config = {"from_attributes": True}


class FriendAccept(BaseModel):
    friendship_id: uuid.UUID


class FriendReject(BaseModel):
    friendship_id: uuid.UUID
