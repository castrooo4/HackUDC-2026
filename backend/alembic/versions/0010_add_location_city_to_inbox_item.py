"""Add location_city to inboxitem.

Revision ID: 0010_add_location_city_to_inbox_item
Revises: 0009_add_location_to_inbox_item
Create Date: 2026-02-28 00:00:00
"""

from typing import Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy import inspect

# revision identifiers, used by Alembic.
revision: str = "0010_add_location_city_to_inbox_item"
down_revision: Union[str, None] = "0009_add_location_to_inbox_item"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    if "inboxitem" not in inspector.get_table_names():
        return

    columns = {column["name"] for column in inspector.get_columns("inboxitem")}
    if "location_city" not in columns:
        op.add_column("inboxitem", sa.Column("location_city", sa.String(length=120), nullable=True))

    indexes = {index["name"] for index in inspector.get_indexes("inboxitem")}
    if "ix_inboxitem_location_city" not in indexes:
        op.create_index("ix_inboxitem_location_city", "inboxitem", ["location_city"], unique=False)


def downgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    if "inboxitem" not in inspector.get_table_names():
        return

    indexes = {index["name"] for index in inspector.get_indexes("inboxitem")}
    if "ix_inboxitem_location_city" in indexes:
        op.drop_index("ix_inboxitem_location_city", table_name="inboxitem")

    columns = {column["name"] for column in inspector.get_columns("inboxitem")}
    if "location_city" in columns:
        op.drop_column("inboxitem", "location_city")
