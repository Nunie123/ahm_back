FROM python:3.7
LABEL maintainer="Cantrip Technologies"

USER root

ENV HOME /root

RUN apt-get clean \
    && apt-get -y update

RUN apt-get -y install \
   build-essential \
   gcc \
   nginx \
   && pip install awscli --upgrade --ignore-installed \
   && rm -rf /var/cache/apk/*

# install Python dependencies
# use --ignore-installed to force re-installation of all packages into correct location
COPY requirements.txt /
RUN pip install -r /requirements.txt --ignore-installed

RUN mkdir /etc/my_init.d
COPY etc/scripts /etc/my_init.d
RUN chmod +x /etc/my_init.d/*.sh
# RUN chmod +x /etc/my_init.d/*.py

EXPOSE 80
COPY etc/configs/nginx.conf /etc/nginx/
COPY etc/configs/ahm-nginx.conf /etc/nginx/conf.d/
COPY etc/configs/uwsgi.ini /etc/uwsgi/

ENV S3_CONFIG_BUCKET notcreatedyet
ENV S3_COPY_CONFIG true
ENV S3_APP_CONFIG secrets.ini

ENV PAVE_DB false
ENV RUN_DB_SEEDS false
ENV RUN_DB_SAMPLES false

ENV APP_DIR /code
ENV CONFIG_DIR $APP_DIR/config
ENV APP_CONFIG_FILE $CONFIG_DIR/$S3_APP_CONFIG
ENV LOG_DIR  $APP_DIR/log
ENV LOG_FILE ahm.log

COPY . $APP_DIR

RUN mkdir $LOG_DIR --mode 6660 \
    && touch $LOG_DIR/$LOG_FILE \
    && chown -R www-data:www-data $APP_DIR \
    && chmod -R 774 $APP_DIR

WORKDIR /$APP_DIR
RUN chmod +x start.py
CMD ["./start.py"]