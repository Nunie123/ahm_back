
from flask import Flask
from flask_login import LoginManager
from flask_migrate import Migrate
from flask_sqlalchemy import SQLAlchemy
from app.config import AppConfig


# instantiate flask app
app = Flask(__name__)
app.config.from_object(AppConfig)
db = SQLAlchemy(app)
migrate = Migrate(app, db)

login = LoginManager(app)

from app import routes, models, errors
