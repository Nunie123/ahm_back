#!/usr/bin/env sh

if [ "$S3_COPY_CONFIG" = "true" ]; then
    echo "copying config files from S3"
    mkdir -p $CONFIG_DIR   ;
    aws s3 cp s3://$S3_CONFIG_BUCKET/$S3_APP_CONFIG $CONFIG_DIR/$S3_APP_CONFIG
fi
