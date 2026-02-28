"""Add automation fields on inboxitem and text merge history table.

Revision ID: 0012_inbox_automation_fields_and_merge_history
Revises: 0011_add_data_location_to_user
Create Date: 2026-02-28 23:50:00
"""

from typing import Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0012_inbox_automation_fields_and_merge_history"
down_revision: Union[str, None] = "0011_add_data_location_to_user"
branch_labels = None
depends_on = None


def _column_names(table_name: str) -> set[str]:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    return {column["name"] for column in inspector.get_columns(table_name)}


def _table_names() -> set[str]:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    return set(inspector.get_table_names())


def _index_names(table_name: str) -> set[str]:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    return {index["name"] for index in inspector.get_indexes(table_name)}


def upgrade() -> None:
    columns = _column_names("inboxitem")

    with op.batch_alter_table("inboxitem") as batch_op:
        if "content_hash" not in columns:
            batch_op.add_column(sa.Column("content_hash", sa.String(length=64), nullable=True))
        if "dedupe_key" not in columns:
            batch_op.add_column(sa.Column("dedupe_key", sa.String(length=200), nullable=True))
        if "save_count" not in columns:
            batch_op.add_column(sa.Column("save_count", sa.Integer(), nullable=False, server_default="1"))
        if "processing_attempts" not in columns:
            batch_op.add_column(sa.Column("processing_attempts", sa.Integer(), nullable=False, server_default="0"))
        if "last_processing_error" not in columns:
            batch_op.add_column(sa.Column("last_processing_error", sa.String(length=500), nullable=True))

    index_names = _index_names("inboxitem")
    if "ix_inboxitem_content_hash" not in index_names:
        op.create_index("ix_inboxitem_content_hash", "inboxitem", ["content_hash"], unique=False)
    if "ix_inboxitem_dedupe_key" not in index_names:
        op.create_index("ix_inboxitem_dedupe_key", "inboxitem", ["dedupe_key"], unique=False)

    if "textmergehistory" not in _table_names():
        op.create_table(
            "textmergehistory",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("created_at", sa.DateTime(), nullable=False),
            sa.Column("reverted_at", sa.DateTime(), nullable=True),
            sa.Column("user_id", sa.Integer(), nullable=False),
            sa.Column("source_item_id", sa.Integer(), nullable=False),
            sa.Column("target_item_id", sa.Integer(), nullable=False),
            sa.Column("preview_markdown", sa.String(), nullable=False),
            sa.Column("snapshot_target_title", sa.String(length=120), nullable=True),
            sa.Column("snapshot_target_content", sa.String(), nullable=False),
            sa.ForeignKeyConstraint(["source_item_id"], ["inboxitem.id"]),
            sa.ForeignKeyConstraint(["target_item_id"], ["inboxitem.id"]),
            sa.ForeignKeyConstraint(["user_id"], ["user.id"]),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index("ix_textmergehistory_user_id", "textmergehistory", ["user_id"], unique=False)
        op.create_index("ix_textmergehistory_source_item_id", "textmergehistory", ["source_item_id"], unique=False)
        op.create_index("ix_textmergehistory_target_item_id", "textmergehistory", ["target_item_id"], unique=False)


def downgrade() -> None:
    table_names = _table_names()
    if "textmergehistory" in table_names:
        op.drop_index("ix_textmergehistory_target_item_id", table_name="textmergehistory")
        op.drop_index("ix_textmergehistory_source_item_id", table_name="textmergehistory")
        op.drop_index("ix_textmergehistory_user_id", table_name="textmergehistory")
        op.drop_table("textmergehistory")

    index_names = _index_names("inboxitem")
    if "ix_inboxitem_dedupe_key" in index_names:
        op.drop_index("ix_inboxitem_dedupe_key", table_name="inboxitem")
    if "ix_inboxitem_content_hash" in index_names:
        op.drop_index("ix_inboxitem_content_hash", table_name="inboxitem")

    with op.batch_alter_table("inboxitem") as batch_op:
        batch_op.drop_column("last_processing_error")
        batch_op.drop_column("processing_attempts")
        batch_op.drop_column("save_count")
        batch_op.drop_column("dedupe_key")
        batch_op.drop_column("content_hash")
