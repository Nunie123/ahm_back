import datetime

from flask_login import UserMixin
from werkzeug.security import generate_password_hash, check_password_hash
import sqlalchemy as sa
from sqlalchemy_serializer import SerializerMixin
from sqlalchemy.exc import IntegrityError

from app import login, db
import app.helpers as helpers


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

    @staticmethod
    def get_geocode_id(search_str):
        geo_code_id = GeoCode.query.with_entities(GeoCode.geo_code_id)\
            .filter(sa.or_(GeoCode.fips_code == search_str, 
                            GeoCode.geo_name == search_str, 
                            GeoCode.geo_abreviation == search_str)).first()
        return geo_code_id


class GeographicDataset(db.Model, SerializerMixin):
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

    @property
    def geographic_attributes_dict(self):
        return [helpers.convert_row_to_dict(row) for row in self.geographic_attributes]

    @property
    def distinct_geographic_attribute_names(self):
        name_list = [attribute.attribute_name for attribute in self.geographic_attributes]
        distinct_name_list = list(set(name_list))
        distinct_name_list.sort()
        distinct_attribute_list = [{'name': name, 'dataset_id': self.geographic_dataset_id} for name in distinct_name_list]
        # distinct_attribute_list = []
        # for name in distinct_name_list:
        #     years = GeographicAttribute.query.with_entities(GeographicAttribute.attribute_year)\
        #         .filter_by(attribute_name=name, dataset_id=self.geographic_dataset_id).order_by(GeographicAttribute.attribute_year.desc())
        #     attribute_dict = {'name': name, 'years': years, 'dataset_id': self.geographic_dataset_id}
        #     distinct_attribute_list.append(attribute_dict)
        # print(distinct_attribute_list)
        return distinct_attribute_list


class GeographicAttribute(db.Model, SerializerMixin):
    __tablename__ = 'geographic_attributes'
    geographic_attribute_id = db.Column(db.Integer, primary_key=True)
    geo_code_id = db.Column(db.Integer, db.ForeignKey('geo_codes.geo_code_id'), nullable=False)
    dataset_id = db.Column(db.Integer, db.ForeignKey('geographic_datasets.geographic_dataset_id'), nullable=False)
    attribute_name = db.Column(db.Text, nullable=False)
    attribute_value = db.Column(db.Numeric, nullable=False)
    attribute_value_type = db.Column(sa.Enum('percent', 'count', name='value_type', create_type=True), server_default='percent')
    attribute_year = db.Column(db.SmallInteger)
    attribute_relative_weight = db.Column(sa.Enum('high', 'medium', 'low', name='relative_weights', create_type=True))
    __table_args__ = (db.UniqueConstraint('geo_code_id', 'attribute_name', 'attribute_year', 'dataset_id', name='_attribute_year_dataset_uc'),)

    @property
    def geo_name(self):
        return self.geo_code.geo_name

    @staticmethod
    def bulk_insert(attributes, dataset_id):
        insert_list = []
        for attribute in attributes:
            row = {}
            row['geo_code_id'] = GeoCode.get_geocode_id(attribute.get('geographic-label'))
            row['dataset_id'] = dataset_id
            row['attribute_name'] = attribute.get('attribute-name')
            row['attribute_value'] = attribute.get('attribute-value')
            row['attribute_value_type'] = 'percent'
            row['attribute_year'] = attribute.get('atrribute-year')
            insert_list.append(row)
        db.session.execute(GeographicAttribute.__table__.insert(), insert_list)
        db.session.commit()

    

class Map(db.Model, SerializerMixin):
    __tablename__ = 'maps'
    map_id = db.Column(db.Integer, primary_key=True)
    primary_dataset_id = db.Column(db.Integer, db.ForeignKey('geographic_datasets.geographic_dataset_id') , nullable=False)
    secondary_dataset_id = db.Column(db.Integer, db.ForeignKey('geographic_datasets.geographic_dataset_id'))
    attribute_name_1 = db.Column(db.Text, nullable=False)
    attribute_name_2 = db.Column(db.Text)
    attribute_year_1 = db.Column(db.SmallInteger, nullable=False)
    attribute_year_2 = db.Column(db.SmallInteger)
    hex_color_1 = db.Column(db.Text)
    hex_color_2 = db.Column(db.Text)
    title = db.Column(db.Text, nullable=False)
    owner_id = db.Column(db.Integer, db.ForeignKey('users.user_id'))
    is_public = db.Column(db.Boolean, server_default=sa.true())
    zoom_level = db.Column(db.Text)
    center_coordinates = db.Column(db.Text)
    map_thumbnail_link = db.Column(db.Text)
    created_at = db.Column(db.DateTime, server_default=sa.func.now())
    updated_at = db.Column(db.DateTime, server_default=sa.func.now())
    views = db.relationship('MapView', backref='map', lazy='dynamic')
    primary_dataset = db.relationship("GeographicDataset", foreign_keys=[primary_dataset_id])
    secondary_dataset = db.relationship("GeographicDataset", foreign_keys=[secondary_dataset_id])
    __table_args__ = (db.UniqueConstraint('title', 'owner_id', name='_title_owner_uc'),)

    def save(self, counter=0):
        print('title:', self.title)
        print('counter:', counter)
        try:
            print('trying')
            db.session.add(self)
            db.session.commit()
            print('try succeeded')
        except IntegrityError as e:
            db.session.rollback()
            print(f'violation!!!!!: ')
            counter += 1
            if counter > 1:
                self.title = self.title[:-2] + f'{counter})'
            else:
                self.title += f'({counter})'
            print(self.title)
            self.save(counter)




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
    geographic_dataset_id = db.Column(db.Integer, db.ForeignKey('geographic_datasets.geographic_dataset_id') , nullable=False)
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