# Intelligent Chunking Feature for Large Documents

## Overview

This update dramatically improves flashcard generation for large documents (like 400+ page books) by implementing an **intelligent content chunking system**. Instead of generating only 25 flashcards from an entire book, the system now:

1. **Divides documents into logical sections** (chapters, topics, etc.)
2. **Generates flashcards for each section separately**
3. **Scales flashcard count with document size**
4. **Adds section metadata** to track which part of the document each flashcard comes from

## What Changed

### Before
- **Problem**: 400-page book → only 25 flashcards
- All content sent to AI as one large blob
- Fixed flashcard count (15-25) regardless of document size
- No section/topic organization
- Limited coverage of content

### After
- **Solution**: 400-page book → potentially 200-500+ flashcards (depending on content)
- Content intelligently split into chunks by topics/chapters
- Dynamic flashcard count (~1 flashcard per 200-300 characters)
- Section metadata on every flashcard
- Comprehensive coverage of all topics

## How It Works

### 1. **Intelligent Content Analysis** (`contentChunker.js`)

The system automatically detects:
- Chapter boundaries (Chapter 1, Chapter 2, etc.)
- Section markers (Section, Part, Unit)
- Heading patterns (Markdown headers, ALL CAPS headings)
- Numbered sections (1. Introduction, 2. Methods)

If no clear structure is found, it uses intelligent size-based chunking with proper paragraph breaks.

### 2. **Optimal Chunk Sizing**

- **Minimum chunk**: 2,000 characters
- **Target chunk**: 8,000 characters
- **Maximum chunk**: 15,000 characters
- **Overlap**: 500 characters between chunks for context continuity

Large sections are automatically split into manageable parts while maintaining coherence.

### 3. **Batch Processing** (`geminiService.js`)

Each chunk is processed separately with Gemini AI:
- Calculates optimal flashcard count per chunk
- Generates 10-50 flashcards per chunk (based on content length)
- Adds section metadata to every flashcard
- Includes 1-second delays between API calls to avoid rate limits
- Continues processing even if one chunk fails

### 4. **Enhanced Output**

**CSV Export** now includes section information:
```csv
Section,Question,Answer
"Chapter 1: Introduction","What is the main topic?","..."
"Chapter 1: Introduction","How does X work?","..."
"Chapter 2: Methods","What technique is used for Y?","..."
```

**Flashcard Viewer** displays section badges showing which part of the document each card is from.

## File Changes

### Backend
1. **`services/fileParser.js`** - Now returns metadata (page count, document info)
2. **`services/contentChunker.js`** - NEW: Intelligent chunking logic
3. **`services/geminiService.js`** - Batch processing, dynamic card counts
4. **`routes/flashcards.js`** - Orchestrates chunking and batch processing

### Frontend
1. **`components/Dashboard.js`** - Updated loading messages for large documents
2. **`components/FlashcardViewer.js`** - Displays section badges
3. **CSS updates** - Styling for section badges and loading text

## Expected Results

### Small Documents (< 5 pages)
- **Before**: 15-25 flashcards
- **After**: 15-25 flashcards (no change, works efficiently as-is)

### Medium Documents (10-50 pages)
- **Before**: 20-25 flashcards
- **After**: 50-200 flashcards (better coverage)

### Large Documents (100+ pages)
- **Before**: 25 flashcards (inadequate)
- **After**: 200-500+ flashcards (comprehensive coverage)

### Example: 400-Page Book
- **Content**: ~200,000 characters
- **Chunks**: ~25-30 intelligent sections
- **Flashcards**: ~300-600 cards total
- **Processing time**: 30-60 seconds (with 1s delays between chunks)

## Benefits

1. ✅ **Comprehensive Coverage** - No more missing important topics
2. ✅ **Topic Organization** - Flashcards organized by book sections
3. ✅ **Scalable** - Automatically adjusts to document size
4. ✅ **Robust** - Continues even if some sections fail to process
5. ✅ **Smart** - Detects natural document structure
6. ✅ **Exportable** - CSV includes section metadata for external tools

## User Experience

### Upload Process
1. Upload large PDF (e.g., 400 pages)
2. System shows: "Processing large document - this may take several minutes..."
3. Backend logs progress: "Processing chunk 5/28 - Chapter 3 - Total cards: 85"
4. When complete: "Successfully generated 420 flashcards from 28 sections"

### Viewing Flashcards
- Each card shows a **section badge** (e.g., "📍 Chapter 3: Neural Networks")
- Navigate through cards with arrow keys
- Progress bar shows position in full set
- CSV export organizes by section

## Technical Details

### Chunking Algorithm
```
1. Parse document → extract text + metadata
2. Detect section boundaries:
   - Look for chapter/section markers
   - Find heading patterns
   - Identify structural breaks
3. Refine chunks:
   - Merge too-small chunks
   - Split too-large chunks
   - Maintain min/max constraints
4. Add overlap for context
5. Return array of chunk objects with metadata
```

### Flashcard Generation
```
For each chunk:
  1. Calculate target flashcard count (~1 per 250 chars)
  2. Generate flashcards with Gemini AI
  3. Add section metadata to each card
  4. Aggregate with other chunks
  5. Delay 1s before next chunk (rate limiting)
```

### Error Handling
- Individual chunk failures don't stop the entire process
- Skipped chunks are logged with error details
- Final result includes all successful chunks
- User gets partial results even if some chunks fail

## Configuration

To adjust chunking behavior, edit `backend/services/contentChunker.js`:

```javascript
this.config = {
  minChunkSize: 2000,        // Minimum characters per chunk
  maxChunkSize: 15000,       // Maximum characters per chunk
  targetChunkSize: 8000,     // Target chunk size
  overlapSize: 500,          // Context overlap between chunks
};
```

To adjust flashcard density, edit `calculateFlashcardsPerChunk`:
```javascript
// Current: ~1 flashcard per 250 characters
const baseCount = Math.ceil(charCount / 250);
```

## Future Enhancements

Potential improvements:
- [ ] Real-time progress updates via WebSockets/SSE
- [ ] Parallel chunk processing (with rate limit management)
- [ ] User-configurable flashcard density
- [ ] Section-based filtering in viewer
- [ ] Auto-detect optimal chunk size per document type
- [ ] Support for image-based PDFs with OCR

## Summary

This feature transforms the flashcard generation system from a basic "one-size-fits-all" approach to an **intelligent, scalable, section-aware system** that properly handles documents of any size. A 400-page book now generates hundreds of well-organized flashcards instead of just 25, making the tool practical for serious study of large educational materials.

