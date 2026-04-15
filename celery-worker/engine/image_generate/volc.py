import base64
import hashlib
import hmac
import json
import mimetypes
from datetime import datetime, timezone
from urllib.parse import quote

import httpx
from langfuse import propagate_attributes

from base_implement.image_generate_engine_base import ImageGenerateEngineBase
from common.usage_billing import persist_engine_usage
from enums.engine_enums import EngineCategory, EngineProvided

DEFAULT_VOLC_IMAGE_BASE_URL = "https://visual.volcengineapi.com"
DEFAULT_VOLC_IMAGE_REGION = "cn-north-1"
DEFAULT_VOLC_IMAGE_SERVICE = "cv"
DEFAULT_VOLC_IMAGE_ACTION = "CVProcess"
DEFAULT_VOLC_IMAGE_VERSION = "2022-08-31"
DEFAULT_VOLC_IMAGE_REQ_KEY = ""


def _sha256_hex(data: str) -> str:
    return hashlib.sha256(data.encode("utf-8")).hexdigest()


def _hmac_sha256(key: bytes, data: str) -> bytes:
    return hmac.new(key, data.encode("utf-8"), hashlib.sha256).digest()


def _canonical_query_string(params: dict[str, str]) -> str:
    return "&".join(
        f"{quote(str(key), safe='-_.~')}={quote(str(value), safe='-_.~')}"
        for key, value in sorted(params.items(), key=lambda item: item[0])
    )


def _safe_json(response: httpx.Response) -> dict | None:
    try:
        payload = response.json()
    except Exception:
        return None
    return payload if isinstance(payload, dict) else None


def _guess_content_type(*, header_value: str | None, image_url: str) -> str:
    if header_value:
        content_type = header_value.split(";", 1)[0].strip().lower()
        if content_type.startswith("image/"):
            return content_type

    guessed, _ = mimetypes.guess_type(image_url)
    if guessed and guessed.startswith("image/"):
        return guessed
    return "image/png"


def _extract_image_url_or_data_url(response_data: dict) -> str | None:
    data = response_data.get("data")
    if not isinstance(data, dict):
        return None

    image_urls = data.get("image_urls")
    if isinstance(image_urls, list) and image_urls:
        first_url = image_urls[0]
        if isinstance(first_url, str) and first_url.strip():
            return first_url.strip()

    binary_data_base64 = data.get("binary_data_base64")
    if isinstance(binary_data_base64, list) and binary_data_base64:
        first_image = binary_data_base64[0]
        if isinstance(first_image, str) and first_image.strip():
            return f"data:image/png;base64,{first_image.strip()}"

    return None


def _normalize_response_payload(response_data: dict) -> dict:
    result = response_data.get("Result")
    if not isinstance(result, dict):
        return response_data

    resp_json = result.get("RespJson")
    if isinstance(resp_json, dict):
        return resp_json
    return response_data


class VolcImageGenerateEngine(ImageGenerateEngineBase):

    def __init__(self):
        super().__init__(
            engine_uuid=EngineProvided.Volc_Image.meta.uuid,
            engine_name="Volc Image",
            engine_name_zh="火山图像生成",
            engine_category=EngineCategory.IMAGE_GENERATE,
            engine_description="Based on Volcengine OpenAPI image generation service",
            engine_description_zh="基于火山引擎 OpenAPI 的图像生成引擎"
        )

    def generate_image(
        self,
        prompt: str,
    ) -> str | None:
        config = self.get_engine_config()
        if config is None:
            raise Exception("The engine hasn't been initialized yet.")

        access_key_id = config.get("access_key_id")
        secret_access_key = config.get("secret_access_key")
        base_url = str(config.get("base_url") or DEFAULT_VOLC_IMAGE_BASE_URL).rstrip("/")
        region = str(config.get("region") or DEFAULT_VOLC_IMAGE_REGION)
        service = str(config.get("service") or DEFAULT_VOLC_IMAGE_SERVICE)
        action = str(config.get("action") or DEFAULT_VOLC_IMAGE_ACTION)
        version = str(config.get("version") or DEFAULT_VOLC_IMAGE_VERSION)
        req_key = str(config.get("req_key") or DEFAULT_VOLC_IMAGE_REQ_KEY).strip()

        if not access_key_id or not secret_access_key or not req_key:
            raise Exception("The configuration of this engine is not complete.")
        if self.user_id is None:
            raise Exception("The user_id is not set.")

        body: dict[str, object] = {
            "req_key": req_key,
            "prompt": prompt,
        }
        if isinstance(config.get("use_pre_llm"), bool):
            body["use_pre_llm"] = config["use_pre_llm"]
        if isinstance(config.get("seed"), int):
            body["seed"] = config["seed"]
        if isinstance(config.get("scale"), (int, float)):
            body["scale"] = config["scale"]
        if isinstance(config.get("width"), int):
            body["width"] = config["width"]
        if isinstance(config.get("height"), int):
            body["height"] = config["height"]
        if isinstance(config.get("return_url"), bool):
            body["return_url"] = config["return_url"]

        body_json = json.dumps(body, ensure_ascii=False, separators=(",", ":"))
        body_sha256 = _sha256_hex(body_json)

        request_time = datetime.now(timezone.utc)
        x_date = request_time.strftime("%Y%m%dT%H%M%SZ")
        short_date = request_time.strftime("%Y%m%d")

        query = _canonical_query_string(
            {
                "Action": action,
                "Version": version,
            }
        )
        host = base_url.replace("https://", "").replace("http://", "").split("/", 1)[0]
        canonical_headers = (
            f"content-type:application/json\n"
            f"host:{host}\n"
            f"x-content-sha256:{body_sha256}\n"
            f"x-date:{x_date}\n"
        )
        signed_headers = "content-type;host;x-content-sha256;x-date"
        canonical_request = (
            f"POST\n/\n{query}\n{canonical_headers}\n{signed_headers}\n{body_sha256}"
        )
        credential_scope = f"{short_date}/{region}/{service}/request"
        string_to_sign = (
            f"HMAC-SHA256\n{x_date}\n{credential_scope}\n{_sha256_hex(canonical_request)}"
        )

        k_date = _hmac_sha256(secret_access_key.encode("utf-8"), short_date)
        k_region = hmac.new(k_date, region.encode("utf-8"), hashlib.sha256).digest()
        k_service = hmac.new(k_region, service.encode("utf-8"), hashlib.sha256).digest()
        k_signing = hmac.new(k_service, b"request", hashlib.sha256).digest()
        signature = hmac.new(
            k_signing,
            string_to_sign.encode("utf-8"),
            hashlib.sha256,
        ).hexdigest()

        authorization = (
            "HMAC-SHA256 "
            f"Credential={access_key_id}/{credential_scope}, "
            f"SignedHeaders={signed_headers}, "
            f"Signature={signature}"
        )
        request_url = f"{base_url}/?{query}"

        with propagate_attributes(
            user_id=str(self.user_id),
            tags=[f"volc_action:{action}", f"volc_req_key:{req_key}"],
        ):
            with httpx.Client(timeout=180.0) as client:
                response = client.post(
                    request_url,
                    headers={
                        "Content-Type": "application/json",
                        "Host": host,
                        "X-Content-Sha256": body_sha256,
                        "X-Date": x_date,
                        "Authorization": authorization,
                    },
                    content=body_json.encode("utf-8"),
                )
                if response.is_error:
                    error_payload = _safe_json(response)
                    raise Exception(
                        "Volc image generation http error: "
                        f"status={response.status_code}, "
                        f"body={error_payload if error_payload is not None else response.text}"
                    )
                response_data = _normalize_response_payload(response.json())

                if response_data.get("code") not in (None, 10000, "10000"):
                    raise Exception(
                        f"Volc image generation failed: "
                        f"{response_data.get('code')}: {response_data.get('message')}"
                    )

                image_payload = _extract_image_url_or_data_url(response_data)
                if not image_payload:
                    return None

                if image_payload.startswith("data:image/"):
                    return f"![image]({image_payload})"

                image_response = client.get(image_payload)
                image_response.raise_for_status()

        persist_engine_usage(
            user_id=self.user_id,
            resource_uuid=self.resource_uuid or self.engine_uuid,
            usage_details={"total": 1},
            source="volc_image_generate",
        )

        content_type = _guess_content_type(
            header_value=image_response.headers.get("content-type"),
            image_url=image_payload,
        )
        image_base64 = base64.b64encode(image_response.content).decode("ascii")
        return f"![image](data:{content_type};base64,{image_base64})"
