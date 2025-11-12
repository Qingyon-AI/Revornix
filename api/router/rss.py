import crud
import schemas
import models
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from datetime import datetime
from common.dependencies import get_current_user, get_db

rss_router = APIRouter()

@rss_router.post('/detail', response_model=schemas.rss.RssServerInfo)
async def getRssServerDetail(get_rss_server_detail_request: schemas.rss.GetRssServerDetailRequest,
                             db: Session = Depends(get_db),
                             current_user: models.user.User = Depends(get_current_user)):
    db_rss_server = crud.rss.get_rss_server_by_id(db=db,
                                                  id=get_rss_server_detail_request.rss_id)
    if db_rss_server is None:
        return schemas.common.ErrorResponse(message='rss server not found', code=404)
    rss_server_info = schemas.rss.RssServerInfo.model_validate(db_rss_server)
        
    rss_server_info.sections = []
    db_rss_sections = crud.rss.get_sections_by_rss_server_id(db=db, rss_server_id=db_rss_server.id)
    for db_rss_section in db_rss_sections:
        rss_server_info.sections.append(schemas.rss.RssSectionInfo.model_validate(db_rss_section))
        
    rss_server_info.documents = []
    db_rss_documents = crud.rss.get_documents_by_rss_server_id(db=db, rss_server_id=db_rss_server.id)
    for db_rss_document in db_rss_documents:
        rss_server_info.documents.append(schemas.rss.RssDocumentInfo.model_validate(db_rss_document))
    return rss_server_info

@rss_router.post('/document', response_model=schemas.pagination.InifiniteScrollPagnition[schemas.document.DocumentInfo])
async def getRssServerDocument(get_rss_server_document_request: schemas.rss.GetRssServerDocumentRequest,
                               db: Session = Depends(get_db),
                               user: models.user.User = Depends(get_current_user)):
    has_more = True
    next_start = None
    db_documents = crud.rss.search_document_for_rss(
        db=db, 
        rss_id=get_rss_server_document_request.rss_id,
        start=get_rss_server_document_request.start,
        limit=get_rss_server_document_request.limit,
        keyword=get_rss_server_document_request.keyword,
        desc=get_rss_server_document_request.desc
    )
    def get_document_info(db_document: models.rss.RSSDocument): 
        db_labels = crud.document.get_labels_by_document_id(db=db,
                                                            document_id=db_document.id)
        db_transform_task = crud.task.get_document_transform_task_by_document_id(db=db,
                                                                                 document_id=db_document.id)
        db_embedding_task = crud.task.get_document_embedding_task_by_document_id(db=db,
                                                                                 document_id=db_document.id)
        db_process_task = crud.task.get_document_process_task_by_document_id(db=db,
                                                                             document_id=document.id)
        db_graph_task = crud.task.get_document_graph_task_by_document_id(db=db,
                                                                         document_id=document.id)
        return schemas.document.DocumentInfo(
            **db_document.__dict__,
            labels=db_labels,
            transform_task=db_transform_task,
            process_task=db_process_task,
            graph_task=db_graph_task,
            embedding_task=db_embedding_task
        )
    documents = [get_document_info(db_document) for db_document in db_documents]
    if len(documents) < get_rss_server_document_request.limit or len(documents) == 0:
        has_more = False
    if len(documents) == get_rss_server_document_request.limit:
        next_rss_document = crud.rss.search_next_document_for_rss(
            db=db, 
            rss_id=get_rss_server_document_request.rss_id,
            document=db_documents[-1],
            keyword=get_rss_server_document_request.keyword,
            desc=get_rss_server_document_request.desc
        )
        has_more = next_rss_document is not None
        next_start = next_rss_document.id if has_more else None
    total = crud.rss.count_document_for_rss(
        db=db,
        rss_id=get_rss_server_document_request.rss_id,
        keyword=get_rss_server_document_request.keyword
    )
    return schemas.pagination.InifiniteScrollPagnition(
        total=total,
        elements=documents,
        start=get_rss_server_document_request.start,
        limit=get_rss_server_document_request.limit,
        has_more=has_more,
        next_start=next_start
    )

@rss_router.post('/add', response_model=schemas.rss.AddRssServerResponse)
async def addRssServer(add_rss_request: schemas.rss.AddRssServerRequest, 
                       db: Session = Depends(get_db), 
                       current_user: models.user.User = Depends(get_current_user)):
    db_rss_server = crud.rss.create_rss_server(db=db, 
                                               title=add_rss_request.title, 
                                               description=add_rss_request.description,
                                               cover=add_rss_request.cover,
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
                          current_user: models.user.User = Depends(get_current_user)):
    crud.rss.delete_rss_servers(db=db, 
                                ids=delete_rss_request.ids,
                                user_id=current_user.id)
    crud.rss.delete_rss_sections(db=db,
                                 ids=delete_rss_request.ids,
                                 user_id=current_user.id)
    db.commit()
    return schemas.common.SuccessResponse()

@rss_router.post('/update', response_model=schemas.common.NormalResponse)
async def updateRssServer(update_rss_request: schemas.rss.UpdateRssServerRequest,
                          db: Session = Depends(get_db),
                          current_user: models.user.User = Depends(get_current_user)):
    now = datetime.now()
    db_rss_server = crud.rss.get_rss_server_by_id(db=db, id=update_rss_request.rss_id)
    if db_rss_server is None:
        raise schemas.error.CustomException(code=404, message='rss server not found')
    if db_rss_server.user_id != current_user.id:
        raise schemas.error.CustomException(code=403, message='no permission')
    if update_rss_request.title is not None:
        db_rss_server.title = update_rss_request.title
    if update_rss_request.description is not None:
        db_rss_server.description = update_rss_request.description
    if update_rss_request.address is not None:
        db_rss_server.address = update_rss_request.address
    if update_rss_request.cover is not None:
        db_rss_server.cover = update_rss_request.cover
    db_rss_server.update_time = now
    db.commit()
    return schemas.common.SuccessResponse()

@rss_router.post('/search', response_model=schemas.pagination.InifiniteScrollPagnition[schemas.rss.RssServerInfo])
async def searchRssServer(search_rss_request: schemas.rss.SearchRssServerRequest, 
                          db: Session = Depends(get_db), 
                          current_user: models.user.User = Depends(get_current_user)):
    has_more = True
    next_start = None
    db_rss_servers = crud.rss.search_rss_servers_for_user(
        db=db, 
        user_id=current_user.id,
        start=search_rss_request.start,
        limit=search_rss_request.limit,
        keyword=search_rss_request.keyword
    )
    def get_rss_server_info(db_rss_server: models.rss.RSSServer):
        rss_server_info = schemas.rss.RssServerInfo.model_validate(db_rss_server)
        
        rss_server_info.sections = []
        db_rss_sections = crud.rss.get_sections_by_rss_server_id(db=db, rss_server_id=db_rss_server.id)
        for db_rss_section in db_rss_sections:
            rss_server_info.sections.append(schemas.rss.RssSectionInfo.model_validate(db_rss_section))
            
        rss_server_info.documents = []
        db_rss_documents = crud.rss.get_documents_by_rss_server_id(db=db, rss_server_id=db_rss_server.id)
        for db_rss_document in db_rss_documents:
            rss_server_info.documents.append(schemas.rss.RssDocumentInfo.model_validate(db_rss_document))
            
        return rss_server_info
    
    rss_servers = [get_rss_server_info(rss_server) for rss_server in db_rss_servers]
    
    if len(rss_servers) < search_rss_request.limit or len(rss_servers) == 0:
        has_more = False
    if len(rss_servers) == search_rss_request.limit:
        db_next_rss_server = crud.rss.search_next_rss_server_for_user(
            db=db,
            user_id=current_user.id,
            rss_server=db_rss_servers[-1],
            keyword=search_rss_request.keyword
        )
        has_more = db_next_rss_server is not None
        next_start = db_next_rss_server.id if has_more else None
    db_rss_servers_count = crud.rss.count_rss_servers_for_user(
        db=db,
        user_id=current_user.id,
        keyword=search_rss_request.keyword
    )
    return schemas.pagination.InifiniteScrollPagnition(total=db_rss_servers_count,
                                                       start=search_rss_request.start,
                                                       limit=search_rss_request.limit,
                                                       next_start=next_start,
                                                       elements=rss_servers,
                                                       has_more=has_more)