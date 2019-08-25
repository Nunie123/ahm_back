from flask import render_template, request, flash, redirect, url_for
from flask_login import current_user, login_user, logout_user, login_required
from app import app, db
from app.forms import RegistrationForm, LoginForm
from app.models import User


@app.route('/', methods=['GET'])
def index():
    return "Hello, world"


@app.route('/login', methods=['GET', 'POST'])
def login():
    if current_user.is_authenticated:
        return redirect(url_for('index'))
    form = LoginForm()
    if form.validate_on_submit():
        user = User.query.filter_by(email=form.email.data).first()
        if user is None or not user.check_password(form.password.data):
            flash('Invalid username or password')
            return redirect(url_for('login'))
        login_user(user, remember=form.remember_me.data)
        return redirect(url_for('index'))
    return render_template('login.html', title='Sign In', form=form)


@app.route('/logout', methods=['POST'])
def logout():
    """
    Take username
    redirect to home
    """
    pass


@app.route('/register', methods=['GET', 'POST'])
def register():
    """
    Take:
        username
        password
        email
    send authentication email
    do not allow login until email authentication
    redirect to home
    """
    if current_user.is_authenticated:
        return redirect(url_for('index'))
    form = RegistrationForm()
    if form.validate_on_submit():
        user = User(username=form.username.data, email=form.email.data)
        user.set_password(form.password.data)
        db.session.add(user)
        db.session.commit()
        flash('Congratulations, you are now a registered user!')
        return redirect(url_for('login'))
    return render_template('register.html', title='Register', form=form)


@app.route('/authenticate-email/<user_id>/<authentication_code>', methods=['POST'])
def authenticate_email():
    """
    Flash success message
    log in
    redirect to home
    """
    pass


@app.route('/register_admin', methods=['POST'])
def register_admin():
    """
    Only allow other admins access to endpoint.
    Take username/password/email
    send authentication email
    do not allow login until email authenticated
    redirect to home
    """
    pass


@app.route('/user/<user_id>', methods=['GET'])
def get_user():
    """
    user_id
    username
    email
    is_email_authenticated?
    is_admin?
    owned_dataset_ids
    owned_map_ids
    favorite_dataset_ids
    favorite_map_id
    """
    pass


@app.route('/user/<user_id>/update', methods=['POST'])
def update_user():
    """
    Take: username, password, email (all optional)
    update user based on id
    user can only update self (except admin)
    """
    pass


@app.route('/user/<user_id>/delete', methods=['GET'])
def delete_user():
    """
    user can only delete self (except admin)
    """
    pass


@app.route('/map/<map_id>', methods=['GET'])
def get_map():
    """
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
    """
    pass


@app.route('/dataset/<dataset_id>', methods=['GET']) 
def get_dataset():
    """
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
    """


@app.route('/get_map_metadata_list', methods=['POST'])
def get_map_metadata_list():
    """
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
    """
    pass


@app.route('/get_popular_map_metadata_list', methods=['GET'])
def get_popular_map_metadata_list():
    """
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
    """
    pass


@app.route('/get_dataset_metadata_list', methods=['POST'])
def get_dataset_metadata_list():
    """
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
    """
    pass


@app.route('/get_popular_dataset_metadata_list', methods=['GET'])
def get_popular_dataset_metadata_list():
    """
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
    """
    pass
