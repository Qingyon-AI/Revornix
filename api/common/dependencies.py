import crud
import schemas
import models
from jose import jwt
from redis import Redis
from typing import Annotated
from sqlalchemy.orm import Session
from common.sql import SessionLocal
from datetime import datetime, timezone
from config.oauth2 import SECRET_KEY, ALGORITHM
from fastapi.encoders import jsonable_encoder
from fastapi import Request, HTTPException, status, Depends, Header, Cookie, Query, WebSocketException

def get_db():
    db = SessionLocal()
    try:
        yield db
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()

def get_cache(request: Request) -> Redis:
    return request.app.state.redis

async def get_cookie_or_token(
    access_token: Annotated[str | None, Cookie()] = None,
    token: Annotated[str | None, Query()] = None,
) -> str | None:
    return access_token or token

async def get_current_user_with_websocket(
    token: Annotated[str | None, Depends(get_cookie_or_token)],
    db: Session = Depends(get_db),
) -> models.user.User:
    if token is None:
        raise WebSocketException(code=status.WS_1008_POLICY_VIOLATION)
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        uuid: str = payload.get("sub")
        if uuid is None:
            raise WebSocketException(code=status.WS_1008_POLICY_VIOLATION)
    except Exception as e:
        raise WebSocketException(code=status.WS_1008_POLICY_VIOLATION)
    user = crud.user.get_user_by_uuid(db, user_uuid=uuid)
    return user

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
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
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