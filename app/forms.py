from flask_wtf import FlaskForm
from wtforms import PasswordField, BooleanField, SubmitField, StringField
from wtforms.validators import DataRequired, Email, EqualTo, InputRequired, ValidationError
from wtforms.fields.html5 import EmailField
from app.models import User


class RegistrationForm(FlaskForm):
    username = StringField('Username', validators=[DataRequired()])
    email = StringField('Email', validators=[DataRequired(), Email()])
    password = PasswordField('Password', validators=[DataRequired()])
    password2 = PasswordField(
        'Repeat Password', validators=[DataRequired(), EqualTo('password')])
    submit = SubmitField('Register')

    def validate_username(self, username):
        user = User.query.filter_by(username=username.data).first()
        if user is not None:
            raise ValidationError('Please use a different username.')

    def validate_email(self, email):
        user = User.query.filter_by(email=email.data).first()
        if user is not None:
            raise ValidationError('Please use a different email address.')


class LoginForm(FlaskForm):
    email = EmailField(
        'Email',
        validators=[
            InputRequired("Please enter your email address."),
            Email("This field requires a valid email address")
        ]
    )
    password = PasswordField(
        'Password',
        validators=[
            InputRequired("Please enter your password.")
        ]
    )
    remember_me = BooleanField('Remember Me')
    submit = SubmitField('Sign In')
