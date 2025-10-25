from pathlib import Path
from config.base import BASE_DIR

ISSUER: str = "http://localhost:8002"   # 你的 OP 根地址（外部可访问）
JWK_PUBLIC_PATH: Path = BASE_DIR / 'keys' / 'public.pem'
JWK_PRIVATE_PATH: Path = BASE_DIR / 'keys' / 'private.pem'