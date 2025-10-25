import crud
import schemas
import secrets
from fastapi import APIRouter, Depends, Cookie, status, Form
from fastapi.responses import RedirectResponse
from config.oauth2 import ISSUER
from starlette.responses import JSONResponse
from common.jwks import load_public_key
from sqlalchemy.orm import Session
from jose import jwt
from config.oauth2 import JWK_PUBLIC_PATH
from common.dependencies import get_db, get_real_ip, get_authorization_header
from fastapi.exceptions import HTTPException
from datetime import datetime, timezone, timedelta
from urllib.parse import urlencode
from common.hash import hash_password, verify_password

router = APIRouter()

# ==== OIDC 发现文档 ====
@router.get("/.well-known/openid-configuration")
def openid_configuration():
    return {
        "issuer": ISSUER,
        "authorization_endpoint": f"{ISSUER}/authorize",
        "token_endpoint": f"{ISSUER}/token",
        "userinfo_endpoint": f"{ISSUER}/userinfo",
        "jwks_uri": f"{ISSUER}/.well-known/jwks.json",
        "response_types_supported": ["code"],
        "subject_types_supported": ["public"],
        "id_token_signing_alg_values_supported": ["RS256"],
        "scopes_supported": ["openid", "profile", "email", "revornix.read", "revornix.write"],
        "token_endpoint_auth_methods_supported": ["client_secret_basic"],
        "grant_types_supported": ["authorization_code","refresh_token","client_credentials"],
        "code_challenge_methods_supported": ["S256"],
    }

@router.get("/.well-known/jwks.json")
def jwks():
    key = load_public_key()
    res = {
        "keys": [key]
    }
    return JSONResponse(res)


# ==== 授权页（演示：直接模拟登录通过，生产环境应有真实登录+consent） ====
@router.get("/authorize")
async def authorize_get(client_id: str,
                        redirect_uri: str,
                        db: Session = Depends(get_db),
                        authorization: str | None = Cookie(default=None),
                        ip: str = Depends(get_real_ip)):
    if authorization is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="authorization required"
        )
        
    db_client = crud.oauth.get_oauth_client_by_client_id(db=db, 
                                                         client_id=client_id)
    if db_client is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="client not found"
        )
    if redirect_uri not in db_client.redirect_uris:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="redirect_uri not match"
        )
    now = datetime.now(tz=timezone.utc)
    try:
        token = authorization.replace('Bearer ', '')
        payload = jwt.decode(token, JWK_PUBLIC_PATH.read_bytes(), algorithms=['EdDSA'])
        uuid: str | None = payload.get("sub")
        if uuid is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="invalid authorization"
            )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="invalid authorization"
        )
    user = crud.user.get_user_by_uuid(db=db, 
                                      user_uuid=uuid)
    if user is None:
        # 重定向到登录页并带上原请求参数，登录后再回到 /authorize
        params = urlencode({
            "client_id": client_id,
            "redirect_uri": redirect_uri,
        })
        login_url = f"/login?next=/authorize?{params}"
        return RedirectResponse(url=login_url, status_code=302)
    if user.is_forbidden:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are forbidden"
        )
    user.last_login_ip = ip
    user.last_login_time = now
    db.commit()
    db.refresh(user)
    code = secrets.token_urlsafe(32)
    crud.oauth.create_oauth_code(db=db,
                                 client_id=client_id,
                                 user_id=user.id,
                                 code=code,
                                 redirect_uri=redirect_uri)
    final_redirect_uri = f"{redirect_uri}?&code={code}"
    return RedirectResponse(url=final_redirect_uri, status_code=302)

# ==== 令牌端点 ====
@router.post("/token")
async def issue_token(
    db: Session = Depends(get_db),
    grant_type: str = Form(...),
    code: str = Form(...),
    redirect_uri: str = Form(...),
    client_id: str = Form(...),
    client_secret: str | None = Form(None),
    username: str | None = Form(None),
    password: str | None = Form(None),
):
    db_client = crud.oauth.get_oauth_client_by_client_id(db=db, 
                                                         client_id=client_id)
    if not db_client:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="invalid_client"
        )
    if db_client.is_confidential and db_client.client_secret != client_secret:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="invalid_client_secret"
        )

    # 授权码模式
    if grant_type == "authorization_code":
        if redirect_uri != db_client.redirect_uri:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="redirect_uri_mismatch"
            )

        # Step 3️⃣: 校验授权码
        db_code = crud.oauth.get_oauth_code_by_code(db=db, 
                                                    code=code)

        if not db_code:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="invalid_grant"
            )
        if db_code.is_used:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="authorization_code_already_used"
            )
        if db_code.auth_time + timedelta(minutes=5) < datetime.now(tz=timezone.utc):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="authorization_code_expired"
            )

        # Step 4️⃣: 标记授权码已用
        db_code.is_used = True
        db.commit()

        # Step 5️⃣: 生成 Access Token (JWT)
        now = datetime.now(tz=timezone.utc)
        
        db_user = crud.user.get_user_by_id(db=db, 
                                        user_id=db_code.user_id)
        if db_user.is_forbidden:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="user_forbidden")
        
        payload = {
            "iss": ISSUER,
            "sub": db_user.uuid,
            "aud": client_id,
            "iat": int(now.timestamp()),
            "exp": int((now + timedelta(seconds=3600)).timestamp()),
            "scope": db_code.scope,
        }

        access_token = jwt.encode(claims=payload, 
                                key=JWK_PUBLIC_PATH.read_bytes(), 
                                algorithm='EdDSA')

        # Step 6️⃣: 可选生成 Refresh Token
        refresh_token = secrets.token_urlsafe(48)

        # 存储 refresh_token（如有需要）
        crud.oauth.create_oauth_token(
            db=db,
            client_id=client_id,
            user_id=db_code.user_id,
            access_token=access_token,
            refresh_token=refresh_token,
            expires_in=3600 * 7
        )

        # Step 7️⃣: 返回令牌响应
        return {
            "access_token": access_token,
            "token_type": "Bearer",
            "expires_in": 3600,
            "refresh_token": refresh_token,
            "scope": db_code.scope,
        }
    # 密码模式 (纯 API 登录)
    elif grant_type == "password":
        if not username or not password:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="missing_username_or_password")

        # 查找用户（支持 EmailUser / PhoneUser）
        db_email_user = crud.user.get_user_by_email(db=db, 
                                                    email=username)

        user = db_email_user
        if not user:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="invalid_user")

        # 校验密码
        if not verify_password(user.hashed_password, password):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="invalid_password")

        if user.is_forbidden:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="user_forbidden")

        now = datetime.now(tz=timezone.utc)
        payload = {
            "iss": ISSUER,
            "sub": user.uuid,
            "aud": client_id,
            "iat": int(now.timestamp()),
            "exp": int((now + timedelta(hours=1)).timestamp()),
            "scope": "openid profile email revornix.read revornix.write",
        }

        access_token = jwt.encode(
            claims=payload,
            key=JWK_PUBLIC_PATH.read_bytes(),
            algorithm="EdDSA"
        )
        refresh_token = secrets.token_urlsafe(48)

        crud.oauth.create_oauth_token(
            db=db,
            client_id=client_id,
            user_id=user.id,
            access_token=access_token,
            refresh_token=refresh_token,
            expires_in=3600 * 7
        )

        return {
            "access_token": access_token,
            "token_type": "Bearer",
            "expires_in": 3600,
            "refresh_token": refresh_token,
            "scope": payload["scope"],
        }
        
    elif grant_type == "client_credentials":
        if not db_client:
            raise HTTPException(status_code=401, detail="invalid_client")
        if db_client.is_confidential and db_client.client_secret != client_secret:
            raise HTTPException(status_code=401, detail="invalid_client_secret")

        now = datetime.now(tz=timezone.utc)
        payload = {
            "iss": ISSUER,
            "sub": client_id,  # 这里没有用户，所以主体是客户端自身
            "aud": ISSUER,
            "iat": int(now.timestamp()),
            "exp": int((now + timedelta(hours=1)).timestamp()),
            "scope": " ".join(db_client.scopes or ["revornix.read"]),
            "client_credentials": True
        }

        access_token = jwt.encode(
            claims=payload,
            key=JWK_PUBLIC_PATH.read_bytes(),
            algorithm="EdDSA"
        )

        return {
            "access_token": access_token,
            "token_type": "Bearer",
            "expires_in": 3600,
            "scope": payload["scope"]
        }
    else:
        raise HTTPException(400, "unsupported_grant_type")
        
# ==== UserInfo ====
@router.get("/userinfo")
async def userinfo(authorization: str = Depends(get_authorization_header),
                   db: Session = Depends(get_db)):
    try:
        token = authorization.replace('Bearer ', '')
        payload = jwt.decode(token, JWK_PUBLIC_PATH.read_bytes(), algorithms=['HS256'])
        uuid: str | None = payload.get("sub")
        if uuid is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="invalid_token_payload",
            )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="invalid_token_signature_or_expired",
        )

    db_token = crud.oauth.get_oauth_token_by_access_token(db=db, 
                                                          access_token=token)
    if not db_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="token_revoked_or_not_found",
        )
    if db_token.issued_at + timedelta(seconds=db_token.expires_in) < datetime.now(tz=timezone.utc):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="token_expired",
        )

    db_user = crud.user.get_user_by_uuid(db=db, 
                                         user_uuid=uuid)
    if not db_user or db_user.is_forbidden:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="user not found or forbidden",
        )

    # Step 5️⃣: 返回符合 OIDC 的 UserInfo 响应
    return {
        "sub": uuid,
        "name": db_user.nickname,
        "email": db_user.email,
        "email_verified": True,
        "updated_at": db_user.update_time.timestamp(),
        "iss": ISSUER,
    }