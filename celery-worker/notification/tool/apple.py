import httpx
import time
import uuid
import json
import jwt
from jwcrypto import jwk
from protocol.notification_tool import NotificationToolProtocol
from common.logger import exception_logger

APPLE_PUBLIC_KEYS_URL = "https://appleid.apple.com/auth/keys"

class AppleNotificationTool(NotificationToolProtocol):
    
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

    async def send_notification(
        self, 
        title: str,
        content: str | None = None,
        cover: str | None = None,
        link: str | None = None
    ):
        if self.source is None or self.target is None:
            raise Exception("The source or target of the notification is not set")
        source_config = self.get_source_config()
        target_config = self.get_target_config()
        if source_config is None or target_config is None:
            raise Exception("The source or target config of the notification is not set")
        headers = self._create_apns_headers(
            team_id=source_config.get('team_id'),
            key_id=source_config.get('key_id'),
            private_key=source_config.get('private_key'),
            apns_topic=source_config.get('app_bundle_id')
        )
        device_token = target_config.get('device_token')
        url = f'https://api.push.apple.com/3/device/{device_token}'
        data = {
            "aps" : {
                "alert" : {
                    "title" : title,
                    "body" : content
                },
                "sound": {
                    "name": "default"
                },
                "mutable-content": 1,
            },
            "link": link,
            "content-available": 1
        }
        if cover is not None:
            data.update({'sender_avatar': cover})
        async with httpx.AsyncClient(http2=True, timeout=10) as client:
            try:
                res = await client.post(url=url, headers=headers, json=data)
                res.raise_for_status()
                return True
            except Exception as e:
                exception_logger.error("Error sending notification to APNs:", e)
                return False
