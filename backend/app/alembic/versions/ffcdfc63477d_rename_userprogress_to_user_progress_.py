"""rename userprogress to user_progress and add progress schemas

Revision ID: ffcdfc63477d
Revises: 22923932d3d9
Create Date: 2026-04-05 23:59:58.087474

"""

from alembic import op

# revision identifiers, used by Alembic.
revision = "ffcdfc63477d"
down_revision = "22923932d3d9"
branch_labels = None
depends_on = None


def upgrade():
    # Rename table and update index names; also relax nullable on timestamps
    op.drop_index(op.f("ix_userprogress_user_id"), table_name="userprogress")
    op.rename_table("userprogress", "user_progress")
    op.create_index(
        op.f("ix_user_progress_user_id"), "user_progress", ["user_id"], unique=True
    )
    op.alter_column("user_progress", "created_at", nullable=True)
    op.alter_column("user_progress", "updated_at", nullable=True)


def downgrade():
    op.alter_column("user_progress", "created_at", nullable=False)
    op.alter_column("user_progress", "updated_at", nullable=False)
    op.drop_index(op.f("ix_user_progress_user_id"), table_name="user_progress")
    op.rename_table("user_progress", "userprogress")
    op.create_index(
        op.f("ix_userprogress_user_id"), "userprogress", ["user_id"], unique=True
    )
