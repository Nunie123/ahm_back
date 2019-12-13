import datetime

from flask_login import UserMixin
from werkzeug.security import generate_password_hash, check_password_hash
import sqlalchemy as sa
from sqlalchemy_serializer import SerializerMixin
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.hybrid import hybrid_property

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

    @property
    def maps_owned(self):
        maps = Map.query.filter_by(owner_id=self.user_id).all()
        map_list = [map.map_id for map in maps]
        return map_list

    @property
    def maps_favorited(self):
        maps = MapFavorite.query.filter_by(user_id=self.user_id).all()
        map_list = [map.map_id for map in maps]
        return map_list

    @property
    def datasets_owned(self):
        datasets = GeographicDataset.query.filter_by(owner_id=self.user_id).all()
        dataset_list = [dataset.geographic_dataset_id for dataset in datasets]
        return dataset_list

    @property
    def datasets_favorited(self):
        datasets = GeographicDatasetFavorite.query.filter_by(user_id=self.user_id).all()
        dataset_list = [dataset.geographic_dataset_id for dataset in datasets]
        return dataset_list

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def get_id(self):
        return str(self.user_id)

    def update_user(self, username=None, password=None,
                    email=None, is_admin=None):
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
        return (f'<User id={self.user_id},'
                f'username={self.username},'
                f'email={self.email}>')


class EmailAuthenticationCode(db.Model):
    __tablename__ = 'email_authentication_codes'
    email_authentication_id = db.Column(db.Integer,
                                        primary_key=True,
                                        autoincrement=False)
    user_id = db.Column(db.Integer,
                        db.ForeignKey('users.user_id'),
                        nullable=False)
    authentication_code = db.Column(db.Integer, nullable=False)
    expiration_timestamp = db.Column(db.DateTime, nullable=False)


class SupportTicket(db.Model):
    __tablename__ = 'support_tickets'
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column(db.Integer,
                        db.ForeignKey('users.user_id'),
                        nullable=True)
    user_email = db.Column(db.Text, nullable=False)
    user_name = db.Column(db.Text)
    user_message = db.Column(db.Text)

    def get_id(self):
        return str(self.user_id)


class GeoCode(db.Model):
    __tablename__ = 'geo_codes'
    geo_code_id = db.Column(db.Integer, primary_key=True)
    fips_code = db.Column(db.Text)
    geo_name = db.Column(db.Text)
    geo_abreviation = db.Column(db.Text)
    geographic_level = db.Column(sa.Enum('state',
                                         'county',
                                         name='geo_levels',
                                         create_type=True),
                                 nullable=False)
    geographic_attributes = db.relationship('GeographicAttribute',
                                            backref='geo_code',
                                            lazy='dynamic')

    @staticmethod
    def get_geocode(search_str):
        geocode = GeoCode.query\
            .filter(sa.or_(GeoCode.fips_code == search_str.lower(),
                           GeoCode.geo_name == search_str.lower(),
                           GeoCode.geo_abreviation == search_str.lower())).first()
        return geocode


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
    favorites = db.relationship('GeographicDatasetFavorite', backref='dataset')
    created_at = db.Column(db.DateTime, server_default=sa.func.now())
    geographic_attributes = db.relationship('GeographicAttribute',
                                            backref='geographic_dataset',
                                            lazy='dynamic')
    views = db.relationship('GeographicDatasetView',
                            backref='geographic_dataset',
                            lazy='dynamic')

    def __init__(self, dataset):
        self.owner_id = dataset['owner_id']
        self.name = dataset['name']
        self.description = dataset['description']
        self.organization = dataset['organization']
        self.url = dataset['url']
        self.is_public = dataset['is_public']

    @hybrid_property
    def favorite_count(self):
        if self.favorites:
            return len(self.favorites)
        return 0

    @favorite_count.expression
    def favorite_count(cls):
        return sa.select([sa.func.count(GeographicDatasetFavorite.geographic_dataset_favorite_id)])\
            .where(GeographicDatasetFavorite.geographic_dataset_id == cls.geographic_dataset_id)

    @property
    def geographic_attributes_dict(self):
        return [helpers.convert_row_to_dict(row)
                for row in self.geographic_attributes]

    @property
    def distinct_geographic_attribute_names(self):
        name_list = [attribute.attribute_name
                     for attribute in self.geographic_attributes
                     if attribute.deleted_at is None]
        distinct_name_list = list(set(name_list))
        distinct_name_list.sort()
        distinct_attribute_list = \
            [{'name': name, 'dataset_id': self.geographic_dataset_id}
             for name in distinct_name_list]
        return distinct_attribute_list

    @property
    def geo_level(self):
        geo_level = self.geographic_attributes[0].geo_code.geographic_level
        return geo_level

    def get_distinct_attributes(self):
        attributes = GeographicAttribute.query \
            .with_entities(GeographicAttribute.attribute_name,
                           GeographicAttribute.attribute_year,
                           sa.func.count(GeographicAttribute.geo_code_id)
                           .label('count'))\
            .filter(GeographicAttribute.dataset_id == self.geographic_dataset_id,
                    GeographicAttribute.deleted_at is not None)\
            .group_by(GeographicAttribute.attribute_name,
                      GeographicAttribute.attribute_year)\
            .order_by(GeographicAttribute.attribute_name,
                      GeographicAttribute.attribute_year).all()
        return attributes

    def get_list_of_attributes(self):
        attribute_list = []
        for att in self.get_distinct_attributes():
            item = {}
            item['attribute_name'] = att.attribute_name
            item['attribute_year'] = att.attribute_year
            item['source_id'] = self.geographic_dataset_id
            item['source_name'] = self.name
            item['source_description'] = self.description
            item['source_organization'] = self.organization
            item['source_url'] = self.url
            item['attribute_count'] = att.count
# TODO Adding the geo level like below wrecks performance.
# item['geo_level'] = self.geographic_attributes[0].geo_code.geographic_level
            attribute_list.append(item)
        return attribute_list

    @classmethod
    def get_datasets_and_attributes_by_owner(cls, user_id):
        dataset_list = []
        datasets = cls.query.filter_by(owner_id=user_id).all()
        for dataset in datasets:
            item = {}
            item['attributes'] = dataset.get_list_of_attributes()
            item['source_id'] = dataset.geographic_dataset_id
            item['source_name'] = dataset.name
            item['source_description'] = dataset.description
            item['source_organization'] = dataset.organization
            item['source_url'] = dataset.url
            dataset_list.append(item)
        return dataset_list

    @classmethod
    def get_favorite_datasets_and_attributes(cls, current_user):
        dataset_list = []
        datasets = cls.query.filter(cls.geographic_dataset_id.in_(current_user.datasets_favorited)).all()
        for dataset in datasets:
            item = {}
            item['attributes'] = dataset.get_list_of_attributes()
            item['source_id'] = dataset.geographic_dataset_id
            item['source_name'] = dataset.name
            item['source_description'] = dataset.description
            item['source_organization'] = dataset.organization
            item['source_url'] = dataset.url
            dataset_list.append(item)
        return dataset_list

    @classmethod
    def get_popular_datasets_and_attributes(cls):
        dataset_list = []
        datasets = cls.query.order_by(sa.desc(cls.favorite_count)).limit(5).all()
        for dataset in datasets:
            item = {}
            item['attributes'] = dataset.get_list_of_attributes()
            item['source_id'] = dataset.geographic_dataset_id
            item['source_name'] = dataset.name
            item['source_description'] = dataset.description
            item['source_organization'] = dataset.organization
            item['source_url'] = dataset.url
            dataset_list.append(item)
        return dataset_list

    @classmethod
    def get_list_of_all_attributes(cls):
        attribute_list = []
        for dataset in cls.query.all():
            these_attributes = dataset.get_list_of_attributes()
            attribute_list += these_attributes
        return attribute_list

    @classmethod
    def get_default_datasets(cls):
        defaults = []
        geo_levels = [('State Datasets', 'state'), ('County Datasets', 'county')]
        default_datasets = cls.query.filter_by(display_by_default=True).all()
        print('start loop', datetime.datetime.now())
        for name, search_term in geo_levels:
            region_defaults = dict(name=name, level=search_term)
            region_defaults['datasets'] = []
            for sa_dataset in default_datasets:
                if sa_dataset.geo_level == search_term:
                    dataset = dict(
                        dataset_id=sa_dataset.geographic_dataset_id,
                        name=sa_dataset.name,
                        distinct_geographic_attribute_names=sa_dataset.distinct_geographic_attribute_names
                    )
                    region_defaults['datasets'].append(dataset)
            defaults.append(region_defaults)
        print('end', datetime.datetime.now())
        return defaults

    @classmethod
    def get_personal_datasets(cls, user_id):
        personals = []
        geo_levels = [('State Datasets', 'state'), ('County Datasets', 'county')]
        personal_datasets = cls.query.filter_by(owner_id=user_id).all()
        for name, search_term in geo_levels:
            region_personals = dict(name=name, level=search_term)
            region_personals['datasets'] = []
            for sa_dataset in personal_datasets:
                if sa_dataset.geo_level == search_term:
                    dataset = dict(
                        dataset_id=sa_dataset.geographic_dataset_id,
                        name=sa_dataset.name,
                        distinct_geographic_attribute_names=sa_dataset.distinct_geographic_attribute_names
                    )
                    region_personals['datasets'].append(dataset)
            personals.append(region_personals)
        return personals

    @classmethod
    def get_favorite_datasets(cls, favorites_list):
        favorites = []
        geo_levels = [('State Datasets', 'state'), ('County Datasets', 'county')]
        favorite_datasets = cls.query.filter(cls.geographic_dataset_id.in_(favorites_list)).all()
        for name, search_term in geo_levels:
            region_favorites = dict(name=name, level=search_term)
            region_favorites['datasets'] = []
            for sa_dataset in favorite_datasets:
                if sa_dataset.geo_level == search_term:
                    dataset = dict(
                        dataset_id=sa_dataset.geographic_dataset_id,
                        name=sa_dataset.name,
                        distinct_geographic_attribute_names=sa_dataset.distinct_geographic_attribute_names
                    )
                    region_favorites['datasets'].append(dataset)
            favorites.append(region_favorites)
        return favorites


class GeographicAttribute(db.Model, SerializerMixin):
    __tablename__ = 'geographic_attributes'
    geographic_attribute_id = db.Column(db.Integer, primary_key=True)
    geo_code_id = db.Column(db.Integer,
                            db.ForeignKey('geo_codes.geo_code_id'),
                            nullable=False)
    dataset_id = db.Column(db.Integer,
                           db.ForeignKey('geographic_datasets.geographic_dataset_id'),
                           nullable=False)
    attribute_name = db.Column(db.Text, nullable=False)
    attribute_value = db.Column(db.Numeric, nullable=False)
    attribute_value_type = db.Column(sa.Enum('percent', 'count', name='value_type', create_type=True),
                                     server_default='percent')
    attribute_year = db.Column(db.SmallInteger)
    attribute_relative_weight = db.Column(sa.Enum('high', 'medium', 'low', name='relative_weights', create_type=True))
    fips_code = db.Column(db.Text)
    deleted_at = db.Column(db.DateTime)
    __table_args__ = (db.UniqueConstraint('geo_code_id',
                                          'attribute_name',
                                          'attribute_year',
                                          'dataset_id',
                                          name='_attribute_year_dataset_uc'),)

    @property
    def geo_name(self):
        return self.geo_code.geo_name

    def to_dict(self):
        attribute_dict = dict()
        attribute_dict['attribute_name'] = self.attribute_name
        attribute_dict['attribute_value'] = self.attribute_value
        attribute_dict['fips_code'] = self.fips_code
        attribute_dict['dataset_id'] = self.dataset_id
        attribute_dict['attribute_year'] = self.attribute_year
        return attribute_dict

    @classmethod
    def get_attribute_years(cls, dataset_id, attribute_name):
        year_rows = cls.query\
            .with_entities(cls.attribute_year)\
            .filter_by(dataset_id=dataset_id, attribute_name=attribute_name).all()
        year_list = [row.attribute_year for row in year_rows]
        distinct_year_list = list(set(year_list))
        distinct_year_list.sort(reverse=True)
        return distinct_year_list

    @staticmethod
    def bulk_insert(attributes, dataset_id):
        insert_list = []
        for attribute in attributes:
            geocode = GeoCode.get_geocode(attribute.get('geographic-label'))
            row = {}
            row['geo_code_id'] = geocode.geo_code_id if geocode else 0
            row['fips_code'] = geocode.fips_code if geocode else None
            row['dataset_id'] = dataset_id
            row['attribute_name'] = attribute.get('attribute-name')
            row['attribute_value'] = attribute.get('attribute-value')
            row['attribute_value_type'] = 'percent'
            row['attribute_year'] = attribute.get('attribute-year')
            insert_list.append(row)
            # insert_list = [{k: v for d in insert_list for k, v in d.items() if v is not None}]
        # This was the only way I could get the import to work. I think there is a problem with the csv parsing.
        for row in insert_list:
            if row['attribute_value'] is not None and row['geo_code_id'] != 0:
                db.session.execute(GeographicAttribute.__table__.insert(), row)


class Map(db.Model, SerializerMixin):
    __tablename__ = 'maps'
    map_id = db.Column(db.Integer, primary_key=True)
    primary_dataset_id = db.Column(db.Integer,
                                   db.ForeignKey('geographic_datasets.geographic_dataset_id'),
                                   nullable=False)
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
    views = db.relationship('MapView', backref='map')
    favorites = db.relationship('MapFavorite', backref='map')
    primary_dataset = db.relationship("GeographicDataset", foreign_keys=[primary_dataset_id])
    secondary_dataset = db.relationship("GeographicDataset", foreign_keys=[secondary_dataset_id])
    __table_args__ = (db.UniqueConstraint('title', 'owner_id', name='_title_owner_uc'),)

    @property
    def geo_level(self):
        level = self.primary_dataset.geo_level
        return level

    @hybrid_property
    def view_count(self):
        if self.views:
            return len(self.views)
        return 0

    @view_count.expression
    def view_count(cls):
        return sa.select([sa.func.count(MapView.map_view_id)]).where(MapView.map_id == cls.map_id)

    @hybrid_property
    def favorite_count(self):
        if self.favorites:
            return len(self.favorites)
        return 0

    @favorite_count.expression
    def favorite_count(cls):
        return sa.select([sa.func.count(MapFavorite.map_favorite_id)]).where(MapFavorite.map_id == cls.map_id)

    def save(self, counter=0):
        try:
            if not self.map_id:
                db.session.add(self)
            db.session.commit()
        except IntegrityError:
            db.session.rollback()
            counter += 1
            if counter > 1:
                self.title = self.title[:-2] + f'{counter})'
            else:
                self.title += f'({counter})'
            self.save(counter)

    def get_preloaded_data(self):
        data = {}
        data['map_id'] = self.map_id
        data['title'] = self.title
        data['zoom_level'] = self.zoom_level
        data['center_coordinates'] = self.center_coordinates
        data['attribute_name_1'] = self.attribute_name_1
        data['attribute_year_1'] = self.attribute_year_1
        data['primary_dataset_id'] = self.primary_dataset_id
        data['attribute_name_2'] = self.attribute_name_1
        data['attribute_year_2'] = self.attribute_year_1
        data['secondary_dataset_id'] = self.secondary_dataset_id
        data['geo_level'] = self.geo_level
        return data

    def get_map_card_data(self):
        data = {}
        data['map_id'] = self.map_id
        data['attribute_name_1'] = self.attribute_name_1
        data['attribute_name_2'] = self.attribute_name_2
        data['attribute_year_1'] = self.attribute_year_1
        data['attribute_year_2'] = self.attribute_year_2
        data['title'] = self.title
        data['owner'] = User.query.get(self.owner_id).username
        data['map_thumbnail_link'] = self.map_thumbnail_link
        data['views'] = self.view_count
        data['favorites'] = self.favorite_count
        return data

    def remove_owner(self):
        self.owner_id = None
        db.session.commit()

    @classmethod
    def get_maps_by_owner(cls, owner_id):
        maps = cls.query.filter_by(owner_id=owner_id).order_by(sa.desc(cls.map_id)).all()
        return maps

    @classmethod
    def get_most_viewed_maps(cls):
        maps = cls.query.order_by(sa.desc(cls.view_count)).limit(3).all()
        return maps


class MapView(db.Model):
    __tablename__ = 'map_views'
    map_view_id = db.Column(db.Integer, primary_key=True)
    map_id = db.Column(db.Integer, db.ForeignKey('maps.map_id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.user_id'), nullable=True)
    ip_address = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, server_default=sa.func.now())
    updated_at = db.Column(db.DateTime, server_default=sa.func.now())


class GeographicDatasetView(db.Model):
    __tablename__ = 'geographic_dataset_views'
    geographic_dataset_view_id = db.Column(db.Integer, primary_key=True)
    geographic_dataset_id = db.Column(db.Integer,
                                      db.ForeignKey('geographic_datasets.geographic_dataset_id'),
                                      nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.user_id'), nullable=True)
    ip_address = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, server_default=sa.func.now())
    updated_at = db.Column(db.DateTime, server_default=sa.func.now())


class MapFavorite(db.Model):
    __tablename__ = 'map_favorites'
    map_favorite_id = db.Column(db.Integer, primary_key=True)
    map_id = db.Column(db.Integer, db.ForeignKey('maps.map_id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.user_id'), nullable=False)
    created_at = db.Column(db.DateTime, server_default=sa.func.now())
    updated_at = db.Column(db.DateTime, server_default=sa.func.now())


class GeographicDatasetFavorite(db.Model):
    __tablename__ = 'geographic_dataset_favorites'
    geographic_dataset_favorite_id = db.Column(db.Integer, primary_key=True)
    geographic_dataset_id = db.Column(db.Integer,
                                      db.ForeignKey('geographic_datasets.geographic_dataset_id'),
                                      nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.user_id'), nullable=False)
    created_at = db.Column(db.DateTime, server_default=sa.func.now())
    updated_at = db.Column(db.DateTime, server_default=sa.func.now())


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
