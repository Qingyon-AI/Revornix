import schemas
import crud
import uuid
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from common.dependencies import get_current_user, get_db

engine_router = APIRouter()

@engine_router.post("/document-parse/search")
async def search_document_parse_engine(engine_search_request: schemas.engine.EngineSearchRequest, 
                                       db: Session = Depends(get_db), 
                                       current_user: schemas.user.PrivateUserInfo = Depends(get_current_user)):
    engines = crud.engine.get_document_parsing_engine_by_user_id(db=db,
                                                                 user_id=current_user.id,
                                                                 keyword=engine_search_request.keyword)
    return engines

@engine_router.post("/website-crawl/search")
async def search_website_crawel_engine(engine_search_request: schemas.engine.EngineSearchRequest, 
                                       db: Session = Depends(get_db), 
                                       current_user: schemas.user.PrivateUserInfo = Depends(get_current_user)):
    engines = crud.engine.get_website_crawling_engine_by_user_id(db=db,
                                                                 user_id=current_user.id,
                                                                 keyword=engine_search_request.keyword)
    return engines