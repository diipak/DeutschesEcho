import pypdf
import os

pdf_files = [
    "backend/data/GoetheA1wordlist.pdf",
    "backend/data/KedarJadha750wordslist.pdf"
]

for pdf_path in pdf_files:
    if os.path.exists(pdf_path):
        print(f"--- Analyzing {pdf_path} ---")
        try:
            reader = pypdf.PdfReader(pdf_path)
            # Read first 2 pages to get a sense of structure
            for i in range(min(2, len(reader.pages))):
                print(f"Page {i+1}:")
                text = reader.pages[i].extract_text()
                print(text[:500]) # First 500 chars
                print("-" * 20)
        except Exception as e:
            print(f"Error reading {pdf_path}: {e}")
    else:
        print(f"File not found: {pdf_path}")
