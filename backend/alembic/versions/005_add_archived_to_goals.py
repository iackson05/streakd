"""add archived to goals

Revision ID: 005
Revises: 004
Create Date: 2026-03-17
"""
from alembic import op
import sqlalchemy as sa

revision = '005'
down_revision = '004'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('goals', sa.Column('archived', sa.Boolean(), nullable=False, server_default='false'))


def downgrade() -> None:
    op.drop_column('goals', 'archived')
