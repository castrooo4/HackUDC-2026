"""Create inbox_item table and remove legacy title column.

Revision ID: 0001_inbox_item_without_title
Revises:
Create Date: 2026-02-27
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "0001_inbox_item_without_title"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    if "inboxitem" not in inspector.get_table_names():
        op.create_table(
            "inboxitem",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("created_at", sa.DateTime(), nullable=False),
            sa.Column("source", sa.String(), nullable=False),
            sa.Column("content", sa.String(), nullable=False),
            sa.Column("status", sa.String(length=7), nullable=False),
            sa.PrimaryKeyConstraint("id"),
        )
        return

    column_names = {column["name"] for column in inspector.get_columns("inboxitem")}
    if "title" in column_names:
        with op.batch_alter_table("inboxitem") as batch_op:
            batch_op.drop_column("title")


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    if "inboxitem" not in inspector.get_table_names():
        return

    column_names = {column["name"] for column in inspector.get_columns("inboxitem")}
    if "title" not in column_names:
        with op.batch_alter_table("inboxitem") as batch_op:
            batch_op.add_column(sa.Column("title", sa.String(length=120), nullable=True))
