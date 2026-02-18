"""add push_token and push_notifications_enabled to users

Revision ID: 002
Revises: 001
Create Date: 2026-02-15

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "002"
down_revision: Union[str, None] = "001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("push_notifications_enabled", sa.Boolean, server_default="false"))


def downgrade() -> None:
    op.drop_column("users", "push_notifications_enabled")
