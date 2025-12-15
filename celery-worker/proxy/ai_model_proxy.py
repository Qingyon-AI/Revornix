import crud
from enums.model import OfficialModel, OfficialModelProvider
from data.sql.base import SessionLocal
from pydantic import BaseModel
from official.ai.llm import OFFICIAL_LLM_AI_BASE_URL, OFFICIAL_LLM_AI_KEY
from official.ai.image import OFFICIAL_IMAGE_AI_BASE_URL, OFFICIAL_IMAGE_AI_KEY
from official.ai.tts import OFFICIAL_TTS_AI_BASE_URL, OFFICIAL_TTS_AI_KEY

OFFICIAL_MODEL_CONFIG = {
    OfficialModel.llm.value: (OFFICIAL_LLM_AI_KEY, OFFICIAL_LLM_AI_BASE_URL),
    OfficialModel.image.value: (OFFICIAL_IMAGE_AI_KEY, OFFICIAL_IMAGE_AI_BASE_URL),
    OfficialModel.tts.value: (OFFICIAL_TTS_AI_KEY, OFFICIAL_TTS_AI_BASE_URL),
}

class AIModelConfiguration(BaseModel):
    api_key: str | None
    base_url: str | None
    model_name: str
    
class AIModelProxy:
    api_key: str
    base_url: str
    model_name: str
    
    def __init__(
        self,
        user_id: int,
        model_id: int
    ) -> None:
        with SessionLocal() as db:
            try:
                db_model = crud.model.get_ai_model_by_id(
                    db=db,
                    model_id=model_id
                )
                if db_model is None:
                    raise Exception("Model not found")
                db_model_provider = crud.model.get_ai_model_provider_by_id(
                    db=db,
                    provider_id=db_model.provider_id
                )
                if db_model_provider is None:
                    raise Exception("Model provider not found")
                db_user_model_provider = crud.model.get_user_ai_model_provider_by_id_decrypted(
                    db=db,
                    user_id=user_id,
                    ai_model_provider_id=db_model_provider.id
                )
                if db_user_model_provider is None:
                    raise Exception("User model provider not found")
                if db_model_provider.uuid in [
                    OfficialModelProvider.Revornix.value
                ] and db_model.uuid in [
                    OfficialModel.llm.value,
                    OfficialModel.image.value,
                    OfficialModel.tts.value
                ]:
                    if db_model.uuid == OfficialModel.llm.value:
                        if OFFICIAL_LLM_AI_KEY is None or OFFICIAL_LLM_AI_BASE_URL is None:
                            raise Exception("API key or base URL not set for the official LLM AI")
                        self.api_key = OFFICIAL_LLM_AI_KEY
                        self.base_url = OFFICIAL_LLM_AI_BASE_URL
                    elif db_model.uuid == OfficialModel.image.value:
                        if OFFICIAL_IMAGE_AI_KEY is None or OFFICIAL_IMAGE_AI_BASE_URL is None:
                            raise Exception("API key or base URL not set for the official image AI")
                        self.api_key = OFFICIAL_IMAGE_AI_KEY
                        self.base_url = OFFICIAL_IMAGE_AI_BASE_URL
                    elif db_model.uuid == OfficialModel.tts.value:
                        if OFFICIAL_TTS_AI_KEY is None or OFFICIAL_TTS_AI_BASE_URL is None:
                            raise Exception("API key or base URL not set for the official TTS AI")
                        self.api_key = OFFICIAL_TTS_AI_KEY
                        self.base_url = OFFICIAL_TTS_AI_BASE_URL
                    else:
                        raise Exception("Unknown official model")
                else:
                    if db_user_model_provider.api_key is None or db_user_model_provider.base_url is None:
                        raise Exception("API key or base URL not set")
                    self.api_key = db_user_model_provider.api_key
                    self.base_url = db_user_model_provider.base_url
                self.model_name = db_model.name
            except Exception as e:
                raise RuntimeError("Failed to initialize AIModelProxy") from e
        
    def get_configuration(self):
        return AIModelConfiguration(
            api_key=self.api_key,
            base_url=self.base_url,
            model_name=self.model_name
        )