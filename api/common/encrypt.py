from cryptography.hazmat.primitives.ciphers.aead import AESGCM
import os, base64

# 系统环境变量里的主密钥
MASTER_KEY = base64.b64decode(os.getenv("APIKEY_ENCRYPT_KEY", "623f8bce26d03a8f93b2a9ba9fbbaa5b"))

def encrypt_api_key(api_key: str) -> str:
    aesgcm = AESGCM(MASTER_KEY)
    nonce = os.urandom(12)
    ciphertext = aesgcm.encrypt(nonce, api_key.encode(), None)
    return base64.b64encode(nonce + ciphertext).decode()

def decrypt_api_key(encoded: str) -> str:
    raw = base64.b64decode(encoded)
    nonce, ciphertext = raw[:12], raw[12:]
    aesgcm = AESGCM(MASTER_KEY)
    return aesgcm.decrypt(nonce, ciphertext, None).decode()

if __name__ == "__main__":
    ciphertext = encrypt_api_key("12345678901234567890123456789012")
    print(ciphertext)
    print(decrypt_api_key(ciphertext))