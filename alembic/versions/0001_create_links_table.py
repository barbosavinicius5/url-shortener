"""create links table

Revision ID: 0001
Revises:
Create Date: 2025-01-15
"""

import sqlalchemy as sa

from alembic import op

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "links",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("short_code", sa.String(length=20), nullable=False),
        sa.Column("original_url", sa.String(length=2048), nullable=False),
        sa.Column("is_permanent", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("click_count", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("short_code"),
    )
    op.create_index("ix_links_short_code", "links", ["short_code"])


def downgrade() -> None:
    op.drop_index("ix_links_short_code", table_name="links")
    op.drop_table("links")
