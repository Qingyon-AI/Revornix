import json
import pkgutil
import importlib
import inspect
from typing import Type
from pathlib import Path
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

