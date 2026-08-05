import crud
import asyncio
import httpx
import uuid
import base64
from typing import Any
from common.logger import info_logger
from common.file import get_remote_file_signed_url
from data.sql.base import async_session_context
from enums.engine_enums import EngineProvided, EngineCategory
from base_implement.stt_engine_base import (
    STTEngineBase,
    STTCapability,
    Segment,
    TranscribeResult,
)


class VolcSTTFastEngine(STTEngineBase):

    VOLC_BASE = "https://openspeech.bytedance.com"

    # Flash bigmodel returns timestamped utterances but no speaker info, and is
    # limited to audio under two hours.
    CAPABILITY = STTCapability(segments=True, diarization=False, max_audio_seconds=7200)

    def __init__(self):
        super().__init__(
            engine_uuid=EngineProvided.Volc_STT_Fast.meta.uuid,
            engine_category=EngineCategory.STT,
            engine_name="Volc Fast STT",
            engine_name_zh="Volc 极速版语音转文字",
            engine_description=(
                "Volc Fast STT is a speech-to-text service provided by ByteDance, which can convert speech into text. It only supports audio files that are less than two hours long."
            ),
            engine_description_zh=(
                "Volc 极速版STT 是字节跳动提供的语音转文字服务，可以将语音转换为文字。仅支持两小时以下的音频。"
            )
        )
    
    def _require_engine_config(self) -> tuple[str, str]:
        engine_config = self.get_engine_config()
        if not engine_config:
            raise Exception("The engine is not initialized yet. Please initialize the engine first.")
        token = engine_config.get("token")
        appid = engine_config.get("appid")
        if not token or not appid:
            raise Exception("There is something wrong with the user's configuration of the volc fast stt engine")
        return token, appid
    
    async def _fetch_file_as_base64(self, url: str) -> str:
        async with httpx.AsyncClient() as client:
            resp = await client.get(url)
            resp.raise_for_status()
            binary = resp.content              # bytes
            encoded = base64.b64encode(binary) # bytes
            return encoded.decode("utf-8")     # str

    @staticmethod
    def _parse_segments(result: dict[str, Any]) -> list[Segment]:
        """Convert Volc flash ``utterances`` into unified segments.

        Volc time unit is milliseconds. The flash model does not emit speaker
        labels, so ``speaker`` is always None here.
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
            with_segments (bool): 是否返回带时间戳的分段结果（极速版不含说话人信息）。

        """
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
        
        file_base64 = await self._fetch_file_as_base64(final_audio_file_url)
        
        request_url = f"{self.VOLC_BASE}/api/v3/auc/bigmodel/recognize/flash"
        headers = {
            "X-Api-App-Key": appid,
            "X-Api-Access-Key": token,
            "X-Api-Resource-Id": "volc.bigasr.auc_turbo", 
            "X-Api-Request-Id": str(uuid.uuid4()),
            "X-Api-Sequence": "-1", 
        }
        payload = {
            "user": {
                "uid": str(user_id)
            },
            "audio": {
                "data": file_base64
            },
            "request": {
                "model_name": "bigmodel",
                "enable_itn": True,
                "enable_punc": True,
                "enable_ddc": True,
                "enable_speaker_info": False,
                "show_utterances": True,
            }
        }
        info_logger.info(f"[Volc Fast STT] submit request_id={audio_file_name}")
        async with httpx.AsyncClient(proxy=None, trust_env=False, timeout=30) as client:
            response = await client.post(
                request_url,
                json=payload,
                headers=headers
            )
            status_code = response.headers.get("X-Api-Status-Code")
            if status_code != "20000000":
                message = response.headers.get("X-Api-Message", "")
                raise Exception(f"Volc STT submit failed: status={status_code}, message={message}")
            info_logger.info("[Volc Standard STT] query success")
            try:
                payload = response.json()
            except Exception as exc:
                raise Exception("Volc Standard STT query response is not valid JSON") from exc
            if isinstance(payload, dict) and "result" in payload:
                result = payload["result"]
                if isinstance(result, dict) and "text" in result:
                    segments = self._parse_segments(result) if with_segments else None
                    return TranscribeResult(text=result["text"], segments=segments)
                else:
                    raise Exception("Volc Standard STT query response is not valid JSON")
            raise Exception("Volc Fast STT response does not contain transcription text")

async def main():
    engine = VolcSTTFastEngine()
    engine.set_user_id(1)
    engine.set_engine_config({
        "token": "",
        "appid": ""
    })
    result = await engine.transcribe_audio(audio_file_name="audio/test.wav", with_segments=True)
    print(result.text)
    print(result.segments)

if __name__ == "__main__":
    asyncio.run(main())
