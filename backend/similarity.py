"""
Semantic similarity checker using sentence-transformers.
Used to validate user answers locally without API calls.
"""

from sentence_transformers import SentenceTransformer, util
from typing import Tuple

# Load a lightweight multilingual model
# This will download ~500MB on first run
model = None


def load_model():
    """Load the sentence transformer model (lazy loading)."""
    global model
    if model is None:
        print("📥 Loading semantic similarity model (first time only)...")
        model = SentenceTransformer('paraphrase-multilingual-MiniLM-L12-v2')
        print("✅ Model loaded successfully")
    return model


def check_similarity(text1: str, text2: str) -> Tuple[float, bool]:
    """
    Check semantic similarity between two German texts.
    
    Args:
        text1: User's answer
        text2: Correct answer
        
    Returns:
        Tuple of (similarity_score, is_correct)
        - similarity_score: 0-100 percentage
        - is_correct: True if similarity >= 85%
    """
    # Clean texts
    text1 = text1.lower().strip()
    text2 = text2.lower().strip()
    
    # Exact match
    if text1 == text2:
        return 100.0, True
    
    # Load model
    sim_model = load_model()
    
    # Compute embeddings
    embeddings = sim_model.encode([text1, text2], convert_to_tensor=True)
    
    # Calculate cosine similarity
    similarity = util.cos_sim(embeddings[0], embeddings[1]).item()
    
    # Convert to percentage
    similarity_percent = similarity * 100
    
    # Consider correct if >= 85% similar
    is_correct = similarity_percent >= 85.0
    
    return round(similarity_percent, 2), is_correct


def check_word_similarity(user_word: str, target_word: str, threshold: float = 90.0) -> bool:
    """
    Check if a single word is similar enough (for vocab checking).
    Higher threshold than full sentences.
    
    Args:
        user_word: Word spoken/typed by user
        target_word: Correct word
        threshold: Minimum similarity percentage (default 90%)
        
    Returns:
        True if similar enough
    """
    score, _ = check_similarity(user_word, target_word)
    return score >= threshold


# Pre-load model on module import (optional - comment out to lazy load)
# Uncomment the line below to preload the model when server starts
# load_model()
