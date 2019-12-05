from datetime import datetime
import os
import base64
from flask import render_template, request, flash, redirect, url_for, jsonify
from flask_login import current_user, login_user, logout_user, login_required
from sqlalchemy.orm.session import make_transient_to_detached
from app import app, db, models
from app.forms import RegistrationForm, LoginForm, PasswordForm, EmailForm, SupportForm
from app.email import send_email
from app.token import generate_confirmation_token, confirm_token
from app import models
import app.helpers as helpers


@app.route('/', methods=['GET'])
def index():
    user_id = current_user.get_id()
    user_maps = models.Map.query.filter_by(owner_id=user_id).filter(models.Map.map_thumbnail_link != None).all()
    all_maps = models.Map.query.filter(models.Map.map_thumbnail_link != None).limit(5).all()
    return render_template('index.html', user_maps=user_maps, all_maps=all_maps)

@app.route('/support', methods=['GET', 'POST'])
def support():
    form = SupportForm()
    if form.validate_on_submit():
        if current_user.is_authenticated:
            user_id = current_user.get_id()
        else:
            user_id = None
        ticket = models.SupportTicket(user_email=form.email.data,
                                      user_name=form.name.data,
                                      user_id=user_id,
                                      user_message=form.message.data
                                      )
        db.session.add(ticket)
        db.session.commit()
        confirmation = render_template('support_email.html',
                                       ticket=ticket.get_id())
        subject = "Support ticket submitted"
        send_email(form.email.data, subject, confirmation)
        internal_ticket = render_template('support_ticket.html',
                                          email=form.email.data,
                                          name=form.name.data,
                                          ticket_number=ticket.get_id(),
                                          user_id=user_id,
                                          message=form.message.data)
        send_email(app.config['INTERNAL_RECIPIENTS'], subject, internal_ticket)
        flash('Thank you for your feedback. A ticket has been submitted.', 'success')
        return redirect(url_for('index'))
    return render_template('support.html', title='Support', form=form)



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

@app.route('/reset', methods=["GET", "POST"])
def reset():
    form = EmailForm()
    if form.validate_on_submit():
        user = models.User.query.filter_by(email=form.email.data).first_or_404()
        subject = "Password reset requested"
        token = generate_confirmation_token(user.email.lower())
        print(token)
        recover_url = url_for(
            'reset_with_token',
            token=token,
            _external=True)
        html = render_template(
            'recover.html',
            recover_url=recover_url)
        send_email(user.email, subject, html)
        flash('A reset link been sent via email.', 'success')
        return redirect(url_for('index'))
    return render_template('reset.html', form=form)


@app.route('/reset/<token>', methods=["GET", "POST"])
def reset_with_token(token):
    try:
        email = confirm_token(token)
    except:
        flash('The reset link is invalid or has expired.', 'danger')
    form = PasswordForm()
    if form.validate_on_submit():
        user = models.User.query.filter_by(email=email).first_or_404()
        user.set_password(form.password.data)
        user.is_email_authenticated = True
        db.session.add(user)
        db.session.commit()
        flash('Password reset.', 'success')
        return redirect(url_for('login'))

    return render_template('reset_with_token.html', title='Reset Password', form=form, token=token)


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
    if current_user.is_authenticated:
        user_datasets = models.GeographicDataset.query.filter_by(owner_id=current_user.user_id).all()
        user_datasets = [row.to_dict(rules=('-geographic_attributes', 'distinct_geographic_attribute_names')) for row
                            in user_datasets]
    else:
        user_datasets = []
    favorite_datasets = []
    return render_template('analysis.html'
                            , default_dataset_list=serialized_default
                            , personal_dataset_list=user_datasets
                            , favorite_dataset_list=favorite_datasets)

@app.route('/analysis/<map_id>', methods=['GET'])
def get_map(map_id):
    user_map = models.Map.query.get(map_id)
    map_dict = user_map.to_dict(rules=('-primary_dataset', '-secondary_dataset'))
    default_datasets = models.GeographicDataset.query.filter_by(display_by_default=True).all()
    serialized_default = [row.to_dict(rules=('-geographic_attributes', 'distinct_geographic_attribute_names')) for row in default_datasets]
    user_datasets = []
    favorite_datasets = []
    mapView = models.MapView(map_id=map_id, user_id=current_user.get_id(), ip_address=request.remote_addr)
    db.session.add(mapView)
    db.session.commit()
    return render_template('analysis.html'
                            , default_dataset_list=serialized_default
                            , user_dataset_list=user_datasets
                            , favorite_dataset_list=favorite_datasets
                            , preloaded_map=map_dict)

@login_required
@app.route('/analysis/save', methods=['POST'])
def save_map():
    params = request.get_json()
    params['owner_id'] = current_user.user_id
    if params.get('mapId'):
        user_map = models.Map.query.get(params.get('mapId'))
    else:
        user_map = models.Map()
        db.session.add(user_map)
    user_map.primary_dataset_id = params.get('dataset1')
    user_map.secondary_dataset_id = params.get('dataset2')
    user_map.attribute_name_1 = params.get('attribute1')
    user_map.attribute_name_2 = params.get('attribute2')
    user_map.attribute_year_1 = params.get('year1')
    user_map.attribute_year_2 = params.get('year2')
    user_map.hex_color_1 = params.get('color1')
    user_map.hex_color_2 = params.get('color2')
    user_map.title = params.get('title', '')
    user_map.owner_id = params.get('owner_id')
    user_map.is_public = params.get('isPublic')
    user_map.zoom_level = params.get('zoom')
    user_map.center_coordinates = params.get('coordinates')
    user_map.save()

    return jsonify(success=True, map_id=user_map.map_id)

@login_required
@app.route('/analysis/<int:map_id>/save-thumbnail', methods=['POST'])
def save_thumbnail(map_id):
    raw_image = request.data
    image_data = raw_image[raw_image.find(b'base64')+7:]
    user_map = models.Map.query.get(map_id)
    filename = f'{user_map.title}_{map_id}.jpg'
    thumbnail_link = f'static/thumbnails/{filename}'
    filepath = 'app/' + thumbnail_link
    with open(filepath, "wb") as fh:
        fh.write(base64.decodestring(image_data))
    user_map.map_thumbnail_link = thumbnail_link
    db.session.commit()
    return jsonify(success=True)

# @app.route('/analysis/<int:map_id>/get-thumbnail-url', methods=['GET'])
# def get_thumbnail_url(map_id):
#     user_map = models.Map.query.get(map_id)
#     filename = user_map.map_thumbnail_link
#     url = url_for('static', filename=f'thumbnails/{filename}', _external=True)
#     return jsonify(success=True, url=url)

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

    dataset = models.GeographicDataset(dataset_dict)
    db.session.add(dataset)
    db.session.commit()
    models.GeographicAttribute.bulk_insert(attributes, dataset.geographic_dataset_id)
    return jsonify(success=True)

@app.errorhandler(404)
def page_not_found(e):
    return render_template('404.html'), 404

@app.errorhandler(500)
def page_error(e):
    db.session.rollback()
    return render_template('500.html'), 500

@app.route('/maps', methods=['GET'])
def maps():
    user_maps = []
    if current_user.is_authenticated:
        user_id = current_user.get_id()
        user_maps = models.Map.get_maps_by_owner(user_id)
        user_maps = [ map.get_map_card_data() for map in user_maps ]
        user_maps = helpers.group_list_by_threes(user_maps)

    community_maps = models.Map.get_most_viewed_maps()
    community_maps = [ map.get_map_card_data() for map in community_maps ]
    community_maps = helpers.group_list_by_threes(community_maps)
    return render_template('maps.html', user_maps=user_maps, community_maps=community_maps)

@login_required
@app.route('/maps/<map_id>/remove_owner', methods=['GET'])
def remove_owner(map_id):
    this_map = models.Map.query.get(map_id)
    if this_map.owner_id == current_user.user_id or current_user.is_admin:
        this_map.remove_owner()
        return jsonify(success=True)
    else:
        return jsonify(success=False, msg='Permission denied.')


@login_required
@app.route('/maps/<map_id>/add_favorite', methods=['GET'])
def add_favorite(map_id):
    duplicate_fav = models.MapFavorite.query.filter_by(map_id=map_id, user_id=current_user.user_id).first()
    if duplicate_fav:
        msg = "This map is already a favorite."
        flash(msg)
        return jsonify(success=False, msg=msg)
    try:
        fav = models.MapFavorite(map_id=map_id, user_id=current_user.user_id)
        db.session.add(fav)
        db.session.commit()
        flash('Added to Favorites.')
        return jsonify(success=True)
    except Exception as e:
        return jsonify(success=False, msg=e)


@app.route('/datasets', methods=['GET'])
def datasets():
    return render_template('datasets.html')

@app.route('/dataset/<dataset_id>', methods=['GET'])
def dataset():
    return render_template('dataset.html')

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
