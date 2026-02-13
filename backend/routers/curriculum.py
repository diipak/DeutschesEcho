"""
Curriculum API endpoints.
"""
import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from pydantic import BaseModel

from ..database import get_db
from ..models import User, Chapter
from .user import get_or_create_user

router = APIRouter(prefix="/api/chapters", tags=["curriculum"])

class ChapterResponse(BaseModel):
    id: int
    title: str
    summary: str
    content: dict
    is_locked: bool
    is_completed: bool

class CompleteRequest(BaseModel):
    user_id: int = 1

@router.get("", response_model=list[ChapterResponse])
async def get_chapters(
    user_id: int = 1,
    db: AsyncSession = Depends(get_db)
):
    """Get all chapters with lock/completion status for user."""
    # Get user progress
    user = await get_or_create_user(db, user_id)
    try:
        completed_ids = json.loads(user.completed_chapter_ids or "[]")
    except json.JSONDecodeError:
        completed_ids = []

    # Get all chapters
    result = await db.execute(select(Chapter).order_by(Chapter.id))
    chapters = result.scalars().all()
    
    response = []
    
    # Logic: Chapter is unlocked if:
    # 1. Master Unlock is True
    # 2. It's Chapter 1
    # 3. Previous chapter ID is in completed_ids
    
    for chapter in chapters:
        try:
            content_dict = json.loads(chapter.content)
        except json.JSONDecodeError:
            content_dict = {}
            
        is_completed = chapter.id in completed_ids
        
        is_locked = True
        if user.master_unlock:
            is_locked = False
        elif chapter.id == 1:
            is_locked = False
        elif (chapter.id - 1) in completed_ids:
            is_locked = False
            
        response.append(ChapterResponse(
            id=chapter.id,
            title=chapter.title,
            summary=chapter.summary,
            content=content_dict,
            is_locked=is_locked,
            is_completed=is_completed
        ))
        
    return response

@router.post("/{chapter_id}/complete")
async def complete_chapter(
    chapter_id: int,
    req: CompleteRequest,
    db: AsyncSession = Depends(get_db)
):
    """Mark a chapter as complete."""
    user = await get_or_create_user(db, req.user_id)
    
    try:
        completed_ids = set(json.loads(user.completed_chapter_ids or "[]"))
    except:
        completed_ids = set()
        
    if chapter_id not in completed_ids:
        completed_ids.add(chapter_id)
        user.completed_chapter_ids = json.dumps(list(completed_ids))
        
        # Award XP for completing a chapter
        user.xp_points += 50 
        
        await db.commit()
        return {"status": "success", "message": "Chapter completed", "xp_awarded": 50}
    
    return {"status": "success", "message": "Already completed"}

@router.post("/settings/toggle_unlock")
async def toggle_unlock(
    user_id: int = 1,
    db: AsyncSession = Depends(get_db)
):
    """Toggle master unlock for all chapters."""
    user = await get_or_create_user(db, user_id)
    user.master_unlock = not user.master_unlock
    await db.commit()
    return {"status": "success", "master_unlock": user.master_unlock}
