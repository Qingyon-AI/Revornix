from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.backends import default_backend
import os

KEY = b'your-32-byte-long-key-here-123456789012'  # AES-256 key
IV = b'16-byte-initvectr'  # AES 需要16字节IV

def encrypt_chunk(data: bytes) -> bytes:
    cipher = Cipher(algorithms.AES(KEY), modes.CFB(IV), backend=default_backend())
    encryptor = cipher.encryptor()
    return encryptor.update(data) + encryptor.finalize()

def decrypt_chunk(data: bytes) -> bytes:
    cipher = Cipher(algorithms.AES(KEY), modes.CFB(IV), backend=default_backend())
    decryptor = cipher.decryptor()
    return decryptor.update(data) + decryptor.finalize()