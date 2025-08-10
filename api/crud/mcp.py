import models
from datetime import datetime, timezone
from sqlalchemy.orm import Session

def create_mcp_server_base(db: Session,
                           user_id: int, 
                           name: str, 
                           category: int):
    now = datetime.now(timezone.utc)
    db_mcp_server = models.mcp.MCPServer(
        name=name,
        category=category,
        user_id=user_id,
        enable=True,
        create_time=now,
        update_time=now,
    )
    db.add(db_mcp_server)
    db.flush()
    return db_mcp_server

def create_std_mcp(db: Session, 
                   cmd: str, 
                   args: str, 
                   env: str,
                   server_id: int):
    now = datetime.now(timezone.utc)
    db_std_mcp = models.mcp.StdMCP(
        cmd=cmd,
        args=args,
        env=env,
        create_time=now,
        update_time=now,
        server_id=server_id,
    )
    db.add(db_std_mcp)
    db.flush()
    return db_std_mcp

def create_http_mcp(db: Session, 
                    url: str,
                    headers: str,
                    server_id: int):
    now = datetime.now(timezone.utc)
    db_http_mcp = models.mcp.HttpMCP(
        url=url,
        headers=headers,
        create_time=now,
        update_time=now,
        server_id=server_id,
    )
    db.add(db_http_mcp)
    db.flush()
    return db_http_mcp

def search_mcp_servers(db: Session,
                       user_id: int,
                       keyword: str | None = None):
    query = db.query(models.mcp.MCPServer)
    query = query.filter(models.mcp.MCPServer.user_id == user_id,
                         models.mcp.MCPServer.delete_at == None)
    query = query.order_by(models.mcp.MCPServer.id.desc())
    if keyword is not None and len(keyword) > 0:
        query = query.filter(models.mcp.MCPServer.name.like(f'%{keyword}%'))
    return query.all()
    
def get_base_mcp_server_by_id(db: Session, 
                              id: int):
    query = db.query(models.mcp.MCPServer)
    query = query.filter(models.mcp.MCPServer.id == id,
                         models.mcp.MCPServer.delete_at == None)
    return query.first()

def get_std_mcp_server_by_id(db: Session, 
                             id: int):
    query = db.query(models.mcp.StdMCP)
    query = query.filter(models.mcp.StdMCP.id == id,
                         models.mcp.StdMCP.delete_at == None)
    return query.first()

def get_http_mcp_server_by_id(db: Session,
                              id: int):
    query = db.query(models.mcp.HttpMCP)
    query = query.filter(models.mcp.HttpMCP.id == id,
                         models.mcp.HttpMCP.delete_at == None)
    return query.first()

def get_std_mcp_server_by_base_id(db: Session,
                                  base_id: int):
    query = db.query(models.mcp.StdMCP)
    query = query.join(models.mcp.MCPServer)
    query = query.filter(models.mcp.MCPServer.id == base_id,
                         models.mcp.StdMCP.delete_at == None,
                         models.mcp.MCPServer.delete_at == None)
    return query.first()

def get_http_mcp_server_by_base_id(db: Session,
                                   base_id: int):
    query = db.query(models.mcp.HttpMCP)
    query = query.join(models.mcp.MCPServer)
    query = query.filter(models.mcp.MCPServer.id == base_id,
                         models.mcp.HttpMCP.delete_at == None, 
                         models.mcp.MCPServer.delete_at == None)
    return query.first()

def delete_base_mcp_server_by_id(db: Session,
                                 id: int):
    query = db.query(models.mcp.MCPServer)
    query = query.filter(models.mcp.MCPServer.id == id,
                         models.mcp.MCPServer.delete_at == None)
    query.update({models.mcp.MCPServer.delete_at: datetime.now(timezone.utc)})
    db.flush()
    
def delete_std_mcp_server_by_id(db: Session,
                                id: int):
    query = db.query(models.mcp.StdMCP)
    query = query.filter(models.mcp.StdMCP.id == id,
                         models.mcp.StdMCP.delete_at == None)
    query.update({models.mcp.StdMCP.delete_at: datetime.now(timezone.utc)})
    db.flush()
    
def delete_http_mcp_server_by_id(db: Session,
                                 id: int):
    query = db.query(models.mcp.HttpMCP)
    query = query.filter(models.mcp.HttpMCP.id == id,
                         models.mcp.HttpMCP.delete_at == None)
    query.update({models.mcp.HttpMCP.delete_at: datetime.now(timezone.utc)})
    db.flush() 
 
def delete_http_mcp_server_by_base_id(db: Session,
                                      base_id: int):
    query = db.query(models.mcp.HttpMCP)
    query = query.join(models.mcp.MCPServer)
    query = query.filter(models.mcp.MCPServer.id == base_id,
                         models.mcp.HttpMCP.delete_at == None,
                         models.mcp.MCPServer.delete_at == None)
    
    ids = [db_http_mcp.id for db_http_mcp in query.all()]
    
    db.query(models.mcp.HttpMCP)\
        .filter(models.mcp.HttpMCP.id.in_(ids))\
            .update({models.mcp.HttpMCP.delete_at: datetime.now(timezone.utc)})
    
def delete_std_mcp_server_by_base_id(db: Session,
                                     base_id: int):
    query = db.query(models.mcp.StdMCP)
    query = query.join(models.mcp.MCPServer)
    query = query.filter(models.mcp.MCPServer.id == base_id,
                         models.mcp.StdMCP.delete_at == None, 
                         models.mcp.MCPServer.delete_at == None)
    
    ids = [db_std_mcp.id for db_std_mcp in query.all()]

    db.query(models.mcp.StdMCP)\
        .filter(models.mcp.StdMCP.id.in_(ids))\
            .update({models.mcp.StdMCP.delete_at: datetime.now(timezone.utc)})