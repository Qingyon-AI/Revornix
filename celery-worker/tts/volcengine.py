from uuid import uuid4
from protocol.tts_engine import TTSEngine

url = 'wss://openspeech.bytedance.com/api/v3/sami/podcasttts'

headers = {
    'X-Api-App-Id': '',
    'X-Api-Access-Key': '',
    'X-Api-Resource-Id': '',
    'X-Api-App-Key': '',
    'X-Api-Request-Id': uuid4().hex
}

payload = {
    "input_id": "test_podcast",
    "input_text": "分析下当前的大模型发展",
    "action": 0,
    "use_head_music": False,
    "audio_config": {
        "format": "mp3",
        "sample_rate": 24000,
        "speech_rate": 0,
    },
    "speaker_info": {
        "random_order": True,
        "speakers": [
            "zh_male_dayixiansheng_v2_saturn_bigtts",
            "zh_female_mizaitongxue_v2_saturn_bigtts"
        ]
    },
    "aigc_watermark": False,
    "aigc_metadata": {
        "enable": True,
        "content_producer": "volcengine",
        "produce_id": "12abc",
        "content_propagator": "volcengine",
        "propagate_id": "34def"
    }
}

class VolcEngine(TTSEngine):
    def __init__(self, app_id, api_key, api_secret):
        self.app_id = app_id
        self.api_key = api_key
        self.api_secret = api_secret

    def synthesize(self, text, voice_name, speed, volume, pitch):
        # 调用火山引擎的API进行语音合成
        # 返回合成的音频文件
        pass