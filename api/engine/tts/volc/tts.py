import json
import time
import uuid

import httpx
import websockets
from langfuse import propagate_attributes
from pydantic import AnyUrl

from common.langfuse import langfuse
from common.logger import exception_logger
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
from enums.engine_enums import EngineProvided, EngineCategory
from base_implement.tts_engine_base import TTSEngineBase


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
            engine_demo_config='{"appid":"","access_token":"","base_url":""}'
        )

    async def synthesize(
        self,
        text: str
    ):
        config = self.get_engine_config()
        if config is None:
            raise Exception("The engine havn't been initialized yet.")
        if config.get('appid') is None or config.get('access_token') is None or config.get('base_url') is None:
            raise Exception("The user's configuration of this engine is not complete.")
        final_audio_url: AnyUrl | None = None

        websocket = None

        headers = {
            "X-Api-App-Id": config.get('appid'),
            "X-Api-App-Key": "aGjiRDfUWi",
            "X-Api-Access-Key": config.get('access_token'),
            "X-Api-Resource-Id": 'volc.service_type.10050',
            "X-Api-Connect-Id": str(uuid.uuid4()),
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
                    # 建立WebSocket连接	client<----------->server
                    websocket = await websockets.connect(
                        config.get('base_url'),
                        additional_headers=headers
                    )
                    while retry_num > 0:
                        req_params = {
                            "input_id": str(time.time()),
                            "action": 4,
                            "prompt_text": f"这是一份文档，请你帮我用播客形式总结一下，{text}",
                            "scene": "deep_research",
                            "use_head_music": True,
                            "audio_config": {
                                "format": "mp3",
                                "sample_rate": 24000,
                                "speech_rate": 0
                            },
                            "input_info": {
                                "return_audio_url": True
                            }
                        }
                        if not is_podcast_round_end:
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
                    exception_logger.error(f"Synthesize error: {e}")
                    gen.update(
                        status_message=str(e)
                    )
                finally:
                    if websocket:
                        await websocket.close()
                if final_audio_url is not None:
                    return httpx.get(str(final_audio_url)).content
                return None