"""
Vocabulary API endpoints.
Implements caching and spaced repetition.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from datetime import datetime, timedelta
from typing import Optional
import json
import random

from ..database import get_db
from ..models import ContentCache, Progress, User
from ..ai_engine import generate_vocab_batch

router = APIRouter()


@router.get("/next")
async def get_next_vocab(
    topic: str = "general",
    user_id: int = 1,
    db: AsyncSession = Depends(get_db)
):
    """
    Get next vocabulary card from cache.
    Uses spaced repetition to prioritize cards.
    """
    # Check cache for unused vocab
    query = select(ContentCache).where(
        and_(
            ContentCache.content_type == "vocab",
            ContentCache.topic == topic,
            ContentCache.is_used == False
        )
    ).limit(1)
    
    result = await db.execute(query)
    cached_item = result.scalar_one_or_none()
    
    if not cached_item:
        # No cached items, return message
        return {
            "message": "No cached vocabulary. Generate new batch first.",
            "action": "generate",
            "topic": topic
        }
    
    # Parse JSON content
    vocab_data = json.loads(cached_item.content_json)
    
    return {
        "id": cached_item.id,
        "german": vocab_data["german"],
        "english": vocab_data["english"],
        "gender": vocab_data.get("gender", "plural"),
        "example": vocab_data.get("example", ""),
        "pronunciation_tip": vocab_data.get("pronunciation_tip", "")
    }


@router.post("/answer")
async def submit_vocab_answer(
    vocab_id: int,
    known: bool,
    user_id: int = 1,
    db: AsyncSession = Depends(get_db)
):
    """
    Submit user's answer (swipe left/right or button).
    Updates progress and marks item as used.
    """
    # Mark content as used
    query = select(ContentCache).where(ContentCache.id == vocab_id)
    result = await db.execute(query)
    vocab_item = result.scalar_one_or_none()
    
    if not vocab_item:
        raise HTTPException(status_code=404, detail="Vocabulary item not found")
    
    vocab_item.is_used = True
    
    # Update or create progress entry
    progress_query = select(Progress).where(
        and_(
            Progress.user_id == user_id,
            Progress.content_id == vocab_id
        )
    )
    progress_result = await db.execute(progress_query)
    progress = progress_result.scalar_one_or_none()
    
    if not progress:
        # Create new progress entry
        progress = Progress(
            user_id=user_id,
            content_id=vocab_id,
            status="learning" if known else "new",
            last_reviewed=datetime.utcnow()
        )
        db.add(progress)
    else:
        # Update existing progress
        progress.last_reviewed = datetime.utcnow()
        progress.repetition_count += 1
        
        if known:
            # Calculate next review date using SM-2 algorithm (simplified)
            if progress.status == "new":
                progress.status = "learning"
                progress.interval_days = 1
            elif progress.status == "learning":
                progress.interval_days = min(progress.interval_days * 2, 30)
                if progress.repetition_count >= 3:
                    progress.status = "reviewing"
            elif progress.status == "reviewing":
                progress.interval_days = min(progress.interval_days * 2, 90)
                if progress.repetition_count >= 5:
                    progress.status = "mastered"
            
            progress.next_review_date = datetime.utcnow() + timedelta(days=progress.interval_days)
        else:
            # Reset if not known
            progress.status = "new"
            progress.interval_days = 1
            progress.next_review_date = datetime.utcnow() + timedelta(hours=1)
    
    await db.commit()
    
    return {
        "success": True,
        "status": progress.status,
        "next_review": progress.next_review_date.isoformat() if progress.next_review_date else None
    }


@router.post("/generate")
async def generate_vocab(
    topic: str = "general",
    level: str = "A1",
    count: int = 50,
    db: AsyncSession = Depends(get_db)
):
    """
    Generate a new batch of vocabulary items using Gemini.
    Stores in cache for later retrieval.
    """
    try:
        # Generate content
        vocab_items = await generate_vocab_batch(topic, level, count)
        
        # Store in database
        stored_count = 0
        for item in vocab_items:
            cache_entry = ContentCache(
                topic=topic,
                content_type="vocab",
                content_json=json.dumps(item),
                is_used=False,
                difficulty_level=level
            )
            db.add(cache_entry)
            stored_count += 1
        
        await db.commit()
        
        return {
            "success": True,
            "message": f"Generated and cached {stored_count} vocabulary items for '{topic}'",
            "count": stored_count,
            "topic": topic
        }
    
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating vocabulary: {str(e)}")


@router.get("/stats")
async def get_vocab_stats(
    user_id: int = 1,
    db: AsyncSession = Depends(get_db)
):
    """Get vocabulary learning statistics."""
    # Count by status
    new_count = await db.execute(
        select(Progress).where(
            and_(Progress.user_id == user_id, Progress.status == "new")
        )
    )
    learning_count = await db.execute(
        select(Progress).where(
            and_(Progress.user_id == user_id, Progress.status == "learning")
        )
    )
    reviewing_count = await db.execute(
        select(Progress).where(
            and_(Progress.user_id == user_id, Progress.status == "reviewing")
        )
    )
    mastered_count = await db.execute(
        select(Progress).where(
            and_(Progress.user_id == user_id, Progress.status == "mastered")
        )
    )
    
    return {
        "new": len(new_count.scalars().all()),
        "learning": len(learning_count.scalars().all()),
        "reviewing": len(reviewing_count.scalars().all()),
        "mastered": len(mastered_count.scalars().all())
    }
