"""SQLAlchemy 的 declarative Base。

放在 `models/` 而不是 `data/sql/`：Base 是**模型**的根，不是数据访问设施。
它原本和 engine、session 工厂一起放在 `data/sql/base.py`，于是每个模型文件都要
`from data.sql.base import Base` —— 模型层反过来依赖数据访问层，方向是反的，
而且这一条边把 `models` 锁在了依赖环里，搬不进 shared。

engine 与 session 仍在 `data/sql/base.py`：那些确实是数据访问设施。
"""

from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()
