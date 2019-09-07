"""empty message

Revision ID: f2501838389d
Revises: e49923ba934e
Create Date: 2019-09-07 14:26:56.551440

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'f2501838389d'
down_revision = 'e49923ba934e'
branch_labels = None
depends_on = None


def upgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    op.drop_constraint('geographic_dataset_views_geographic_dataset_id_fkey', 'geographic_dataset_views', type_='foreignkey')
    op.create_foreign_key(None, 'geographic_dataset_views', 'geographic_datasets', ['geographic_dataset_id'], ['geographic_dataset_id'])
    op.add_column('maps', sa.Column('primary_dataset_id', sa.Integer(), nullable=False))
    op.add_column('maps', sa.Column('secondary_dataset_id', sa.Integer(), nullable=True))
    op.drop_constraint('maps_dataset_1_id_fkey', 'maps', type_='foreignkey')
    op.drop_constraint('maps_dataset_2_id_fkey', 'maps', type_='foreignkey')
    op.create_foreign_key(None, 'maps', 'geographic_datasets', ['primary_dataset_id'], ['geographic_dataset_id'])
    op.create_foreign_key(None, 'maps', 'geographic_datasets', ['secondary_dataset_id'], ['geographic_dataset_id'])
    op.drop_column('maps', 'dataset_2_id')
    op.drop_column('maps', 'dataset_1_id')
    # ### end Alembic commands ###


def downgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    op.add_column('maps', sa.Column('dataset_1_id', sa.INTEGER(), autoincrement=False, nullable=False))
    op.add_column('maps', sa.Column('dataset_2_id', sa.INTEGER(), autoincrement=False, nullable=True))
    op.drop_constraint(None, 'maps', type_='foreignkey')
    op.drop_constraint(None, 'maps', type_='foreignkey')
    op.create_foreign_key('maps_dataset_2_id_fkey', 'maps', 'geographic_datasets', ['dataset_2_id'], ['geographic_dataset_id'])
    op.create_foreign_key('maps_dataset_1_id_fkey', 'maps', 'geographic_datasets', ['dataset_1_id'], ['geographic_dataset_id'])
    op.drop_column('maps', 'secondary_dataset_id')
    op.drop_column('maps', 'primary_dataset_id')
    op.drop_constraint(None, 'geographic_dataset_views', type_='foreignkey')
    op.create_foreign_key('geographic_dataset_views_geographic_dataset_id_fkey', 'geographic_dataset_views', 'maps', ['geographic_dataset_id'], ['map_id'])
    # ### end Alembic commands ###
