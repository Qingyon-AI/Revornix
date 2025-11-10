import models
from datetime import datetime, timezone
from sqlalchemy.orm import Session

def create_mcp_server_base(
    db: Session,
    user_id: int, 
    name: str, 
    category: int
):
    now = datetime.now(timezone.utc)
    db_mcp_server = models.mcp.MCPServer(
        name=name,
        category=category,
        user_id=user_id,
        enable=True,
        create_time=now
    )
    db.add(db_mcp_server)
    db.flush()
    return db_mcp_server

def create_std_mcp(
    db: Session, 
    server_id: int,
    cmd: str, 
    args: str | None = None, 
    env: str | None = None,
):
    now = datetime.now(timezone.utc)
    db_std_mcp = models.mcp.StdMCP(
        server_id=server_id,
        cmd=cmd,
        args=args,
        env=env,
        create_time=now
    )
    db.add(db_std_mcp)
    db.flush()
    return db_std_mcp

def create_http_mcp(
    db: Session, 
    server_id: int,
    url: str,
    headers: str | None = None
):
    now = datetime.now(timezone.utc)
    db_http_mcp = models.mcp.HttpMCP(
        url=url,
        server_id=server_id,
        headers=headers,
        create_time=now
    )
    db.add(db_http_mcp)
    db.flush()
    return db_http_mcp

def search_mcp_servers(
    db: Session,
    user_id: int,
    keyword: str | None = None
):
    query = db.query(models.mcp.MCPServer)
    query = query.filter(models.mcp.MCPServer.user_id == user_id,
                         models.mcp.MCPServer.delete_at == None)
    query = query.order_by(models.mcp.MCPServer.id.desc())
    if keyword is not None and len(keyword) > 0:
        query = query.filter(models.mcp.MCPServer.name.like(f'%{keyword}%'))
    return query.all()
    
def get_base_mcp_server_by_id(
    db: Session, 
    id: int
):
    query = db.query(models.mcp.MCPServer)
    query = query.filter(models.mcp.MCPServer.id == id,
                         models.mcp.MCPServer.delete_at == None)
    return query.one_or_none()

def get_std_mcp_server_by_base_server_id(
    db: Session,
    base_server_id: int
):
    query = db.query(models.mcp.StdMCP)
    query = query.join(models.mcp.MCPServer)
    query = query.filter(models.mcp.MCPServer.id == base_server_id,
                         models.mcp.StdMCP.delete_at == None,
                         models.mcp.MCPServer.delete_at == None)
    return query.one_or_none()

def get_http_mcp_server_by_base_server_id(
    db: Session,
    base_server_id: int
):
    query = db.query(models.mcp.HttpMCP)
    query = query.join(models.mcp.MCPServer)
    query = query.filter(models.mcp.MCPServer.id == base_server_id,
                         models.mcp.HttpMCP.delete_at == None, 
                         models.mcp.MCPServer.delete_at == None)
    return query.one_or_none()

def delete_base_mcp_server_by_base_server_id(
    db: Session,
    base_server_id: int
):
    query = db.query(models.mcp.MCPServer)
    query = query.filter(models.mcp.MCPServer.id == base_server_id,
                         models.mcp.MCPServer.delete_at == None)
    query.update({models.mcp.MCPServer.delete_at: datetime.now(timezone.utc)})
    db.flush()

def delete_http_mcp_server_by_base_server_id(
    db: Session,
    base_server_id: int
):
    now = datetime.now(timezone.utc)
    query = db.query(models.mcp.HttpMCP)
    query = query.join(models.mcp.MCPServer)
    query = query.filter(models.mcp.MCPServer.id == base_server_id,
                         models.mcp.HttpMCP.delete_at == None,
                         models.mcp.MCPServer.delete_at == None)
    http_mcp_server = query.one_or_none()
    if http_mcp_server is not None:
        http_mcp_server.delete_at = now
        db.flush()
    
def delete_std_mcp_server_by_base_server_id(
    db: Session,
    base_server_id: int
):
    now = datetime.now(timezone.utc)
    query = db.query(models.mcp.StdMCP)
    query = query.join(models.mcp.MCPServer)
    query = query.filter(models.mcp.MCPServer.id == base_server_id,
                         models.mcp.StdMCP.delete_at == None, 
                         models.mcp.MCPServer.delete_at == None)
    std_mcp_server = query.one_or_none()
    if std_mcp_server is not None:
        std_mcp_server.delete_at = now
        db.flush()