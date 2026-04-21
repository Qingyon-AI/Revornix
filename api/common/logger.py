import json
import logging
import os
import re
import traceback
from datetime import datetime
from logging import handlers
from typing import Any

from config.base import BASE_DIR


class _TimezoneAwareFormatter(logging.Formatter):

    def formatTime(self, record: logging.LogRecord, datefmt: str | None = None) -> str:
        dt = datetime.fromtimestamp(record.created).astimezone()
        if datefmt:
            return dt.strftime(datefmt)
        return dt.isoformat(timespec='milliseconds')


class BaseLogger:

    level_relations = {
        'debug': logging.DEBUG,
        'info': logging.INFO,
        'warning': logging.WARNING,
        'error': logging.ERROR,
        'crit': logging.CRITICAL
    }  # 日志级别关系映射

    def __init__(self, filename, level='info', when='D', backCount=3,
                 fmt='%(asctime)s - %(pathname)s[line:%(lineno)d] - %(levelname)s: %(message)s'):
        self.logger = logging.getLogger(filename)
        format_str = _TimezoneAwareFormatter(fmt)  # 设置日志格式
        level_value = self.level_relations.get(level, logging.INFO)
        self.logger.setLevel(level_value)  # 设置日志级别
        self.logger.propagate = False
        log_file_path = os.path.join(str(BASE_DIR), "logs", filename)
        sh = logging.StreamHandler()  # 往屏幕上输出
        sh.setFormatter(format_str)  # 设置屏幕上显示的格式
        th = handlers.TimedRotatingFileHandler(filename=log_file_path, when=when, backupCount=backCount,
                                               encoding='utf-8')  # 往文件里写入#指定间隔时间自动生成文件的处理器
        # 实例化TimedRotatingFileHandler
        # interval是时间间隔，backupCount是备份文件的个数，如果超过这个个数，就会自动删除，when是间隔的时间单位，单位有以下几种：
        # S 秒 M 分 H 小时 D 天 W 每星期（interval==0时代表星期一）midnight 每天凌晨
        th.setFormatter(format_str)  # 设置文件里写入的格式
        has_stream_handler = any(
            isinstance(handler, logging.StreamHandler)
            and not isinstance(handler, handlers.TimedRotatingFileHandler)
            for handler in self.logger.handlers
        )
        has_file_handler = any(
            isinstance(handler, handlers.TimedRotatingFileHandler)
            and getattr(handler, "baseFilename", None) == os.path.abspath(log_file_path)
            for handler in self.logger.handlers
        )
        if not has_stream_handler:
            self.logger.addHandler(sh)  # 把对象加到logger里
        if not has_file_handler:
            self.logger.addHandler(th)

exception_logger = BaseLogger("exception.log").logger
info_logger = BaseLogger("info.log").logger
warning_logger = BaseLogger("warning.log").logger


def _stringify_log_value(value: Any, *, limit: int = 300) -> str:
    if isinstance(value, (dict, list, tuple, set)):
        try:
            text = json.dumps(value, ensure_ascii=False, sort_keys=True, default=str)
        except TypeError:
            text = str(value)
    else:
        text = str(value)
    text = re.sub(r"\s+", " ", text).strip()
    if len(text) > limit:
        text = text[: limit - 3] + "..."
    if not text:
        return '""'
    if any(char.isspace() for char in text) or "=" in text:
        return json.dumps(text, ensure_ascii=False)
    return text


def format_log_message(event: str, **fields: Any) -> str:
    parts = [f"event={_stringify_log_value(event)}"]
    for key, value in fields.items():
        if value is None:
            continue
        parts.append(f"{key}={_stringify_log_value(value)}")
    return " ".join(parts)


def log_exception():
    exception_logger.error(traceback.format_exc())
