import jwt
import crud
import models
from pathlib import Path
from datetime import datetime, timezone, timedelta
from common.hash import verify_password
from config.oauth2 import SECRET_KEY, ALGORITHM

def create_jwt(data: dict, 
               expires_delta: timedelta | None = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
        to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(payload=to_encode, 
                             key=SECRET_KEY, 
                             algorithm=ALGORITHM,
                             headers={"alg": ALGORITHM})
    return encoded_jwt

def create_upload_token(user: models.user.User):
    data = {"sub": user.uuid}
    upload_token = create_jwt(data, expires_delta=timedelta(hours=1))
    return upload_token

def create_token(user: models.user.User):
    # 注意这里token生成使用的是uuid，而不是email
    data = {"sub": user.uuid}
    access_token = create_jwt(data, expires_delta=timedelta(hours=1))
    refresh_token = create_jwt(data, expires_delta=timedelta(days=7))
    return access_token, refresh_token

def authenticate_user(db, 
                      user_uuid: str, 
                      password: str):
    user = crud.user.get_user_by_uuid(db, 
                                      user_uuid=user_uuid)
    if not user:
        return False
    if not verify_password(user.hashed_password, password):
        return False
    return user

def is_dir_empty(path: str):
    return not any(Path(path).iterdir())