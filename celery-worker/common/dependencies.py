import crud
import models
import schemas
import httpx
from jose import jwt
from redis import Redis
from sqlalchemy.orm import Session
from data.sql.base import SessionLocal
from config.oauth2 import OAUTH_SECRET_KEY
from config.base import OFFICIAL, DEPLOY_HOSTS
from urllib.parse import urlparse
from fastapi import Request, HTTPException, status, Depends, Header
from config.base import UNION_PAY_URL_PREFIX

if OAUTH_SECRET_KEY is None:
    raise Exception("OAUTH_SECRET_KEY is not set")
    
async def get_request_host(request: Request) -> str | None:
    origin = request.headers.get("origin")
    if origin:
        return urlparse(origin).netloc

    referer = request.headers.get("referer")
    if referer:
        return urlparse(referer).netloc

    return None

async def check_deployed_by_official(
    host = Depends(get_request_host)
):
    # 检查是否是部署在官方的服务
    if host in DEPLOY_HOSTS:
        return True
    if OFFICIAL == 'True':
        return True
    return False

async def check_deployed_by_official_in_fuc():
    if OFFICIAL == 'True':
        return True
    return False

async def reject_if_official(
    host = Depends(get_request_host)
):
    # 如果不是部署着的服务 则可访问
    if host not in DEPLOY_HOSTS and OFFICIAL == 'False':
        return True
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

def decode_jwt_token(
    token: str, 
    secret_key: str = OAUTH_SECRET_KEY
):
    return jwt.decode(token, secret_key, algorithms=["HS256"])

def get_cache(request: Request) -> Redis:
    return request.app.state.redis

def get_api_key(
    api_key: str | None = Header(default=None), 
    db: Session = Depends(get_db)
):
    if api_key is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing API Key")
    db_api_key = crud.api_key.get_api_key_by_api_key(
        db=db, 
        api_key=api_key
    )
    if db_api_key is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid API Key")
    return db_api_key

def get_current_user_with_api_key(
    api_key: models.api_key.ApiKey = Depends(get_api_key),
    db: Session = Depends(get_db)
):
     user = crud.user.get_user_by_id(
         db=db, 
         user_id=api_key.user_id
        )
     return user

def get_real_ip(
    request: Request, 
    x_forwarded_for: str | None = Header(default=None)
) -> str | None:
    if x_forwarded_for:
        # 取第一个IP，因为X-Forwarded-For可能包含多个IP，由逗号分隔
        ip = x_forwarded_for.split(",")[0]
    else:
        if request.client:
            ip = request.client.host
        else:
            ip = None
    return ip

def get_authorization_header(
    authorization: str | None = Header(default=None)
):
    if authorization is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing authorization header")
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid authorization header format")
    return authorization.replace("Bearer ", "")

def get_current_user_without_throw(
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db)
):
    authenticate_value = "Bearer"
    if authorization is None or not authorization.startswith(authenticate_value):
        return None
    try:
        token = authorization.replace('Bearer ', '')
        payload = jwt.decode(token, OAUTH_SECRET_KEY, algorithms=['HS256'])
        uuid: str | None = payload.get("sub")
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
    return user

def get_current_user(
    authorization: str | None = Header(default=None), 
    db: Session = Depends(get_db)
):
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
        uuid: str | None = payload.get("sub")
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
    return user

async def plan_ability_checked_in_func(
    ability: str,
    authorization: str
):
    headers = { }
    if authorization is not None:
        headers.update({
            'Authorization': f'Bearer {authorization}'
        })
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f'{UNION_PAY_URL_PREFIX}/user/ability/check',
            headers=headers,
            json={
                "ability": ability
            }
        )
        if not response.is_success:
            return False
    return True
    

def plan_ability_checked(
    ability: str
):
    async def dependency(
        authorization: str | None = Header(default=None),
        deployed_by_official: bool = Depends(check_deployed_by_official)
    ):
        # 如果不是官方的部署 那么就直接返回True表示该能力可用
        if not deployed_by_official:
            return True

        headers = { }
        if authorization is not None:
            headers.update({
                'Authorization': f'{authorization}'
            })
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f'{UNION_PAY_URL_PREFIX}/user/ability/check',
                headers=headers,
                json={
                    "ability": ability
                }
            )
            if not response.is_success: 
                try:
                    errMsg = response.json().get("message")
                    raise schemas.error.CustomException(
                        message=errMsg, 
                        code=403
                    )
                except Exception as e:
                    raise schemas.error.CustomException(
                        message="Something is wrong with the ability check service", 
                        code=503
                    )
        return True
    return dependency
