"""
Reading comprehension API endpoints.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func
import json

from ..database import get_db
from ..models import ContentCache
from ..ai_engine import generate_reading_batch

router = APIRouter()


@router.get("/text")
async def get_reading_text(
    db: AsyncSession = Depends(get_db)
):
    """Get a reading comprehension exercise."""
    query = select(ContentCache).where(
        and_(
            ContentCache.content_type == "reading",
            ContentCache.is_used == False
        )
    ).order_by(func.random()).limit(1)

    
    result = await db.execute(query)
    reading = result.scalar_one_or_none()
    
    if not reading:
        return {
            "message": "No reading texts cached. Generate new batch first.",
            "action": "generate"
        }
    
    data = json.loads(reading.content_json)
    
    return {
        "id": reading.id,
        "title": data["title"],
        "text": data["text"],
        "question": data["question"],
        "options": data["options"],
        "answer": data["answer"]  # Include answer index for validation
    }


@router.post("/answer")
async def check_reading_answer(
    reading_id: int,
    selected: int,
    user_id: int = 1,
    db: AsyncSession = Depends(get_db)
):
    """Check reading comprehension answer."""
    query = select(ContentCache).where(ContentCache.id == reading_id)
    result = await db.execute(query)
    reading = result.scalar_one_or_none()
    
    if not reading:
        raise HTTPException(status_code=404, detail="Reading not found")
    
    data = json.loads(reading.content_json)
    correct_answer = data["answer"]
    
    is_correct = selected == correct_answer
    
    if is_correct:
        reading.is_used = True
        await db.commit()
    
    return {
        "correct": is_correct,
        "correct_answer": data["options"][correct_answer],
        "feedback": "Richtig! Well understood." if is_correct else "Falsch. Read the text carefully again."
    }


@router.post("/generate")
async def generate_reading(
    count: int = 10,
    db: AsyncSession = Depends(get_db)
):
    """Generate new reading comprehension texts."""
    try:
        readings = await generate_reading_batch(count)
        
        stored_count = 0
        for reading in readings:
            cache_entry = ContentCache(
                topic="reading",
                content_type="reading",
                content_json=json.dumps(reading),
                is_used=False,
                difficulty_level="A1"
            )
            db.add(cache_entry)
            stored_count += 1
        
        await db.commit()
        
        return {
            "success": True,
            "message": f"Generated and cached {stored_count} reading texts",
            "count": stored_count
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
