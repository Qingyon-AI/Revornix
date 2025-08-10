import crud
import schemas
from sqlalchemy.orm import Session
from fastapi import APIRouter, Depends
from common.dependencies import get_current_user, get_db

mcp_router = APIRouter()

@mcp_router.post('/server/detail', response_model=schemas.mcp.MCPServerInfo)
async def get_mcp_server_detail(mcp_server_detail_request: schemas.mcp.MCPServerDetailRequest,
                                db: Session = Depends(get_db),
                                user: schemas.user.PrivateUserInfo = Depends(get_current_user)):
    mcp_server = crud.mcp.get_base_mcp_server_by_id(db=db, 
                                                    id=mcp_server_detail_request.id)
    if mcp_server.category == 0:
        db_std_mcp_server = crud.mcp.get_std_mcp_server_by_base_id(db=db, 
                                                                   base_id=mcp_server.id)
        return schemas.mcp.MCPServerInfo(
            id=mcp_server.id,
            enable=mcp_server.enable,
            name=mcp_server.name,
            category=mcp_server.category,
            cmd=db_std_mcp_server.cmd,
            args=db_std_mcp_server.args,
            env=db_std_mcp_server.env
        )
    elif mcp_server.category == 1:
        db_http_mcp_server = crud.mcp.get_http_mcp_server_by_base_id(db=db,
                                                                     base_id=mcp_server.id)
        return schemas.mcp.MCPServerInfo(
            id=mcp_server.id,
            enable=mcp_server.enable,
            name=mcp_server.name,
            category=mcp_server.category,
            url=db_http_mcp_server.url,
            headers=db_http_mcp_server.headers
        )
    else:
        raise schemas.error.CustomException(message="MCPServerCategoryError")

@mcp_router.post("/server/search", response_model=schemas.mcp.MCPServerSearchResponse)
async def get_mcp_server_list(mcp_server_search_request: schemas.mcp.MCPServerSearchRequest,
                              db: Session = Depends(get_db),
                              user: schemas.user.PrivateUserInfo = Depends(get_current_user)):
    mcp_servers = crud.mcp.search_mcp_servers(db=db, 
                                              user_id=user.id,
                                              keyword=mcp_server_search_request.keyword)
    res = []
    for mcp_server in mcp_servers:
        if mcp_server.category == 0:
            db_std_mcp_server = crud.mcp.get_std_mcp_server_by_base_id(db=db, 
                                                                       base_id=mcp_server.id)
            res.append(schemas.mcp.MCPServerInfo(
                id=mcp_server.id,
                enable=mcp_server.enable,
                name=mcp_server.name,
                category=mcp_server.category,
                cmd=db_std_mcp_server.cmd,
                args=db_std_mcp_server.args,
                env=db_std_mcp_server.env
            ))
        elif mcp_server.category == 1:
            db_http_mcp_server = crud.mcp.get_http_mcp_server_by_base_id(db=db,
                                                                         base_id=mcp_server.id)
            res.append(schemas.mcp.MCPServerInfo(
                id=mcp_server.id,
                enable=mcp_server.enable,
                name=mcp_server.name,
                category=mcp_server.category,
                url=db_http_mcp_server.url,
                headers=db_http_mcp_server.headers
            ))
    return schemas.mcp.MCPServerSearchResponse(data=res)

@mcp_router.post('/server/create', response_model=schemas.common.NormalResponse)
async def create_server(mcp_server_create_request: schemas.mcp.MCPServerCreateRequest,
                        db: Session = Depends(get_db),
                        user: schemas.user.PrivateUserInfo = Depends(get_current_user)):
    db_base_mcp_server = crud.mcp.create_mcp_server_base(
        db=db,
        user_id=user.id,
        name=mcp_server_create_request.name,
        category=mcp_server_create_request.category
    )
    if mcp_server_create_request.category == 0:
        db_std_mcp_server = crud.mcp.create_std_mcp(
            db=db,
            cmd=mcp_server_create_request.cmd,
            args=mcp_server_create_request.args,
            env=mcp_server_create_request.env,
            server_id=db_base_mcp_server.id
        )
    elif mcp_server_create_request.category == 1:
        db_http_mcp_server = crud.mcp.create_http_mcp(
            db=db,
            url=mcp_server_create_request.url,
            headers=mcp_server_create_request.headers,
            server_id=db_base_mcp_server.id
        )
    db.commit()
    return schemas.common.SuccessResponse()

@mcp_router.post("/server/update", response_model=schemas.common.NormalResponse)
async def update_server(mcp_server_update_request: schemas.mcp.MCPServerUpdateRequest,
                        db: Session = Depends(get_db),
                        user: schemas.user.PrivateUserInfo = Depends(get_current_user)):
    db_base_mcp_server = crud.mcp.get_base_mcp_server_by_id(db=db, 
                                                            id=mcp_server_update_request.id)
    if db_base_mcp_server is None:
        raise schemas.error.CustomException(message="mcp server not found", 
                                            code=404)
    if db_base_mcp_server.user_id != user.id:
        raise schemas.error.CustomException(message="permission denied", 
                                            code=400)
    if mcp_server_update_request.name is not None:
        db_base_mcp_server.name = mcp_server_update_request.name
    if mcp_server_update_request.enable is not None:
        db_base_mcp_server.enable = mcp_server_update_request.enable
    if db_base_mcp_server.category == mcp_server_update_request.category:
        if db_base_mcp_server.category == 0:
            db_std_mcp_server = crud.mcp.get_std_mcp_server_by_base_id(db=db, 
                                                                    base_id=mcp_server_update_request.id)
            if db_std_mcp_server is None:
                raise schemas.error.CustomException(message="mcp server not found", 
                                                    code=404)
            if mcp_server_update_request.cmd is not None: 
                db_std_mcp_server.cmd = mcp_server_update_request.cmd
            if mcp_server_update_request.args is not None:
                db_std_mcp_server.args = mcp_server_update_request.args
            if mcp_server_update_request.headers is not None:
                db_std_mcp_server.env = mcp_server_update_request.env
        if db_base_mcp_server.category == 1:
            db_stream_mcp_server = crud.mcp.get_stream_mcp_server_by_base_id(db=db, 
                                                                            base_id=mcp_server_update_request.id)
            if db_stream_mcp_server is None:
                raise schemas.error.CustomException(message="mcp server not found", 
                                                    code=404)
            if mcp_server_update_request.url is not None:
                db_stream_mcp_server.url = mcp_server_update_request.url
            if mcp_server_update_request.headers is not None:
                db_stream_mcp_server.headers = mcp_server_update_request.headers
    else:
        if db_base_mcp_server.category == 0 and mcp_server_update_request.category == 1:
            crud.mcp.delete_std_mcp_server_by_base_id(db=db, base_id=db_base_mcp_server.id)
            db_new_http_mcp_server = crud.mcp.create_http_mcp(
                db=db,
                url=mcp_server_update_request.url,
                headers=mcp_server_update_request.headers,
                server_id=db_base_mcp_server.id
            )
        elif db_base_mcp_server.category == 1 and mcp_server_update_request.category == 0:
            crud.mcp.delete_stream_mcp_server_by_base_id(db=db, base_id=db_base_mcp_server.id)
            db_new_std_mcp_server = crud.mcp.create_std_mcp(
                db=db,
                cmd=mcp_server_update_request.cmd,
                args=mcp_server_update_request.args,
                env=mcp_server_update_request.env,
                server_id=db_base_mcp_server.id
            )
        if mcp_server_update_request.category is not None:
            db_base_mcp_server.category = mcp_server_update_request.category
    db.commit()
    return schemas.common.SuccessResponse()

@mcp_router.post("/server/delete", response_model=schemas.common.NormalResponse)
async def delete_server(mcp_server_delete_request: schemas.mcp.MCPServerDeleteRequest,
                        db: Session = Depends(get_db),
                        user: schemas.user.PrivateUserInfo = Depends(get_current_user)):
    db_base_mcp_server = crud.mcp.get_base_mcp_server_by_id(db=db, 
                                                            id=mcp_server_delete_request.id)
    if db_base_mcp_server is None:
        raise schemas.error.CustomException(message="mcp server not found", 
                                            code=404)
    if db_base_mcp_server.user_id != user.id:
        raise schemas.error.CustomException(message="permission denied", 
                                            code=400)
    category = db_base_mcp_server.category
    if category == 0:
        db_std_mcp_server = crud.mcp.get_std_mcp_server_by_base_id(db=db, 
                                                                   base_id=mcp_server_delete_request.id)
        if db_std_mcp_server is None:
            raise schemas.error.CustomException(message="mcp server not found", 
                                                code=404)
        crud.mcp.delete_std_mcp_server_by_base_id(db=db, 
                                                  base_id=mcp_server_delete_request.id)
    elif category == 1:
        db_http_mcp_server = crud.mcp.get_http_mcp_server_by_base_id(db=db, 
                                                                     base_id=mcp_server_delete_request.id)
        if db_http_mcp_server is None:
            raise schemas.error.CustomException(message="mcp server not found", 
                                                code=404)
        crud.mcp.delete_http_mcp_server_by_base_id(db=db, 
                                                   base_id=mcp_server_delete_request.id)
    crud.mcp.delete_base_mcp_server_by_id(db=db,
                                          id=mcp_server_delete_request.id)
    db.commit()
    return schemas.common.SuccessResponse()