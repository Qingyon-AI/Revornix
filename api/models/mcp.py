from sqlalchemy import Column, Integer, String, ForeignKey, DateTime
from common.sql import Base

class MCPServer(Base):
    __tablename__ = 'mcp_server'

    id = Column(Integer, primary_key=True)
    name = Column(String(200), index=True)
    category = Column(Integer, nullable=False, index=True, comment='0: std, 1: stream')
    create_time = Column(DateTime(timezone=True))
    update_time = Column(DateTime(timezone=True))
    delete_at = Column(DateTime(timezone=True))
    user_id = Column(Integer, ForeignKey('user.id'))
    
class StdMCP(Base):
    __tablename__ = 'std_mcp'

    id = Column(Integer, primary_key=True)
    cmd = Column(String(200))
    args = Column(String(200))
    create_time = Column(DateTime(timezone=True))
    update_time = Column(DateTime(timezone=True))
    delete_at = Column(DateTime(timezone=True))
    server_id = Column(Integer, ForeignKey('mcp_server.id'))
    
class StreamMCP(Base):
    __tablename__ = 'stream_mcp'

    id = Column(Integer, primary_key=True)
    address = Column(String(200))
    create_time = Column(DateTime(timezone=True))
    update_time = Column(DateTime(timezone=True))
    delete_at = Column(DateTime(timezone=True))
    server_id = Column(Integer, ForeignKey('mcp_server.id'))