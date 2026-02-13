import pypdf
import os
import json
import re

def extract_goethe_words(pdf_path):
    reader = pypdf.PdfReader(pdf_path)
    extracted_data = []
    
    # Goethe list starts around page 9 (index 8)
    # Pattern: Bold word (often with article) followed by example sentence
    # However, pypdf extracts plain text, so bold formatting is lost.
    # We need to rely on the layout properties or heurisitcs.
    # Looking at the sample:
    # "ab Ab morgen muss ich arbeiten."
    # "aber Ich bin oft im Büro, aber nur für wenige Stunden."
    # "abfahren Wir fahren um zwölf Uhr ab."
    # "die Abfahrt Vor der Abfahrt rufe ich an."
    
    # Heuristic: The first word (or "der/die/das" + word) is the vocab item.
    # The rest is the example.
    
    vocab_list = []
    
    for page_index in range(8, len(reader.pages)):
        text = reader.pages[page_index].extract_text()
        lines = text.split('\n')
        
        for line in lines:
            line = line.strip()
            if not line:
                continue
                
            # Skip page headers/footers
            if line.startswith("VS_") or line.isdigit() or line == "WORTLISTE":
                continue
                
            # Clean tabs and multiple spaces
            line = re.sub(r'\s+', ' ', line).strip()
            
            # Basic parsing logic
            # Attempt to split into Word and Example
            # Case 1: "die Adresse,-en Können Sie mir seine Adresse sagen?"
            # Case 2: "ab Ab morgen muss ich arbeiten."
            
            parts = line.split(' ', 1)
            if len(parts) < 2:
                continue
                
            word_part = parts[0]
            rest = parts[1]
            
            # Handle articles: "der", "die", "das"
            if word_part in ["der", "die", "das"] and len(rest.split(' ', 1)) > 1:
                subparts = rest.split(' ', 1)
                word_part = f"{word_part} {subparts[0]}"
                example = subparts[1]
            else:
                example = rest
                
            # Clean up punctuation from word (e.g., "Adresse,-en")
            # Also remove trailing comma or hyphen used for plural
            clean_word = word_part.split(',')[0].replace('-', '').strip()
             
            # Guess gender
            gender = "unknown"
            if clean_word.startswith("der "): gender = "masculine"
            elif clean_word.startswith("die "): gender = "feminine"
            elif clean_word.startswith("das "): gender = "neutral"
            
            # Only add likely valid items
            if len(clean_word) > 1:
                item = {
                    "german": clean_word,
                    "english": "", # PDF doesn't have English translations! content is German-only?
                    "gender": gender,
                    "example": example,
                    "pronunciation_tip": "",
                    "source": "Goethe A1"
                }
                vocab_list.append(item)
                
    return vocab_list

if __name__ == "__main__":
    path = "backend/data/GoetheA1wordlist.pdf"
    if os.path.exists(path):
        data = extract_goethe_words(path)
        print(f"Extracted {len(data)} items")
        with open("backend/data/goethe_parsed.json", "w") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        # Print sample
        print(json.dumps(data[:5], indent=2, ensure_ascii=False))
    else:
        print("File not found")
