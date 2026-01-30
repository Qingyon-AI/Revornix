import asyncio
import importlib
import inspect
import json
import pkgutil
import re
from pathlib import Path

import crud
from common.logger import exception_logger
from data.sql.base import SessionLocal
from proxy.file_system_proxy import FileSystemProxy


def collect_classes(
    package_name: str,
    base_class: type
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
