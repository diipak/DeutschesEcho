import os
import re
import sys
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

router = APIRouter()

# Hardcoded German Practice notebook ID — contains 49 A1 sources
GERMAN_PRACTICE_NOTEBOOK_ID = "d8b9cae5-2d4a-4fe1-8da2-3c184d3c6d53"

class AskNotebookRequest(BaseModel):
    question: str
    wrong_answer: str = "N/A"
    rule_name: str


def clean_nlm_response(text: str) -> str:
    """Strip NotebookLM metadata noise from the response."""
    # Remove (Conversation ID: ...) block and everything after it
    text = re.sub(r'\s*\(Conversation ID:.*', '', text, flags=re.DOTALL)
    # Remove References: [...] blocks
    text = re.sub(r'\s*References:\s*\[.*', '', text, flags=re.DOTALL)
    # Remove trailing citation markers like [1, 2] or [1]
    text = re.sub(r'\s*\[\d+(?:,\s*\d+)*\]\s*$', '', text)
    # Remove inline citation markers like [1] [2] at end
    text = re.sub(r'(\s*\[\d+\])+\s*$', '', text)
    # Remove "Answer: " prefix if present
    text = re.sub(r'^Answer:\s*', '', text)
    # Clean up leading/trailing whitespace
    return text.strip()


@router.post("/ask-notebook")
async def ask_notebook(request: AskNotebookRequest):
    """
    MCP client that calls the NotebookLM MCP server to provide
    a 1-sentence "Aha!" analogy for a grammar rule, using the
    German Practice notebook (49 A1 sources).
    """
    try:
        # Determine path to mcp_server.py
        base_dir = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
        mcp_script = os.path.join(base_dir, "..", "notebooklm", "mcp_server.py")
        
        if not os.path.exists(mcp_script):
            raise FileNotFoundError(f"NotebookLM MCP server script not found at {mcp_script}")
        
        server_params = StdioServerParameters(
            command=sys.executable,
            args=[mcp_script]
        )
        
        # Build a versatile prompt that works for Grammar, Reading, and Speaking
        prompt_text = (
            f"The user is studying German A1 and needs a practical hit of knowledge. "
            f"The current topic or focus area is: '{request.rule_name}'. "
            f"You must strictly base your insight, analogy, or memory trick on the following source documents ONLY. Do not invent rules outside of these sources: "
            f"1. German Language Masterclass Database: Chapters 1-4, Chapters 5-9, and Advanced Grammar and Exam Protocols (Chapters 10-14). "
            f"2. Goethe Zertifikat A1 HÖREN, LESEN, SCHREIBEN, SPRECHEN Guides. "
            f"3. 30 Commonly used Partizip 2 Verbs in German. "
            f"4. Common German Adjektiv with Examples. "
            f"5. Commonly Used Singular & Plural in German. "
            f"6. Commonly Used Trennbare Verben. "
            f"7. List of Verbs with Akkusativ. "
            f"8. List of Verbs with Dativ. "
            f"Based on these materials ONLY, provide a 1-sentence 'Aha!' insight or trick to master this topic. "
            f"Keep it extremely brief, encouraging, and highly practical. "
            f"Do NOT include conversation IDs, references, or citations in your answer."
        )

        async with stdio_client(server_params) as (read, write):
            async with ClientSession(read, write) as session:
                await session.initialize()
                
                # Use hardcoded notebook ID — skip list_notebooks entirely
                ask_result = await session.call_tool(
                    name="notebooklm_ask_notebook",
                    arguments={
                        "notebook_id": GERMAN_PRACTICE_NOTEBOOK_ID,
                        "query": prompt_text
                    }
                )
                
                response_text = ask_result.content[0].text
                cleaned = clean_nlm_response(response_text)
                return {"analogy": cleaned}
                
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

