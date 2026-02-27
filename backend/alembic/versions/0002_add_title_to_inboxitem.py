"""Add nullable title column to inboxitem.

Revision ID: 0002_add_title_to_inboxitem
Revises: 0001_inbox_item_without_title
Create Date: 2026-02-27
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "0002_add_title_to_inboxitem"
down_revision: Union[str, None] = "0001_inbox_item_without_title"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    if "inboxitem" not in inspector.get_table_names():
        return

    column_names = {column["name"] for column in inspector.get_columns("inboxitem")}
    if "title" not in column_names:
        with op.batch_alter_table("inboxitem") as batch_op:
            batch_op.add_column(sa.Column("title", sa.String(length=120), nullable=True))


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    if "inboxitem" not in inspector.get_table_names():
        return

    column_names = {column["name"] for column in inspector.get_columns("inboxitem")}
    if "title" in column_names:
        with op.batch_alter_table("inboxitem") as batch_op:
            batch_op.drop_column("title")
