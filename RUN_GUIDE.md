# 🏃 Running DeutschesEcho

Follow these steps to get the application up and running on your local machine.

## 1. Environment Setup
We use `uv` for lightning-fast Python dependency management.

```bash
# Create a virtual environment
uv venv

# Activate it
source .venv/bin/activate  # On macOS/Linux
# .venv\Scripts\activate   # On Windows
```

## 2. Install Dependencies
```bash
uv pip install -r requirements.txt
```

## 3. Configuration
1.  Copy the example environment file:
    ```bash
    cp .env.example .env
    ```
2.  Open `.env` and add your **Gemini API Key**:
    ```env
    GEMINI_API_KEY=AIzaSy...
    ```

## 4. Initialize the Database
The app uses a local SQLite database (`german_tutor.db`). To seed it with the curriculum and vocabulary data:

```bash
# Seed the core vocabulary and grammar drills
python3 seed_db.py

# Seed the structured 14-chapter curriculum
python3 backend/seed_curriculum.py
```

## 5. Start the Server
Run the FastAPI backend:

```bash
python3 -m backend.main
```

The app will be available at: **[http://localhost:8000](http://localhost:8000)**

---

### 💡 Pro Tips
- **PWA Installation**: Open the link in Chrome (Android/Desktop) or Safari (iOS) and select "Add to Home Screen" to use it as a standalone app.
- **Offline Mode**: Once you've loaded a chapter or vocabulary set, it's cached locally so it works even without an internet connection.
- **Development**: If you're editing code, run with auto-reload:
  ```bash
  uvicorn backend.main:app --reload
  ```
