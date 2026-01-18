from dotenv import load_dotenv

load_dotenv(override=True)

from sqlalchemy import create_engine as create_sqlalchemy_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

from config.sql import POSTGRES_DB, POSTGRES_DB_URL, POSTGRES_PASSWORD, POSTGRES_USER

SQLALCHEMY_DATABASE_URL = f"postgresql://{POSTGRES_USER}:{POSTGRES_PASSWORD}@{POSTGRES_DB_URL}/{POSTGRES_DB}"

engine = create_sqlalchemy_engine(
    SQLALCHEMY_DATABASE_URL,
    max_overflow=20, # 超过连接池大小之后，允许最大扩展连接数；
    pool_size=10,    # 连接池的大小
    pool_timeout=30,# 连接池如果没有连接了，最长的等待时间
    pool_recycle=1800, # 多久之后对连接池中连接进行一次回收
    echo=False
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()
