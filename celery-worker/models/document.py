from sqlalchemy.orm import relationship
from sqlalchemy import Column, Integer, String, ForeignKey, DateTime
from common.sql import Base

class Document(Base):
    __tablename__ = "document"

    id = Column(Integer, primary_key=True)
    creator_id = Column(Integer, ForeignKey("user.id"), index=True)
    from_plat = Column(String(100))
    title = Column(String(500), index=True)
    description = Column(String(500))
    ai_summary = Column(String(10000))
    cover = Column(String(500))
    category = Column(Integer, index=True, comment='0: file, 1: website, 2: quick-note')
    create_time = Column(DateTime(timezone=True))
    update_time = Column(DateTime(timezone=True))
    delete_at = Column(DateTime(timezone=True))
    
    creator = relationship("User", backref="created_documents")
    
class QuickNoteDocument(Base):
    __tablename__ = "quick_note_document"

    id = Column(Integer, primary_key=True)
    document_id = Column(Integer, ForeignKey("document.id"), index=True)
    content = Column(String(1000), nullable=False)
    delete_at = Column(DateTime(timezone=True))
    
class WebsiteDocument(Base):
    __tablename__ = "website_document"

    id = Column(Integer, primary_key=True)
    document_id = Column(Integer, ForeignKey("document.id"), index=True)
    url = Column(String(500), nullable=False, index=True)
    keywords = Column(String(500))
    md_file_name = Column(String(500), comment='The path of the markdown file which you uploaded to the file system')
    delete_at = Column(DateTime(timezone=True))

class FileDocument(Base):
    __tablename__ = "file_document"

    id = Column(Integer, primary_key=True)
    document_id = Column(Integer, ForeignKey("document.id"), index=True)
    file_name = Column(String(500), nullable=False, index=True)
    md_file_name = Column(String(500), comment='The path of the markdown file which you uploaded to the file system')
    delete_at = Column(DateTime(timezone=True))