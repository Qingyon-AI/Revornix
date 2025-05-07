from dotenv import load_dotenv
load_dotenv()

import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from common.logger import info_logger

info_logger.info(f"{os.environ.get('USER_NAME')}")

SQLALCHEMY_DATABASE_URL = f"mysql+pymysql://{os.environ.get('USER_NAME')}:{os.environ.get('PASSWORD')}@{os.environ.get('DATABASE_URL')}/{os.environ.get('DATABASE_NAME')}?charset=utf8mb4" 

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    max_overflow=10,
    pool_size=5,
    pool_timeout=30,
    pool_recycle=2400,  # 40分钟回收连接，需小于MySQL的wait_timeout
    pool_pre_ping=True,  # 每次执行前验证连接有效性
    echo=False
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

# 为了alembic能够正确生成表数据
from models.user import *
