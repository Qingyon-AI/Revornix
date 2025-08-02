from sqlalchemy import Column, Integer, String, ForeignKey, DateTime
from common.sql import Base

class RSSServer(Base):
    __tablename__ = 'rss_server'

    id = Column(Integer, primary_key=True)
    title = Column(String(200), index=True)
    description = Column(String(2000))
    address = Column(String(300), nullable=False)
    create_time = Column(DateTime(timezone=True))
    update_time = Column(DateTime(timezone=True))
    delete_at = Column(DateTime(timezone=True))
    user_id = Column(Integer, ForeignKey('user.id'))
    
class RSSDocument(Base):
    __tablename__ = 'rss_document'

    id = Column(Integer, primary_key=True)
    document_id = Column(Integer, ForeignKey('document.id'))
    rss_server_id = Column(Integer, ForeignKey('rss_server.id'))
    create_time = Column(DateTime(timezone=True))
    update_time = Column(DateTime(timezone=True))
    delete_at = Column(DateTime(timezone=True))
    
class RSSSection(Base):
    __tablename__ = 'rss_section'

    id = Column(Integer, primary_key=True)
    section_id = Column(Integer, ForeignKey('section.id'))
    rss_server_id = Column(Integer, ForeignKey('rss_server.id'))
    create_time = Column(DateTime(timezone=True))
    update_time = Column(DateTime(timezone=True))
    delete_at = Column(DateTime(timezone=True))