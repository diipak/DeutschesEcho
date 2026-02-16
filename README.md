# DeutschesEcho - German Learning App

A progressive web application (PWA) for learning German with AI-powered content generation and intelligent spaced repetition.

## 🚀 Features

- **Vocabulary Cards** - Tinder-style swipe interface with spaced repetition
- **Grammar Builder** - Sentence construction with instant feedback
- **Reading Comprehension** - A1-level texts with questions
- **Speaking Practice** - Voice recognition with semantic similarity checking
- **AI Tutor Chat** - Powered by Google Gemini
- **Mock Exams** - Infinite exam generation
- **PWA Support** - Install on iOS/Android as native app
- **Offline Mode** - Works without internet (cached content)

## 📋 Prerequisites

- Python 3.11+ with `uv` package manager
- Google Gemini API key ([Get one here](https://aistudio.google.com/apikey))
- Modern browser (Chrome/Safari for PWA features)

## 🛠️ Setup Instructions

### 1. Clone and Navigate
```bash
cd /path/to/DeutschesEcho
```

### 2. Create Virtual Environment
```bash
uv venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
```

### 3. Install Dependencies
```bash
uv pip install -r requirements.txt
```

### 4. Configure Environment
```bash
cp .env.example .env
```

**IMPORTANT:** Edit `.env` and paste your Gemini API key:
```env
GEMINI_API_KEY=your_actual_api_key_here
```

### 5. Run the Server
```bash
python -m backend.main
```

The server will start at `http://localhost:8000`

## 📱 Installing as PWA

### iOS (Safari)
1. Open `http://localhost:8000` in Safari
2. Tap the Share button
3. Select "Add to Home Screen"
4. Tap "Add"

### Android (Chrome)
1. Open the URL in Chrome
2. Tap the menu (three dots)
3. Select "Install app" or "Add to Home Screen"

## 🧪 Testing the API

### Health Check
```bash
curl http://localhost:8000/api/health
```

### Generate Vocabulary
```bash
curl -X POST "http://localhost:8000/api/vocab/generate?topic=Food&count=50"
```

### Get Next Vocab Card
```bash
curl "http://localhost:8000/api/vocab/next?topic=Food"
```

### View API Documentation
Open `http://localhost:8000/docs` in your browser for interactive API documentation.

## 🗂️ Project Structure

```
DeutschesEcho/
├── backend/
│   ├── main.py           # FastAPI app
│   ├── database.py       # SQLite connection
│   ├── models.py         # Database schema
│   ├── ai_engine.py      # Gemini batch generation
│   ├── similarity.py     # Local semantic checker
│   └── routers/          # API endpoints
│       ├── vocab.py
│       ├── grammar.py
│       ├── reading.py
│       ├── speaking.py
│       └── user.py
├── static/
│   ├── index.html        # PWA frontend
│   ├── manifest.json     # PWA config
│   ├── service-worker.js # Offline support
│   ├── css/
│   │   └── styles.css
│   └── js/
│       └── modules/      # ES6 modules
├── .env                  # Environment variables (NOT in git)
├── german_tutor.db       # SQLite database (created on first run)
└── requirements.txt      # Python dependencies
```

## 🎯 Usage Tips

### Cost Optimization
- Content is generated in batches of 50 items
- First generation takes 30-60 seconds
- Subsequent usage serves from cache (no API calls)
- Similarity checking is 100% local (no tokens used)

### Multi-User Support (Future)
The database schema is designed to support multiple users. Currently running in single-user mode (user_id=1).

## 🔧 Development

### Run with Auto-Reload
```bash
uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
```

### Access Logs
The server prints initialization and generation logs to console.

## 📝 License

MIT License - Feel free to use for personal or commercial projects.

## 🙏 Credits

- **AI**: Google Gemini 2.0 Flash
- **Semantic Similarity**: sentence-transformers (paraphrase-multilingual-MiniLM-L12-v2)
- **Framework**: FastAPI
- **Frontend**: Vanilla JS + TailwindCSS

## 📚 Credits & Acknowledgments

This application was built as a personal study tool to accompany the learning materials from the following excellent resources. The code structure is original, but the curriculum logic is based on:

* **Learn German with Kedar Jadhav:** The "Cheat Codes" and grammar logic (Accusative/Dative triggers) are inspired by his teaching methods. [Watch his Channel here](https://www.youtube.com/c/learngermanwithkedarjadhav).
* **Learn German Step by Step:** The structured A1 curriculum path is based on their "9.5 Hour Complete Course." [Watch the full course here](https://www.youtube.com/@FiveMinuteGerman).
* **Goethe Institut:** Vocabulary standards align with the official A1 Wordlist.

**Disclaimer:**
This project is for **educational purposes only**. It is a study companion and is not affiliated with, endorsed by, or connected to the creators mentioned above. All course content, audio transcripts, and teaching methodologies belong to their respective copyright holders. If you are using this app, please support the original creators by watching their videos and purchasing their official materials.
