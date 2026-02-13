"""
User management and statistics API endpoints.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime, timedelta
import random

from ..database import get_db
from ..models import User

router = APIRouter()

# Collection of grammar tips for "Daily Wisdom"
GRAMMAR_TIPS = [
    "The verb always goes in the 2nd position in German sentences.",
    "Remember: der (masculine), die (feminine), das (neutral).",
    "Modal verbs (kann, muss, will) send the main verb to the end.",
    "Separable verbs split: anfangen → Ich fange an.",
    "Accusative case: den/einen (masculine) changes from der/ein.",
    "W-questions (Wer, Was, Wo) have verb in 2nd position.",
    "Use 'Sie' for formal you, 'du' for friends, 'ihr' for multiple friends.",
    "Perfect tense: haben/sein + past participle at the end.",
    "Dative is for indirect objects: Ich gebe dem Mann das Buch.",
    "Adjective endings change based on gender and case!"
]


async def get_or_create_user(db: AsyncSession, user_id: int = 1) -> User:
    """Get existing user or create default user."""
    query = select(User).where(User.id == user_id)
    result = await db.execute(query)
    user = result.scalar_one_or_none()
    
    if not user:
        user = User(id=user_id, username="default_user")
        db.add(user)
        await db.commit()
        await db.refresh(user)
    
    return user


@router.get("/stats")
async def get_user_stats(
    user_id: int = 1,
    db: AsyncSession = Depends(get_db)
):
    """Get user statistics (streak, XP points)."""
    user = await get_or_create_user(db, user_id)
    
    return {
        "username": user.username,
        "streak": user.daily_streak,
        "xp": user.xp_points,
        "member_since": user.created_at.strftime("%Y-%m-%d"),
        "last_login": user.last_login.strftime("%Y-%m-%d %H:%M")
    }


@router.post("/update-streak")
async def update_streak(
    user_id: int = 1,
    db: AsyncSession = Depends(get_db)
):
    """Update user's daily streak."""
    user = await get_or_create_user(db, user_id)
    
    # Check if last login was yesterday
    today = datetime.utcnow().date()
    last_login_date = user.last_login.date() if user.last_login else today
    
    if last_login_date == today:
        # Already logged in today
        return {
            "message": "Already checked in today!",
            "streak": user.daily_streak
        }
    elif last_login_date == today - timedelta(days=1):
        # Logged in yesterday, increment streak
        user.daily_streak += 1
    else:
        # Streak broken, reset
        user.daily_streak = 1
    
    user.last_login = datetime.utcnow()
    await db.commit()
    
    return {
        "message": f"Streak updated to {user.daily_streak} days! 🔥",
        "streak": user.daily_streak,
        "xp_bonus": user.daily_streak * 10
    }


@router.post("/add-xp")
async def add_xp(
    points: int,
    user_id: int = 1,
    db: AsyncSession = Depends(get_db)
):
    """Add XP points to user."""
    user = await get_or_create_user(db, user_id)
    user.xp_points += points
    await db.commit()
    
    return {
        "message": f"Earned {points} XP!",
        "total_xp": user.xp_points
    }


@router.get("/wisdom")
async def daily_wisdom():
    """Get a random grammar tip."""
    return {
        "tip": random.choice(GRAMMAR_TIPS),
        "category": "Grammar Wisdom"
    }
