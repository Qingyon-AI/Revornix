import json
import time
import uuid
from typing import Any

import httpx
import websockets
import crud
from langfuse import propagate_attributes
from pydantic import AnyUrl

from base_implement.tts_engine_base import TTSEngineBase, TTSSynthesisResult
from common.ai import generate_podcast_dialogue_turns
from common.langfuse import langfuse
from common.logger import exception_logger, info_logger
from common.usage_billing import persist_engine_usage
from data.sql.base import session_scope
from engine.tts.volc.protocol import (
    EventType,
    MsgType,
    finish_connection,
    finish_session,
    receive_message,
    start_connection,
    start_session,
    wait_for_event,
)
from enums.engine_enums import EngineCategory, EngineProvided


DEFAULT_VOLC_PODCAST_BASE_URL = "wss://openspeech.bytedance.com/api/v3/sami/podcasttts"
DEFAULT_VOLC_PODCAST_SPEAKERS = [
    "zh_male_dayixiansheng_v2_saturn_bigtts",
    "zh_female_mizaitongxue_v2_saturn_bigtts",
]
DEFAULT_VOLC_AUDIO_CONFIG = {
    "format": "mp3",
    "sample_rate": 24000,
    "speech_rate": 0,
}
DEFAULT_VOLC_WAIT_EVENT_TYPES = {
    MsgType.FullServerResponse,
    MsgType.AudioOnlyServer,
}
DEFAULT_MAX_RETRIES = 3


class VolcTTSEngine(TTSEngineBase):
    """此引擎使用的是字节跳动的播客TTS引擎，具体文档参照https://www.volcengine.com/docs/6561/1668014"""

    def __init__(self):
        super().__init__(
            engine_uuid=EngineProvided.Volc_TTS.meta.uuid,
            engine_name="Volc Podcast Engine",
            engine_name_zh="豆包播客引擎",
            engine_category=EngineCategory.TTS,
            engine_description="DouBao Podcast TTS, based on ByteDance's DouBao large model podcast generation engine.",
            engine_description_zh="豆包播客，基于字节跳动的豆包大模型的播客生成引擎。",
        )

    def _resolve_base_url(self, config: dict[str, Any]) -> str:
        return str(config.get("base_url") or DEFAULT_VOLC_PODCAST_BASE_URL)

    def _resolve_generation_mode(self, config: dict[str, Any]) -> str:
        raw_mode = str(config.get("generation_mode") or "summary").strip().lower()
        if raw_mode in {"summary", "prompt", "dialogue"}:
            return raw_mode
        raise Exception(
            "The generation_mode in Volc TTS engine config must be one of: summary, prompt, dialogue"
        )

    def _resolve_generation_action(self, config: dict[str, Any]) -> int:
        generation_mode = self._resolve_generation_mode(config)
        if generation_mode == "dialogue":
            return 3
        if generation_mode == "prompt":
            return 4
        return 0

    def _resolve_audio_config(self, config: dict[str, Any]) -> dict[str, Any]:
        audio_config = dict(DEFAULT_VOLC_AUDIO_CONFIG)
        raw_audio_config = config.get("audio_config")
        if isinstance(raw_audio_config, dict):
            for key in ("format", "sample_rate", "speech_rate"):
                value = raw_audio_config.get(key)
                if value not in (None, ""):
                    audio_config[key] = value
        return audio_config

    def _resolve_speakers(self, config: dict[str, Any]) -> list[str]:
        raw_speaker_info = config.get("speaker_info")
        if isinstance(raw_speaker_info, dict):
            raw_speakers = raw_speaker_info.get("speakers")
            if isinstance(raw_speakers, list):
                speakers = [
                    str(speaker).strip()
                    for speaker in raw_speakers
                    if str(speaker).strip()
                ]
                if len(speakers) == 2:
                    return speakers
        return list(DEFAULT_VOLC_PODCAST_SPEAKERS)

    def _resolve_dialogue_model_id(self, config: dict[str, Any]) -> int:
        raw_dialogue_model_id = config.get("dialogue_model_id")
        if raw_dialogue_model_id not in (None, ""):
            try:
                return int(raw_dialogue_model_id)
            except (TypeError, ValueError) as e:
                raise Exception("The dialogue_model_id in Volc TTS engine config is invalid") from e

        if self.user_id is None:
            raise Exception("The user_id is not set.")

        db = session_scope()
        try:
            db_user = crud.user.get_user_by_id(db=db, user_id=self.user_id)
            if db_user is None:
                raise Exception("The user is not found")
            if db_user.default_document_reader_model_id is None:
                raise Exception(
                    "The user has not set the default document reader model required by Volc action=3 dialogue generation"
                )
            return db_user.default_document_reader_model_id
        finally:
            db.close()

    def _resolve_max_retries(self, config: dict[str, Any]) -> int:
        raw_max_retries = config.get("max_retries")
        if raw_max_retries in (None, ""):
            return DEFAULT_MAX_RETRIES
        try:
            return max(1, int(raw_max_retries))
        except (TypeError, ValueError) as e:
            raise Exception("The max_retries in Volc TTS engine config is invalid") from e

    def _resolve_input_info(self, config: dict[str, Any]) -> dict[str, Any]:
        input_info: dict[str, Any] = {"return_audio_url": True}
        raw_input_info = config.get("input_info")
        if isinstance(raw_input_info, dict):
            input_info.update(
                {key: value for key, value in raw_input_info.items() if value is not None}
            )
        return input_info

    def _resolve_speaker_additions(self, config: dict[str, Any]) -> dict[str, str]:
        raw_speaker_additions = config.get("speaker_additions")

        additions: dict[str, str] = {}
        if not isinstance(raw_speaker_additions, dict):
            return additions

        for speaker_id, value in raw_speaker_additions.items():
            normalized_speaker_id = str(speaker_id).strip()
            if not normalized_speaker_id or value in (None, ""):
                continue
            if isinstance(value, str):
                additions[normalized_speaker_id] = value
            else:
                additions[normalized_speaker_id] = json.dumps(value, ensure_ascii=False)
        return additions

    def _resolve_speaker_info(self, config: dict[str, Any], *, for_dialogue: bool) -> dict[str, Any]:
        raw_speaker_info = config.get("speaker_info")
        speaker_info: dict[str, Any] = {}
        if isinstance(raw_speaker_info, dict):
            if raw_speaker_info.get("random_order") is not None:
                speaker_info["random_order"] = bool(raw_speaker_info.get("random_order"))

        speaker_info["speakers"] = self._resolve_speakers(config)

        speaker_additions = self._resolve_speaker_additions(config)
        if speaker_additions:
            speaker_info["speaker_additions"] = speaker_additions

        if for_dialogue:
            speaker_info["random_order"] = False
        elif "random_order" not in speaker_info:
            speaker_info["random_order"] = True

        return speaker_info

    def _merge_extra_body(self, req_params: dict[str, Any], config: dict[str, Any]) -> dict[str, Any]:
        raw_extra_body = config.get("extra_body")
        if not isinstance(raw_extra_body, dict):
            return req_params

        for key, value in raw_extra_body.items():
            if isinstance(value, dict) and isinstance(req_params.get(key), dict):
                req_params[key].update(value)
            else:
                req_params[key] = value
        return req_params

    async def _build_action3_dialogue_turns(
        self,
        *,
        config: dict[str, Any],
        text: str,
    ) -> list[dict[str, str]]:
        if self.user_id is None:
            raise Exception("The user_id is not set.")

        speakers = self._resolve_speakers(config)
        model_id = self._resolve_dialogue_model_id(config)
        turns = await generate_podcast_dialogue_turns(
            user_id=self.user_id,
            model_id=model_id,
            content=text,
            speakers=speakers,
        )
        if not turns:
            raise Exception("Failed to generate action=3 dialogue turns for Volc podcast")
        return turns

    def _build_request_payload(
        self,
        *,
        config: dict[str, Any],
        text: str,
    ) -> dict[str, Any]:
        action = self._resolve_generation_action(config)
        audio_config = self._resolve_audio_config(config)
        input_info = self._resolve_input_info(config)

        req_params: dict[str, Any] = {
            "input_id": str(time.time()),
            "action": action,
            "use_head_music": bool(config.get("use_head_music", True)),
            "use_tail_music": bool(config.get("use_tail_music", False)),
            "aigc_watermark": bool(config.get("aigc_watermark", False)),
            "audio_config": audio_config,
        }

        raw_aigc_metadata = config.get("aigc_metadata")
        if isinstance(raw_aigc_metadata, dict):
            req_params["aigc_metadata"] = raw_aigc_metadata

        raw_scene = config.get("scene")
        if raw_scene not in (None, ""):
            req_params["scene"] = str(raw_scene)

        if action == 3:
            req_params["speaker_info"] = self._resolve_speaker_info(config, for_dialogue=True)
            return self._merge_extra_body(req_params, config)

        if action == 4:
            req_params["prompt_text"] = text.strip()
            speaker_info = self._resolve_speaker_info(config, for_dialogue=False)
            if speaker_info.get("speakers"):
                req_params["speaker_info"] = speaker_info
            req_params["input_info"] = input_info
            return self._merge_extra_body(req_params, config)

        input_url = input_info.get("input_url")

        if not input_url:
            req_params["input_text"] = text
        req_params["input_info"] = input_info

        speaker_info = self._resolve_speaker_info(config, for_dialogue=False)
        if speaker_info.get("speakers"):
            req_params["speaker_info"] = speaker_info

        return self._merge_extra_body(req_params, config)

    def _build_retry_payload(
        self,
        *,
        req_params: dict[str, Any],
        task_id: str,
        last_finished_round_id: int,
    ) -> dict[str, Any]:
        retry_payload = dict(req_params)
        retry_payload["retry_info"] = {
            "retry_task_id": task_id,
            "last_finished_round_id": last_finished_round_id,
        }
        return retry_payload

    def _accumulate_usage(
        self,
        *,
        token_usage_info: dict[str, int],
        payload: bytes,
        gen: Any,
    ) -> None:
        data = json.loads(payload.decode("utf-8"))
        usage = data.get("usage") or {}
        input_text_tokens = int(usage.get("input_text_tokens") or 0)
        output_audio_tokens = int(usage.get("output_audio_tokens") or 0)
        token_usage_info["input_text_tokens"] += input_text_tokens
        token_usage_info["output_audio_tokens"] += output_audio_tokens
        gen.update(
            output="",
            usage_details={
                "input_text_tokens": token_usage_info["input_text_tokens"],
                "output_audio_tokens": token_usage_info["output_audio_tokens"],
            },
        )

    def _merge_round_timing_into_segments(
        self,
        *,
        script_segments: list[dict[str, Any]],
        round_meta: dict[str, Any],
        round_id: int,
    ) -> None:
        if not script_segments:
            return

        candidate_indexes: list[int] = []
        if 0 <= round_id < len(script_segments):
            candidate_indexes.append(round_id)
        if 0 <= round_id - 1 < len(script_segments):
            candidate_indexes.append(round_id - 1)

        target_index = next(
            (
                index
                for index in candidate_indexes
                if script_segments[index].get("start") in (None, "")
                and script_segments[index].get("end") in (None, "")
            ),
            candidate_indexes[0] if candidate_indexes else None,
        )
        if target_index is None:
            return

        target_segment = script_segments[target_index]
        if round_meta.get("start_time") not in (None, ""):
            target_segment["start"] = float(round_meta["start_time"])
        if round_meta.get("end_time") not in (None, ""):
            target_segment["end"] = float(round_meta["end_time"])
        if round_meta.get("audio_duration") not in (None, ""):
            target_segment["audioDuration"] = float(round_meta["audio_duration"])

    async def synthesize(self, text: str) -> TTSSynthesisResult:
        config = self.get_engine_config()
        if config is None:
            raise Exception("The engine havn't been initialized yet.")
        if not config.get("appid") or not config.get("access_token"):
            raise Exception("The user's configuration of this engine is not complete.")
        if self.user_id is None:
            raise Exception("The user_id is not set.")

        headers = {
            "X-Api-App-Id": config.get("appid"),
            "X-Api-App-Key": "aGjiRDfUWi",
            "X-Api-Access-Key": config.get("access_token"),
            "X-Api-Resource-Id": "volc.service_type.10050",
            "X-Api-Request-Id": str(uuid.uuid4()),
        }

        req_params = self._build_request_payload(config=config, text=text)
        script_segments: list[dict[str, Any]] = []
        script_text = text
        if req_params.get("action") == 3:
            req_params["nlp_texts"] = await self._build_action3_dialogue_turns(
                config=config,
                text=text,
            )
            script_segments = list(req_params["nlp_texts"])
            script_text = "\n\n".join(
                f"{turn.get('speaker')}: {turn.get('text')}"
                for turn in script_segments
                if turn.get("text")
            ).strip() or text
            info_logger.info(
                f"event=volc_podcast_dialogue_generated user_id={self.user_id} "
                f"turns={len(req_params['nlp_texts'])} generation_mode=dialogue"
            )

        final_audio_url: AnyUrl | None = None
        last_error: Exception | None = None
        token_usage_info = {"input_text_tokens": 0, "output_audio_tokens": 0}
        completed_audio_chunks: list[bytes] = []
        current_round_audio_chunks: list[bytes] = []
        task_id = ""
        current_round = -1
        last_finished_round_id = -1
        max_retries = self._resolve_max_retries(config)

        with langfuse.start_as_current_observation(as_type="generation", name="tts-call", model="volc-podcast") as gen:
            with propagate_attributes(user_id=str(self.user_id), tags=["model:volc-podcast"]):
                gen.update(input=text)
                for attempt in range(1, max_retries + 1):
                    websocket = None
                    round_completed = True
                    session_finished = False
                    current_round_audio_chunks = []
                    try:
                        attempt_payload = dict(req_params)
                        if task_id and last_finished_round_id >= 0:
                            attempt_payload = self._build_retry_payload(
                                req_params=req_params,
                                task_id=task_id,
                                last_finished_round_id=last_finished_round_id,
                            )

                        websocket = await websockets.connect(
                            self._resolve_base_url(config),
                            additional_headers=headers,
                        )
                        await start_connection(websocket)
                        await wait_for_event(
                            websocket,
                            DEFAULT_VOLC_WAIT_EVENT_TYPES,
                            EventType.ConnectionStarted,
                        )

                        session_id = str(uuid.uuid4())
                        if not task_id:
                            task_id = session_id

                        await start_session(
                            websocket,
                            json.dumps(attempt_payload, ensure_ascii=False).encode("utf-8"),
                            session_id,
                        )
                        await wait_for_event(
                            websocket,
                            DEFAULT_VOLC_WAIT_EVENT_TYPES,
                            EventType.SessionStarted,
                        )
                        await finish_session(websocket, session_id)

                        while True:
                            msg = await receive_message(websocket)
                            if msg.type == MsgType.Error:
                                error_message = msg.payload.decode("utf-8", "ignore")
                                raise RuntimeError(f"Server error [{msg.error_code}]: {error_message}")

                            if msg.event == EventType.PodcastRoundStart:
                                round_meta = json.loads(msg.payload.decode("utf-8")) if msg.payload else {}
                                current_round = int(round_meta.get("round_id", -1))
                                current_round_audio_chunks = []
                                round_completed = False
                                continue

                            if msg.event == EventType.PodcastRoundResponse:
                                if msg.payload:
                                    current_round_audio_chunks.append(msg.payload)
                                continue

                            if msg.event == EventType.PodcastRoundEnd:
                                round_meta = json.loads(msg.payload.decode("utf-8")) if msg.payload else {}
                                if round_meta.get("is_error"):
                                    raise RuntimeError(
                                        f"Podcast round {current_round} failed: {round_meta.get('error_msg') or 'unknown error'}"
                                    )
                                self._merge_round_timing_into_segments(
                                    script_segments=script_segments,
                                    round_meta=round_meta,
                                    round_id=current_round,
                                )
                                completed_audio_chunks.extend(current_round_audio_chunks)
                                current_round_audio_chunks = []
                                last_finished_round_id = current_round
                                round_completed = True
                                continue

                            if msg.event == EventType.PodcastEnd:
                                data = json.loads(msg.payload.decode("utf-8")) if msg.payload else {}
                                meta_info = data.get("meta_info") or {}
                                audio_url = meta_info.get("audio_url")
                                if audio_url:
                                    final_audio_url = AnyUrl(audio_url)
                                continue

                            if msg.event == EventType.UsageResponse:
                                self._accumulate_usage(
                                    token_usage_info=token_usage_info,
                                    payload=msg.payload,
                                    gen=gen,
                                )
                                continue

                            if msg.event == EventType.SessionFinished:
                                session_finished = True
                                break

                        await finish_connection(websocket)
                        await wait_for_event(
                            websocket,
                            DEFAULT_VOLC_WAIT_EVENT_TYPES,
                            EventType.ConnectionFinished,
                        )

                        if final_audio_url is not None or completed_audio_chunks:
                            break
                        if not session_finished:
                            raise RuntimeError("Volc podcast session did not finish cleanly")
                    except Exception as e:
                        last_error = e
                        gen.update(status_message=str(e))
                        exception_logger.error(f"Synthesize error (attempt {attempt}/{max_retries}): {e}")
                        if attempt < max_retries:
                            info_logger.warning(
                                f"event=volc_podcast_retry user_id={self.user_id} "
                                f"attempt={attempt + 1}/{max_retries} task_id={task_id or 'pending'} "
                                f"last_finished_round_id={last_finished_round_id}"
                            )
                            continue
                    finally:
                        if websocket is not None:
                            await websocket.close()

                    if round_completed and (final_audio_url is not None or completed_audio_chunks):
                        break

                if (
                    token_usage_info.get("input_text_tokens", 0) > 0
                    or token_usage_info.get("output_audio_tokens", 0) > 0
                ):
                    persist_engine_usage(
                        user_id=self.user_id,
                        resource_uuid=self.resource_uuid or self.engine_uuid,
                        usage_details=token_usage_info,
                        source="volc_tts_synthesize",
                        strict=True,
                    )

                if final_audio_url is not None:
                    async with httpx.AsyncClient() as client:
                        response = await client.get(str(final_audio_url))
                        response.raise_for_status()
                        return TTSSynthesisResult(
                            audio_bytes=response.content,
                            script_text=script_text,
                            script_segments=script_segments,
                        )

                if completed_audio_chunks:
                    return TTSSynthesisResult(
                        audio_bytes=b"".join(completed_audio_chunks),
                        script_text=script_text,
                        script_segments=script_segments,
                    )

                if last_error is not None:
                    raise last_error

                raise Exception("Volc TTS did not return audio data")
