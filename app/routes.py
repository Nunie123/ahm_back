from datetime import datetime

from flask import render_template, request, flash, redirect, url_for, jsonify
from flask_login import current_user, login_user, logout_user, login_required
import simplejson as json

from app import app, db, models, file_handler
from app.forms import (RegistrationForm, LoginForm, PasswordForm, EmailForm,
                       SupportForm)
from app.email import send_email
from app.token import generate_confirmation_token, confirm_token
import app.helpers as helpers


@app.route('/', methods=['GET'])
def index():
    user_maps = []
    if current_user.is_authenticated:
        user_id = current_user.get_id()
        user_maps = models.Map.get_maps_by_owner(user_id)
        user_maps = [map.get_map_card_data() for map in user_maps]
        user_maps = user_maps[:3]
        for map in user_maps:
            user_map_link = file_handler.generate_image_path(map)
            map['s3_link'] = user_map_link

    community_maps = models.Map.get_most_viewed_maps()
    community_maps = [map.get_map_card_data() for map in community_maps]
    community_maps = community_maps[:3]
    for map in community_maps:
        community_map_link = file_handler.generate_image_path(map)
        map['s3_link'] = community_map_link
    return render_template('index.html', user_maps=user_maps,
                           community_maps=community_maps)


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
                                       ticket_number=ticket.get_id())
        subject = "Support ticket submitted"
        send_email(form.email.data, subject, confirmation)
        internal_ticket = render_template('support_ticket.html',
                                          email=form.email.data,
                                          name=form.name.data,
                                          ticket_number=ticket.get_id(),
                                          user_id=user_id,
                                          message=form.message.data)
        send_email(app.config['INTERNAL_RECIPIENTS'], subject, internal_ticket)
        msg = 'Thank you for your feedback. A ticket has been submitted.'
        flash(msg, 'success')
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
        user = models.User.query\
            .filter_by(email=form.email.data).first_or_404()
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
    except Exception:
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

    return render_template('reset_with_token.html',
                           title='Reset Password',
                           form=form, token=token)


@app.route('/authenticate-email/<token>', methods=['GET'])
def confirm_email(token):
    try:
        email = confirm_token(token)
    except Exception:
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
    print('start default', datetime.now())
    default_datasets = models.GeographicDataset.get_default_datasets()
    print('start personal', datetime.now())
    if current_user.is_authenticated:
        user_datasets = models.GeographicDataset.get_personal_datasets(current_user.user_id)
    else:
        user_datasets = []
    print('start favorite', datetime.now())
    if current_user.is_authenticated:
        favorite_datasets = models.GeographicDataset.get_favorite_datasets(current_user.datasets_favorited)
    else:
        favorite_datasets = []
    print('finish', datetime.now())
    return render_template('analysis.html',
                           default_dataset_list=default_datasets,
                           personal_dataset_list=user_datasets,
                           favorite_dataset_list=favorite_datasets,
                           preloaded_map=None)


@app.route('/analysis/<map_id>', methods=['GET'])
def get_map(map_id):
    user_map = models.Map.query.get(map_id)
    # map_dict = user_map.to_dict(rules=('-primary_dataset',
    #                                    '-secondary_dataset'))
    map_dict = user_map.get_preloaded_data()

    default_datasets = models.GeographicDataset.get_default_datasets()
    if current_user.is_authenticated:
        user_datasets = models.GeographicDataset.get_personal_datasets(current_user.user_id)
    else:
        user_datasets = []
    if current_user.is_authenticated:
        favorite_datasets = models.GeographicDataset.get_favorite_datasets(current_user.datasets_favorited)
    else:
        favorite_datasets = []

    mapView = models.MapView(map_id=map_id, user_id=current_user.get_id(), ip_address=request.remote_addr)
    db.session.add(mapView)
    db.session.commit()

    return render_template('analysis.html',
                           default_dataset_list=default_datasets,
                           user_dataset_list=user_datasets,
                           favorite_dataset_list=favorite_datasets,
                           preloaded_map=map_dict)


@login_required
@app.route('/analysis/save', methods=['POST'])
def save_map():
    params = request.get_json()
    if params.get('mapId'):
        print('saving existing map')
        print('map id:', params.get('mapId'))
        user_map = models.Map.query.get(params.get('mapId'))
    else:
        print('saving new map')
        user_map = models.Map()
        user_map.owner_id = current_user.user_id
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
    file_handler.upload_image(image_data, filename, 'thumbnails')
    user_map.map_thumbnail_link = filename
    db.session.commit()
    return jsonify(success=True)


@app.route('/analysis/get-attribute-years', methods=['GET'])
def get_attribute_year():
    dataset_id = request.args.get('datasetId')
    attribute_name = request.args.get('attributeName')
    distinct_year_list = models.GeographicAttribute.get_attribute_years(dataset_id, attribute_name)
    return jsonify(distinct_year_list)


@app.route('/analysis/get-data-attribute', methods=['GET'])
def get_data_attribute():
    dataset_id = request.args.get('datasetId')
    attribute_name = request.args.get('attributeName')
    attribute_year = request.args.get('attributeYear')
    if attribute_year == 'Unspecified Year':
        attribute_year = None
    attribute_list = models.GeographicAttribute.query\
        .filter_by(dataset_id=dataset_id,
                   attribute_name=attribute_name,
                   attribute_year=attribute_year).all()
    serialized_list = [attribute.to_dict() for attribute in attribute_list]
    return json.dumps(serialized_list)


@login_required
@app.route('/datasets/save', methods=['POST'])
def save_dataset():
    data = request.get_json()
    dataset_dict = data['metadata']
    dataset_dict['owner_id'] = current_user.user_id
    dataset_dict.pop('year', None)
    attributes = data['data']

    try:
        dataset = models.GeographicDataset(dataset_dict)
        db.session.add(dataset)
        db.session.flush()
        models.GeographicAttribute.bulk_insert(attributes, dataset.geographic_dataset_id)
        db.session.commit()
        return jsonify(success=True)
    except Exception as e:
        print(e)
        db.session.rollback()
        return jsonify(success=False, msg="Error occurred while saving to the database.")


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
        user_maps = [map.get_map_card_data() for map in user_maps]
        for map in user_maps:
            user_map_link = file_handler.generate_image_path(map)
            map['s3_link'] = user_map_link
        user_maps = helpers.convert_to_list_of_lists(user_maps, 3)

    if not current_user.is_authenticated:
        user_id = None
    community_maps = models.Map.get_community_maps(user_id)
    community_maps = [map.get_map_card_data() for map in community_maps]
    for map in community_maps:
        community_map_link = file_handler.generate_image_path(map)
        map['s3_link'] = community_map_link
    community_maps = helpers.convert_to_list_of_lists(community_maps, 3)
    return render_template('maps.html', user_maps=user_maps,
                           community_maps=community_maps)


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
    duplicate_fav = models.MapFavorite.query\
        .filter_by(map_id=map_id, user_id=current_user.user_id).first()
    if duplicate_fav:
        msg = "This map is already a favorite."
        return jsonify(success=False, msg=msg)
    try:
        fav = models.MapFavorite(map_id=map_id, user_id=current_user.user_id)
        db.session.add(fav)
        db.session.commit()
        return jsonify(success=True)
    except Exception as e:
        return jsonify(success=False, msg=e)


@login_required
@app.route('/maps/<map_id>/remove_favorite', methods=['GET'])
def remove_favorite(map_id):
    try:
        models.MapFavorite.query.filter_by(map_id=map_id, user_id=current_user.user_id).delete()
        db.session.commit()
        return jsonify(success=True)
    except Exception as e:
        return jsonify(success=False, msg=e)


@app.route('/datasets', methods=['GET'])
def datasets():
    if current_user.is_authenticated:
        user_datasets = models.GeographicDataset.get_datasets_and_attributes_by_owner(current_user.user_id)
        for dataset in user_datasets:
            dataset['attributes'] = helpers.convert_to_list_of_lists(dataset['attributes'], 2)
        favorite_datasets = models.GeographicDataset.get_favorite_datasets_and_attributes(current_user)
        for dataset in favorite_datasets:
            dataset['attributes'] = helpers.convert_to_list_of_lists(dataset['attributes'], 2)
    else:
        user_datasets = []
        favorite_datasets = []
    popular_datasets = models.GeographicDataset.get_popular_datasets_and_attributes()
    for dataset in popular_datasets:
        dataset['attributes'] = helpers.convert_to_list_of_lists(dataset['attributes'], 2)
    return render_template('datasets.html',
                           user_datasets=user_datasets,
                           favorite_datasets=favorite_datasets,
                           popular_datasets=popular_datasets)


@login_required
@app.route('/datasets/<dataset_id>/<attribute_name>/<year>/delete', methods=['GET'])
def delete_attribute(dataset_id, attribute_name, year):
    if not current_user.is_admin:
        return jsonify(success=False, msg='Only admin users can delete attributes.')
    attributes = models.GeographicAttribute.query\
        .filter_by(dataset_id=dataset_id,
                   attribute_name=attribute_name,
                   attribute_year=year).all()
    for attribute in attributes:
        attribute.deleted_at = datetime.now()
    db.session.commit()
    return jsonify(success=True)


@login_required
@app.route('/datasets/<dataset_id>/remove_owner', methods=['GET'])
def remove_dataset_owner(dataset_id):
    dataset = models.GeographicDataset.query.get(dataset_id)
    if current_user.user_id == dataset.owner_id or current_user.is_admin:
        dataset.owner_id = None
        db.session.commit()
        return jsonify(success=True)
    else:
        return jsonify(success=False, msg='Current user does not have permission to remove owner of this dataset.')


@login_required
@app.route('/datasets/<dataset_id>/add_favorite', methods=['GET'])
def add_dataset_favortie(dataset_id):
    duplicate_fav = models.GeographicDatasetFavorite.query\
        .filter_by(geographic_dataset_id=dataset_id, user_id=current_user.user_id).first()
    if duplicate_fav:
        msg = "This dataset is already a favorite."
        return jsonify(success=False, msg=msg)
    try:
        fav = models.GeographicDatasetFavorite(geographic_dataset_id=dataset_id, user_id=current_user.user_id)
        db.session.add(fav)
        db.session.commit()
        return jsonify(success=True)
    except Exception as e:
        return jsonify(success=False, msg=e)


@login_required
@app.route('/datasets/<dataset_id>/remove_favorite', methods=['GET'])
def remove_dataset_favorite(dataset_id):
    try:
        models.GeographicDatasetFavorite.query.filter_by(geographic_dataset_id=dataset_id, user_id=current_user.user_id).delete()
        db.session.commit()
        return jsonify(success=True)
    except Exception as e:
        return jsonify(success=False, msg=e)


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
