import asyncio
import json
import os
import sys
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

# Add parent directory to path to import modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.database import DATABASE_URL, engine, init_db
from backend.models import Base, Chapter

CURRICULUM_FILE = os.path.join(os.path.dirname(__file__), "data/curriculum.json")

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

async def seed_chapters():
    """Read JSON and upsert chapters."""
    if not os.path.exists(CURRICULUM_FILE):
        print(f"❌ Curriculum file not found at {CURRICULUM_FILE}")
        return

    print(f"📖 Reading curriculum from {CURRICULUM_FILE}...")
    with open(CURRICULUM_FILE, "r", encoding="utf-8") as f:
        chapters_data = json.load(f)

    async with engine.begin() as conn:
        # Create tables if they don't exist (e.g. chapters)
        await conn.run_sync(Base.metadata.create_all)
        
        for chapter in chapters_data:
            # Prepare content JSON
            content_json = json.dumps({
                "key_vocab": chapter.get("key_vocab", []),
                "grammar_rules": chapter.get("grammar_rules", []),
                "dialogue": chapter.get("dialogue", {})
            }, ensure_ascii=False)
            
            # Upsert logic (Delete existing with same ID and insert new)
            # Using raw SQL for simplicity in upsert across different DBs, but here for SQLite specific
            # We'll just check if it exists and update, or insert.
            # Actually easier to delete and re-insert for seeding to ensure fresh data
            
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

async def main():
    await migrate_schema()
    await seed_chapters()
    print("✨ Curriculum seeding complete!")

if __name__ == "__main__":
    asyncio.run(main())
