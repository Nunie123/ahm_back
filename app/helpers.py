
def convert_row_to_dict(row_obj):
    return {x.name: getattr(row_obj, x.name)
            for x in row_obj.__table__.columns}


def convert_to_list_of_lists(source_list: list, inner_list_length: int):
    grouped_list = []
    for index, item in enumerate(source_list):
        if index % inner_list_length == 0:
            grouped_list.append(list())
        group = index // inner_list_length
        grouped_list[group].append(item)
    return grouped_list
