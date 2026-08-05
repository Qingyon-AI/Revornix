import os

# to get a string like this run:
# openssl rand -hex 32
OAUTH_SECRET_KEY = os.environ.get("OAUTH_SECRET_KEY")
