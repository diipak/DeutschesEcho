"""
Main FastAPI application for DeutschesEcho.
Serves static files and API endpoints.
"""

import os
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from dotenv import load_dotenv
from contextlib import asynccontextmanager

from .database import init_db

# Load environment variables
load_dotenv()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events."""
    # Startup: Initialize database
    print("🚀 Starting DeutschesEcho server...")
    await init_db()
    yield
    # Shutdown
    print("👋 Shutting down server...")


# Create FastAPI app
app = FastAPI(
    title="DeutschesEcho API",
    description="German Learning Platform",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:8000").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API routes
from .routers import vocab, grammar, reading, speaking, user, curriculum, live
app.include_router(vocab.router, prefix="/api/vocab", tags=["Vocabulary"])
app.include_router(grammar.router, prefix="/api/grammar", tags=["Grammar"])
app.include_router(reading.router, prefix="/api/reading", tags=["Reading"])
app.include_router(speaking.router, prefix="/api/speaking", tags=["Speaking"])
app.include_router(user.router, prefix="/api/user", tags=["User"])
app.include_router(curriculum.router)
app.include_router(live.router)


@app.get("/api/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "app": "DeutschesEcho"}


# Mount static files (HTML, CSS, JS, icons)
# This should be last so API routes take precedence
static_path = os.path.join(os.path.dirname(__file__), "..", "static")
if os.path.exists(static_path):
    app.mount("/static", StaticFiles(directory=static_path), name="static")


@app.get("/")
async def root():
    """Serve the main index.html."""
    index_path = os.path.join(static_path, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    return {"message": "DeutschesEcho - Frontend not yet built. Visit /docs for API."}


if __name__ == "__main__":
    import uvicorn
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("backend.main:app", host=host, port=port, reload=True)
