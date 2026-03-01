"""add is_pinned

Revision ID: 7064a8291884
Revises: 0012_inbox_automation_fields_and_merge_history
Create Date: 2026-03-01 00:55:10.460130
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "7064a8291884"
down_revision: Union[str, None] = "0012_inbox_automation_fields_and_merge_history"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade():
    # Añadimos solo nuestra nueva columna
    op.add_column(
        "inboxitem",
        sa.Column("is_pinned", sa.Boolean(), nullable=False, server_default="0"),
    )


def downgrade():
    # Quitamos solo nuestra columna si echamos para atrás
    op.drop_column("inboxitem", "is_pinned")
