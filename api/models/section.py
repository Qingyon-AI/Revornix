from sqlalchemy.orm import relationship
from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Boolean
from common.sql import Base

class PublishSection(Base):
    __tablename__ = "publish_section"

    id = Column(Integer, primary_key=True)
    section_id = Column(Integer, ForeignKey("section.id"), index=True)
    uuid = Column(String(32), nullable=False, index=True)
    create_time = Column(DateTime(timezone=True), nullable=False)
    update_time = Column(DateTime(timezone=True), nullable=False)
    delete_at = Column(DateTime(timezone=True))

class SectionUser(Base):
    __tablename__ = "section_user"

    id = Column(Integer, primary_key=True)
    section_id = Column(Integer, ForeignKey("section.id"), index=True)
    user_id = Column(Integer, ForeignKey("user.id"), index=True)
    role = Column(Integer, nullable=False, index=True, comment='0: creator 1: member 2: subscriber')
    # full access相比于w&r多了一个邀请的权限，注意 除了所有者 任何人都不具备删除的权限，同时，除了所有者 任何人都不能修改他人的权限
    authority = Column(Integer, nullable=False, index=True, comment='0: full access 1: w&r 2: r')
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
    
class SectionLabel(Base):
    __tablename__ = "section_section_label"

    id = Column(Integer, primary_key=True)
    section_id = Column(Integer, ForeignKey("section.id"), index=True)
    label_id = Column(Integer, ForeignKey("section_label.id"), index=True)
    create_time = Column(DateTime(timezone=True), nullable=False)
    update_time = Column(DateTime(timezone=True), nullable=False)
    delete_at = Column(DateTime(timezone=True))
    
class DaySection(Base):
    __tablename__ = "day_section"

    id = Column(Integer, primary_key=True)
    section_id = Column(Integer, ForeignKey("section.id"), index=True)
    date = Column(String(20), nullable=False, comment='Considering that only the year, month, and day are needed here, a string is used for storage.')
    create_time = Column(DateTime(timezone=True), nullable=False)
    update_time = Column(DateTime(timezone=True), nullable=False)
    delete_at = Column(DateTime(timezone=True))
    
class Section(Base):
    __tablename__ = "section"

    id = Column(Integer, primary_key=True)
    title = Column(String(500), index=True, nullable=False)
    creator_id = Column(Integer, ForeignKey("user.id"), index=True, nullable=False)
    cover = Column(String(500), comment='The path of the cover image which you uploaded to the file system')
    description = Column(String(500), index=True, nullable=False)
    md_file_name = Column(String(500), comment='The path of the markdown file which you uploaded to the file system')
    create_time = Column(DateTime(timezone=True), nullable=False)
    update_time = Column(DateTime(timezone=True), nullable=False)
    delete_at = Column(DateTime(timezone=True))
    
    creator = relationship("User", backref="created_sections")

class Label(Base):
    __tablename__ = "section_label"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("user.id"), index=True)
    name = Column(String(100), index=True, nullable=False)
    create_time = Column(DateTime(timezone=True), nullable=False)
    update_time = Column(DateTime(timezone=True), nullable=False)
    delete_at = Column(DateTime(timezone=True))
    
class SectionComment(Base):
    __tablename__ = "section_comment"

    id = Column(Integer, primary_key=True)
    section_id = Column(Integer, ForeignKey("section.id"), nullable=False, index=True)
    creator_id = Column(Integer, ForeignKey("user.id"), nullable=False, index=True)
    content = Column(String(500), nullable=False)
    parent_id = Column(Integer, ForeignKey("section_comment.id"), index=True, comment='The id of the parent comment')
    create_time = Column(DateTime(timezone=True), nullable=False)
    update_time = Column(DateTime(timezone=True), nullable=False)
    delete_at = Column(DateTime(timezone=True))
    
    creator = relationship("User", backref="created_section_comments")