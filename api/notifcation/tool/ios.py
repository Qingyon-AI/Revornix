import schemas
import httpx
import time
import uuid
import json
import jwt
from jwcrypto import jwk
from protocol.notify import NotifyProtocol
from common.logger import exception_logger

APPLE_PUBLIC_KEYS_URL = "https://appleid.apple.com/auth/keys"

class IOSNotify(NotifyProtocol):
    def __init__(self):
        super().__init__(
            notify_uuid='ec2101d2d2134fe398626487eae7b05c',
            notify_name='IOSNotify (Production)',
            notify_name_zh='iOS通知（正式服）',
            notify_description='Send notification via ios apns (production)',
            notify_description_zh='通过iOS APNS发送通知 (正式服)',
        )
    
    def _create_apns_headers(
        self, 
        team_id: str, 
        key_id: str, 
        private_key: str, 
        apns_topic: str
    ):
        """
        动态生成 APNs 请求所需的 HTTP Headers，包括最新的 JWT Token。
        """
        token = jwt.encode(
            payload={
                "iss": team_id,
                "iat": int(time.time()),
                "exp": int(time.time()) + 3600  # 设置过期时间为1小时以内
            },
            algorithm="ES256",
            headers={
                "alg": "ES256",
                "kid": key_id
            },
            key=private_key
        )
        return {
            "authorization": "bearer " + token,
            "apns-topic": apns_topic,
            "apns-id": str(uuid.uuid4())
        }
    
    def _fetch_apple_public_keys(
        self
    ):
        """
        从 Apple 的公开 URL 获取公钥。
        """
        try:
            response = httpx.get(APPLE_PUBLIC_KEYS_URL, timeout=5)
            response.raise_for_status()
            return response.json()["keys"]
        except httpx.HTTPError as e:
            raise Exception(f"Failed to fetch Apple public keys: {e}")

    def _get_public_key(
        self, 
        kid, 
        keys
    ):
        """
        根据 kid 从 Apple 公钥列表中找到对应的公钥。
        """
        public_key_data = next((key for key in keys if key["kid"] == kid), None)
        if not public_key_data or "n" not in public_key_data or "e" not in public_key_data:
            raise Exception("Public key not found or invalid")
        return public_key_data

    def _convert_jwk_to_pem(
        self, 
        jwk_data
    ):
        """
        将 JWK 格式的密钥转换为 PEM 格式。
        """
        try:
            key = jwk.JWK.from_json(json.dumps(jwk_data))
            return key.export_to_pem().decode('utf-8')
        except Exception as e:
            raise Exception(f"Failed to convert JWK to PEM: {e}")

    def _verify_jwt(
        self, 
        identity_token, 
        public_key, 
        audience: str | None = None
    ):
        """
        验证 JWT 签名并解码。
        """
        decoded = jwt.decode(
            identity_token,
            public_key,
            algorithms=["RS256"],
            audience=audience,  # 替换为你的客户端ID
            issuer="https://appleid.apple.com"
        )
        return decoded

    def _decode_identity_token(
        self, 
        identity_token: str
    ):
        """
        主逻辑：获取 Apple 公钥、解析 JWT 头部、验证 JWT。
        """
        # Step 1: 获取 Apple 公钥
        keys = self._fetch_apple_public_keys()

        # Step 2: 解码 JWT 头部以获取 kid
        try:
            header = jwt.get_unverified_header(identity_token)
            kid = header["kid"]
        except Exception as e:
            raise Exception(f"Invalid ID token header: {e}")

        # Step 3: 根据 kid 获取对应的公钥
        public_key_data = self._get_public_key(kid, keys)

        # Step 4: 将 JWK 转换为 PEM 格式
        pem_key = self._convert_jwk_to_pem(public_key_data)

        # Step 5: 验证 JWT
        res = self._verify_jwt(
            identity_token=identity_token, 
            public_key=pem_key
        )
        return res

    def send_notification(
        self, 
        message: schemas.notification.Message
    ):
        if self.source is None or self.target is None:
            raise Exception("The source or target of the notification is not set")
        if self.source.ios_notification_source is None or self.target.ios_notification_target is None:
            raise Exception("The ios notification source or target of the notification is not set")
        headers = self._create_apns_headers(
            team_id=self.source.ios_notification_source.team_id,
            key_id=self.source.ios_notification_source.key_id,
            private_key=self.source.ios_notification_source.private_key,
            apns_topic=self.source.ios_notification_source.app_bundle_id
        )
        device_token = self.target.ios_notification_target.device_token
        url = f'https://api.push.apple.com/3/device/{device_token}'
        data = {
            "aps" : {
                "alert" : {
                    "title" : message.title,
                    "body" : message.content
                },
                "sound": {
                    "name": "default"
                },
                "mutable-content": 1,
            },
            "content-available": 1
        }
        with httpx.Client(http2=True) as client:
            try:
                res = client.post(url=url, headers=headers, json=data)
                res.raise_for_status()
                return True
            except Exception as e:
                exception_logger.error("Error sending notification to APNs:", e)
                return False