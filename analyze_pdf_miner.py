from pdfminer.high_level import extract_text

def analyze_pdf_miner(path):
    print(f"\n--- Analyzing {path} with pdfminer.six ---")
    try:
        text = extract_text(path, maxpages=5)
        print(f"Text Length: {len(text)}")
        print(text[:1000])
    except Exception as e:
        print(f"Error: {e}")

analyze_pdf_miner("backend/data/KedarJadha750wordslist.pdf")
