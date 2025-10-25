import base64
from config.oauth2 import JWK_PUBLIC_PATH

def load_public_key():
    public_key = JWK_PUBLIC_PATH.read_bytes()
    x = base64.urlsafe_b64encode(public_key).rstrip(b"=").decode("utf-8")
    jwk_key = {
        "kty": "OKP",
        "use": "sig",
        "alg": "EdDSA",
        "crv": "Ed25519",
        "kid": "revornix-2025",
        "x": x,
    }
    return jwk_key

if __name__ == "__main__":
    print(load_public_key())