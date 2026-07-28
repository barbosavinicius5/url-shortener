"""create short_urls table

Revision ID: 0001
Revises:
Create Date: 2024-07-28
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0001"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "short_urls",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("long_url", sa.String(), nullable=False),
        sa.Column("short_code", sa.String(length=20), nullable=False),
        sa.Column("click_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("project_id", sa.String(), nullable=False, server_default=""),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("short_code"),
    )
    op.create_index(op.f("ix_short_urls_short_code"), "short_urls", ["short_code"], unique=True)


def downgrade() -> None:
    op.drop_index(op.f("ix_short_urls_short_code"), table_name="short_urls")
    op.drop_table("short_urls")
