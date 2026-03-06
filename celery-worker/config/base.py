import os
from pathlib import Path

WEB_BASE_URL = os.environ.get('WEB_BASE_URL')

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

DEPLOY_HOSTS = os.environ.get('DEPLOY_HOSTS', 'localhost').split(',')
OFFICIAL = os.environ.get('OFFICIAL')

UNION_PAY_URL_PREFIX = os.environ.get('UNION_PAY_URL_PREFIX')

ROOT_USER_NAME = os.environ.get('ROOT_USER_NAME')
ROOT_USER_PASSWORD = os.environ.get('ROOT_USER_PASSWORD')