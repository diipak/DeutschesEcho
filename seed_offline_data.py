import asyncio
import json
import os
import sys

# Add root directory to python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from backend.database import AsyncSessionLocal
from backend.models import ContentCache

async def seed_data():
    json_path = "backend/data/offline_data.json"
    if not os.path.exists(json_path):
        print(f"Error: {json_path} not found.")
        return

    with open(json_path, "r", encoding="utf-8") as f:
        data = json.load(f)
        
    async with AsyncSessionLocal() as session:
        for item in data:
            # Wrap the item in the expected {"feedback_data": ...} structure
            payload = {"feedback_data": item}
            
            entry = ContentCache(
                topic="grammar",
                content_type="grammar_rule",
                content_json=json.dumps(payload, ensure_ascii=False),
                is_used=False,
                difficulty_level="A1"
            )
            session.add(entry)
        
        await session.commit()
        print(f"✅ Successfully seeded {len(data)} offline grammar rules into ContentCache!")

if __name__ == "__main__":
    asyncio.run(seed_data())
