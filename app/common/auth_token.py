"""JWT 的解码与失效判定。零 FastAPI 依赖。

这两件事本身与 Web 框架无关 —— 解一个 token、比一个 epoch，纯计算。它们原先住在
`common/dependencies.py` 里，而那个文件 import 了 fastapi，于是任何想复用它们的
非 api 侧代码都得跟着背上 fastapi。`common/plan_access.py` 就撞在这上面：它的存在
意义正是"零 fastapi"，却需要这两个函数。

抽出来之后单一事实来源在这里：
  - api 侧的 `_reject_if_stale_auth_epoch` 调 `is_auth_epoch_stale` 再抛 HTTPException；
  - 非 api 侧直接用布尔值。
判定逻辑只有一份，抛不抛异常是各自的事。
"""

from __future__ import annotations

import jwt

from config.oauth2 import OAUTH_SECRET_KEY


def decode_jwt_token(token: str, secret_key: str = OAUTH_SECRET_KEY):
    return jwt.decode(token, secret_key, algorithms=["HS256"])


def is_auth_epoch_stale(payload: dict, user) -> bool:
    """token 里的 auth_epoch 是否已经落后于用户当前的。

    落后意味着用户改过密码 / 主动登出过全部会话，这个 token 应当失效。
    缺字段按 0 处理：老 token 没有这个字段，而用户的 auth_epoch 一旦递增过就不为 0，
    于是老 token 自然失效 —— 这正是想要的。

    `user` 不标注类型是刻意的：标了就要 import models，而 models 会把整棵
    SQLAlchemy 依赖拖进这个本该很轻的模块。这里只读一个属性。
    """
    token_auth_epoch = payload.get("auth_epoch")
    if token_auth_epoch is None:
        token_auth_epoch = 0
    return token_auth_epoch != user.auth_epoch
