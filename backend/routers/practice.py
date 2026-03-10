import os
import re
import sys
import json
import hashlib
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func

from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

from ..database import get_db
from ..models import ContentCache

router = APIRouter()

# Hardcoded German Practice notebook ID — contains 49 A1 sources
GERMAN_PRACTICE_NOTEBOOK_ID = "d8b9cae5-2d4a-4fe1-8da2-3c184d3c6d53"

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
    Fetch pedagogical feedback dynamically using NotebookLM, but cache the result in SQLite.
    If the exact question has been asked before, it serves the cached response instantly.
    """
    try:
        # 1. Generate unique cache key based on the exercise content
        cache_key = hashlib.sha256(f"{request.rule_name}:{request.question}".encode()).hexdigest()

        # 2. Check SQLite Cache
        query = select(ContentCache).where(
            and_(
                ContentCache.content_type == "grammar_rule",
                ContentCache.topic == cache_key
            )
        )
        result = await db.execute(query)
        cached_rule = result.scalar_one_or_none()

        if cached_rule:
            print(f"⚡ Cache Hit! Serving dynamic rule from DB for: {request.rule_name}")
            return json.loads(cached_rule.content_json)

        print(f"🌐 Cache Miss! Calling NotebookLM MCP for: {request.rule_name}")
        
        # 3. Call NotebookLM via MCP
        base_dir = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
        mcp_script = os.path.join(base_dir, "..", "notebooklm", "mcp_server.py")
        
        if not os.path.exists(mcp_script):
            raise FileNotFoundError(f"NotebookLM MCP server script not found at {mcp_script}")
        
        server_params = StdioServerParameters(
            command=sys.executable,
            args=[mcp_script]
        )
        
        prompt_text = (
            f"The user is studying German and needs structured pedagogical feedback geared towards the Goethe A1 Exam. "
            f"Topic/Rule context: '{request.rule_name}'. "
            f"Sentence context: '{request.question}'. "
            f"You must strictly base your insight on the following source documents ONLY. Do not invent grammar rules outside of these sources: "
            f"1. German Language Masterclass Database: Chapters 1-4, Chapters 5-9, and Advanced Grammar and Exam Protocols (Chapters 10-14). "
            f"2. Goethe Zertifikat A1 HÖREN, LESEN, SCHREIBEN, SPRECHEN Guides. "
            f"3. 30 Commonly used Partizip 2 Verbs in German. "
            f"4. Common German Adjektiv with Examples. "
            f"5. Commonly Used Singular & Plural in German. "
            f"6. Commonly Used Trennbare Verben. "
            f"7. List of Verbs with Akkusativ. "
            f"8. List of Verbs with Dativ. "
            f"9. Learn German Step by Step | Full German A1 Course For Beginners \n"
            f"CRITICAL INSTRUCTION: NO PARAGRAPHS ALLOWED IN THE GRAMMAR EXPLANATION. "
            f"You must teach the grammar using a strict structural formula or pattern, breaking it down into visual blocks (like a math equation). "
            f"Return ONLY a raw, valid JSON object with the exact following structure (do not include markdown codeblocks like ```json): "
            """{"feedback_data": {"rule_title": "Short title of rule", "grammar_formula": [{"label": "Part of speech / role", "value": "Word in German", "color": "Choose one: blue, green, slate, pink, orange, purple, red, yellow"}], "key_vocab": [{"german": "word in german", "english": "english translation"}], "exam_cheat_code": {"section": "E.g., Hören Part 1, Lesen Part 2, Sprechen, etc.", "signal_word": "A specific cue word or grammatical trigger", "the_hack": "The action to take when you see/hear the signal", "the_trap": "The common trap or distractor they use in the Goethe A1 exam"}}}"""
        )

        async with stdio_client(server_params) as (read, write):
            async with ClientSession(read, write) as session:
                await session.initialize()
                
                ask_result = await session.call_tool(
                    name="notebooklm_ask_notebook",
                    arguments={
                        "notebook_id": GERMAN_PRACTICE_NOTEBOOK_ID,
                        "query": prompt_text
                    }
                )
                
                response_text = ask_result.content[0].text
                
                clean_json_str = response_text.replace("```json", "").replace("```", "").strip()
                try:
                    start_idx = clean_json_str.find('{')
                    end_idx = clean_json_str.rfind('}')
                    if start_idx != -1 and end_idx != -1:
                        clean_json_str = clean_json_str[start_idx:end_idx+1]
                    
                    data = json.loads(clean_json_str)

                    # 4. Save to Write-Through Cache
                    new_cache_entry = ContentCache(
                        topic=cache_key,
                        content_type="grammar_rule",
                        content_json=json.dumps(data, ensure_ascii=False),
                        is_used=False,
                        difficulty_level="A1"
                    )
                    db.add(new_cache_entry)
                    await db.commit()

                    return data
                except Exception as e:
                    print(f"JSON Parse Error: {str(e)}\nRaw Response: {response_text}")
                    # Fallback on error, do not cache bad responses
                    return {
                        "feedback_data": {
                            "rule_title": "Error generating rule",
                            "grammar_formula": [
                                {"label": "Error", "value": "Could not parse JSON.", "color": "red"}
                            ],
                            "key_vocab": [],
                            "exam_cheat_code": {
                                "section": "System",
                                "signal_word": "Error",
                                "the_hack": "Try again.",
                                "the_trap": "Parsing failed."
                            }
                        }
                    }
                
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

