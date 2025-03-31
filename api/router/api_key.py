import schemas
import crud
import uuid
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from common.dependencies import get_current_user, get_db

api_key_router = APIRouter()

@api_key_router.post("/create", response_model=schemas.api_key.ApiKeyCreateResponse)
async def create_api_key(api_key_create_request: schemas.api_key.ApiKeyCreateRequest,
                         db: Session = Depends(get_db),
                         user: schemas.user.PrivateUserInfo = Depends(get_current_user)):
    db_api_key = crud.api_key.create_api_key(db=db,
                                             user_id=user.id,
                                             api_key=uuid.uuid4().hex ,
                                             description=api_key_create_request.description)
    db.commit()
    return schemas.api_key.ApiKeyCreateResponse(api_key_id=db_api_key.id)

@api_key_router.post("/search", response_model=schemas.pagination.Pagination[schemas.api_key.ApiKeyInfo])
async def search_api_key(search_api_key_request: schemas.api_key.SearchApiKeysRequest,
                         db: Session = Depends(get_db),
                         user: schemas.user.PrivateUserInfo = Depends(get_current_user)):
    db_api_keys = crud.api_key.search_api_key(db=db, 
                                              user_id=user.id,
                                              page_num=search_api_key_request.page_num,
                                              page_size=search_api_key_request.page_size,
                                              keyword=search_api_key_request.keyword)
    count = crud.api_key.count_user_api_key(db=db, 
                                            user_id=user.id,
                                            keyword=search_api_key_request.keyword)
    total_pages = count // search_api_key_request.page_size if count % search_api_key_request.page_size == 0 else count // search_api_key_request.page_size + 1
    res = schemas.pagination.Pagination(total_elements=count,
                                        total_pages=total_pages,
                                        page_num=search_api_key_request.page_num,
                                        page_size=search_api_key_request.page_size,
                                        current_page_elements=len(db_api_keys),
                                        elements=db_api_keys)
    return res

@api_key_router.post("/delete", response_model=schemas.common.NormalResponse)
async def delete_api_key(api_keys_delete_request: schemas.api_key.ApiKeysDeleteRequest,
                         db: Session = Depends(get_db),
                         user: schemas.user.PrivateUserInfo = Depends(get_current_user)):
    crud.api_key.delete_api_keys_by_ids(db=db, 
                                        user_id=user.id,
                                        api_key_ids=api_keys_delete_request.api_key_ids)
    db.commit()
    return schemas.common.NormalResponse()