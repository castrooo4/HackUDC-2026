"""Create directory table and link inbox items to directories.

Revision ID: 0006_create_directory_and_link_inbox
Revises: 0005_add_user_id_to_inboxitem
Create Date: 2026-02-28
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "0006_create_directory_and_link_inbox"
down_revision: Union[str, None] = "0005_add_user_id_to_inboxitem"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    if "directory" not in inspector.get_table_names():
        op.create_table(
            "directory",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("created_at", sa.DateTime(), nullable=False),
            sa.Column("user_id", sa.Integer(), nullable=False),
            sa.Column("name", sa.String(length=60), nullable=False),
            sa.Column("parent_id", sa.Integer(), nullable=True),
            sa.ForeignKeyConstraint(["parent_id"], ["directory.id"]),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index("ix_directory_user_id", "directory", ["user_id"], unique=False)
        op.create_index("ix_directory_parent_id", "directory", ["parent_id"], unique=False)

    if "inboxitem" in inspector.get_table_names():
        columns = {column["name"] for column in inspector.get_columns("inboxitem")}
        if "directory_id" not in columns:
            with op.batch_alter_table("inboxitem") as batch_op:
                batch_op.add_column(sa.Column("directory_id", sa.Integer(), nullable=True))
                batch_op.create_index("ix_inboxitem_directory_id", ["directory_id"], unique=False)


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    if "inboxitem" in inspector.get_table_names():
        columns = {column["name"] for column in inspector.get_columns("inboxitem")}
        if "directory_id" in columns:
            with op.batch_alter_table("inboxitem") as batch_op:
                batch_op.drop_index("ix_inboxitem_directory_id")
                batch_op.drop_column("directory_id")

    if "directory" in inspector.get_table_names():
        op.drop_index("ix_directory_parent_id", table_name="directory")
        op.drop_index("ix_directory_user_id", table_name="directory")
        op.drop_table("directory")
