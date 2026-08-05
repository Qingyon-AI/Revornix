import crud
import asyncio
import time
import httpx
from ipaddress import ip_address
from typing import Any, cast
from urllib.parse import parse_qs, urlparse

from common.logger import info_logger, log_event, log_exception
from protocol.remote_file_service import RemoteFileServiceProtocol
from data.sql.base import async_session_context
from enums.engine_enums import EngineProvided, EngineCategory
from base_implement.stt_engine_base import (
    STTEngineBase,
    STTCapability,
    Segment,
    TranscribeResult,
)
from common.file import get_remote_file_signed_url


class VolcSTTStandardEngine(STTEngineBase):

    VOLC_BASE = "https://openspeech-direct.zijieapi.com"
    POLL_TIMEOUT_SEC = 3600
    POLL_INTERVAL_SEC = 1

    # Standard bigmodel supports both timestamped utterances and speaker info.
    CAPABILITY = STTCapability(segments=True, diarization=True, max_audio_seconds=None)

    def __init__(self):
        super().__init__(
            engine_uuid=EngineProvided.Volc_STT_Standard.meta.uuid,
            engine_category=EngineCategory.STT,
            engine_name="Volc Standard STT",
            engine_name_zh="Volc 标准版语音转文字",
            engine_description=(
                "Volc Standard STT is a speech-to-text service provided by ByteDance, which can convert speech into text. It supports audio files up to two hours long."
            ),
            engine_description_zh=(
                "Volc 标准版 STT 是字节跳动提供的语音转文字服务，可以将语音转换为文字，支持两小时以上的音频。"
            )
        )
    
    def _require_engine_config(self) -> tuple[str, str]:
        engine_config = self.get_engine_config()
        if not engine_config:
            raise Exception("The engine is not initialized yet. Please initialize the engine first.")
        token = engine_config.get("token")
        appid = engine_config.get("appid")
        if not token or not appid:
            raise Exception("There is something wrong with the user's configuration of the volc standard stt engine")
        return token, appid

    @staticmethod
    def _describe_signed_audio_url(url: str) -> dict[str, Any]:
        parsed = urlparse(url)
        query = parse_qs(parsed.query, keep_blank_values=True)
        query_keys = sorted(query.keys())
        expires_param = (
            query.get("X-Amz-Expires")
            or query.get("Expires")
            or query.get("x-oss-expires")
        )
        return {
            "scheme": parsed.scheme,
            "host": parsed.netloc,
            "path": parsed.path,
            "url_length": len(url),
            "query_keys": query_keys,
            "expires_param": expires_param[0] if expires_param else None,
            "has_signature": any("signature" in key.lower() for key in query_keys),
            "has_credential": any("credential" in key.lower() for key in query_keys),
        }

    @staticmethod
    def _is_non_public_host(host: str | None) -> bool:
        if not host:
            return True
        normalized_host = host.rstrip(".").lower()
        if normalized_host == "localhost" or normalized_host.endswith(".localhost"):
            return True
        try:
            address = ip_address(normalized_host)
        except ValueError:
            return False
        return (
            address.is_loopback
            or address.is_private
            or address.is_link_local
            or address.is_unspecified
        )

    def _ensure_volc_can_download_url(
        self,
        *,
        audio_file_name: str,
        signed_url: str,
    ) -> dict[str, Any]:
        parsed = urlparse(signed_url)
        url_info = self._describe_signed_audio_url(signed_url)
        rejection_reason: str | None = None
        if parsed.scheme not in {"http", "https"}:
            rejection_reason = "unsupported_scheme"
        elif self._is_non_public_host(parsed.hostname):
            rejection_reason = "non_public_host"

        if rejection_reason:
            log_event(
                info_logger,
                "volc_standard_stt_audio_url_rejected",
                request_id=audio_file_name,
                reason=rejection_reason,
                **url_info,
            )
            raise Exception(
                "Volc Standard STT audio URL is not publicly downloadable: "
                f"reason={rejection_reason}, host={url_info.get('host')}. "
                "Set FILE_SYSTEM_SERVER_PUBLIC_URL to a public object-storage endpoint "
                "or use a public S3/OSS-compatible file system for Volc STT."
            )
        return url_info

    async def _probe_signed_audio_url(
        self,
        *,
        audio_file_name: str,
        signed_url: str,
    ) -> None:
        url_info = self._describe_signed_audio_url(signed_url)
        try:
            async with httpx.AsyncClient(
                proxy=None,
                trust_env=False,
                timeout=10,
                follow_redirects=True,
            ) as client:
                response = await client.head(signed_url)
                method = "HEAD"
                if response.status_code >= 400:
                    async with client.stream(
                        "GET",
                        signed_url,
                        headers={"Range": "bytes=0-0"},
                    ) as streamed_response:
                        response = streamed_response
                        method = "GET_RANGE"
                        log_event(
                            info_logger,
                            "volc_standard_stt_audio_url_probe",
                            request_id=audio_file_name,
                            method=method,
                            status_code=response.status_code,
                            content_type=response.headers.get("content-type"),
                            content_length=response.headers.get("content-length"),
                            accept_ranges=response.headers.get("accept-ranges"),
                            final_host=urlparse(str(response.url)).netloc,
                            **url_info,
                        )
                        if response.status_code >= 400:
                            raise Exception(
                                "Volc Standard STT signed audio URL probe returned "
                                f"HTTP {response.status_code} with method={method}"
                            )
                        return

                log_event(
                    info_logger,
                    "volc_standard_stt_audio_url_probe",
                    request_id=audio_file_name,
                    method=method,
                    status_code=response.status_code,
                    content_type=response.headers.get("content-type"),
                    content_length=response.headers.get("content-length"),
                    accept_ranges=response.headers.get("accept-ranges"),
                    final_host=urlparse(str(response.url)).netloc,
                    **url_info,
                )
                if response.status_code >= 400:
                    raise Exception(
                        "Volc Standard STT signed audio URL probe returned "
                        f"HTTP {response.status_code} with method={method}"
                    )
        except Exception as exc:
            log_event(
                info_logger,
                "volc_standard_stt_audio_url_probe_failed",
                request_id=audio_file_name,
                error=repr(exc),
                **url_info,
            )
            raise

    async def _upload_audio(self, audio_file_name: str):
        token, appid = self._require_engine_config()
        user_id = self.user_id
        if not user_id:
            raise Exception("Engine is not initialized. Please initialize first.")

        async with async_session_context() as db:
            db_user = await crud.user.get_user_by_id_async(db=db, user_id=user_id)
            if not db_user:
                raise Exception("The owner of the engine is not found.")
            if db_user.default_user_file_system is None:
                raise Exception("The owner of the engine has not set a default file system yet.")
        
        final_audio_file_url = await get_remote_file_signed_url(
            user_id=user_id,
            file_name=audio_file_name,
        )
        url_info = self._ensure_volc_can_download_url(
            audio_file_name=audio_file_name,
            signed_url=final_audio_file_url,
        )
        log_event(
            info_logger,
            "volc_standard_stt_audio_url_prepared",
            request_id=audio_file_name,
            user_id=user_id,
            **url_info,
        )
        await self._probe_signed_audio_url(
            audio_file_name=audio_file_name,
            signed_url=final_audio_file_url,
        )
        
        request_url = f"{self.VOLC_BASE}/api/v3/auc/bigmodel/submit"
        headers = {
            "X-Api-App-Key": appid,
            "X-Api-Access-Key": token,
            "X-Api-Resource-Id": "volc.seedasr.auc",
            "X-Api-Request-Id": audio_file_name,
            "X-Api-Sequence": "-1",
        }
        payload = {
            "user": {
                "uid": str(user_id)
            },
            "audio": {
                "url": final_audio_file_url,
                "format": "wav"
            },
            "request": {
                "model_name": "bigmodel",
                "enable_channel_split": True,
                "enable_ddc": True,
                "enable_speaker_info": True,
                "show_utterances": True,
                "enable_punc": True,
                "enable_itn": True,
                "corpus": {
                    "correct_table_name": "",
                    "context": ""
                }
            }
        }
        info_logger.info(f"[Volc Standard STT] submit request_id={audio_file_name}")
        async with httpx.AsyncClient(proxy=None, trust_env=False, timeout=30) as client:
            response = await client.post(
                request_url,
                json=payload,
                headers=headers
            )
            status_code = response.headers.get("X-Api-Status-Code")
            if status_code != "20000000":
                message = response.headers.get("X-Api-Message", "")
                log_event(
                    info_logger,
                    "volc_standard_stt_submit_failed",
                    request_id=audio_file_name,
                    status_code=status_code,
                    api_message=message,
                    x_tt_logid=response.headers.get("X-Tt-Logid"),
                    **url_info,
                )
                raise Exception(f"Volc Standard STT submit failed: status={status_code}, message={message}")
            x_tt_logid = response.headers.get("X-Tt-Logid")
            if not x_tt_logid:
                raise Exception("Volc Standard STT submit response missing X-Tt-Logid")
            info_logger.info(f"[Volc Standard STT] submit success request_id={audio_file_name}, logid={x_tt_logid}")
            return audio_file_name, x_tt_logid

    async def _query_status(self, audio_file_name: str, x_tt_logid: str) -> tuple[bool, str, dict[str, Any] | None]:
        token, appid = self._require_engine_config()
        user_id = self.user_id
        if not user_id:
            raise Exception("Engine is not initialized. Please initialize first.")
        request_url = f"{self.VOLC_BASE}/api/v3/auc/bigmodel/query"

        headers = {
            "X-Api-App-Key": appid,
            "X-Api-Access-Key": token,
            "X-Api-Resource-Id": "volc.seedasr.auc",
            "X-Api-Request-Id": audio_file_name,
            "X-Tt-Logid": x_tt_logid  # 固定传递 x-tt-logid
        }
        
        async with httpx.AsyncClient(proxy=None, trust_env=False, timeout=30) as client:
            response = await client.post(
                request_url,
                json={},
                headers=headers
            )
            status_code = response.headers.get("X-Api-Status-Code")
            if status_code == "20000000":  # task finished
                info_logger.info("[Volc Standard STT] query success")
                try:
                    payload = response.json()
                except Exception as exc:
                    raise Exception("Volc Standard STT query response is not valid JSON") from exc
                if isinstance(payload, dict) and "result" in payload:
                    return True, status_code, payload["result"]
                return True, status_code, payload
            if status_code in {"20000001", "20000002"}:  # task running/queued
                return False, status_code, None
            message = response.headers.get("X-Api-Message", "")
            log_event(
                info_logger,
                "volc_standard_stt_query_failed",
                request_id=audio_file_name,
                x_tt_logid=x_tt_logid,
                status_code=status_code,
                api_message=message,
            )
            raise Exception(f"Volc STT query failed: status={status_code}, message={message}")

    @staticmethod
    def _parse_segments(result: dict[str, Any]) -> list[Segment]:
        """Convert Volc bigmodel ``utterances`` into unified segments.

        Volc time unit is milliseconds; speaker label lives at
        ``utterances[].additions.speaker`` (a string like "1"/"2") and is absent
        on engines that do not support diarization.
        """
        segments: list[Segment] = []
        for utterance in result.get("utterances", []) or []:
            speaker = (utterance.get("additions") or {}).get("speaker")
            segments.append(
                Segment(
                    start=utterance.get("start_time", 0) / 1000.0,
                    end=utterance.get("end_time", 0) / 1000.0,
                    speaker=(f"S{speaker}" if speaker else None),
                    text=utterance.get("text", ""),
                )
            )
        return segments

    async def transcribe_audio(
        self,
        audio_file_name: str,
        *,
        with_segments: bool = False,
    ) -> TranscribeResult:
        """音频转文本

        Args:
            audio_file_name (str): 用户的音频在文件系统中的路径，注意并非完整的url！而是路径！
            with_segments (bool): 是否返回带时间戳/说话人的分段结果（会议记录模式）。

        """
        audio_file_name, x_tt_logid = await self._upload_audio(audio_file_name)
        start_time = time.monotonic()
        last_status: str | None = None
        while True:
            done, status_code, result = await self._query_status(audio_file_name, x_tt_logid)
            last_status = status_code
            if done and result:
                text = cast(str, result.get('text') or "")
                segments = self._parse_segments(result) if with_segments else None
                return TranscribeResult(text=text, segments=segments)
            if time.monotonic() - start_time >= self.POLL_TIMEOUT_SEC:
                raise Exception(
                    f"Timeout waiting for Volc STT results (>{self.POLL_TIMEOUT_SEC}s). "
                    f"request_id={audio_file_name}, logid={x_tt_logid}, last_status={last_status}"
                )
            await asyncio.sleep(self.POLL_INTERVAL_SEC)

async def main():
    try:
        engine = VolcSTTStandardEngine()
        engine.set_engine_config({
            "token": "",
            "appid": "",
        })
        engine.set_user_id(1)
        result = await engine.transcribe_audio(audio_file_name="audio/test.wav", with_segments=True)
        print(result.text)
        with open('./test.json', 'w') as f:
            print(result.text, file=f)
        print(result.segments)
    except Exception as exc:
        print(exc)
        log_exception()

if __name__ == "__main__":
    asyncio.run(main())
