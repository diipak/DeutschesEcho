import pypdf
import os

pdf_files = [
    "backend/data/GoetheA1wordlist.pdf",
    "backend/data/KedarJadha750wordslist.pdf"
]

def analyze_page(path, page_num):
    print(f"\n--- Analyzing {path} - Page {page_num} ---")
    try:
        reader = pypdf.PdfReader(path)
        if page_num < len(reader.pages):
            text = reader.pages[page_num].extract_text()
            print(f"Text Length: {len(text)}")
            print(text[:1000]) 
        else:
            print("Page number out of range")
    except Exception as e:
        print(f"Error: {e}")

# Check deeper into Goethe list (e.g. Page 9 for alphabetical list)
analyze_page("backend/data/GoetheA1wordlist.pdf", 8) 

# Check deeper into Kedar list (maybe page 3 or 4)
analyze_page("backend/data/KedarJadha750wordslist.pdf", 2)
analyze_page("backend/data/KedarJadha750wordslist.pdf", 3)
