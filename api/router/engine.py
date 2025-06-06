import schemas
import crud
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from common.dependencies import get_current_user, get_db

engine_router = APIRouter()

@engine_router.post("/document-parse/search", response_model=schemas.engine.EngineSearchResponse)
async def search_document_parse_engine(engine_search_request: schemas.engine.EngineSearchRequest, 
                                       db: Session = Depends(get_db), 
                                       current_user: schemas.user.PrivateUserInfo = Depends(get_current_user)):
    engines = crud.engine.get_document_parsing_engine_by_user_id(db=db,
                                                                 user_id=current_user.id,
                                                                 keyword=engine_search_request.keyword)
    for engine in engines:
        db_user_engine = crud.engine.get_user_document_parsing_engine_by_user_id_and_engine_id(db=db,
                                                                                               user_id=current_user.id,
                                                                                               document_parsing_engine_id=engine.id)
        engine.enable = db_user_engine.enable
    return schemas.engine.EngineSearchResponse(data=engines)

@engine_router.post("/website-crawl/search", response_model=schemas.engine.EngineSearchResponse)
async def search_website_crawel_engine(engine_search_request: schemas.engine.EngineSearchRequest, 
                                       db: Session = Depends(get_db), 
                                       current_user: schemas.user.PrivateUserInfo = Depends(get_current_user)):
    engines = crud.engine.get_website_crawling_engine_by_user_id(db=db,
                                                                 user_id=current_user.id,
                                                                 keyword=engine_search_request.keyword)
    for engine in engines:
        db_user_engine = crud.engine.get_user_website_crawling_engine_by_user_id_and_engine_id(db=db,
                                                                                               user_id=current_user.id,
                                                                                               website_crawling_engine_id=engine.id)
        engine.enable = db_user_engine.enable
    return schemas.engine.EngineSearchResponse(data=engines)