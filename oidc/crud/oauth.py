import models
import uuid
from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import Session

def create_oauth_code(
    db: Session,
    client_id: str,
    user_id: int,
    code: str,
    redirect_uri: str
):
    db_code = models.oauth.OAuth2AuthorizationCode(
        client_id=client_id,
        user_id=user_id,
        code=code,
        redirect_uri=redirect_uri
    )
    db.add(db_code)
    db.flush()
    return db_code

def create_oauth_token(
    db: Session,
    client_id: str,
    user_id: int,
    access_token: str,
    refresh_token: str,
    expires_in: int
):
    db_token = models.oauth.OAuth2Token(
        client_id=client_id,
        user_id=user_id,
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=expires_in
    )
    db.add(db_token)
    db.flush()
    return db_token   

def create_oauth_client(
    db: Session, 
    name: str, 
    description: str | None,
    redirect_uris: list[str]
):
    client_id = uuid.uuid4().hex
    client_secret = uuid.uuid4().hex
    db_client = models.oauth.OAuth2Client(client_id=client_id,
                                          client_secret=client_secret,
                                          redirect_uris=redirect_uris,
                                          name=name,
                                          description=description)
    db.add(db_client)
    db.flush()
    return db_client

def get_oauth_code_by_code(
    db: Session,
    code: str
):
    now = datetime.now(timezone.utc)
    query = db.query(models.oauth.OAuth2AuthorizationCode)
    query = query.filter(models.oauth.OAuth2AuthorizationCode.code == code,
                         models.oauth.OAuth2AuthorizationCode.is_used == False,
                         models.oauth.OAuth2AuthorizationCode.delete_at == None,
                         models.oauth.OAuth2AuthorizationCode.auth_time + timedelta(minutes=5) > now)
    return query.one_or_none()

def get_oauth_token_by_access_token(
    db: Session,
    access_token: str
):
    query = db.query(models.oauth.OAuth2Token)
    query = query.filter(models.oauth.OAuth2Token.access_token == access_token,
                         models.oauth.OAuth2Token.revoked == False)
    return query.one_or_none()

def get_oauth_token_by_refresh_token(
    db: Session,
    refresh_token: str
):
    query = db.query(models.oauth.OAuth2Token)
    query = query.filter(models.oauth.OAuth2Token.refresh_token == refresh_token,
                         models.oauth.OAuth2Token.revoked == False)
    return query.one_or_none()

# 同一时间内，可能存在多个客户端访问，所以同一用户可能存在多个token
def get_oauth_tokens_by_user_id(
    db: Session,
    user_id: str
):
    query = db.query(models.oauth.OAuth2Token)
    query = query.filter(models.oauth.OAuth2Token.user_id == user_id,
                         models.oauth.OAuth2Token.revoked == False)
    return query.all()

def get_oauth_client_by_client_id(
    db: Session,
    client_id: str
):
    query = db.query(models.oauth.OAuth2Client)
    query = query.filter(models.oauth.OAuth2Client.client_id == client_id,
                         models.oauth.OAuth2Client.delete_at == None)
    return query.one_or_none()

def get_oauth_client_by_id(
    db: Session,
    client_id: int
):
    query = db.query(models.oauth.OAuth2Client)
    query = query.filter(models.oauth.OAuth2Client.id == client_id,
                         models.oauth.OAuth2Client.delete_at == None)
    return query.one_or_none()

def delete_oauth_client(
    db: Session, 
    client_id: str
):
    now = datetime.now(timezone.utc)
    db_client = db.query(models.oauth.OAuth2Client).filter(models.oauth.OAuth2Client.client_id == client_id,
                                                           models.oauth.OAuth2Client.delete_at == None)
    db_client.update({
        models.oauth.OAuth2Client.delete_at: now
    })
    db.flush()
    
def delete_oauth_token(
    db: Session, 
    access_token: str
):
    now = datetime.now(timezone.utc)
    db_token = db.query(models.oauth.OAuth2Token).filter(models.oauth.OAuth2Token.access_token == access_token)
    db_token.update({
        models.oauth.OAuth2Token.delete_at: now
    })
    db.flush()
    
def delete_oauth_code(
    db: Session, 
    code: str
):
    now = datetime.now(timezone.utc)
    db_code = db.query(models.oauth.OAuth2AuthorizationCode).filter(models.oauth.OAuth2AuthorizationCode.code == code)
    db_code.update({
        models.oauth.OAuth2AuthorizationCode.delete_at: now
    })
    db.flush()