import models
import string
import random
import uuid
from datetime import datetime, timezone
from common.hash import hash_password
from sqlalchemy.orm import Session

def create_wechat_user(db: Session, 
                       user_id: int, 
                       wechat_user_open_id: str, 
                       wechat_user_union_id: str, 
                       wechat_user_name: str):
    query = db.query(models.user.User)
    query = query.filter(models.user.User.id == user_id,
                         models.user.User.delete_at == None)
    db_user = query.first()
    if db_user is None:
        raise Exception("The base info of the wechat user you want to create is not exist")
    db_wechat_user = models.user.WechatUser(user_id=user_id,
                                            wechat_user_open_id=wechat_user_open_id,
                                            wechat_user_union_id=wechat_user_union_id,
                                            wechat_user_name=wechat_user_name)
    db.add(db_wechat_user)
    db.flush()
    return db_wechat_user

def create_phone_user(db: Session, 
                      user_id: int, 
                      phone: str):
    query = db.query(models.user.User)
    query = query.filter(models.user.User.id == user_id,
                         models.user.User.delete_at == None)
    db_user = query.first()
    if db_user is None:
        raise Exception("The base info of the phone user you want to create is not exist")
    
    db_phone_user = models.user.PhoneUser(user_id=user_id, 
                                          phone=phone)
    db.add(db_phone_user)
    db.flush()
    return db_phone_user

def create_follow_user_record(db: Session, 
                              from_user_id: int, 
                              to_user_id: int):
    now = datetime.now(timezone.utc)
    db_follow_user = models.user.FollowUser(from_user_id=from_user_id,
                                            to_user_id=to_user_id,
                                            create_time=now,
                                            update_time=now)
    db.add(db_follow_user)
    db.flush()

def create_base_user(db: Session, 
                     default_read_mark_reason: int,
                     nickname: str,
                     avatar: str | None = None) -> models.user.User:
    db_user = models.user.User(uuid=str(uuid.uuid4()),
                               nickname=nickname,
                               avatar=avatar,
                               default_read_mark_reason=default_read_mark_reason,
                               create_time=datetime.now(timezone.utc),
                               update_time=datetime.now(timezone.utc))
    db.add(db_user)
    db.flush()
    return db_user

def create_github_user(db: Session, 
                       user_id: int, 
                       github_user_id: str, 
                       github_user_name: str):
    query = db.query(models.user.User)
    query = query.filter(models.user.User.id == user_id,
                         models.user.User.delete_at == None)
    db_user = query.first()
    if db_user is None:
        raise Exception("The base info of the github user you want to create is not exist")
    
    db_github = models.user.GithubUser(user_id=db_user.id, 
                                       github_user_id=github_user_id,
                                       github_user_name=github_user_name)
    db.add(db_github)
    db.flush()
    return db_github

def create_google_user(db: Session, 
                       user_id: int, 
                       google_user_id: str, 
                       google_user_name: str):
    query_get_base_user = db.query(models.user.User)
    query_get_base_user = query_get_base_user.filter(models.user.User.id == user_id,
                                                     models.user.User.delete_at == None)
    db_user = query_get_base_user.first()
    if db_user is None:
        raise Exception("The base info of the google user you want to create is not exist")
    
    db_google_user = models.user.GoogleUser(user_id=user_id,
                                            google_user_id=google_user_id,
                                            google_user_name=google_user_name)
    db.add(db_google_user)
    db.flush()
    return db_google_user     

def create_email_user(db: Session, 
                      user_id: int, 
                      email: str, 
                      password: str | None = None,
                      nickname: str | None = None) -> models.user.EmailUser:
    query_get_base_user = db.query(models.user.User)
    query_get_base_user = query_get_base_user.filter(models.user.User.id == user_id,
                                                     models.user.User.delete_at == None)
    db_user = query_get_base_user.first()
    if db_user is None:
        raise Exception("The base info of the email user you want to create is not exist")
    
    user_data = {
        "user_id": user_id,
        "email": email,
    }
    
    if nickname is not None:
        user_data.update({
            "nickname": nickname
        })
    
    if password is not None:
        user_data.update({
            "hashed_password": hash_password(password)
        })
    else:
        # 如果是在用户页面绑定邮箱的情况下的话，那么这里需要随机新建一串字符串作为初始密码
        characters = string.ascii_letters + string.digits
        random_password = ''.join(random.choice(characters) for _ in range(12))
        user_data.update({
            "hashed_password": hash_password(random_password),
            "is_initial_password": True,
            "initial_password": random_password
        })
 
    db_email_user = models.user.EmailUser(**user_data)
    db.add(db_email_user)
    db.flush()
    return db_email_user

def search_user_fans(db: Session,
                     user_id: int,
                     limit: int = 10,
                     start: int | None = None,
                     keyword: str | None = None):
    query = db.query(models.user.User)
    query = query.join(models.user.FollowUser, models.user.FollowUser.from_user_id == models.user.User.id)
    query = query.filter(models.user.FollowUser.to_user_id == user_id,
                         models.user.FollowUser.delete_at == None,
                         models.user.User.delete_at == None)
    if keyword is not None:
        query = query.filter(models.user.User.nickname.like(f"%{keyword}%"))
    query = query.order_by(models.user.User.create_time.desc())
    if start is not None:
        query = query.filter(models.user.User.id <= start)
    query = query.limit(limit)
    return query.all()

def count_user_fans(db: Session,
                    user_id: int,
                    keyword: str | None = None):
    query = db.query(models.user.User)
    query = query.join(models.user.FollowUser, models.user.FollowUser.from_user_id == models.user.User.id)
    query = query.filter(models.user.FollowUser.to_user_id == user_id,
                         models.user.FollowUser.delete_at == None,
                         models.user.User.delete_at == None)
    if keyword is not None:
        query = query.filter(models.user.User.nickname.like(f"%{keyword}%"))
    return query.count()

def search_next_user_fan(db: Session,
                         user: int,
                         keyword: str | None = None):
    query = db.query(models.user.User)
    query = query.join(models.user.FollowUser, models.user.FollowUser.from_user_id == models.user.User.id)
    query = query.filter(models.user.FollowUser.to_user_id == user,
                         models.user.FollowUser.delete_at == None,
                         models.user.User.delete_at == None)
    if keyword is not None:
        query = query.filter(models.user.User.nickname.like(f"%{keyword}%"))
    query = query.order_by(models.user.User.create_time.desc())
    query = query.filter(models.user.User.create_time < user.create_time)
    return query.first()

def search_user_follows(db: Session,
                        user_id: int,
                        limit: int = 10,
                        start: int | None = None,
                        keyword: str | None = None):
    query = db.query(models.user.User)
    query = query.join(models.user.FollowUser, models.user.FollowUser.to_user_id == models.user.User.id)
    query = query.filter(models.user.FollowUser.from_user_id == user_id,
                         models.user.FollowUser.delete_at == None,
                         models.user.User.delete_at == None)
    if keyword is not None:
        query = query.filter(models.user.User.nickname.like(f"%{keyword}%"))
    query = query.order_by(models.user.User.create_time.desc())
    if start is not None:
        query = query.filter(models.user.User.id <= start)
    query = query.limit(limit)
    return query.all()

def count_user_follows(db: Session,
                       user_id: int,
                       keyword: str | None = None):
    query = db.query(models.user.User)
    query = query.join(models.user.FollowUser, models.user.FollowUser.to_user_id == models.user.User.id)
    query = query.filter(models.user.FollowUser.from_user_id == user_id,
                         models.user.FollowUser.delete_at == None,
                         models.user.User.delete_at == None)
    if keyword is not None:
        query = query.filter(models.user.User.nickname.like(f"%{keyword}%"))
    return query.count()

def search_next_user_follow(db: Session,
                         user: int,
                         keyword: str | None = None):
    query = db.query(models.user.User)
    query = query.join(models.user.FollowUser, models.user.FollowUser.to_user_id == models.user.User.id)
    query = query.filter(models.user.FollowUser.from_user_id == user,
                         models.user.FollowUser.delete_at == None,
                         models.user.User.delete_at == None)
    if keyword is not None:
        query = query.filter(models.user.User.nickname.like(f"%{keyword}%"))
    query = query.order_by(models.user.User.create_time.desc())
    query = query.filter(models.user.User.create_time < user.create_time)
    return query.first()

def get_wechat_user_by_user_id(db: Session,
                               user_id: int):
    query = db.query(models.user.WechatUser)
    query = query.join(models.user.User)
    query = query.filter(models.user.WechatUser.user_id == user_id,
                         models.user.WechatUser.delete_at == None,
                         models.user.User.delete_at == None)
    return query.first()

def get_wechat_user_by_wechat_open_id(db: Session,
                                      wechat_user_open_id: str):
    query = db.query(models.user.WechatUser)
    query = query.filter(models.user.WechatUser.wechat_user_open_id == wechat_user_open_id,
                         models.user.WechatUser.delete_at == None)
    return query.first()

def get_wechat_user_by_wechat_union_id(db: Session,
                                       wechat_user_union_id: str):
    query = db.query(models.user.WechatUser)
    query = query.filter(models.user.WechatUser.wechat_user_union_id == wechat_user_union_id,
                         models.user.WechatUser.delete_at == None)
    return query.first()

def get_phone_user_by_phone(db: Session,
                            phone: str):
    query = db.query(models.user.PhoneUser)
    query = query.filter(models.user.PhoneUser.phone == phone,
                         models.user.PhoneUser.delete_at == None)
    return query.first()

def get_phone_user_by_user_id(db: Session,
                              user_id: int):
    query = db.query(models.user.PhoneUser)
    query = query.join(models.user.User)
    query = query.filter(models.user.PhoneUser.user_id == user_id,
                         models.user.PhoneUser.delete_at == None,
                         models.user.User.delete_at == None)
    return query.first()

def get_github_user_by_user_id(db: Session,
                               user_id: int):
    query = db.query(models.user.GithubUser)
    query = query.join(models.user.User)
    query = query.filter(models.user.GithubUser.user_id == user_id,
                         models.user.GithubUser.delete_at == None,
                         models.user.User.delete_at == None)
    return query.first()

def get_github_user_by_github_user_id(db: Session,
                                      github_user_id: str):
    query = db.query(models.user.GithubUser)
    query = query.filter(models.user.GithubUser.github_user_id == github_user_id,
                         models.user.GithubUser.delete_at == None)
    return query.first()

def get_google_user_by_user_id(db: Session,
                               user_id: int):
    query = db.query(models.user.GoogleUser)
    query = query.join(models.user.User)
    query = query.filter(models.user.GoogleUser.user_id == user_id,
                         models.user.GoogleUser.delete_at == None,
                         models.user.User.delete_at == None)
    return query.first()

def get_google_user_by_google_id(db: Session, 
                                 google_user_id: str): 
    query = db.query(models.user.GoogleUser)
    query = query.filter(models.user.GoogleUser.google_user_id == google_user_id,
                         models.user.GoogleUser.delete_at == None)
    return query.first()

def get_user_follow_by_to_user_id_and_from_user_id(db: Session,
                                                   to_user_id: int,
                                                   from_user_id: int):
    query = db.query(models.user.FollowUser)
    query = query.filter(models.user.FollowUser.to_user_id == to_user_id,
                         models.user.FollowUser.from_user_id == from_user_id,
                         models.user.FollowUser.delete_at == None)
    return query.first()

def get_user_by_id(db: Session,
                   user_id: int) -> models.user.User:
    query = db.query(models.user.User)
    query = query.filter(models.user.User.id == user_id,
                         models.user.User.delete_at == None)
    return query.first()

def get_email_user_by_user_id(db: Session,
                              user_id: int) -> models.user.EmailUser:
    query = db.query(models.user.EmailUser)
    query = query.join(models.user.User)
    query = query.filter(models.user.EmailUser.user_id == user_id,
                        models.user.EmailUser.delete_at == None,
                        models.user.User.delete_at == None)
    return query.first()

def get_user_initial_password(db: Session, 
                              user_id: int) -> str:
    query = db.query(models.user.EmailUser)
    query = query.filter(models.user.EmailUser.user_id == user_id,
                         models.user.EmailUser.delete_at == None)
    db_user = query.first()
    if db_user is None:
        raise Exception("Can't find the email user")
    db_user.has_seen_initial_password = True
    db.flush()
    return db_user.initial_password

def get_user_by_uuid(db: Session,
                     user_uuid: str) -> models.user.User:
    query = db.query(models.user.User)
    query = query.filter(models.user.User.uuid == user_uuid, 
                         models.user.User.delete_at == None)
    return query.first()

def get_email_user_by_email(db: Session,
                            email: str):
    query = db.query(models.user.EmailUser)
    query = query.filter(models.user.EmailUser.email == email,
                         models.user.EmailUser.delete_at == None)
    return query.first()

def get_user_by_email(db: Session, 
                      email: str) -> models.user.User:
    query = db.query(models.user.User)
    query = query.join(models.user.EmailUser)
    query = query.filter(models.user.User.delete_at == None,
                         models.user.EmailUser.delete_at == None,
                         models.user.EmailUser.email == email)
    return query.first()

def update_user_password(db: Session,
                         user_id: int,
                         password: str) -> models.user.EmailUser:
    db_email_user_query = db.query(models.user.EmailUser)
    db_email_user_query = db_email_user_query.join(models.user.User)
    db_email_user_query = db_email_user_query.filter(models.user.EmailUser.user_id == user_id,
                                                     models.user.EmailUser.delete_at == None,
                                                     models.user.User.delete_at == None)
    db_email_user = db_email_user_query.first()
    if db_email_user is None:
        raise Exception("Can't find the user info based on the user_id you provided.")
    db_email_user.hashed_password = hash_password(password)
    db_email_user.is_initial_password = False
    db.flush()
    return db_email_user

def update_user_follow_by_to_user_id_and_from_user_id(db: Session,
                                                      from_user_id: int,
                                                      to_user_id: int,
                                                      status: bool):
    now = datetime.now(timezone.utc)
    query = db.query(models.user.FollowUser)
    query = query.filter(models.user.FollowUser.from_user_id == from_user_id,
                         models.user.FollowUser.to_user_id == to_user_id,
                         models.user.FollowUser.delete_at == None)
    db_user_follow = query.first()
    if db_user_follow is None:
        raise Exception("Can't find the user follow info based on the from_user_id and to_user_id you provided.")
    else:
        if status == True:
            db_user_follow.delete_at = None
        else:
            db_user_follow.delete_at = now
    db.flush()
    return db_user_follow

def update_user_default_engine(db: Session,
                               user_id: int,
                               default_file_document_parse_user_engine_id: int | None = None,
                               default_website_document_parse_user_engine_id: int | None = None):
    now = datetime.now(timezone.utc)
    db_user_query = db.query(models.user.User)
    db_user_query = db_user_query.filter(models.user.User.id == user_id,
                                         models.user.User.delete_at == None)
    db_user = db_user_query.first()
    if db_user is None:
        raise Exception("Can't find the user info based on the user_id you provided.")
    if default_file_document_parse_user_engine_id is not None:
        db_user.default_file_document_parse_user_engine_id = default_file_document_parse_user_engine_id
    if default_website_document_parse_user_engine_id is not None:
        db_user.default_website_document_parse_user_engine_id = default_website_document_parse_user_engine_id
    db_user.update_time = now
    db.flush()
    return db_user
    
def update_user_default_model(db: Session,
                              user_id: int,
                              default_document_reader_model_id: int | None = None,
                              default_revornix_model_id: int | None = None):
    now = datetime.now(timezone.utc)
    db_user_query = db.query(models.user.User)
    db_user_query = db_user_query.filter(models.user.User.id == user_id,
                                        models.user.User.delete_at == None)
    db_user = db_user_query.first()
    if db_user is None:
        raise Exception("Can't find the user info based on the user_id you provided.")
    if default_document_reader_model_id is not None:
        db_user.default_document_reader_model_id = default_document_reader_model_id
    if default_revornix_model_id is not None:
        db_user.default_revornix_model_id = default_revornix_model_id
    db_user.update_time = now
    db.flush()
    return db_user

def update_user_default_mark_read_reason(db: Session,
                                         user_id: int,
                                         default_read_mark_reason: int | None = None):
    now = datetime.now(timezone.utc)
    db_user_query = db.query(models.user.User)
    db_user_query = db_user_query.filter(models.user.User.id == user_id,
                                         models.user.User.delete_at == None)
    db_user = db_user_query.first()
    if db_user is None:
        raise Exception("Can't find the user info based on the user_id you provided.")
    if default_read_mark_reason is not None:
        db_user.default_read_mark_reason = default_read_mark_reason
    db_user.update_time = now
    db.flush()
    return db_user

def update_user_info(db: Session,
                     user_id: int,
                     avatar: str | None = None,
                     nickname: str | None = None,
                     slogan: str | None = None,
                     age: int | None = None,
                     gender: int | None = None) -> models.user.User:
    db_user_query = db.query(models.user.User)
    db_user_query = db_user_query.filter(models.user.User.id == user_id, 
                                         models.user.User.delete_at == None)
    db_user = db_user_query.first()
    if db_user is None:
        raise Exception("Can't find the user info based on the user_id you provided.")
    if nickname is not None:
        db_user.nickname = nickname
    if slogan is not None:
        db_user.slogan = slogan
    if age is not None:
        db_user.age = age
    if gender is not None:
        db_user.gender = gender
    if avatar is not None:
        db_user.avatar = avatar
    db.flush()
    return db_user

def delete_email_user_by_user_id(db: Session,
                                 user_id: int):
    now = datetime.now(timezone.utc)
    query = db.query(models.user.EmailUser)
    query = query.filter(models.user.EmailUser.user_id == user_id,
                         models.user.EmailUser.delete_at == None)
    query = query.update({"delete_at": now})
    db.flush()
    
def delete_user_by_user_id(db: Session,
                           user_id: int):
    now = datetime.now(timezone.utc)
    
    db_user = db.query(models.user.User).filter(models.user.User.id == user_id,
                                                models.user.User.delete_at == None).first()
    if db_user is None:
        raise Exception("Can't find the user info based on the user_id you provided.")
    db_user.delete_at = now
    
    delete_email_user_by_user_id(db, user_id)
    db.flush()
    
def delete_follow_user_record(db: Session,
                              from_user_id: int,
                              to_user_id: int):
    now = datetime.now(timezone.utc)
    query = db.query(models.user.FollowUser).filter(models.user.FollowUser.from_user_id == from_user_id,
                                                             models.user.FollowUser.to_user_id == to_user_id)
    db_follow_user = query.first()
    if db_follow_user is None:
        raise Exception("The follow user record you want to delete is not exist")
    db_follow_user.delete_at = now
    db.flush()
    
def delete_google_user_by_user_id(db: Session,
                                  user_id: int):
    now = datetime.now(timezone.utc)
    query = db.query(models.user.GoogleUser)
    query = query.filter(models.user.GoogleUser.user_id == user_id,
                         models.user.GoogleUser.delete_at == None)
    query = query.update({"delete_at": now})
    db.flush()
    
def delete_github_user_by_user_id(db: Session,
                                  user_id: int):
    now = datetime.now(timezone.utc)
    query = db.query(models.user.GithubUser)
    query = query.filter(models.user.GithubUser.user_id == user_id,
                         models.user.GithubUser.delete_at == None)
    query = query.update({"delete_at": now})
    db.flush()
    
def delete_phone_user_by_user_id(db: Session,
                                 user_id: int):
    now = datetime.now(timezone.utc)
    query = db.query(models.user.PhoneUser)
    query = query.filter(models.user.PhoneUser.user_id == user_id,
                         models.user.PhoneUser.delete_at == None)
    query = query.update({"delete_at": now})
    db.flush()

def delete_wechat_user_by_user_id(db: Session,
                                  user_id: int):
    now = datetime.now(timezone.utc)
    query = db.query(models.user.WechatUser)
    query = query.filter(models.user.WechatUser.user_id == user_id,
                         models.user.WechatUser.delete_at == None)
    query = query.update({"delete_at": now})
    db.flush()