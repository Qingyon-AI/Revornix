import crud
import asyncio
import time
import httpx
from typing import Any, cast
from common.logger import info_logger, log_exception
from protocol.remote_file_service import RemoteFileServiceProtocol
from data.sql.base import SessionLocal
from enums.engine_enums import EngineProvided, EngineCategory
from base_implement.stt_engine_base import STTEngineBase
from common.file import get_remote_file_signed_url


class VolcSTTStandardEngine(STTEngineBase):

    VOLC_BASE = "https://openspeech-direct.zijieapi.com"
    POLL_TIMEOUT_SEC = 3600
    POLL_INTERVAL_SEC = 1

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
            ),
            engine_demo_config='{"token": "******", "appid": "******"}',
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

    async def _upload_audio(self, audio_file_name: str):
        token, appid = self._require_engine_config()
        user_id = self.user_id
        if not user_id:
            raise Exception("Engine is not initialized. Please initialize first.")

        db = SessionLocal()
        db_user = crud.user.get_user_by_id(db=db, user_id=user_id)
        if not db_user:
            raise Exception("The owner of the engine is not found.")
        if db_user.default_user_file_system is None:
            raise Exception("The owner of the engine has not set a default file system yet.")
        
        final_audio_file_url = await get_remote_file_signed_url(
            user_id=user_id,
            file_name=audio_file_name,
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
            raise Exception(f"Volc STT query failed: status={status_code}, message={message}")

    async def transcribe_audio(self, audio_file_name: str) -> str:
        """音频转文本

        Args:
            audio_file_name (str): 用户的音频在文件系统中的路径，注意并非完整的url！而是路径！

        """
        audio_file_name, x_tt_logid = await self._upload_audio(audio_file_name)
        start_time = time.monotonic()
        last_status: str | None = None
        while True:
            done, status_code, result = await self._query_status(audio_file_name, x_tt_logid)
            last_status = status_code
            if done and result:
                return cast(str, result.get('text'))
            if time.monotonic() - start_time >= self.POLL_TIMEOUT_SEC:
                raise Exception(
                    f"Timeout waiting for Volc STT results (>{self.POLL_TIMEOUT_SEC}s). "
                    f"request_id={audio_file_name}, logid={x_tt_logid}, last_status={last_status}"
                )
            await asyncio.sleep(self.POLL_INTERVAL_SEC)

async def main():
    from data.sql.base import SessionLocal
    db = SessionLocal()
    try:
        engine = VolcSTTStandardEngine()
        engine.set_engine_config({
            "token": "",
            "appid": "",
        })
        engine.set_user_id(1)
        result = await engine.transcribe_audio(audio_file_name="audio/test.wav")
        print(result)
        with open('./test.json', 'w') as f:
            print(result, file=f)
        print(result)
    except Exception as exc:
        print(exc)
        log_exception()
        
    finally:
        db.close()

if __name__ == "__main__":
    asyncio.run(main())