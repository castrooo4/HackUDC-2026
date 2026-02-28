"""Compatibility placeholder for previously referenced revision 0011.

Revision ID: 0011_add_data_location_to_user
Revises: 0010_add_location_city_to_inbox_item
Create Date: 2026-02-28 00:00:00
"""

from typing import Union

# revision identifiers, used by Alembic.
revision: str = "0011_add_data_location_to_user"
down_revision: Union[str, None] = "0010_add_location_city_to_inbox_item"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # No-op: this revision is kept to prevent migration chain breaks
    # in local environments that already reference 0011.
    pass


def downgrade() -> None:
    # No-op
    pass
