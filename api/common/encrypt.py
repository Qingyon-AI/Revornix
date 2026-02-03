import base64
import os

from cryptography.hazmat.primitives.ciphers.aead import AESGCM

APIKEY_ENCRYPT_KEY = os.environ.get("APIKEY_ENCRYPT_KEY")
ENGINE_CONFIG_ENCRYPT_KEY = os.environ.get("ENGINE_CONFIG_ENCRYPT_KEY")
FILE_SYSTEM_CONFIG_ENCRYPT_KEY = os.environ.get("FILE_SYSTEM_CONFIG_ENCRYPT_KEY")
NOTIFICATION_SOURCE_CONFIG_ENCRYPT_KEY = os.environ.get("NOTIFICATION_SOURCE_CONFIG_ENCRYPT_KEY")
NOTIFICATION_TARGET_CONFIG_ENCRYPT_KEY = os.environ.get("NOTIFICATION_TARGET_CONFIG_ENCRYPT_KEY")

if not APIKEY_ENCRYPT_KEY:
    raise Exception("APIKEY_ENCRYPT_KEY not set")
if not ENGINE_CONFIG_ENCRYPT_KEY:
    raise Exception("ENGINE_CONFIG_ENCRYPT_KEY not set")
if not FILE_SYSTEM_CONFIG_ENCRYPT_KEY:
    raise Exception("FILE_SYSTEM_CONFIG_ENCRYPT_KEY not set")
if not NOTIFICATION_SOURCE_CONFIG_ENCRYPT_KEY:
    raise Exception("NOTIFICATION_SOURCE_CONFIG_ENCRYPT_KEY not set")
if not NOTIFICATION_TARGET_CONFIG_ENCRYPT_KEY:
    raise Exception("NOTIFICATION_TARGET_CONFIG_ENCRYPT_KEY not set")

# 系统环境变量里的主密钥
APIKEY_MASTER_KEY = base64.b64decode(APIKEY_ENCRYPT_KEY)
ENGINE_CONFIG_MASTER_KEY = base64.b64decode(ENGINE_CONFIG_ENCRYPT_KEY)
FILE_SYSTEM_CONFIG_MASTER_KEY = base64.b64decode(FILE_SYSTEM_CONFIG_ENCRYPT_KEY)
NOTIFICATION_SOURCE_CONFIG_MASTER_KEY = base64.b64decode(NOTIFICATION_SOURCE_CONFIG_ENCRYPT_KEY)
NOTIFICATION_TARGET_CONFIG_MASTER_KEY = base64.b64decode(NOTIFICATION_TARGET_CONFIG_ENCRYPT_KEY)

def encrypt_file_system_config(
    file_system_config_json_str: str
):
    aesgcm = AESGCM(FILE_SYSTEM_CONFIG_MASTER_KEY)
    nonce = os.urandom(12)
    ciphertext = aesgcm.encrypt(nonce, file_system_config_json_str.encode(), None)
    return base64.b64encode(nonce + ciphertext).decode()

def decrypt_file_system_config(
    encoded: str
):
    raw = base64.b64decode(encoded)
    nonce, ciphertext = raw[:12], raw[12:]
    aesgcm = AESGCM(FILE_SYSTEM_CONFIG_MASTER_KEY)
    return aesgcm.decrypt(nonce, ciphertext, None).decode()

def encrypt_engine_config(
    config_json_str: str
):
    aesgcm = AESGCM(ENGINE_CONFIG_MASTER_KEY)
    nonce = os.urandom(12)
    ciphertext = aesgcm.encrypt(nonce, config_json_str.encode(), None)
    return base64.b64encode(nonce + ciphertext).decode()

def decrypt_engine_config(
    encoded: str
):
    raw = base64.b64decode(encoded)
    nonce, ciphertext = raw[:12], raw[12:]
    aesgcm = AESGCM(ENGINE_CONFIG_MASTER_KEY)
    return aesgcm.decrypt(nonce, ciphertext, None).decode()

def encrypt_api_key(
    api_key: str
):
    aesgcm = AESGCM(APIKEY_MASTER_KEY)
    nonce = os.urandom(12)
    ciphertext = aesgcm.encrypt(nonce, api_key.encode(), None)
    return base64.b64encode(nonce + ciphertext).decode()

def decrypt_api_key(
    encoded: str
):
    raw = base64.b64decode(encoded)
    nonce, ciphertext = raw[:12], raw[12:]
    aesgcm = AESGCM(APIKEY_MASTER_KEY)
    return aesgcm.decrypt(nonce, ciphertext, None).decode()

def encrypt_notification_source_config(
    config_json_str: str
):
    aesgcm = AESGCM(NOTIFICATION_SOURCE_CONFIG_MASTER_KEY)
    nonce = os.urandom(12)
    ciphertext = aesgcm.encrypt(nonce, config_json_str.encode(), None)
    return base64.b64encode(nonce + ciphertext).decode()

def decrypt_notification_source_config(
    encoded: str
):
    raw = base64.b64decode(encoded)
    nonce, ciphertext = raw[:12], raw[12:]
    aesgcm = AESGCM(NOTIFICATION_SOURCE_CONFIG_MASTER_KEY)
    return aesgcm.decrypt(nonce, ciphertext, None).decode()

def encrypt_notification_target_config(
    config_json_str: str
):
    aesgcm = AESGCM(NOTIFICATION_TARGET_CONFIG_MASTER_KEY)
    nonce = os.urandom(12)
    ciphertext = aesgcm.encrypt(nonce, config_json_str.encode(), None)
    return base64.b64encode(nonce + ciphertext).decode()

def decrypt_notification_target_config(
    encoded: str
):
    raw = base64.b64decode(encoded)
    nonce, ciphertext = raw[:12], raw[12:]
    aesgcm = AESGCM(NOTIFICATION_TARGET_CONFIG_MASTER_KEY)
    return aesgcm.decrypt(nonce, ciphertext, None).decode()

if __name__ == "__main__":
    ciphertext = encrypt_api_key("12345678901234567890123456789012")
    print(ciphertext)
    print(decrypt_api_key(ciphertext))
