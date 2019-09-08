from sqlalchemy.ext.declarative import DeclarativeMeta
from flask import json

def convert_row_to_dict(row_obj):
    return {x.name: getattr(row_obj, x.name) for x in row_obj.__table__.columns}