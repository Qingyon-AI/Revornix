from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

import crud
import models
import schemas
from common.dependencies import get_async_db, get_current_user
from enums.mcp import MCPCategory

mcp_router = APIRouter()

@mcp_router.post('/server/detail', response_model=schemas.mcp.MCPServerInfo)
async def get_mcp_server_detail(
    mcp_server_detail_request: schemas.mcp.MCPServerDetailRequest,
    db: AsyncSession = Depends(get_async_db),
    user: models.user.User = Depends(get_current_user)
):
    mcp_server = await crud.mcp.get_base_mcp_server_by_id_async(
        db=db,
        id=mcp_server_detail_request.id
    )
    if mcp_server is None:
        raise schemas.error.CustomException(message="MCP server not found", code=404)
    if mcp_server.category == MCPCategory.STD:
        db_std_mcp_server = await crud.mcp.get_std_mcp_server_by_base_server_id_async(
            db=db,
            base_server_id=mcp_server.id
        )
        if db_std_mcp_server is None:
            raise schemas.error.CustomException(message="MCP server not found", code=404)
        return schemas.mcp.MCPServerInfo(
            id=mcp_server.id,
            enable=mcp_server.enable,
            name=mcp_server.name,
            category=mcp_server.category,
            cmd=db_std_mcp_server.cmd,
            args=db_std_mcp_server.args,
            env=db_std_mcp_server.env
        )
    elif mcp_server.category == MCPCategory.HTTP:
        db_http_mcp_server = await crud.mcp.get_http_mcp_server_by_base_server_id_async(
            db=db,
            base_server_id=mcp_server.id
        )
        if db_http_mcp_server is None:
            raise schemas.error.CustomException(message="MCP server not found", code=404)
        return schemas.mcp.MCPServerInfo(
            id=mcp_server.id,
            enable=mcp_server.enable,
            name=mcp_server.name,
            category=mcp_server.category,
            url=db_http_mcp_server.url,
            headers=db_http_mcp_server.headers
        )
    else:
        raise schemas.error.CustomException(message="Unsupported MCP server category", code=400)

@mcp_router.post("/server/search", response_model=schemas.mcp.MCPServerSearchResponse)
async def get_mcp_server_list(
    mcp_server_search_request: schemas.mcp.MCPServerSearchRequest,
    db: AsyncSession = Depends(get_async_db),
    user: models.user.User = Depends(get_current_user)
):
    mcp_servers = await crud.mcp.search_mcp_servers_async(
        db=db,
        user_id=user.id,
        keyword=mcp_server_search_request.keyword
    )
    std_server_map = {
        server.server_id: server
        for server in await crud.mcp.get_std_mcp_servers_by_base_server_ids_async(
            db=db,
            base_server_ids=[mcp_server.id for mcp_server in mcp_servers if mcp_server.category == MCPCategory.STD],
        )
    }
    http_server_map = {
        server.server_id: server
        for server in await crud.mcp.get_http_mcp_servers_by_base_server_ids_async(
            db=db,
            base_server_ids=[mcp_server.id for mcp_server in mcp_servers if mcp_server.category == MCPCategory.HTTP],
        )
    }
    res = []
    for mcp_server in mcp_servers:
        if mcp_server.category == MCPCategory.STD:
            db_std_mcp_server = std_server_map.get(mcp_server.id)
            if db_std_mcp_server is None:
                continue
            res.append(schemas.mcp.MCPServerInfo(
                id=mcp_server.id,
                enable=mcp_server.enable,
                name=mcp_server.name,
                category=mcp_server.category,
                cmd=db_std_mcp_server.cmd,
                args=db_std_mcp_server.args,
                env=db_std_mcp_server.env
            ))
        elif mcp_server.category == MCPCategory.HTTP:
            db_http_mcp_server = http_server_map.get(mcp_server.id)
            if db_http_mcp_server is None:
                continue
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
async def create_server(
    mcp_server_create_request: schemas.mcp.MCPServerCreateRequest,
    db: AsyncSession = Depends(get_async_db),
    user: models.user.User = Depends(get_current_user)
):
    db_base_mcp_server = await crud.mcp.create_mcp_server_base_async(
        db=db,
        user_id=user.id,
        name=mcp_server_create_request.name,
        category=mcp_server_create_request.category
    )
    if mcp_server_create_request.category == MCPCategory.STD:
        if mcp_server_create_request.cmd is None:
            raise schemas.error.CustomException(message="Command is required for STD MCP servers", code=400)
        await crud.mcp.create_std_mcp_async(
            db=db,
            cmd=mcp_server_create_request.cmd,
            args=mcp_server_create_request.args,
            env=mcp_server_create_request.env,
            server_id=db_base_mcp_server.id
        )
    elif mcp_server_create_request.category == MCPCategory.HTTP:
        if mcp_server_create_request.url is None:
            raise schemas.error.CustomException(message="URL is required for HTTP MCP servers", code=400)
        await crud.mcp.create_http_mcp_async(
            db=db,
            url=mcp_server_create_request.url,
            headers=mcp_server_create_request.headers,
            server_id=db_base_mcp_server.id
        )
    await db.commit()
    return schemas.common.SuccessResponse()

@mcp_router.post("/server/update", response_model=schemas.common.NormalResponse)
async def update_server(
    mcp_server_update_request: schemas.mcp.MCPServerUpdateRequest,
    db: AsyncSession = Depends(get_async_db),
    user: models.user.User = Depends(get_current_user)
):
    db_base_mcp_server = await crud.mcp.get_base_mcp_server_by_id_async(
        db=db,
        id=mcp_server_update_request.id
    )
    if db_base_mcp_server is None:
        raise schemas.error.CustomException(message="MCP server not found", code=404)
    if db_base_mcp_server.user_id != user.id:
        raise schemas.error.CustomException(message="You don't have permission to manage this MCP server", code=403)
    if mcp_server_update_request.name is not None:
        db_base_mcp_server.name = mcp_server_update_request.name
    if mcp_server_update_request.enable is not None:
        db_base_mcp_server.enable = mcp_server_update_request.enable
    if db_base_mcp_server.category == mcp_server_update_request.category:
        if db_base_mcp_server.category == MCPCategory.STD:
            db_std_mcp_server = await crud.mcp.get_std_mcp_server_by_base_server_id_async(
                db=db,
                base_server_id=mcp_server_update_request.id
            )
            if db_std_mcp_server is None:
                raise schemas.error.CustomException(message="MCP server not found", code=404)
            if mcp_server_update_request.cmd is not None:
                db_std_mcp_server.cmd = mcp_server_update_request.cmd
            if mcp_server_update_request.args is not None:
                db_std_mcp_server.args = mcp_server_update_request.args
            if mcp_server_update_request.env is not None:
                db_std_mcp_server.env = mcp_server_update_request.env
        if db_base_mcp_server.category == MCPCategory.HTTP:
            db_http_mcp_server = await crud.mcp.get_http_mcp_server_by_base_server_id_async(
                db=db,
                base_server_id=mcp_server_update_request.id
            )
            if db_http_mcp_server is None:
                raise schemas.error.CustomException(message="MCP server not found", code=404)
            if mcp_server_update_request.url is not None:
                db_http_mcp_server.url = mcp_server_update_request.url
            if mcp_server_update_request.headers is not None:
                db_http_mcp_server.headers = mcp_server_update_request.headers
    else:
        if db_base_mcp_server.category == MCPCategory.STD and mcp_server_update_request.category == MCPCategory.HTTP:
            await crud.mcp.delete_std_mcp_server_by_base_server_id_async(
                db=db,
                base_server_id=db_base_mcp_server.id
            )
            if mcp_server_update_request.url is None:
                raise schemas.error.CustomException(message="URL is required for HTTP MCP servers", code=400)
            await crud.mcp.create_http_mcp_async(
                db=db,
                url=mcp_server_update_request.url,
                headers=mcp_server_update_request.headers,
                server_id=db_base_mcp_server.id
            )
        elif db_base_mcp_server.category == MCPCategory.HTTP and mcp_server_update_request.category == MCPCategory.STD:
            await crud.mcp.delete_http_mcp_server_by_base_server_id_async(
                db=db,
                base_server_id=db_base_mcp_server.id
            )
            if mcp_server_update_request.cmd is None:
                raise schemas.error.CustomException(message="Command is required for STD MCP servers", code=400)
            await crud.mcp.create_std_mcp_async(
                db=db,
                cmd=mcp_server_update_request.cmd,
                args=mcp_server_update_request.args,
                env=mcp_server_update_request.env,
                server_id=db_base_mcp_server.id
            )
        if mcp_server_update_request.category is not None:
            db_base_mcp_server.category = mcp_server_update_request.category
    await db.commit()
    return schemas.common.SuccessResponse()

@mcp_router.post("/server/delete", response_model=schemas.common.NormalResponse)
async def delete_server(mcp_server_delete_request: schemas.mcp.MCPServerDeleteRequest,
                        db: AsyncSession = Depends(get_async_db),
                        user: models.user.User = Depends(get_current_user)):
    db_base_mcp_server = await crud.mcp.get_base_mcp_server_by_id_async(
        db=db,
        id=mcp_server_delete_request.id
    )
    if db_base_mcp_server is None:
        raise schemas.error.CustomException(message="MCP server not found",
                                            code=404)
    if db_base_mcp_server.user_id != user.id:
        raise schemas.error.CustomException(message="You don't have permission to manage this MCP server",
                                            code=403)
    category = db_base_mcp_server.category
    if category == MCPCategory.STD:
        db_std_mcp_server = await crud.mcp.get_std_mcp_server_by_base_server_id_async(
            db=db,
            base_server_id=mcp_server_delete_request.id
        )
        if db_std_mcp_server is None:
            raise schemas.error.CustomException(message="MCP server not found",
                                                code=404)
        await crud.mcp.delete_std_mcp_server_by_base_server_id_async(
            db=db,
            base_server_id=mcp_server_delete_request.id
        )
    elif category == MCPCategory.HTTP:
        db_http_mcp_server = await crud.mcp.get_http_mcp_server_by_base_server_id_async(
            db=db,
            base_server_id=mcp_server_delete_request.id
        )
        if db_http_mcp_server is None:
            raise schemas.error.CustomException(message="MCP server not found", code=404)
        await crud.mcp.delete_http_mcp_server_by_base_server_id_async(
            db=db,
            base_server_id=mcp_server_delete_request.id
        )
    await crud.mcp.delete_base_mcp_server_by_base_server_id_async(
        db=db,
        base_server_id=mcp_server_delete_request.id
    )
    await db.commit()
    return schemas.common.SuccessResponse()
