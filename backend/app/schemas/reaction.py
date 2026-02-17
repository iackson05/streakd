import uuid

from pydantic import BaseModel


class ToggleReactionRequest(BaseModel):
    post_id: uuid.UUID
    react_emoji: str


class ToggleReactionResponse(BaseModel):
    reaction_fire: int
    reaction_fist: int
    reaction_party: int
    reaction_heart: int
    user_reaction: str | None


class UserReaction(BaseModel):
    post_id: uuid.UUID
    react_emoji: str

    model_config = {"from_attributes": True}
