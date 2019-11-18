from datetime import datetime
from flask import render_template, request, flash, redirect, url_for, jsonify
from flask_login import current_user, login_user, logout_user, login_required
from app import app, db, models
from app.forms import RegistrationForm, LoginForm
from app.email import send_email
from app.token import generate_confirmation_token, confirm_token
from app import models
import app.helpers as helpers


@app.route('/', methods=['GET'])
def index():
    return render_template('index.html')


@app.route('/login', methods=['GET', 'POST'])
def login():
    if current_user.is_authenticated:
        return redirect(url_for('index'))
    form = LoginForm()
    if form.validate_on_submit():
        user = models.User.query.filter_by(email=form.email.data).first()
        if user is None or not user.check_password(form.password.data):
            flash('Invalid username or password')
            return redirect(url_for('login'))
        if user.is_email_authenticated:
            login_user(user, remember=form.remember_me.data)
            return redirect(url_for('index'))
        else:
            flash('Please authenticate email before signing in.')
    return render_template('login.html', title='Sign In', form=form)


@app.route('/logout', methods=['GET'])
def logout():
    logout_user()
    flash('You are now logged out')
    return redirect(url_for('index'))


@app.route('/register', methods=['GET', 'POST'])
def register():
    if current_user.is_authenticated:
        return redirect(url_for('index'))
    form = RegistrationForm()
    if form.validate_on_submit():
        user = models.User(username=form.username.data,
                           email=form.email.data)
        user.set_password(form.password.data)
        db.session.add(user)
        db.session.commit()
        token = generate_confirmation_token(user.email.lower())
        confirm_url = url_for('confirm_email', token=token, _external=True)
        html = render_template('activate.html', confirm_url=confirm_url)
        subject = "Please confirm your email"
        send_email(user.email, subject, html)
        flash('A confirmation email has been sent via email.', 'success')
        return redirect(url_for('login'))
    return render_template('register.html', title='Register', form=form)


@app.route('/authenticate-email/<token>', methods=['GET'])
def confirm_email(token):
    try:
        email = confirm_token(token)
    except:
        flash('The confirmation link is invalid or has expired.', 'danger')
    user = models.User.query.filter_by(email=email).first_or_404()
    if user.is_email_authenticated:
        flash('Account already confirmed. Please login.', 'success')
    else:
        user.is_email_authenticated = True
        db.session.commit()
        flash('You have confirmed your account. Thanks!', 'success')
    return redirect(url_for('login'))


@app.route('/register-admin', methods=['POST'])
def register_admin():
    """
    Only allow other admins access to endpoint.
    Take username/password/email
    send authentication email
    do not allow login until email authenticated
    redirect to home
    """
    pass


@app.route('/analysis', methods=['GET', 'POST'])
def analysis():
    default_datasets = models.GeographicDataset.query.filter_by(display_by_default=True).all()
    serialized_default = [row.to_dict(rules=('-geographic_attributes', 'distinct_geographic_attribute_names')) for row in default_datasets]
    user_datasets = []
    favorite_datasets = []
    return render_template('analysis.html'
                            , default_dataset_list=serialized_default
                            , user_dataset_list=user_datasets
                            , favorite_dataset_list=favorite_datasets)

@app.route('/get-attribute-years', methods=['GET'])
def get_attribute_year():
    dataset_id = request.args.get('datasetId')
    attribute_name = request.args.get('attributeName')
    year_rows = models.GeographicAttribute.query.with_entities(models.GeographicAttribute.attribute_year)\
        .filter_by(dataset_id=dataset_id, attribute_name=attribute_name)
    year_list = [row.attribute_year for row in year_rows]
    distinct_year_list = list(set(year_list))
    distinct_year_list.sort(reverse=True)
    return jsonify(distinct_year_list)

@app.route('/get-data-attribute', methods=['GET'])
def get_data_attribute():
    dataset_id = request.args.get('datasetId')
    attribute_name = request.args.get('attributeName')
    attribute_year = request.args.get('attributeYear')
    attribute_list = models.GeographicAttribute.query.filter_by(dataset_id=dataset_id, attribute_name=attribute_name, attribute_year=attribute_year)
    serialized_list = [row.to_dict(rules=('-geographic_dataset', '-geo_code', 'geo_name')) for row in attribute_list]
    return jsonify(serialized_list)

@login_required
@app.route('/save-dataset', methods=['POST'])
def save_dataset():
    data = request.get_json()
    dataset_dict = data['metadata']
    dataset_dict['owner_id'] = current_user.user_id
    dataset_dict.pop('year', None)
    attributes = data['data']

    dataset = models.GeographicDataset(**dataset_dict)
    models.GeographicAttribute.bulk_insert(attributes, dataset.geographic_dataset_id)
    return  jsonify(success=True)
    # try:
    #     dataset = models.GeographicDataset(**dataset_dict)
    #     db.session.add(dataset)
    #     db.session.commit()
    #     models.GeographicAttribute.bulk_insert(attributes, dataset.geographic_dataset_id)
    #     return jsonify(success=True)
    # except Exception as e:
    #     print(e)
    #     return jsonify(success=False)


@app.route('/explore', methods=['GET', 'POST'])
def explore():
    return render_template('explore.html')


@app.route('/portfolio', methods=['GET', 'POST'])
def portfolio():
    return render_template('portfolio.html')


@app.route('/settings', methods=['GET', 'POST'])
def settings():
    return render_template('settings.html')


@app.route('/tos', methods=['GET'])
def tos():
    return render_template('tos.html')


@app.route('/faq', methods=['GET'])
def faq():
    return render_template('faq.html')


@app.route('/about', methods=['GET'])
def about():
    return render_template('about.html')

@app.route('/dataset/<dataset_id>', methods=['GET'])
def dataset():
    return render_template('dataset.html')


# @app.route('/user/<user_id>', methods=['GET'])
# def get_user():
#     """
#     user_id
#     username
#     email
#     is_email_authenticated?
#     is_admin?
#     owned_dataset_ids
#     owned_map_ids
#     favorite_dataset_ids
#     favorite_map_id
#     """
#     pass


# @app.route('/user/<user_id>/update', methods=['POST'])
# def update_user():
#     """
#     Take: username, password, email (all optional)
#     update user based on id
#     user can only update self (except admin)
#     """
#     pass


# @app.route('/user/<user_id>/delete', methods=['GET'])
# def delete_user():
#     """
#     user can only delete self (except admin)
#     """
#     pass


# @app.route('/map/<map_id>', methods=['GET'])
# def get_map():
#     """
#     map_id
#     title
#     owner
#     dataset_ids
#     hex_colors
#     is_public?
#     zoom_level
#     center_coordinates
#     tags
#     comments
#     favorited_ids
#     fork_ids
#     view_count
#     distinct_ip_view_count
#     """
#     pass


# @app.route('/dataset/<dataset_id>', methods=['GET']) 
# def get_dataset():
#     """
#     dataset_id
#     dataset_name
#     data: [{fips_code, attribute_name, attribute_value, attribute_relative_weight},...]
#     owner
#     description
#     geo_border_level
#     is_public?
#     comments
#     tags
#     favorited_ids
#     fork_ids
#     view_count
#     distinct_ip_view_count
#     source: [{source_id, source_name, source_website, source_organization, publish_year},...]
#     """


# @app.route('/get_map_metadata_list', methods=['POST'])
# def get_map_metadata_list():
#     """
#     Take: list of map ids
#     send back list of:
#         map_id
#         title
#         owner
#         dataset_tags
#         map tags
#         favorited_ids
#         fork_ids
#         view_count
#         distinct_ip_view_count
#         map_thumbnail
#     """
#     pass


# @app.route('/get_popular_map_metadata_list', methods=['GET'])
# def get_popular_map_metadata_list():
#     """
#     send back list of:
#         map_id
#         title
#         owner
#         dataset_tags
#         map_tags
#         favorited_ids
#         fork_ids
#         view_count
#         distinct_ip_view_count
#         map_thumbnail
#     """
#     pass


# @app.route('/get_dataset_metadata_list', methods=['POST'])
# def get_dataset_metadata_list():
#     """
#     dataset_id
#     dataset_name
#     owner
#     description
#     geo_border_level
#     is_public?
#     tags
#     favorited_ids
#     fork_ids
#     view_count
#     distinct_ip_view_count
#     source: [{source_id, source_name, source_website, source_organization, publish_year},...]
#     """
#     pass


# @app.route('/get_popular_dataset_metadata_list', methods=['GET'])
# def get_popular_dataset_metadata_list():
#     """
#     dataset_id
#     dataset_name
#     owner
#     description
#     geo_border_level
#     is_public?
#     tags
#     favorited_ids
#     fork_ids
#     view_count
#     distinct_ip_view_count
#     source: [{source_id, source_name, source_website, source_organization, publish_year},...]
#     """
#     pass
