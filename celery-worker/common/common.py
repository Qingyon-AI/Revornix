import re
import jwt
import crud
import models
from pathlib import Path
from datetime import datetime, timezone, timedelta
from common.hash import verify_password
from file.aliyun_oss_remote_file_service import AliyunOSSRemoteFileService
from file.built_in_remote_file_service import BuiltInRemoteFileService
from common.sql import SessionLocal
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

def extract_title_and_summary(content: str):
    # 提取第一个 Markdown 标题（# 开头）
    title_match = re.search(r'^#\s+(.+)', content, re.MULTILINE)
    title = title_match.group(1).strip() if title_match else "Untitled"

    # 去掉 Markdown 语法，提取正文前 200 个字符
    text = re.sub(r'\!\[.*?\]\(.*?\)', '', content)  # 去掉图片
    text = re.sub(r'\[([^\]]+)\]\([^\)]+\)', r'\1', text)  # 去掉链接保留文字
    text = re.sub(r'[#>*`~\-]+', '', text)  # 去掉标题符号、引用等
    text = re.sub(r'\n+', ' ', text)  # 合并换行
    summary = text.strip()[:200]

    return title, summary

def get_user_remote_file_system(user_id: int):
    db = SessionLocal()
    db_user = crud.user.get_user_by_id(db=db, user_id=user_id)   
    default_file_system = db_user.default_file_system
    if default_file_system is None:
        raise Exception('Please set the default file system for the user first.')
    else:
        if default_file_system == 1:
            remote_file_service = BuiltInRemoteFileService(user_id=user_id)
        elif default_file_system == 2:
            remote_file_service = AliyunOSSRemoteFileService(user_id=user_id)
    return remote_file_service