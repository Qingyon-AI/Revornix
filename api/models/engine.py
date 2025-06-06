from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Boolean

from common.sql import Base

class UserDocumentParsingEngine(Base):
    __tablename__ = "user_document_parsing_engine"

    user_id = Column(Integer, ForeignKey("user.id"), primary_key=True)
    document_parsing_engine_id = Column(Integer, ForeignKey("document_parsing_engine.id"), primary_key=True)
    create_time = Column(DateTime(timezone=True))
    update_time = Column(DateTime(timezone=True))
    delete_at = Column(DateTime(timezone=True))
    enable = Column(Boolean, default=True)
    
class UserWebsiteCarwingEngine(Base):
    __tablename__ = "user_website_crawling_engine"

    user_id = Column(Integer, ForeignKey("user.id"), primary_key=True)
    website_crawling_engine_id = Column(Integer, ForeignKey("website_crawling_engine.id"), primary_key=True)
    create_time = Column(DateTime(timezone=True))
    update_time = Column(DateTime(timezone=True))
    delete_at = Column(DateTime(timezone=True))
    enable = Column(Boolean, default=True)

class DocumentParsingEngine(Base):
    __tablename__ = "document_parsing_engine"

    id = Column(Integer, primary_key=True)
    name = Column(String(100), nullable=False, index=True)
    description = Column(String(500))
    create_time = Column(DateTime(timezone=True))
    update_time = Column(DateTime(timezone=True))
    delete_at = Column(DateTime(timezone=True))
    
class WebsiteCarwingEngine(Base):
    __tablename__ = "website_crawling_engine"

    id = Column(Integer, primary_key=True)
    name = Column(String(100), nullable=False, index=True)
    description = Column(String(500))
    create_time = Column(DateTime(timezone=True))
    update_time = Column(DateTime(timezone=True))
    delete_at = Column(DateTime(timezone=True))