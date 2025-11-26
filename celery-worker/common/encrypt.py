import os, base64
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

APIKEY_ENCRYPT_KEY = os.environ.get("APIKEY_ENCRYPT_KEY")

if not APIKEY_ENCRYPT_KEY:
    raise Exception("APIKEY_ENCRYPT_KEY not set")

# 系统环境变量里的主密钥
MASTER_KEY = base64.b64decode(APIKEY_ENCRYPT_KEY)

def encrypt_api_key(
    api_key: str
):
    aesgcm = AESGCM(MASTER_KEY)
    nonce = os.urandom(12)
    ciphertext = aesgcm.encrypt(nonce, api_key.encode(), None)
    return base64.b64encode(nonce + ciphertext).decode()

def decrypt_api_key(
    encoded: str
):
    raw = base64.b64decode(encoded)
    nonce, ciphertext = raw[:12], raw[12:]
    aesgcm = AESGCM(MASTER_KEY)
    return aesgcm.decrypt(nonce, ciphertext, None).decode()

if __name__ == "__main__":
    ciphertext = encrypt_api_key("12345678901234567890123456789012")
    print(ciphertext)
    print(decrypt_api_key(ciphertext))