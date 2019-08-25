import datetime
from flask_login import UserMixin
from werkzeug.security import generate_password_hash, check_password_hash
import sqlalchemy as sa
from app import login, db


@login.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))


class User(UserMixin, db.Model):
    __tablename__ = 'users'
    user_id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.Text, index=True, unique=True, nullable=False)
    username = db.Column(db.Text, unique=True, nullable=False)
    password_hash = db.Column(db.Text, nullable=False)
    is_admin = db.Column(db.Boolean, server_default=sa.false())
    is_email_authenticated = db.Column(db.Boolean, server_default=sa.false())
    created_at = db.Column(db.DateTime, server_default=sa.func.now())
    deleted_at = db.Column(db.DateTime, nullable=True)

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def get_id(self):
        return str(self.user_id)

    def update_user(self, username=None, password=None, email=None, is_admin=None):
        if username:
            self.username = username
        if email:
            self.email = email 
        if is_admin:
            self.is_admin = True
        if password:
            self.set_password(password)
        db.session.commit()

    def authenticate_email(self):
        self.is_email_authenticated = True
        db.session.commit()
    
    def soft_delete_user(self):
        self.deleted_at = datetime.datetime.utcnow()
        db.session.commit()

    def __repr__(self):
        return f'<User id={self.user_id}, username={self.username} email={self.email}>'


class GeoCode(db.Model):
    __tablename__ = 'geo_codes'
    geo_code_id = db.Column(db.Integer, primary_key=True, autoincrement=False)
    geo_name = db.Column(db.Text)
    geo_abreviation = db.Column(db.Text)
    geographic_level = db.Column(sa.Enum('state', 'county', name='geo_levels', create_type=True), nullable=False)


class GeographicDataset(db.Model):
    __tablename__ = 'geographic_datasets'
    geographic_dataset_id = db.Column(db.Integer, primary_key=True)
    owner_id = db.Column(db.Integer, db.ForeignKey('users.user_id'))
    name = db.Column(db.Text)
    description = db.Column(db.Text)
    is_public = db.Column(db.Boolean, server_default=sa.true())
    created_at = db.Column(db.DateTime, server_default=sa.func.now())


class GeographicAttribute(db.Model):
    __tablename__ = 'geographic_attributes'
    geographic_attribute_id = db.Column(db.Integer, primary_key=True)
    geo_code_id = db.Column(db.Integer, db.ForeignKey('geo_codes.geo_code_id'), nullable=False)
    dataset_id = db.Column(db.Integer, db.ForeignKey('geographic_datasets.geographic_dataset_id'), nullable=False)
    attribute_name = db.Column(db.Text, nullable=False)
    attribute_value = db.Column(db.Numeric, nullable=False)
    attribute_relative_weight = db.Column(sa.Enum('high', 'medium', 'low', name='relative_weights', create_type=True))
    

class Map(db.Model):
    __tablename__ = 'maps'
    map_id = db.Column(db.Integer, primary_key=True)
    dataset_1_id = db.Column(db.Integer, db.ForeignKey('geographic_datasets.geographic_dataset_id') , nullable=False)
    dataset_2_id = db.Column(db.Integer, db.ForeignKey('geographic_datasets.geographic_dataset_id'))
    hex_color_1 = db.Column(db.Text)
    hex_color_2 = db.Column(db.Text)
    title = db.Column(db.Text)
    owner_id = db.Column(db.Integer, db.ForeignKey('users.user_id'))
    is_public = db.Column(db.Boolean, server_default=sa.true())
    zoom_level = db.Column(db.Text)
    center_coordinates = db.Column(db.Text)
    created_at = db.Column(db.DateTime, server_default=sa.func.now())
