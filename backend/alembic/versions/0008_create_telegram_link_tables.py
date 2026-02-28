"""Create telegram link tables.

Revision ID: 0008_create_telegram_link_tables
Revises: 0007_add_phone_number_to_user
Create Date: 2026-02-28
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "0008_create_telegram_link_tables"
down_revision: Union[str, None] = "0007_add_phone_number_to_user"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    if "telegram_link" not in inspector.get_table_names():
        op.create_table(
            "telegram_link",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("created_at", sa.DateTime(), nullable=False),
            sa.Column("user_id", sa.Integer(), nullable=False),
            sa.Column("telegram_user_id", sa.String(length=64), nullable=True),
            sa.Column("telegram_chat_id", sa.String(length=64), nullable=False),
            sa.Column("chat_type", sa.String(length=24), nullable=False),
            sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
            sa.ForeignKeyConstraint(["user_id"], ["user.id"]),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("user_id", name="uq_telegram_link_user_id"),
            sa.UniqueConstraint("telegram_chat_id", name="uq_telegram_link_chat_id"),
        )
        op.create_index("ix_telegram_link_user_id", "telegram_link", ["user_id"], unique=False)
        op.create_index("ix_telegram_link_telegram_user_id", "telegram_link", ["telegram_user_id"], unique=False)
        op.create_index("ix_telegram_link_telegram_chat_id", "telegram_link", ["telegram_chat_id"], unique=False)

    if "telegram_link_code" not in inspector.get_table_names():
        op.create_table(
            "telegram_link_code",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("created_at", sa.DateTime(), nullable=False),
            sa.Column("user_id", sa.Integer(), nullable=False),
            sa.Column("code_hash", sa.String(length=64), nullable=False),
            sa.Column("expires_at", sa.DateTime(), nullable=False),
            sa.Column("consumed_at", sa.DateTime(), nullable=True),
            sa.ForeignKeyConstraint(["user_id"], ["user.id"]),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("code_hash", name="uq_telegram_link_code_hash"),
        )
        op.create_index("ix_telegram_link_code_user_id", "telegram_link_code", ["user_id"], unique=False)
        op.create_index("ix_telegram_link_code_code_hash", "telegram_link_code", ["code_hash"], unique=False)
        op.create_index("ix_telegram_link_code_expires_at", "telegram_link_code", ["expires_at"], unique=False)


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    if "telegram_link_code" in inspector.get_table_names():
        op.drop_index("ix_telegram_link_code_expires_at", table_name="telegram_link_code")
        op.drop_index("ix_telegram_link_code_code_hash", table_name="telegram_link_code")
        op.drop_index("ix_telegram_link_code_user_id", table_name="telegram_link_code")
        op.drop_table("telegram_link_code")

    if "telegram_link" in inspector.get_table_names():
        op.drop_index("ix_telegram_link_telegram_chat_id", table_name="telegram_link")
        op.drop_index("ix_telegram_link_telegram_user_id", table_name="telegram_link")
        op.drop_index("ix_telegram_link_user_id", table_name="telegram_link")
        op.drop_table("telegram_link")
