"""Compatibility placeholder for historical revision.

Revision ID: 0007_add_phone_number_to_user
Revises: 0006_create_directory_and_link_inbox
Create Date: 2026-02-28
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "0007_add_phone_number_to_user"
down_revision: Union[str, None] = "0006_create_directory_and_link_inbox"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """No-op.

    This revision existed in an earlier local history. Keeping it here avoids
    broken chains for databases that already reference this revision ID.
    """
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if "user" in inspector.get_table_names():
        # Intentionally no schema changes.
        return


def downgrade() -> None:
    # Intentionally no schema changes.
    return
