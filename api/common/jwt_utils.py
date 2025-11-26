import models
import jwt
from datetime import datetime, timezone, timedelta
from config.oauth2 import OAUTH_SECRET_KEY

if OAUTH_SECRET_KEY is None:
    raise ValueError("OAUTH_SECRET_KEY is not set")

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
    encoded_jwt = jwt.encode(
        payload=to_encode, 
        key=OAUTH_SECRET_KEY, 
        algorithm='HS256',
        headers={"alg": 'HS256'}
    )
    return encoded_jwt

def create_token(
    user: models.user.User
):
    # 注意这里token生成使用的是uuid，而不是email
    data = {
        "sub": user.uuid
    }
    access_token = create_jwt(
        data, 
        expires_delta=timedelta(hours=1)
    )
    refresh_token = create_jwt(
        data, 
        expires_delta=timedelta(days=7)
    )
    return access_token, refresh_token