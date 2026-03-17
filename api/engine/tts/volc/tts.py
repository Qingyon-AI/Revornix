import uuid
import time
import json
import websockets
import httpx
import crud
from enums.engine_enums import EngineProvided, EngineCategory
from pydantic import AnyUrl
from engine.tts.volc.protocol import start_connection, wait_for_event, start_session, MsgType, EventType, finish_connection, finish_session, receive_message
from common.langfuse import langfuse
from langfuse import propagate_attributes
from common.ai import generate_podcast_dialogue_turns
from common.logger import exception_logger, info_logger
from common.usage_billing import persist_engine_usage
from base_implement.tts_engine_base import TTSEngineBase
from data.sql.base import session_scope


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

class VolcTTSEngine(TTSEngineBase):
    """此引擎使用的是字节跳动的播客TTS引擎，具体文档参照https://www.volcengine.com/docs/6561/1668014
    """
    
    def __init__(self):
        super().__init__(
            engine_uuid=EngineProvided.Volc_TTS.meta.uuid,
            engine_name="Volc Podcast Engine",
            engine_name_zh="豆包播客引擎",
            engine_category=EngineCategory.TTS,
            engine_description="DouBao Podcast TTS, based on ByteDance's DouBao large model podcast generation engine.",
            engine_description_zh="豆包播客，基于字节跳动的豆包大模型的播客生成引擎。",
            engine_demo_config=json.dumps(
                {
                    "appid": "",
                    "access_token": "",
                    "base_url": DEFAULT_VOLC_PODCAST_BASE_URL,
                    "generation_mode": "prompt",
                    "speaker_info": {
                        "speakers": DEFAULT_VOLC_PODCAST_SPEAKERS,
                    },
                    "audio_config": DEFAULT_VOLC_AUDIO_CONFIG,
                    "use_head_music": True,
                    "use_tail_music": False,
                    "aigc_watermark": False,
                },
                ensure_ascii=False,
            )
        )

    def _resolve_base_url(self, config: dict) -> str:
        return str(config.get("base_url") or DEFAULT_VOLC_PODCAST_BASE_URL)

    def _resolve_generation_mode(self, config: dict) -> str:
        raw_action = config.get("action")
        if raw_action in {3, "3"}:
            return "dialogue"
        raw_mode = str(config.get("generation_mode") or "prompt").strip().lower()
        if raw_mode in {"dialogue", "ai_dialogue", "action3"}:
            return "dialogue"
        return "prompt"

    def _resolve_audio_config(self, config: dict) -> dict:
        audio_config = dict(DEFAULT_VOLC_AUDIO_CONFIG)
        raw_audio_config = config.get("audio_config")
        if isinstance(raw_audio_config, dict):
            for key in ("format", "sample_rate", "speech_rate"):
                value = raw_audio_config.get(key)
                if value not in (None, ""):
                    audio_config[key] = value
        return audio_config

    def _resolve_speakers(self, config: dict) -> list[str]:
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

    def _resolve_dialogue_model_id(self, config: dict) -> int:
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

    async def _build_action3_dialogue_turns(
        self,
        *,
        config: dict,
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
        config: dict,
        text: str,
    ) -> dict:
        generation_mode = self._resolve_generation_mode(config)
        audio_config = self._resolve_audio_config(config)
        use_head_music = bool(config.get("use_head_music", True))
        use_tail_music = bool(config.get("use_tail_music", False))
        aigc_watermark = bool(config.get("aigc_watermark", False))
        speaker_info = {
            "speakers": self._resolve_speakers(config),
        }

        req_params: dict = {
            "input_id": str(time.time()),
            "use_head_music": use_head_music,
            "use_tail_music": use_tail_music,
            "aigc_watermark": aigc_watermark,
            "audio_config": audio_config,
            "input_info": {
                "return_audio_url": True,
            },
        }

        raw_input_info = config.get("input_info")
        if isinstance(raw_input_info, dict):
            req_params["input_info"].update(
                {
                    key: value
                    for key, value in raw_input_info.items()
                    if key != "only_nlp_text"
                }
            )
            req_params["input_info"]["return_audio_url"] = True

        raw_aigc_metadata = config.get("aigc_metadata")
        if isinstance(raw_aigc_metadata, dict):
            req_params["aigc_metadata"] = raw_aigc_metadata

        if generation_mode == "dialogue":
            req_params["action"] = 3
            req_params["speaker_info"] = {
                "random_order": False,
                "speakers": speaker_info["speakers"],
            }
            return req_params

        req_params["action"] = 4
        req_params["prompt_text"] = f"Create a podcast about: {text}"
        req_params["scene"] = str(config.get("scene") or "deep_research")

        raw_speaker_info = config.get("speaker_info")
        if isinstance(raw_speaker_info, dict) and raw_speaker_info.get("speakers"):
            req_params["speaker_info"] = {
                "random_order": bool(raw_speaker_info.get("random_order", True)),
                "speakers": speaker_info["speakers"],
            }
        return req_params
        
    async def synthesize(
        self, 
        text: str
    ) -> bytes:
        config = self.get_engine_config()
        if config is None:
            raise Exception("The engine havn't been initialized yet.")
        if not config.get('appid') or not config.get('access_token'):
            raise Exception("The user's configuration of this engine is not complete.")
        
        if self.user_id is None:
            raise Exception("The user_id is not set.")

        final_audio_url: AnyUrl | None = None
        last_error: Exception | None = None
        
        websocket = None
        
        headers = {
            "X-Api-App-Id": config.get('appid'),
            "X-Api-App-Key": "aGjiRDfUWi",
            "X-Api-Access-Key": config.get('access_token'),
            "X-Api-Resource-Id": 'volc.service_type.10050',
            "X-Api-Request-Id": str(uuid.uuid4()),
        }
        
        is_podcast_round_end = False  # 标志当前轮是否结束
        last_round_id = -1  # 上一轮的轮次ID
        task_id = ""  # 任务ID
        retry_num = 3  # 重试次数
        current_round = 0  # 当前轮次ID
        token_usage_info: dict[str, int] = {
            "input_text_tokens": 0,
            "output_audio_tokens": 0
        }  # Token消耗使用信息

        with langfuse.start_as_current_observation(as_type="generation", name="tts-call", model="volc-podcast") as gen:
            with propagate_attributes(
                user_id=str(self.user_id),
                tags=['model:volc-podcast']
            ):
                try:
                    gen.update(
                        input=text
                    )
                    req_params = self._build_request_payload(
                        config=config,
                        text=text,
                    )
                    if req_params.get("action") == 3:
                        req_params["nlp_texts"] = await self._build_action3_dialogue_turns(
                            config=config,
                            text=text,
                        )
                        info_logger.info(
                            f"event=volc_podcast_dialogue_generated user_id={self.user_id} "
                            f"turns={len(req_params['nlp_texts'])} "
                            f"generation_mode=dialogue"
                        )
                    # 建立WebSocket连接	client<----------->server
                    websocket = await websockets.connect(
                        self._resolve_base_url(config),
                        additional_headers=headers
                    )
                    while retry_num > 0:
                        if task_id and not is_podcast_round_end:
                            req_params["retry_info"] = {
                                "retry_task_id": task_id,
                                "last_finished_round_id": last_round_id
                            }
                        # Start connection [event=1] -----------> server
                        await start_connection(websocket)
                        # Connection started [event=50] <---------- server
                        await wait_for_event(
                            websocket,
                            MsgType.FullServerResponse,
                            EventType.ConnectionStarted
                        )
                        session_id = str(uuid.uuid4())
                        if not task_id:
                            task_id = session_id
                        # Start session [event=100] -----------> server
                        await start_session(
                            websocket,
                            json.dumps(req_params).encode(),
                            session_id
                        )
                        # Session started [event=150] <---------- server
                        await wait_for_event(
                            websocket,
                            MsgType.FullServerResponse,
                            EventType.SessionStarted
                        )
                        # Finish session [event=102] -----------> server
                        await finish_session(websocket, session_id)
                        while True:
                            # 接收响应内容
                            msg = await receive_message(websocket)
                            if msg.type == MsgType.Error:
                                # 错误信息
                                raise RuntimeError(f"Server error: {msg.payload.decode()}")
                            elif msg.type == MsgType.FullServerResponse:
                                # 播客开始
                                if msg.event == EventType.PodcastRoundStart:
                                    data = json.loads(msg.payload.decode().encode("utf-8"))
                                    current_round = data.get("round_id")
                                    is_podcast_round_end = False
                                    # info_logger.info(f"Podcast round end, round_id: {current_round}, message: {data}")
                                # 播客结束
                                if msg.event == EventType.PodcastRoundEnd:
                                    is_podcast_round_end = True
                                    last_round_id = current_round
                                    continue
                            if msg.event == EventType.PodcastEnd:
                                # 播客总结性的信息，表示播客结束（注意如果你开启了音频链接返回，那么这段数据中是包含音频下载链接的）
                                data = json.loads(msg.payload.decode().encode("utf-8"))
                                audio_url: str = data.get('meta_info').get("audio_url")
                                final_audio_url = AnyUrl(audio_url)
                            if msg.event == EventType.UsageResponse:
                                # 示例:{"usage":{"input_text_tokens":980,"output_audio_tokens":0}} 其中input_text_tokens表示"API调用token-输入-文本", output_audio_tokens表示"API调用token-输出-音频" 。
                                data = json.loads(msg.payload.decode().encode("utf-8"))
                                # 累计计算
                                token_usage_info = {
                                    "input_text_tokens": token_usage_info.get("input_text_tokens") + data.get("usage").get("input_text_tokens") if (token_usage_info and token_usage_info.get("input_text_tokens")) else data.get("usage").get("input_text_tokens"),
                                    "output_audio_tokens": token_usage_info.get("output_audio_tokens") + data.get("usage").get("output_audio_tokens") if (token_usage_info and token_usage_info.get("output_audio_tokens")) else data.get("usage").get("output_audio_tokens")
                                }
                                input_text_tokens = token_usage_info.get("input_text_tokens")
                                assert input_text_tokens is not None
                                output_audio_tokens = token_usage_info.get("output_audio_tokens")
                                assert output_audio_tokens is not None
                                gen.update(
                                    output='',
                                    usage_details={
                                        "input_text_tokens": input_text_tokens,
                                        "output_audio_tokens": output_audio_tokens,
                                    },
                                )
                            # 会话结束
                            if msg.event == EventType.SessionFinished:
                                break
                        # 保持连接，方便下次请求
                        await finish_connection(websocket)
                        await wait_for_event(
                            websocket,
                            MsgType.FullServerResponse,
                            EventType.ConnectionFinished
                        )
                        break
                except Exception as e:
                    last_error = e
                    exception_logger.error(f"Synthesize error: {e}")
                    gen.update(
                        status_message=str(e)
                    )
                finally:
                    if websocket:
                        await websocket.close()
                if (
                    token_usage_info.get("input_text_tokens", 0) > 0
                    or token_usage_info.get("output_audio_tokens", 0) > 0
                ):
                    persist_engine_usage(
                        user_id=self.user_id,
                        resource_uuid=self.resource_uuid or self.engine_uuid,
                        usage_details=token_usage_info,
                        source="volc_tts_synthesize",
                    )
                if final_audio_url is not None:
                    async with httpx.AsyncClient() as client:
                        response = await client.get(str(final_audio_url))
                        response.raise_for_status()
                        return response.content
                if last_error is not None:
                    raise last_error
                raise Exception("Volc TTS did not return a final audio url")
