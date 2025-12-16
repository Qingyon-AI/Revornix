import crud
import json
from data.sql.base import SessionLocal
from typing import Protocol

class EngineProtocol(Protocol):
    
    engine_uuid: str
    engine_category: int
    engine_name: str
    engine_name_zh: str
    engine_description: str | None
    engine_description_zh: str | None
    engine_demo_config: str | None
    engine_config: str | None = None
    
    user_id: int | None = None
    
    def __init__(
        self, 
        engine_uuid: str,
        engine_name: str,
        engine_category: int,
        engine_name_zh: str, 
        engine_description: str | None = None, 
        engine_description_zh: str | None = None, 
        engine_demo_config: str | None = None,
        engine_config: str | None = None
    ):
        self.engine_uuid = engine_uuid
        self.engine_name = engine_name
        self.engine_name_zh = engine_name_zh
        self.engine_description = engine_description
        self.engine_description_zh = engine_description_zh
        self.engine_demo_config = engine_demo_config
        self.engine_config = engine_config
        self.engine_category = engine_category
    
    def get_engine_config(self) -> dict | None:
        if self.engine_config is None:
            return None
        return json.loads(self.engine_config)
    
    async def init_engine_config_by_user_engine_id(
        self, 
        user_engine_id: int
    ):
        db = SessionLocal()
        db_user_engine = crud.engine.get_user_engine_by_user_engine_id(
            db=db, 
            user_engine_id=user_engine_id
        )
        if db_user_engine is None:
            raise Exception("There is something wrong with the user's engine")
        db_engine = crud.engine.get_engine_by_id(
            db=db,
            id=db_user_engine.engine_id
        )
        if db_engine is None:
            raise Exception("There is something wrong with the user's engine")
        if db_engine.uuid != self.engine_uuid:
            raise Exception("The uuid of the user's engine is not matched with the uuid of the engine for revornix system")
        self.engine_config = db_user_engine.config_json
        self.user_id = db_user_engine.user_id
        db.close()