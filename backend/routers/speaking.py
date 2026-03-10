"""
Speaking practice API endpoints.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func
import json

from ..database import get_db
from ..models import ContentCache
from ..ai_engine import generate_speaking_batch
from ..similarity import check_similarity

router = APIRouter()


@router.get("/phrase")
async def get_speaking_phrase(
    db: AsyncSession = Depends(get_db)
):
    """Get a phrase for speaking practice."""
    query = select(ContentCache).where(
        and_(
            ContentCache.content_type == "speaking",
            ContentCache.is_used == False
        )
    ).order_by(func.random()).limit(1)
    
    result = await db.execute(query)
    phrase = result.scalar_one_or_none()
    
    if not phrase:
        return {
            "message": "No speaking phrases cached. Generate new batch first.",
            "action": "generate"
        }
    
    data = json.loads(phrase.content_json)
    
    return {
        "id": phrase.id,
        "german": data["german"],
        "english": data["english"],
        "context": data.get("context", ""),
        "difficulty": data.get("difficulty", 1)
    }


@router.post("/validate")
async def validate_speaking(
    phrase_id: int,
    spoken_text: str,
    user_id: int = 1,
    db: AsyncSession = Depends(get_db)
):
    """
    Validate user's spoken German using semantic similarity.
    Uses local model, no API call needed.
    """
    query = select(ContentCache).where(ContentCache.id == phrase_id)
    result = await db.execute(query)
    phrase = result.scalar_one_or_none()
    
    if not phrase:
        raise HTTPException(status_code=404, detail="Phrase not found")
    
    data = json.loads(phrase.content_json)
    target_text = data["german"]
    
    # Use local similarity checker
    similarity_score, is_correct = check_similarity(spoken_text, target_text)
    
    # Word-level comparison for feedback
    target_words = target_text.lower().replace(",", "").replace(".", "").replace("?", "").split()
    spoken_words = spoken_text.lower().replace(",", "").replace(".", "").replace("?", "").split()
    
    word_feedback = []
    for i, target_word in enumerate(target_words):
        spoken_word = spoken_words[i] if i < len(spoken_words) else ""
        word_similarity, word_correct = check_similarity(spoken_word, target_word)
        word_feedback.append({
            "word": target_word,
            "spoken": spoken_word,
            "correct": word_correct,
            "similarity": word_similarity
        })
    
    if is_correct:
        phrase.is_used = True
        await db.commit()
    
    return {
        "similarity": similarity_score,
        "passed": is_correct,
        "target": target_text,
        "spoken": spoken_text,
        "word_feedback": word_feedback,
        "message": "Excellent pronunciation!" if is_correct else f"Keep practicing! {int(similarity_score)}% accurate."
    }


@router.post("/generate")
async def generate_speaking(
    count: int = 30,
    db: AsyncSession = Depends(get_db)
):
    """Generate new speaking practice phrases."""
    try:
        phrases = await generate_speaking_batch(count)
        
        stored_count = 0
        for phrase in phrases:
            cache_entry = ContentCache(
                topic="speaking",
                content_type="speaking",
                content_json=json.dumps(phrase),
                is_used=False,
                difficulty_level="A1"
            )
            db.add(cache_entry)
            stored_count += 1
        
        await db.commit()
        
        return {
            "success": True,
            "message": f"Generated and cached {stored_count} speaking phrases",
            "count": stored_count
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
