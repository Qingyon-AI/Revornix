"""让测试不依赖真实配置。

`common/encrypt.py` 在**导入期**就校验五个加密密钥，任何 import 到它的测试模块
（router.ai、common.passkey 等）都会在收集阶段直接失败。此前这套测试因此只能在
配好 `.env` 的开发机上跑 —— 也是它从没进过 CI 的原因之一。

这里在收集之前塞入确定性的假密钥。conftest 会先于测试模块被导入，所以这些赋值
一定发生在 `encryption` 被 import 之前。

假值只用于让模块能加载：这批测试验的是纯函数与 schema 形状（口令哈希、OAuth 跳转
拼装、发布 schema 等），不碰真实凭据，也不连数据库。真出现需要真实密钥的测试，
那条用例该自己 skip，而不是让整套回到依赖 `.env`。
"""

from __future__ import annotations

import base64
import os

# AES-GCM 要 16/24/32 字节的密钥，且代码里按 base64 解。固定值 —— 测试不需要随机性，
# 随机反而会让失败难以复现。
_FAKE_KEY = base64.b64encode(b"revornix-test-key-32-bytes-long!").decode("ascii")

_REQUIRED_KEYS = (
    "APIKEY_ENCRYPT_KEY",
    "ENGINE_CONFIG_ENCRYPT_KEY",
    "FILE_SYSTEM_CONFIG_ENCRYPT_KEY",
    "NOTIFICATION_SOURCE_CONFIG_ENCRYPT_KEY",
    "NOTIFICATION_TARGET_CONFIG_ENCRYPT_KEY",
)

for _name in _REQUIRED_KEYS:
    # setdefault：本地已经配了 .env 的话尊重现有值，不要在开发机上改变行为。
    os.environ.setdefault(_name, _FAKE_KEY)

# 这些没有导入期校验，但缺失时部分模块会走到需要它们的分支。
os.environ.setdefault("OAUTH_SECRET_KEY", "revornix-test-oauth-secret")
os.environ.setdefault("ROOT_USER_NAME", "test@revornix.local")
os.environ.setdefault("ROOT_USER_PASSWORD", "revornix-test-password")
