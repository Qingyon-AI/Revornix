from datetime import datetime, timedelta, timezone

import jwt

import models
from config.oauth2 import OAUTH_SECRET_KEY

if OAUTH_SECRET_KEY is None:
    raise ValueError("OAUTH_SECRET_KEY is not set")

ACCESS_TOKEN_TYPE = "access"
REFRESH_TOKEN_TYPE = "refresh"

ACCESS_TOKEN_EXPIRES = timedelta(hours=1)
REFRESH_TOKEN_EXPIRES = timedelta(days=7)


def create_jwt(
    data: dict,
    expires_delta: timedelta | None = None
):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
        to_encode.update(
            {
                "exp": expire
            }
        )
    return jwt.encode(
        payload=to_encode,
        key=OAUTH_SECRET_KEY,
        algorithm='HS256',
        headers={"alg": 'HS256'}
    )


def create_token(
    user: models.user.User
):
    # 注意这里token生成使用的是uuid，而不是email
    access_token = create_jwt(
        {"sub": user.uuid, "type": ACCESS_TOKEN_TYPE},
        expires_delta=ACCESS_TOKEN_EXPIRES,
    )
    refresh_token = create_jwt(
        {"sub": user.uuid, "type": REFRESH_TOKEN_TYPE},
        expires_delta=REFRESH_TOKEN_EXPIRES,
    )
    return access_token, refresh_token
