import asyncio
import json
from googletrans import Translator
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select
from backend.models import ContentCache, Base
from backend.database import DATABASE_URL

# Setup DB connection
engine = create_async_engine(DATABASE_URL, echo=False)
AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

async def translate_missing_english():
    async with AsyncSessionLocal() as db:
        # Find entries with "German only source" in English field
        query = select(ContentCache).where(ContentCache.content_json.like('%(German only source)%'))
        result = await db.execute(query)
        items = result.scalars().all()
        
        translator = Translator()
        
        print(f"Found {len(items)} items to translate.")
        
        for item in items:
            try:
                data = json.loads(item.content_json)
                german_word = data['german']
                
                # Check if it really needs translation
                if "(German only source)" in data['english']:
                    print(f"Translating: {german_word}")
                    translation = translator.translate(german_word, src='de', dest='en')
                    english_text = translation.text
                    
                    data['english'] = english_text
                    item.content_json = json.dumps(data)
                    print(f" -> {english_text}")
            except Exception as e:
                print(f"Error translating {item.id}: {e}")
                
        await db.commit()
        print("Translation complete.")

if __name__ == "__main__":
    asyncio.run(translate_missing_english())
