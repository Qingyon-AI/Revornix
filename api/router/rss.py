import crud
import schemas
import models
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from common.dependencies import get_current_user, get_db

rss_router = APIRouter()

@rss_router.post('/add', response_model=schemas.rss.AddRssServerResponse)
async def addRssServer(add_rss_request: schemas.rss.AddRssServerRequest, 
                       db: Session = Depends(get_db), 
                       current_user: schemas.user.PrivateUserInfo = Depends(get_current_user)):
    db_rss_server = crud.rss.create_rss_server(db=db, 
                                               title=add_rss_request.title, 
                                               description=add_rss_request.description,
                                               address=add_rss_request.address,
                                               user_id=current_user.id)
    if add_rss_request.section_ids is not None:
        for section_id in add_rss_request.section_ids:
            db_rss_section = crud.rss.bind_rss_to_section(db=db,
                                                          section_id=section_id,
                                                          rss_server_id=db_rss_server.id)
    db.commit()
    return schemas.rss.AddRssServerResponse(id=db_rss_server.id)

@rss_router.post('/delete', response_model=schemas.common.NormalResponse)
async def deleteRssServer(delete_rss_request: schemas.rss.DeleteRssServerRequest, 
                          db: Session = Depends(get_db), 
                          current_user: schemas.user.PrivateUserInfo = Depends(get_current_user)):
    crud.rss.delete_rss_servers(db=db, 
                                ids=delete_rss_request.ids,
                                user_id=current_user.id)
    crud.rss.delete_rss_sections(db=db,
                                 ids=delete_rss_request.ids,
                                 user_id=current_user.id)
    db.commit()
    return schemas.common.SuccessResponse()

@rss_router.post('/search', response_model=schemas.pagination.InifiniteScrollPagnition[schemas.rss.RssServerInfo])
async def searchRssServer(search_rss_request: schemas.rss.SearchRssServerRequest, 
                          db: Session = Depends(get_db), 
                          current_user: schemas.user.PrivateUserInfo = Depends(get_current_user)):
    has_more = True
    next_start = None
    db_rss_servers = crud.rss.search_user_rss_servers(db=db, 
                                                      user_id=current_user.id,
                                                      start=search_rss_request.start,
                                                      limit=search_rss_request.limit,
                                                      keyword=search_rss_request.keyword)
    def get_rss_server_info(db_rss_server: models.rss.RSSServer):
        
        rss_server_info = schemas.rss.RssServerInfo.model_validate(db_rss_server)
        
        rss_server_info.sections = []
        db_rss_sections = crud.rss.get_sections_by_rss_id(db=db, rss_id=db_rss_server.id)
        for db_rss_section in db_rss_sections:
            rss_server_info.sections.append(schemas.section.SectionInfo.model_validate(db_rss_section))
            
        rss_server_info.documents = []
        db_rss_documents = crud.rss.get_documents_by_rss_id(db=db, rss_id=db_rss_server.id)
        for db_rss_document in db_rss_documents:
            rss_server_info.documents.append(schemas.document.DocumentInfo.model_validate(db_rss_document))
            
        return rss_server_info
    
    rss_servers = [get_rss_server_info(rss_server) for rss_server in db_rss_servers]
    if len(rss_servers) < search_rss_request.limit or len(rss_servers) == 0:
        has_more = False
    if len(rss_servers) == search_rss_request.limit:
        db_next_rss_server = crud.rss.search_next_user_rss_server(db=db,
                                                                  user_id=current_user.id,
                                                                  rss_server=db_rss_servers[-1],
                                                                  keyword=search_rss_request.keyword)
        has_more = db_next_rss_server is not None
        next_start = db_next_rss_server.id if has_more else None
    db_rss_servers_count = crud.rss.count_user_rss_servers(db=db,
                                                           user_id=current_user.id,
                                                           keyword=search_rss_request.keyword)
    return schemas.pagination.InifiniteScrollPagnition(total=db_rss_servers_count,
                                                       start=search_rss_request.start,
                                                       limit=search_rss_request.limit,
                                                       next_start=next_start,
                                                       elements=rss_servers,
                                                       has_more=has_more)