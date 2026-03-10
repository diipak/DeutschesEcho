import os
import re
import sys
import json
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func

from ..database import get_db
from ..models import ContentCache

router = APIRouter()

class AskNotebookRequest(BaseModel):
    question: str
    wrong_answer: str = "N/A"
    rule_name: str


def clean_nlm_response(text: str) -> str:
    """Legacy cleaner - kept in case needed later."""
    text = re.sub(r'\s*\(Conversation ID:.*', '', text, flags=re.DOTALL)
    text = re.sub(r'\s*References:\s*\[.*', '', text, flags=re.DOTALL)
    text = re.sub(r'\s*\[\d+(?:,\s*\d+)*\]\s*$', '', text)
    text = re.sub(r'(\s*\[\d+\])+\s*$', '', text)
    text = re.sub(r'^Answer:\s*', '', text)
    return text.strip()


@router.post("/ask-notebook")
async def ask_notebook(
    request: AskNotebookRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Fetch pre-generated structured pedagogical feedback geared towards the Goethe A1 Exam 
    from the local SQLite ContentCache instead of making an external LLM request.
    """
    try:
        # We query for pre-generated offline grammar rules
        query = select(ContentCache).where(
            ContentCache.content_type == "grammar_rule"
        ).order_by(func.random()).limit(1)

        result = await db.execute(query)
        rule = result.scalar_one_or_none()

        if not rule:
            # Fallback if DB wasn't seeded correctly
            print("Fallback: No offline grammar rules found in DB!")
            return {
                "feedback_data": {
                    "rule_title": request.rule_name,
                    "grammar_formula": [
                        {"label": "Word", "value": "...loading data base...", "color": "slate"}
                    ],
                    "key_vocab": [],
                    "exam_cheat_code": {
                        "section": "System",
                        "signal_word": "Missing Data",
                        "the_hack": "Run seed_offline_data.py to populate rules.",
                        "the_trap": "Empty DB"
                    }
                }
            }
        
        # Load the fully structured {"feedback_data": {...}} JSON
        data = json.loads(rule.content_json)
        return data
                
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

