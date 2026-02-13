"""
Gemini AI engine for batch content generation.
Optimizes token usage by generating content in batches of 50.
"""

import os
import json
import google.generativeai as genai
from typing import List, Dict, Optional
from dotenv import load_dotenv

load_dotenv()

# Configure Gemini
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY or GEMINI_API_KEY == "your_gemini_api_key_here":
    print("⚠️  WARNING: Gemini API key not configured. Set GEMINI_API_KEY in .env file.")
    GEMINI_API_KEY = None

if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)
    # Default to 1.5-flash as it usually has the best free tier limits
    model_name = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")
    print(f"🤖 Using Gemini Model: {model_name}")
    model = genai.GenerativeModel(model_name)
else:
    model = None


async def generate_vocab_batch(topic: str, level: str = "A1", count: int = 50) -> List[Dict]:
    """
    Generate a batch of vocabulary items for a given topic.
    
    Args:
        topic: The topic/theme (e.g., "The House", "Food", "Travel")
        level: CEFR level (A1, A2, B1, etc.)
        count: Number of items to generate
        
    Returns:
        List of vocabulary dictionaries with structure:
        {
            "german": "das Haus",
            "english": "house",
            "gender": "neutral",  # masculine, feminine, neutral, plural
            "example": "Das Haus ist groß.",
            "pronunciation_tip": "dahs hows"
        }
    """
    if not model:
        raise ValueError("Gemini API key not configured. Cannot generate content.")
    
    prompt = f"""You are a German language expert. Generate exactly {count} vocabulary items for the topic "{topic}" at {level} level.

Return ONLY a valid JSON array with this exact structure (no markdown, no extra text):
[
  {{
    "german": "das Buch",
    "english": "book",
    "gender": "neutral",
    "example": "Das Buch ist interessant.",
    "pronunciation_tip": "dahs bookh"
  }}
]

Rules:
- Include articles (der/die/das) for nouns
- Gender must be: masculine, feminine, neutral, or plural
- Examples must be simple {level}-level sentences
- Mix nouns, verbs, adjectives, and common phrases
- Ensure all {count} items are related to "{topic}"
"""

    try:
        response = model.generate_content(prompt)
        content = response.text.strip()
        
        # Clean markdown code blocks if present
        if content.startswith("```"):
            content = content.split("```json")[1].split("```")[0].strip()
        elif content.startswith("["):
            pass  # Already clean JSON
        
        vocab_items = json.loads(content)
        print(f"✅ Generated {len(vocab_items)} vocabulary items for '{topic}'")
        return vocab_items
    
    except json.JSONDecodeError as e:
        print(f"❌ JSON decode error: {e}")
        print(f"Raw response: {content[:200]}")
        raise
    except Exception as e:
        print(f"❌ Error generating vocab batch: {e}")
        raise


async def generate_grammar_batch(count: int = 20) -> List[Dict]:
    """
    Generate grammar exercises (sentence building).
    
    Returns:
        List of grammar exercise dictionaries:
        {
            "instruction": "Translate: 'I can play football.'",
            "correct": ["Ich", "kann", "Fußball", "spielen"],
            "rule": "Modal verbs go in position 2, infinitive at the end",
            "difficulty": 2
        }
    """
    if not model:
        raise ValueError("Gemini API key not configured.")
    
    prompt = f"""Generate {count} German grammar exercises for A1-A2 level sentence building.

Return ONLY valid JSON array (no markdown):
[
  {{
    "instruction": "Translate to German: 'I have a dog.'",
    "correct": ["Ich", "habe", "einen", "Hund"],
    "rule": "Masculine accusative: ein becomes einen",
    "difficulty": 1
  }}
]

Focus on:
- Word order (verb in position 2)
- Modal verbs
- Accusative/Dative cases
- Separable verbs
"""

    try:
        response = model.generate_content(prompt)
        content = response.text.strip()
        if content.startswith("```"):
            content = content.split("```json")[1].split("```")[0].strip()
        
        exercises = json.loads(content)
        print(f"✅ Generated {len(exercises)} grammar exercises")
        return exercises
    except Exception as e:
        print(f"❌ Error generating grammar: {e}")
        raise


async def generate_reading_batch(count: int = 10) -> List[Dict]:
    """
    Generate reading comprehension texts with questions.
    
    Returns:
        List of reading exercises:
        {
            "title": "Email from Anna",
            "text": "Hallo! Ich heiße Anna...",
            "question": "Where does Anna live?",
            "options": ["Berlin", "München", "Hamburg"],
            "answer": 1
        }
    """
    if not model:
        raise ValueError("Gemini API key not configured.")
    
    prompt = f"""Generate {count} short German reading texts (A1 level) with comprehension questions.

Return ONLY valid JSON array:
[
  {{
    "title": "Shopping List",
    "text": "Ich brauche Brot, Milch und drei Äpfel. Der Supermarkt ist um 9 Uhr offen.",
    "question": "What does the person need?",
    "options": ["Only bread", "Bread and milk", "Bread, milk and apples"],
    "answer": 2
  }}
]

Rules:
- Texts should be 2-4 sentences
- Use everyday scenarios (emails, notes, ads, signs)
- Questions should test comprehension
- Always provide 3 options
- Answer is the index (0, 1, or 2)
"""

    try:
        response = model.generate_content(prompt)
        content = response.text.strip()
        if content.startswith("```"):
            content = content.split("```json")[1].split("```")[0].strip()
        
        readings = json.loads(content)
        print(f"✅ Generated {len(readings)} reading exercises")
        return readings
    except Exception as e:
        print(f"❌ Error generating reading: {e}")
        raise


async def generate_speaking_batch(count: int = 30) -> List[Dict]:
    """
    Generate speaking practice phrases.
    
    Returns:
        List of speaking phrases:
        {
            "german": "Guten Morgen! Wie geht es Ihnen?",
            "english": "Good morning! How are you?",
            "context": "Formal greeting",
            "difficulty": 1
        }
    """
    if not model:
        raise ValueError("Gemini API key not configured.")
    
    prompt = f"""Generate {count} German speaking practice phrases for A1 level.

Return ONLY valid JSON array:
[
  {{
    "german": "Entschuldigung, wo ist der Bahnhof?",
    "english": "Excuse me, where is the train station?",
    "context": "Asking for directions",
    "difficulty": 1
  }}
]

Include:
- Greetings and introductions
- Shopping phrases
- Asking for help
- Restaurant ordering
- Common polite expressions
"""

    try:
        response = model.generate_content(prompt)
        content = response.text.strip()
        if content.startswith("```"):
            content = content.split("```json")[1].split("```")[0].strip()
        
        phrases = json.loads(content)
        print(f"✅ Generated {len(phrases)} speaking phrases")
        return phrases
    except Exception as e:
        print(f"❌ Error generating speaking: {e}")
        raise
