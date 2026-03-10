# DeutschesEcho System Blueprint

This document outlines the database schema, API communication payloads, and front-end mapping requirements for A1 generated practice data from NotebookLM.

---

## 1. Database Schema

All AI-generated practice content (Vocab, Grammar, Reading, Speaking) is stored in a single table using a polymorphic JSON approach.

### SQLAlchemy Model: `ContentCache`

```python
class ContentCache(Base):
    __tablename__ = "content_cache"
    
    id = Column(Integer, primary_key=True, index=True)
    topic = Column(String(100), nullable=False, index=True)
    content_type = Column(String(20), nullable=False, index=True) # "vocab", "grammar", "reading", "speaking"
    content_json = Column(Text, nullable=False) # JSON string of content mapped to frontend
    is_used = Column(Boolean, default=False)
    difficulty_level = Column(String(10), default="A1")
    created_at = Column(DateTime, default=func.now())
```

> [!TIP]
> The exact contents of `content_json` must match what the router endpoints extract and return to the frontend to ensure UI compatibility.

---

## 2. API Communication Payloads

These are the exact structures that the FastAPI endpoints return to the `app.js` frontend.

### A. Grammar (`/api/grammar/drill`)
Returns a scrambled sentence building exercise.
```json
{
  "id": 1,
  "instruction": "Translate and combine the words.",
  "scrambled": ["Ich", "gehe", "nach", "Hause"],
  "rule": "Word order in main clauses.",
  "difficulty": "A1"
}
```

### B. Reading (`/api/reading/text`)
Returns a short text, a question, and multiple-choice options.
```json
{
  "id": 1,
  "title": "Am Wochenende",
  "text": "Meine Party beginnt am Freitag...",
  "question": "Was gibt es zu essen?",
  "options": ["Salat", "Pizza", "Pasta"],
  "answer": 1
}
```

### C. Speaking (`/api/speaking/phrase`)
Returns a target phrase to read aloud.
```json
{
  "id": 1,
  "target_phrase": "Guten Morgen!",
  "english": "Good morning!",
  "context": "Greeting someone early in the day",
  "difficulty": "A1"
}
```

### D. NotebookLM Live Feedback (`/api/practice/ask-notebook`)
Returns a structured JSON response from the LLM when providing dynamic "Rule Reveal" feedback.

```json
{
  "feedback_data": {
    "rule_title": "Short title of rule",
    "grammar_formula": [
      {
        "label": "Part of speech / role", 
        "value": "Word in German", 
        "color": "blue | green | slate | pink | orange | purple | red | yellow"
      }
    ],
    "key_vocab": [
      {
        "german": "word in german", 
        "english": "english translation"
      }
    ],
    "exam_cheat_code": {
      "section": "E.g., Hören Part 1, Lesen Part 2, Sprechen, etc.",
      "signal_word": "A specific cue word or grammatical trigger",
      "the_hack": "The action to take when you see/hear the signal",
      "the_trap": "The common trap or distractor they use in the Goethe A1 exam"
    }
  }
}
```

---

## 3. Frontend Mappings (`app.js`)

The `practice.js` and `app.js` files expect these specific variable names to render the dynamic Rule Reveal UI at the bottom of the screen. Pre-generated data MUST map into this standard schema.

*   `options.feedbackData` captures the entire output of `/api/practice/ask-notebook`.

**Array Renderers:**
*   `fb.grammar_formula` (Array) -> Expects items with `.label`, `.value`, and `.color`.
*   `fb.key_vocab` (Array) -> Expects items with `.german` and `.english`.

**Object Checkers (Exam Dashboard):**
*   `fb.exam_cheat_code.section`
*   `fb.exam_cheat_code.signal_word`
*   `fb.exam_cheat_code.the_hack`
*   `fb.exam_cheat_code.the_trap`
