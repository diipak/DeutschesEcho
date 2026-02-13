import asyncio
import json
import random
from sqlalchemy.ext.asyncio import AsyncSession
from backend.database import AsyncSessionLocal, init_db
from backend.models import ContentCache
from extract_goethe import extract_goethe_words
import os

async def seed_goethe_data():
    print("🌱 Seeding database with Goethe A1 word list...")
    
    # 1. Extract data
    pdf_path = "backend/data/GoetheA1wordlist.pdf"
    if not os.path.exists(pdf_path):
        print(f"❌ File not found: {pdf_path}")
        return

    vocab_list = extract_goethe_words(pdf_path)
    print(f"📖 Extracted {len(vocab_list)} items.")
    
    # 2. Insert into DB
    async with AsyncSessionLocal() as session:
        # Check if already seeded to avoid duplicates
        # Simple check: count items with source='Goethe A1'
        # But content_json is text, so we can't query fields easily. 
        # We'll rely on the fact that this is a "seed" script.
        # Ideally we should check if table is empty or just append.
        
        count = 0
        for item in vocab_list:
            # Create ContentCache entry
            # We map "general" as topic so it's picked up by default
            
            # Enrich with mock English if missing, to avoid UI issues
            if not item["english"]:
                item["english"] = "(German only source)" 
            
            new_content = ContentCache(
                topic="general",
                content_type="vocab",
                content_json=json.dumps(item),
                is_used=False,
                difficulty_level="A1"
            )
            session.add(new_content)
            count += 1
            
        await session.commit()
        print(f"✅ Successfully added {count} items to ContentCache.")

if __name__ == "__main__":
    asyncio.run(seed_goethe_data())
