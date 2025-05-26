import crud
import schemas
from sqlalchemy.orm import Session
from fastapi import APIRouter, Depends
from common.dependencies import get_current_user, get_db

mcp_router = APIRouter()

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
            server_id=db_base_mcp_server.id
        )
    elif mcp_server_create_request.category == 1:
        db_stream_mcp_server = crud.mcp.create_stream_mcp(
            db=db,
            address=mcp_server_create_request.address,
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
    if db_base_mcp_server.category == 1:
        db_stream_mcp_server = crud.mcp.get_stream_mcp_server_by_base_id(db=db, 
                                                                         base_id=mcp_server_update_request.id)
        if db_stream_mcp_server is None:
            raise schemas.error.CustomException(message="mcp server not found", 
                                                code=404)
        if mcp_server_update_request.address is not None:
            db_stream_mcp_server.address = mcp_server_update_request.address
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
        db_stream_mcp_server = crud.mcp.get_stream_mcp_server_by_base_id(db=db, 
                                                                         base_id=mcp_server_delete_request.id)
        if db_stream_mcp_server is None:
            raise schemas.error.CustomException(message="mcp server not found", 
                                                code=404)
        crud.mcp.delete_stream_mcp_server_by_base_id(db=db, 
                                                     base_id=mcp_server_delete_request.id)
    db.commit()
    return schemas.common.SuccessResponse()