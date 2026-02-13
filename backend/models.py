"""
Database models and schema for DeutschesEcho.
Single-user design with potential for multi-user expansion.
"""

from sqlalchemy import Column, Integer, String, DateTime, Boolean, Text, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.sql import func
from datetime import datetime

Base = declarative_base()


class User(Base):
    """User table - currently single user, expandable to multi-user"""
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, nullable=False, default="default_user")
    daily_streak = Column(Integer, default=0)
    xp_points = Column(Integer, default=0)
    created_at = Column(DateTime, default=func.now())
    last_login = Column(DateTime, default=func.now(), onupdate=func.now())


class ContentCache(Base):
    """Cache for AI-generated content to minimize token usage"""
    __tablename__ = "content_cache"
    
    id = Column(Integer, primary_key=True, index=True)
    topic = Column(String(100), nullable=False, index=True)  # e.g., "The House", "Food"
    content_type = Column(String(20), nullable=False, index=True)  # vocab, grammar, reading, speaking
    content_json = Column(Text, nullable=False)  # JSON string of content
    is_used = Column(Boolean, default=False)  # Track if shown to user
    difficulty_level = Column(String(10), default="A1")  # A1, A2, B1, etc.
    created_at = Column(DateTime, default=func.now())
    

class Progress(Base):
    """Track user progress with spaced repetition"""
    __tablename__ = "progress"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    content_id = Column(Integer, ForeignKey("content_cache.id"), nullable=False)
    status = Column(String(20), default="new")  # new, learning, reviewing, mastered
    next_review_date = Column(DateTime, nullable=True)
    repetition_count = Column(Integer, default=0)
    ease_factor = Column(Integer, default=250)  # SuperMemo SM-2 algorithm (250 = 2.5)
    interval_days = Column(Integer, default=1)
    last_reviewed = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=func.now())
