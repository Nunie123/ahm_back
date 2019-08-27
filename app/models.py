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


class EmailAuthenticationCode(db.Model):
    __tablename__ = 'email_authentication_codes'
    email_authentication_id = db.Column(db.Integer, primary_key=True, autoincrement=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.user_id'), nullable=False)
    authentication_code = db.Column(db.Integer, nullable=False)
    expiration_timestamp = db.Column(db.DateTime, nullable=False)


class GeoCode(db.Model):
    __tablename__ = 'geo_codes'
    geo_code_id = db.Column(db.Integer, primary_key=True)
    fips_code = db.Column(db.Text)
    geo_name = db.Column(db.Text)
    geo_abreviation = db.Column(db.Text)
    geographic_level = db.Column(sa.Enum('state', 'county', name='geo_levels', create_type=True), nullable=False)
    geographic_attributes = db.relationship('GeographicAttribute', backref='geo_code', lazy='dynamic')


class GeographicDataset(db.Model):
    __tablename__ = 'geographic_datasets'
    geographic_dataset_id = db.Column(db.Integer, primary_key=True)
    owner_id = db.Column(db.Integer, db.ForeignKey('users.user_id'))
    name = db.Column(db.Text)
    description = db.Column(db.Text)
    organization = db.Column(db.Text)
    url = db.Column(db.Text)
    display_by_default = db.Column(db.Boolean, server_default=sa.false())
    is_public = db.Column(db.Boolean, server_default=sa.true())
    created_at = db.Column(db.DateTime, server_default=sa.func.now())
    geographic_attributes = db.relationship('GeographicAttribute', backref='geographic_dataset', lazy='dynamic')
    views = db.relationship('GeographicDatasetView', backref='geographic_dataset', lazy='dynamic')
    maps = db.relationship('Map', backref='geographic_dataset', lazy='dynamic')


class GeographicAttribute(db.Model):
    __tablename__ = 'geographic_attributes'
    geographic_attribute_id = db.Column(db.Integer, primary_key=True)
    geo_code_id = db.Column(db.Integer, db.ForeignKey('geo_codes.geo_code_id'), nullable=False)
    dataset_id = db.Column(db.Integer, db.ForeignKey('geographic_datasets.geographic_dataset_id'), nullable=False)
    attribute_name = db.Column(db.Text, nullable=False)
    attribute_value = db.Column(db.Numeric, nullable=False)
    attribute_value_type = db.Column(sa.Enum('percent', 'count', name='value_type', create_type=True), nullable=False)
    attribute_year = db.Column(db.SmallInteger)
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
    map_thumbnail_link = db.Column(db.Text)
    created_at = db.Column(db.DateTime, server_default=sa.func.now())
    updated_at = db.Column(db.DateTime, server_default=sa.func.now())
    views = db.relationship('MapView', backref='map', lazy='dynamic')


class MapView(db.Model):
    __tablename__ = 'map_views'
    map_view_id = db.Column(db.Integer, primary_key=True)
    map_id = db.Column(db.Integer, db.ForeignKey('maps.map_id') , nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.user_id') , nullable=True)
    ip_address = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, server_default=sa.func.now())
    updated_at = db.Column(db.DateTime, server_default=sa.func.now())


class GeographicDatasetView(db.Model):
    __tablename__ = 'geographic_dataset_views'
    geographic_dataset_view_id = db.Column(db.Integer, primary_key=True)
    geographic_dataset_id = db.Column(db.Integer, db.ForeignKey('maps.map_id') , nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.user_id') , nullable=True)
    ip_address = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, server_default=sa.func.now())
    updated_at = db.Column(db.DateTime, server_default=sa.func.now())


# class MapFavorite(db.Model):
#     __tablename__ = 'map_favorites'
#     map_view_id = db.Column(db.Integer, primary_key=True)
#     map_id = db.Column(db.Integer, db.ForeignKey('map.map_id') , nullable=False)
#     user_id = db.Column(db.Integer, db.ForeignKey('users.user_id') , nullable=False)
#     created_at = db.Column(db.DateTime, server_default=sa.func.now())
#     updated_at = db.Column(db.DateTime, server_default=sa.func.now())


# class GeographicDatasetFavorite(db.Model):
#     __tablename__ = 'geographic_dataset_favorites'
#     geographic_dataset_view_id = db.Column(db.Integer, primary_key=True)
#     geographic_dataset_id = db.Column(db.Integer, db.ForeignKey('map.map_id') , nullable=False)
#     user_id = db.Column(db.Integer, db.ForeignKey('users.user_id') , nullable=False)
#     created_at = db.Column(db.DateTime, server_default=sa.func.now())
#     updated_at = db.Column(db.DateTime, server_default=sa.func.now())


# class MapComment(db.Model):
#     __tablename__ = 'map_comments'
#     map_comment_id = db.Column(db.Integer, primary_key=True)
#     owner_id = db.Column(db.Integer, db.ForeignKey('users.user_id') , nullable=False)
#     map_id = db.Column(db.Integer, db.ForeignKey('map.map_id') , nullable=False)
#     parent_comment_id = db.Column(db.Integer)
#     comment_text = db.Column(db.Text)
#     created_at = db.Column(db.DateTime, server_default=sa.func.now())
#     updated_at = db.Column(db.DateTime, server_default=sa.func.now())


# class GeographicDatasetComment(db.Model):
#     __tablename__ = 'geographic_dataset_comments'
#     geographic_dataset_comment_id = db.Column(db.Integer, primary_key=True)
#     owner_id = db.Column(db.Integer, db.ForeignKey('users.user_id') , nullable=False)
#     geographic_dataset_id = db.Column(db.Integer, db.ForeignKey('map.map_id') , nullable=False)
#     parent_comment_id = db.Column(db.Integer)
#     comment_text = db.Column(db.Text)
#     created_at = db.Column(db.DateTime, server_default=sa.func.now())
#     updated_at = db.Column(db.DateTime, server_default=sa.func.now())