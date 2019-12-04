from sqlalchemy.ext.declarative import DeclarativeMeta
from flask import json

def convert_row_to_dict(row_obj):
    return {x.name: getattr(row_obj, x.name) for x in row_obj.__table__.columns}

def group_list_by_threes(source_list):
    grouped_list = []
    for index, item in enumerate(source_list):
        if index % 3 == 0:
            grouped_list.append(list())
        group = index // 3
        grouped_list[group].append(item)
    return grouped_list
    
