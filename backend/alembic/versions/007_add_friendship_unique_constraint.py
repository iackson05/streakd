"""add unique constraint on friendships (user_id, friend_id)

Revision ID: 007
Revises: 006
Create Date: 2026-03-19
"""
from alembic import op

revision = '007'
down_revision = '006'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_unique_constraint('uq_friendship_user_friend', 'friendships', ['user_id', 'friend_id'])


def downgrade() -> None:
    op.drop_constraint('uq_friendship_user_friend', 'friendships', type_='unique')
