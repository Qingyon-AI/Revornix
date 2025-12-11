import crud
import models
import schemas
from jose import jwt
from redis import Redis
from sqlalchemy.orm import Session
from common.sql import SessionLocal
from datetime import datetime, timezone
from config.oauth2 import OAUTH_SECRET_KEY
from config.base import OFFICIAL, DEPLOY_HOSTS
from fastapi import Request, HTTPException, status, Depends, Header

if OAUTH_SECRET_KEY is None:
    raise Exception("OAUTH_SECRET_KEY is not set")

async def get_request_host(request: Request) -> str:
    host = (
        request.headers.get("x-forwarded-host")
        or request.headers.get("host")
        or request.url.hostname
    )

    if host is None:
        raise ValueError("Host not found in request")

    return host

async def check_deployed_by_official(
    host = Depends(get_request_host)
):
    # 如果不是部署着的服务 则可访问
    if host not in DEPLOY_HOSTS:
        return
    # 如果不是官方部署的 则可访问
    if OFFICIAL == 'False':
        return
    raise schemas.error.CustomException(message='This api is only available for local use, and is disabled in the official deployment version', code=403)

def get_db():
    db = SessionLocal()
    try:
        yield db
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()

def decode_jwt_token(token: str, secret_key: str = OAUTH_SECRET_KEY):
    return jwt.decode(token, secret_key, algorithms=["HS256"])

def get_cache(request: Request) -> Redis:
    return request.app.state.redis

def get_api_key(api_key: str | None = Header(default=None), 
                db: Session = Depends(get_db)) -> models.api_key.ApiKey:
    db_api_key = crud.api_key.get_api_key_by_api_key(db=db, 
                                                     api_key=api_key)
    if db_api_key is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid API Key")
    return db_api_key

def get_current_user_with_api_key(api_key: models.api_key.ApiKey = Depends(get_api_key),
                                  db: Session = Depends(get_db)) -> models.user.User:
     user = crud.user.get_user_by_id(db=db, 
                                     user_id=api_key.user_id)
     return user

def get_real_ip(request: Request, 
                x_forwarded_for: str | None = Header(default=None)) -> str:
    if x_forwarded_for:
        # 取第一个IP，因为X-Forwarded-For可能包含多个IP，由逗号分隔
        ip = x_forwarded_for.split(",")[0]
    else:
        ip = request.client.host
    return ip

def get_authorization_header(authorization: str | None = Header(default=None)) -> str:
    if authorization is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing authorization header")
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid authorization header format")
    return authorization.replace("Bearer ", "")

def get_current_user_without_throw(authorization: str | None = Header(default=None),
                                   db: Session = Depends(get_db),
                                   ip: str = Depends(get_real_ip)):
    now = datetime.now(timezone.utc)
    authenticate_value = "Bearer"
    if authorization is None or not authorization.startswith(authenticate_value):
        return None
    try:
        token = authorization.replace('Bearer ', '')
        payload = jwt.decode(token, OAUTH_SECRET_KEY, algorithms=['HS256'])
        uuid: str = payload.get("sub")
        if uuid is None:
            return None
    except Exception as e:
        return None
    user = crud.user.get_user_by_uuid(db, user_uuid=uuid)
    if user is None:
        return None
    if user.is_forbidden:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are forbidden"
        )
    user.last_login_ip = ip
    user.last_login_time = now
    db.commit()
    db.refresh(user)
    return user

def get_current_user(authorization: str | None = Header(default=None), 
                     db: Session = Depends(get_db), 
                     ip: str = Depends(get_real_ip)):
    now = datetime.now(timezone.utc)
    authenticate_value = "Bearer"
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials"
    )
    if authorization is None or not authorization.startswith(authenticate_value):
        raise credentials_exception
    try:
        token = authorization.replace('Bearer ', '')
        payload = jwt.decode(token, OAUTH_SECRET_KEY, algorithms=['HS256'])
        uuid: str = payload.get("sub")
        if uuid is None:
            raise credentials_exception
    except Exception as e:
        raise credentials_exception
    user = crud.user.get_user_by_uuid(db, user_uuid=uuid)
    if user is None:
        raise credentials_exception
    if user.is_forbidden:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are forbidden"
        )
    user.last_login_ip = ip
    user.last_login_time = now
    db.commit()
    db.refresh(user)
    return user