from sqlalchemy.orm import relationship
from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Boolean
from common.sql import Base

class SectionUser(Base):
    __tablename__ = "section_user"

    id = Column(Integer, primary_key=True)
    section_id = Column(Integer, ForeignKey("section.id"), index=True)
    user_id = Column(Integer, ForeignKey("user.id"), index=True)
    authority = Column(Integer, nullable=False, index=True, comment='0: full access 1: w/r 2: r')
    create_time = Column(DateTime(timezone=True), nullable=False)
    update_time = Column(DateTime(timezone=True), nullable=False)
    # expire_time is null means the time is infinite
    expire_time = Column(DateTime(timezone=True))
    delete_at = Column(DateTime(timezone=True))
    
class SectionDocument(Base):
    __tablename__ = "section_document"

    id = Column(Integer, primary_key=True)
    section_id = Column(Integer, ForeignKey("section.id"), index=True)
    document_id = Column(Integer, ForeignKey("document.id"), index=True)
    create_time = Column(DateTime(timezone=True), nullable=False)
    update_time = Column(DateTime(timezone=True), nullable=False)
    status = Column(Integer, nullable=False, index=True, comment='0: waiting to be supplemented, 1: supplementing 2: supplemented successfully 3: supplemented error')
    delete_at = Column(DateTime(timezone=True))
    
class Section(Base):
    __tablename__ = "section"

    id = Column(Integer, primary_key=True)
    title = Column(String(500), index=True, nullable=False)
    public = Column(Boolean, nullable=False, index=True)
    creator_id = Column(Integer, ForeignKey("user.id"), index=True, nullable=False)
    cover = Column(String(500), comment='The path of the cover image which you uploaded to the file system')
    description = Column(String(500), index=True, nullable=False)
    md_file_name = Column(String(500), comment='The path of the markdown file which you uploaded to the file system')
    create_time = Column(DateTime(timezone=True), nullable=False)
    update_time = Column(DateTime(timezone=True), nullable=False)
    delete_at = Column(DateTime(timezone=True))
    
    creator = relationship("User", backref="created_sections")