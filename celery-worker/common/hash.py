import os
import hashlib

def hash_password(password: str) -> str:
    # 创建一个随机盐
    salt = os.urandom(16)
    # 使用 SHA-256 算法对密码和盐进行哈希
    hash_obj = hashlib.sha256(salt + password.encode())
    hashed_password = hash_obj.hexdigest()
    # 将盐和哈希结果一起返回
    return salt.hex() + hashed_password

def verify_password(stored_password: str, provided_password: str) -> bool:
    # 提取存储的盐
    salt = bytes.fromhex(stored_password[:32])
    # 提取存储的哈希值
    stored_hash = stored_password[32:]
    # 对提供的密码进行哈希
    hash_obj = hashlib.sha256(salt + provided_password.encode())
    provided_hash = hash_obj.hexdigest()
    # 比较存储的哈希值和提供的哈希值
    return stored_hash == provided_hash