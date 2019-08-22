from app import app


@app.route('/', methods=['GET'])
def index():
    return "Hello, world"

@app.route('/login', methods=['POST'])
def login():
    '''
    Take username/password
    Return user
    redirect to home
    '''

@app.route('/logout', methods=['POST'])
def logout():
    '''
    Take username
    redirect to home
    '''

@app.route('/register', methods=['POST'])
def register():
    '''
    Take:
        username
        password
        email
    send authentication email
    do not allow login until email authentication
    redirect to home
    '''

@app.rout('/authenticate-email/<user_id>/<authentication_code>')
def authenticate_email():
    '''
    Flash success message
    log in
    redirect to home
    '''

@app.route('/register_admin', methods='POST')
def register_admin():
    '''
    Only allow other admins access to endpoint.
    Take username/password/email
    send authentication email
    do not allow login until email authenticated
    redirect to home
    '''

@app.route('/user/<user_id>', methods=['GET'])
def get_user():
    '''
    user_id
    username
    email
    is_email_authenticated?
    is_admin?
    owned_dataset_ids
    owned_map_ids
    favorite_dataset_ids
    favorite_map_id
    '''

@app.route('/user/<user_id>/update', methods=['POST'])
def update_user():
    '''
    Take: username, password, email (all optional)
    update user based on id
    user can only update self (except admin)
    '''

@app.route('/user/<user_id>/delete', methods=['GET'])
def delete_user():
    '''
    user can only delete self (except admin)
    '''

@app.route('/map/<map_id>', methods=['GET'])
def get_map():
    '''
    map_id
    title
    owner
    dataset_ids
    hex_colors
    is_public?
    zoom_level
    center_coordinates
    tags
    comments
    favorited_ids
    fork_ids
    view_count
    distinct_ip_view_count
    '''

@app.route('/dataset/<dataset_id>', methods=['GET']) 
def get_dataset():
    '''
    dataset_id
    dataset_name
    data: [{fips_code, attribute_name, attribute_value, attribute_relative_weight},...]
    owner
    description
    geo_border_level
    is_public?
    comments
    tags
    favorited_ids
    fork_ids
    view_count
    distinct_ip_view_count
    source: [{source_id, source_name, source_website, source_organization, publish_year},...]
    '''

@app.route('/get_map_metadata_list', methods=['POST'])
def get_map_metadata_list():
    '''
    Take: list of map ids
    send back list of:
        map_id
        title
        owner
        dataset_tags
        map tags
        favorited_ids
        fork_ids
        view_count
        distinct_ip_view_count
        map_thumbnail
    '''

@app.route('/get_popular_map_metadata_list', methods=['GET'])
def get_popular_map_metadata_list():
    '''
    send back list of:
        map_id
        title
        owner
        dataset_tags
        map_tags
        favorited_ids
        fork_ids
        view_count
        distinct_ip_view_count
        map_thumbnail
    '''

@app.route('/get_dataset_metadata_list', methods=['POST'])
def get_dataset_metadata_list():
    '''
    dataset_id
    dataset_name
    owner
    description
    geo_border_level
    is_public?
    tags
    favorited_ids
    fork_ids
    view_count
    distinct_ip_view_count
    source: [{source_id, source_name, source_website, source_organization, publish_year},...]
    '''

@app.route('/get_popular_dataset_metadata_list', methods=['GET'])
def get_popular_dataset_metadata_list():
    '''
    dataset_id
    dataset_name
    owner
    description
    geo_border_level
    is_public?
    tags
    favorited_ids
    fork_ids
    view_count
    distinct_ip_view_count
    source: [{source_id, source_name, source_website, source_organization, publish_year},...]
    '''