"""Add user_id ownership to inboxitem.

Revision ID: 0005_add_user_id_to_inboxitem
Revises: 0004_create_user_table
Create Date: 2026-02-28
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "0005_add_user_id_to_inboxitem"
down_revision: Union[str, None] = "0004_create_user_table"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    if "inboxitem" not in inspector.get_table_names():
        return

    column_names = {column["name"] for column in inspector.get_columns("inboxitem")}
    if "user_id" not in column_names:
        with op.batch_alter_table("inboxitem") as batch_op:
            batch_op.add_column(sa.Column("user_id", sa.Integer(), nullable=True))
            batch_op.create_index("ix_inboxitem_user_id", ["user_id"], unique=False)


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if "inboxitem" not in inspector.get_table_names():
        return

    column_names = {column["name"] for column in inspector.get_columns("inboxitem")}
    if "user_id" in column_names:
        with op.batch_alter_table("inboxitem") as batch_op:
            batch_op.drop_index("ix_inboxitem_user_id")
            batch_op.drop_column("user_id")
