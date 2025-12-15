import crud
from enums.model import OfficialModelProvider, OfficialModel
from data.sql.base import SessionLocal

if __name__ == "__main__":
    db = SessionLocal()
    db_official_llm_model_provider = crud.model.create_ai_model_provider(
        db=db,
        name='Revornix Official Gateway',
        uuid=OfficialModelProvider.Revornix.value,
        description=(
            'Revornix-operated LLM gateway. '
            'Models are provided via Revornix-managed routing, '
            'including official and licensed upstream providers.'
        )
    )
    db_official_llm_model = crud.model.create_ai_model(
        db=db,
        name='GPT-5.2',
        description='GPT-5.2',
        provider_id=db_official_llm_model_provider.id,
        uuid=OfficialModel.llm.value
    )
    db_image_model = crud.model.create_ai_model(
        db=db,
        name='gemini-3-pro-image-preview',
        description='gemini-3-pro-image-preview',
        provider_id=db_official_llm_model_provider.id,
        uuid=OfficialModel.image.value
    )
    db_tts_model = crud.model.create_ai_model(
        db=db,
        name='gpt-audio',
        description='gpt-audio',
        provider_id=db_official_llm_model_provider.id,
        uuid=OfficialModel.tts.value
    )
    db.close()