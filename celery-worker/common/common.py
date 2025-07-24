import re
import crud
from pathlib import Path
from common.hash import verify_password
from common.sql import SessionLocal
from file.aliyun_oss_remote_file_service import AliyunOSSRemoteFileService
from file.built_in_remote_file_service import BuiltInRemoteFileService

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

async def get_user_remote_file_system(user_id: int):
    db = SessionLocal()
    db_user = crud.user.get_user_by_id(db=db, user_id=user_id)   
    if db_user.default_user_file_system is None:
        raise Exception('Please set the default file system for the user first.')
    else:
        db_user_file_system = crud.file_system.get_user_file_system_by_id(db=db, 
                                                                          user_file_system_id=db_user.default_user_file_system)
        if db_user_file_system.file_system_id == 1:
            remote_file_service = BuiltInRemoteFileService()
        elif db_user_file_system.file_system_id == 2:
            remote_file_service = AliyunOSSRemoteFileService()
        await remote_file_service.init_client_by_user_file_system_id(user_file_system_id=db_user.default_user_file_system)
    return remote_file_service