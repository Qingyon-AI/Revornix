import re
import crud
import json
import pkgutil
import importlib
import inspect
import asyncio
from typing import Type
from pathlib import Path
from data.sql.base import SessionLocal
from enums.file import RemoteFileService
from file.aliyun_oss_remote_file_service import AliyunOSSRemoteFileService
from file.built_in_remote_file_service import BuiltInRemoteFileService
from file.aws_s3_remote_file_service import AWSS3RemoteFileService
from file.generic_s3_remote_file_service import GenericS3RemoteFileService
from common.logger import exception_logger

def collect_classes(
    package_name: str, 
    base_class: Type
):
    """获取指定包下的所有指定类型的类

    Args:
        package_name (str): 包位置
        base_class (Type): 类的筛选

    Returns:
        _type_: 一个列表，包含所有指定类型的类
    """
    package = importlib.import_module(package_name)
    result = []

    for module_info in pkgutil.iter_modules(package.__path__, package_name + "."):
        module = importlib.import_module(module_info.name)

        for _, obj in inspect.getmembers(module, inspect.isclass):
            if obj.__module__ != module.__name__:
                continue

            if issubclass(obj, base_class) and obj is not base_class:
                result.append(obj)

    return result

def is_dir_empty(
    path: Path
):
    return not any(Path(path).iterdir())

def extract_title_and_summary(
    content: str
):
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

async def get_user_remote_file_system(
    user_id: int
):
    def _resolve():
        db = SessionLocal()
        try:
            db_user = crud.user.get_user_by_id(
                db=db,
                user_id=user_id,
            )
            if not db_user:
                raise Exception('The user is not found, so his/her file system cannot be obtained.')

            remote_file_service = None
            if db_user.default_user_file_system is None:
                raise Exception('The user has not set a default file system.')
            else:
                db_user_file_system = crud.file_system.get_user_file_system_by_id(
                    db=db,
                    user_file_system_id=db_user.default_user_file_system
                )
                if not db_user_file_system:
                    raise Exception("There is something wrong with the user's default file system.")
                db_file_system = crud.file_system.get_file_system_by_id(
                    db=db,
                    file_system_id=db_user_file_system.file_system_id
                )
                if not db_file_system:
                    raise Exception("There is something wrong with the user's default file system.")
                if db_file_system.uuid == RemoteFileService.Built_In.meta.id:
                    remote_file_service = BuiltInRemoteFileService()
                elif db_file_system.uuid == RemoteFileService.AliyunOSS.meta.id:
                    remote_file_service = AliyunOSSRemoteFileService()
                elif db_file_system.uuid == RemoteFileService.Generic_S3.meta.id:
                    remote_file_service = GenericS3RemoteFileService()
                elif db_file_system.uuid == RemoteFileService.AWS_S3.meta.id:
                    remote_file_service = AWSS3RemoteFileService()
                else:
                    raise Exception("There is something wrong with the user's default file system.")
            return remote_file_service
        finally:
            db.close()

    return await asyncio.to_thread(_resolve)

def to_serializable(
    obj
):
    """把无法直接JSON化的对象转成可序列化形式"""
    if isinstance(obj, (str, int, float, bool)) or obj is None:
        return obj
    elif isinstance(obj, dict):
        return {k: to_serializable(v) for k, v in obj.items()}
    elif isinstance(obj, (list, tuple, set)):
        return [to_serializable(i) for i in obj]
    elif hasattr(obj, "__dict__"):  # 普通类
        return {k: to_serializable(v) for k, v in obj.__dict__.items()}
    else:
        return str(obj)

def safe_json_loads(
    data, 
    default
):
    if not data:
        return default
    try:
        return json.loads(data)
    except (ValueError, TypeError) as e:
        exception_logger.error(f'Failed to parse JSON data: {e}', e)
        return default

