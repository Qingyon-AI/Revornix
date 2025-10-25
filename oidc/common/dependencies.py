import crud
from jose import jwt
from redis import Redis
from common.sql import SessionLocal
from fastapi import Request
from fastapi import Depends, HTTPException, status, Header
from sqlalchemy.orm import Session
from datetime import datetime, timezone
from config.oauth2 import JWK_PUBLIC_PATH

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

def get_real_ip(request: Request, 
                x_forwarded_for: str | None = Header(default=None)) -> str:
    if x_forwarded_for:
        # 取第一个IP，因为X-Forwarded-For可能包含多个IP，由逗号分隔
        ip = x_forwarded_for.split(",")[0]
    else:
        request_client = request.client
        if request_client is not None:
            ip = request_client.host
        else:
            raise Exception("Unable to get real IP")
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
        payload = jwt.decode(token, JWK_PUBLIC_PATH.read_bytes(), algorithms=['EdDSA'])
        uuid: str | None = payload.get("sub")
        if uuid is None:
            return None
    except Exception as e:
        return None
    db_user = crud.user.get_user_by_uuid(db=db, 
                                         user_uuid=uuid)
    if db_user is None:
        return None
    if bool(db_user.is_forbidden):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="user is forbidden"
        )
    db_user.last_login_ip = ip
    db_user.last_login_time = now
    db.commit()
    db.refresh(db_user)
    return db_user
