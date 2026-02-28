"""Add location fields to inbox_item.

Revision ID: 0009_add_location_to_inbox_item
Revises: 0008_create_telegram_link_tables
Create Date: 2026-02-28
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "0009_add_location_to_inbox_item"
down_revision: Union[str, None] = "0008_create_telegram_link_tables"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if "inboxitem" not in inspector.get_table_names():
        return

    columns = {column["name"] for column in inspector.get_columns("inboxitem")}
    if "location_lat" not in columns:
        op.add_column("inboxitem", sa.Column("location_lat", sa.Float(), nullable=True))
    if "location_lon" not in columns:
        op.add_column("inboxitem", sa.Column("location_lon", sa.Float(), nullable=True))

    indexes = {index["name"] for index in inspector.get_indexes("inboxitem")}
    if "ix_inboxitem_location_lat" not in indexes:
        op.create_index("ix_inboxitem_location_lat", "inboxitem", ["location_lat"], unique=False)
    if "ix_inboxitem_location_lon" not in indexes:
        op.create_index("ix_inboxitem_location_lon", "inboxitem", ["location_lon"], unique=False)


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if "inboxitem" not in inspector.get_table_names():
        return

    indexes = {index["name"] for index in inspector.get_indexes("inboxitem")}
    if "ix_inboxitem_location_lon" in indexes:
        op.drop_index("ix_inboxitem_location_lon", table_name="inboxitem")
    if "ix_inboxitem_location_lat" in indexes:
        op.drop_index("ix_inboxitem_location_lat", table_name="inboxitem")

    columns = {column["name"] for column in inspector.get_columns("inboxitem")}
    if "location_lon" in columns:
        op.drop_column("inboxitem", "location_lon")
    if "location_lat" in columns:
        op.drop_column("inboxitem", "location_lat")
