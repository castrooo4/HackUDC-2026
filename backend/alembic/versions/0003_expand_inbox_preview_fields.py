"""Expand inboxitem with preview fields and item type.

Revision ID: 0003_expand_inbox_preview_fields
Revises: 0002_add_title_to_inboxitem
Create Date: 2026-02-27
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "0003_expand_inbox_preview_fields"
down_revision: Union[str, None] = "0002_add_title_to_inboxitem"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _add_column_if_missing(table_name: str, column: sa.Column) -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    column_names = {col["name"] for col in inspector.get_columns(table_name)}
    if column.name not in column_names:
        with op.batch_alter_table(table_name) as batch_op:
            batch_op.add_column(column)


def _drop_column_if_exists(table_name: str, column_name: str) -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    column_names = {col["name"] for col in inspector.get_columns(table_name)}
    if column_name in column_names:
        with op.batch_alter_table(table_name) as batch_op:
            batch_op.drop_column(column_name)


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if "inboxitem" not in inspector.get_table_names():
        return

    _add_column_if_missing(
        "inboxitem",
        sa.Column("item_type", sa.String(length=20), nullable=False, server_default="TEXT"),
    )
    _add_column_if_missing("inboxitem", sa.Column("url", sa.String(), nullable=True))
    _add_column_if_missing("inboxitem", sa.Column("preview_base64", sa.Text(), nullable=True))
    _add_column_if_missing("inboxitem", sa.Column("favicon_base64", sa.Text(), nullable=True))
    _add_column_if_missing("inboxitem", sa.Column("mime_type", sa.String(length=120), nullable=True))
    _add_column_if_missing("inboxitem", sa.Column("metadata_json", sa.JSON(), nullable=True))


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if "inboxitem" not in inspector.get_table_names():
        return

    _drop_column_if_exists("inboxitem", "metadata_json")
    _drop_column_if_exists("inboxitem", "mime_type")
    _drop_column_if_exists("inboxitem", "favicon_base64")
    _drop_column_if_exists("inboxitem", "preview_base64")
    _drop_column_if_exists("inboxitem", "url")
    _drop_column_if_exists("inboxitem", "item_type")
