import os
import logging
from configparser import ConfigParser



APP_CONFIG_FILE = os.environ.get("APP_CONFIG_FILE") or "config/secrets.ini"


def read_config(config_file):
    parser = ConfigParser()
    parser.read(config_file)
    return parser


def build_sqlalchemy_uri(config_filename, connection_name):
    conf = read_config(config_filename)
    db_user = conf[connection_name]["user"]
    db_password = conf[connection_name]["password"]
    db_host = conf[connection_name]["host"]
    database = conf[connection_name]["database"]
    return f"postgresql://{db_user}:{db_password}@{db_host}/{database}"


config = read_config(APP_CONFIG_FILE)

class AppConfig:
    SECRET_KEY = config.get('flask', 'secret_key')
    SQLALCHEMY_DATABASE_URI = build_sqlalchemy_uri(APP_CONFIG_FILE, "ahm-backend")
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SECURITY_PASSWORD_SALT = config.get('flask', 'SECURITY_PASSWORD_SALT')
    DEBUG = True

    # mail settings
    MAIL_SERVER = 'smtp.gmail.com'
    MAIL_PORT = 465
    MAIL_USE_TLS = False
    MAIL_USE_SSL = True

    # gmail authentication
    MAIL_USERNAME = config.get('email', 'username')
    MAIL_PASSWORD = config.get('email', 'password')

    # mail accounts
    MAIL_DEFAULT_SENDER = 'americanhealthmapper@gmail.com'
    INTERNAL_RECIPIENTS = config.get('support', 'recipients')

    # S3

    S3_BUCKET = config.get('S3', 'bucket')

    @staticmethod
    def get_uri(database_name):
        return build_sqlalchemy_uri("config/sources.ini", database_name)
