import boto3
import io
import base64
import logging
from app import app
from botocore.exceptions import ClientError
from botocore.client import Config

session = boto3.Session(
    aws_access_key_id=app.config['AWS_PUBLIC_KEY'],
    aws_secret_access_key=app.config['AWS_PRIVATE_KEY']
)

def upload_image(image_data, image_name, folder):
    s3 = session.client('s3')
    out_img = io.BytesIO()
    out_img.write(base64.decodebytes(image_data))
    out_img.seek(0)
    try:
        s3.put_object(Bucket=app.config['S3_BUCKET'],
                      Key=f'{folder}/{image_name}',
                      Body=out_img)
    except IOError:
        raise Exception


def download_file(file_name, folder):
    s3 = session.reasource('s3')
    output = f"/{folder}/{file_name}"
    s3.Bucket(app.config['S3_BUCKET']).download_file(file_name, output)

    return output

def delete_image():

    return None

def list_files(bucket):
    contents = []
    for item in session.list_objects(Bucket=bucket)['Contents']:
        contents.append(item)

    return contents

def generate_image_path(image):
    s3 = session.client('s3')
    try:
        raw_image = image['map_thumbnail_link']
        url = s3.generate_presigned_url('get_object',
                                        Params={
                                                'Bucket': app.config['S3_BUCKET'],
                                                'Key': f'thumbnails/{raw_image}'
                                        },
                                        ExpiresIn=3600)
    except Exception as e:
        logging.error(e)
        url = None
        pass

    return url