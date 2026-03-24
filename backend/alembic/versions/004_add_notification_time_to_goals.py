"""add notification_time to goals

Revision ID: 004
Revises: 003
Create Date: 2026-02-19

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "004"
down_revision: Union[str, None] = "003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("goals", sa.Column("notification_time", sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    op.drop_column("goals", "notification_time")
