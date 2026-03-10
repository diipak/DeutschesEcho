"""
Grammar practice API endpoints (Sentence Builder).
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func
from typing import List
import json
import random

from ..database import get_db
from ..models import ContentCache
from ..ai_engine import generate_grammar_batch

router = APIRouter()


@router.get("/drill")
async def get_grammar_drill(
    db: AsyncSession = Depends(get_db)
):
    """
    Get a sentence building exercise.
    Scrambles words on each request.
    """
    # Get unused grammar exercise from cache randomly
    query = select(ContentCache).where(
        and_(
            ContentCache.content_type == "grammar",
            ContentCache.is_used == False
        )
    ).order_by(func.random()).limit(1)

    
    result = await db.execute(query)
    exercise = result.scalar_one_or_none()
    
    if not exercise:
        return {
            "message": "No grammar exercises cached. Generate new batch first.",
            "action": "generate"
        }
    
    data = json.loads(exercise.content_json)
    
    # Scramble the words (Python shuffle for randomness)
    scrambled = data["correct"].copy()
    random.shuffle(scrambled)
    
    return {
        "id": exercise.id,
        "instruction": data["instruction"],
        "scrambled": scrambled,
        "rule": data.get("rule", ""),
        "difficulty": data.get("difficulty", 1)
    }


@router.post("/check")
async def check_grammar_answer(
    exercise_id: int,
    user_answer: List[str],
    user_id: int = 1,
    db: AsyncSession = Depends(get_db)
):
    """
    Check if user's sentence is correct.
    """
    query = select(ContentCache).where(ContentCache.id == exercise_id)
    result = await db.execute(query)
    exercise = result.scalar_one_or_none()
    
    if not exercise:
        raise HTTPException(status_code=404, detail="Exercise not found")
    
    data = json.loads(exercise.content_json)
    correct_answer = data["correct"]
    
    # Normalize user answer
    if isinstance(user_answer, list):
        user_joined = " ".join(user_answer)
    else:
        user_joined = str(user_answer)
        
    correct_joined = " ".join(correct_answer)
    
    # Simple string comparison (case-insensitive)
    is_correct = user_joined.strip().lower() == correct_joined.strip().lower()
    
    # Mark as used if correct
    if is_correct:
        exercise.is_used = True
        await db.commit()
    
    return {
        "correct": is_correct,
        "user_answer": user_joined,
        "correct_answer": correct_joined,
        "rule": data.get("rule", ""),
        "feedback": "Perfekt! Correct." if is_correct else f"Falsch! The correct order is: {correct_joined}"
    }


@router.post("/generate")
async def generate_grammar(
    count: int = 20,
    db: AsyncSession = Depends(get_db)
):
    """Generate new grammar exercises."""
    try:
        exercises = await generate_grammar_batch(count)
        
        stored_count = 0
        for exercise in exercises:
            cache_entry = ContentCache(
                topic="grammar",
                content_type="grammar",
                content_json=json.dumps(exercise),
                is_used=False,
                difficulty_level="A1"
            )
            db.add(cache_entry)
            stored_count += 1
        
        await db.commit()
        
        return {
            "success": True,
            "message": f"Generated and cached {stored_count} grammar exercises",
            "count": stored_count
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
