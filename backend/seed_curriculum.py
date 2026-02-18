import asyncio
import json
import os
import sys
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

# Add parent directory to path to import modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.database import DATABASE_URL, engine, init_db
from backend.models import Base, Chapter, ContentCache

CURRICULUM_FILE = os.path.join(os.path.dirname(__file__), "data/enriched_curriculum.json")

async def migrate_schema():
    """Check for missing columns in User table and add them if needed."""
    print("🔄 Checking schema version...")
    
    async with engine.connect() as conn:
        # Check User table columns
        result = await conn.execute(text("PRAGMA table_info(users)"))
        columns = [row.name for row in result.fetchall()]
        
        # Add completed_chapter_ids if missing
        if "completed_chapter_ids" not in columns:
            print("⚠️ Adding 'completed_chapter_ids' column to users table...")
            await conn.execute(text("ALTER TABLE users ADD COLUMN completed_chapter_ids VARCHAR DEFAULT '[]'"))
            await conn.commit()
            print("✅ Column added.")
            
        # Add master_unlock if missing
        if "master_unlock" not in columns:
            print("⚠️ Adding 'master_unlock' column to users table...")
            await conn.execute(text("ALTER TABLE users ADD COLUMN master_unlock BOOLEAN DEFAULT 0"))
            await conn.commit()
            print("✅ Column added.")

async def seed_chapters(chapters_data):
    """Read JSON and upsert chapters."""
    print(f"📖 Seeding chapters from {len(chapters_data)} entries...")

    async with engine.begin() as conn:
        # Create tables if they don't exist (e.g. chapters)
        await conn.run_sync(Base.metadata.create_all)
        
        for chapter in chapters_data:
            # Prepare content JSON with all enriched fields
            # We map new fields from enriched_curriculum.json
            content_json = json.dumps({
                "key_vocab": chapter.get("key_vocab", []),
                "grammar_rules": chapter.get("grammar_rules", []),
                "dialogues": chapter.get("dialogues", []),  # Changed from dialogue dict to dialogues list
                "introduction_template": chapter.get("introduction_template", {}),
                "pronunciation_notes": chapter.get("pronunciation_notes", []),
                "declension_tables": chapter.get("declension_tables", []),
                "source_pages": chapter.get("source_pages", "")
            }, ensure_ascii=False)
            
            # Upsert logic (Delete existing with same ID and insert new)
            await conn.execute(text("DELETE FROM chapters WHERE id = :id"), {"id": chapter["id"]})
            
            await conn.execute(
                text("""
                    INSERT INTO chapters (id, title, summary, content, created_at)
                    VALUES (:id, :title, :summary, :content, CURRENT_TIMESTAMP)
                """),
                {
                    "id": chapter["id"],
                    "title": chapter["title"],
                    "summary": chapter["summary"],
                    "content": content_json
                }
            )
            print(f"✅ seeded Chapter {chapter['id']}: {chapter['title']}")

async def seed_vocab_cache(chapters_data):
    """Seed ContentCache with vocabulary from chapters for Spaced Repetition."""
    print("🧠 Seeding Vocabulary Cache...")
    
    count = 0
    # We need a separate connection context for this massive insert to ensure it commits properly
    async with engine.begin() as conn:
        # We don't delete everything, we append/update. Users might have progress linked to IDs.
        # But for 'clean' seeding, we might want to check existence.
        
        for chapter in chapters_data:
            vocab_list = chapter.get("key_vocab", [])
            # Use chapter title as topic if not specified, but usually vocab has category
            chapter_title = chapter.get("title", "General")
            
            for word in vocab_list:
                german_word = word.get("german")
                if not german_word:
                    continue
                    
                # Check if already exists to avoid duplicates
                # We use a simple check on 'german' word in content_json string to avoid parsing every row
                # Ideally, we should have a unique constraint or hash, but for now this suffices for seeding
                existing = await conn.execute(
                    text("SELECT id FROM content_cache WHERE content_type = 'vocab' AND content_json LIKE :word_pattern"),
                    {"word_pattern": f'%"{german_word}"%'}
                )
                if existing.scalar():
                    continue

                # Prepare JSON content for cache
                # Ensure it has all fields expected by the vocab router
                word_data = {
                    "german": german_word,
                    "english": word.get("english", ""),
                    "gender": word.get("gender", "none"),
                    "category": word.get("category", "general"),
                    "example": word.get("example", f"Das ist {german_word}."), # Fallback
                    "pronunciation_tip": ""
                }
                
                # Insert into cache
                await conn.execute(
                    text("""
                        INSERT INTO content_cache (topic, content_type, content_json, is_used, difficulty_level, created_at)
                        VALUES (:topic, 'vocab', :content_json, 0, 'A1', CURRENT_TIMESTAMP)
                    """),
                    {
                        "topic": word.get("category", chapter_title), # Use category if available, else chapter title
                        "content_json": json.dumps(word_data, ensure_ascii=False)
                    }
                )
                count += 1
    
    print(f"✅ Seeded {count} new vocabulary items into ContentCache.")

async def main():
    if not os.path.exists(CURRICULUM_FILE):
        print(f"❌ Curriculum file not found at {CURRICULUM_FILE}")
        return

    print(f"📂 Loading data from {CURRICULUM_FILE}...")
    with open(CURRICULUM_FILE, "r", encoding="utf-8") as f:
        chapters_data = json.load(f)

    await migrate_schema()
    await seed_chapters(chapters_data)
    await seed_vocab_cache(chapters_data)
    print("✨ Curriculum seeding complete!")

if __name__ == "__main__":
    asyncio.run(main())
