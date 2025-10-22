# Testing the Intelligent Chunking Feature

## Quick Start

The intelligent chunking feature is now active! Here's how to test it:

### 1. Start the Application

```bash
# If using Docker:
make dev

# Or manually:
cd backend && npm install && npm start
cd frontend && npm install && npm start
```

### 2. Upload a Large Document

**Best test documents:**
- Educational textbooks (100+ pages)
- Technical manuals
- Academic papers
- Books with clear chapter structure

**What to expect:**
- Small files (< 10 pages): 15-50 flashcards (fast, < 10 seconds)
- Medium files (10-50 pages): 50-200 flashcards (moderate, 15-30 seconds)
- Large files (100+ pages): 200-600+ flashcards (slower, 1-5 minutes)
- Very large files (400+ pages): 400-1000+ flashcards (may take 5-10 minutes)

### 3. Monitor Progress

Check the **backend console** for detailed progress:

```
Processing file: Machine_Learning_Book.pdf (application/pdf)
Extracted 245678 characters from 412 pages
Document split into 28 intelligent chunks

Processing chunk 1/28: "Chapter 1: Introduction" (7823 chars, targeting 31 cards)
Generated 28 flashcards for "Chapter 1: Introduction"

Progress: 1/28 - Chapter 1: Introduction - Total cards: 28
Processing chunk 2/28: "Chapter 2: Supervised Learning" (8156 chars, targeting 33 cards)
Generated 30 flashcards for "Chapter 2: Supervised Learning"

Progress: 2/28 - Chapter 2: Supervised Learning - Total cards: 58
...

Total flashcards generated: 847 from 28 chunks
Successfully created flashcard set: Machine_Learning_Book with 847 cards
```

### 4. Review Results

**In the Flashcard Viewer:**
- You'll see section badges (e.g., "📍 Chapter 1: Introduction")
- Navigate through all flashcards
- Notice how cards are organized by topics

**Download CSV:**
- Click "Download CSV" button
- Open in spreadsheet software
- See the new "Section" column organizing flashcards

## Example Output Structure

### CSV Format
```csv
Section,Question,Answer
"Chapter 1: Introduction","What is machine learning?","Machine learning is a subset of artificial intelligence..."
"Chapter 1: Introduction","What are the three types of ML?","Supervised, unsupervised, and reinforcement learning."
"Chapter 2: Supervised Learning","What is a decision tree?","A decision tree is a flowchart-like structure..."
"Chapter 2: Supervised Learning","How does gradient descent work?","Gradient descent iteratively adjusts parameters..."
```

## Comparing Before vs After

### Before (Old System)
```
📄 Upload: machine_learning_book.pdf (400 pages)
⏱️  Processing: 5 seconds
📊 Result: 25 flashcards
❌ Problem: Extremely limited coverage
```

### After (New System)
```
📄 Upload: machine_learning_book.pdf (400 pages)
⏱️  Processing: 3-5 minutes
📊 Result: 847 flashcards from 28 sections
✅ Success: Comprehensive coverage of all topics
```

## Testing Checklist

- [ ] Upload a small PDF (< 10 pages)
  - Should complete quickly
  - Should generate proportional flashcards
  
- [ ] Upload a medium PDF (20-50 pages)
  - Should show progress in console
  - Should generate 50-200 flashcards
  
- [ ] Upload a large PDF (100+ pages)
  - Should show "Large documents may take several minutes" message
  - Should see section badges in viewer
  - Should generate 200+ flashcards
  
- [ ] Upload a book with clear chapters
  - Section names should match chapter titles
  - Flashcards should be organized by chapter
  
- [ ] Download CSV
  - Should include "Section" column
  - Should be importable to Anki/Quizlet
  
- [ ] Check error handling
  - Upload corrupted PDF → should show clear error
  - Upload empty file → should show validation error

## Performance Notes

### Processing Time Estimation
- ~1 second per chunk (with API delay)
- Small doc (1-3 chunks): 3-5 seconds
- Medium doc (5-10 chunks): 10-20 seconds
- Large doc (20-30 chunks): 30-60 seconds
- Very large doc (50+ chunks): 1-3 minutes

### Rate Limiting
The system includes a 1-second delay between chunks to:
- Prevent API rate limiting
- Ensure stable processing
- Avoid overwhelming the Gemini API

If you need faster processing and have higher API limits, you can reduce the delay in:
`backend/services/geminiService.js` → `delay(1000)` → change to `delay(500)`

## Troubleshooting

### "Only getting 25 flashcards still"
- Check backend console for chunk processing logs
- Verify `contentChunker.js` exists in `backend/services/`
- Restart backend server
- Clear browser cache

### "Processing takes too long"
- This is normal for large documents
- Each chunk takes ~1-2 seconds
- 400-page book = ~30 chunks = ~1 minute is expected
- Check console for progress

### "Some sections failed to process"
- The system continues even if some chunks fail
- Check console for specific error messages
- You'll still get flashcards from successful chunks
- May indicate content that's difficult for AI to parse

### "Section badges not showing"
- Older flashcard sets won't have section metadata
- Only new uploads after this update will show sections
- Re-upload documents to get section organization

## Sample Test Document

If you don't have a large PDF handy, you can:
1. Find free textbooks at: https://openstax.org/
2. Use Project Gutenberg books: https://www.gutenberg.org/
3. Download academic papers from arXiv: https://arxiv.org/

## What Success Looks Like

✅ **Good Result:**
- Large document generates 100+ flashcards
- Console shows chunk-by-chunk progress
- Section badges appear in viewer
- CSV has section organization
- Flashcards cover diverse topics from the document

❌ **Issues to Report:**
- Still only getting 25 flashcards for large documents
- No section badges showing
- CSV missing section column
- Errors during chunk processing
- System crashes on large files

## Next Steps

If everything works correctly:
1. Test with your actual study materials
2. Export flashcards to your preferred study tool
3. Enjoy comprehensive coverage of large documents!

If you encounter issues:
1. Check backend console logs
2. Verify all new files are present
3. Restart the application
4. Check this document's troubleshooting section

