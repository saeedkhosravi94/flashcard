# Anki .apkg File Integration Summary

## Overview
The system now fully supports importing Anki `.apkg` files with complete media support (images and audio).

## Complete Flow

### 1. Frontend Upload
- User selects `.apkg` file in the "Create New Deck" modal
- File input accepts: `.pdf,.txt,.doc,.docx,.csv,.apkg,application/zip`
- For `.apkg` files, the AI config modal is bypassed (same as CSV)
- Loading message shows: "Importing Anki Deck..."

### 2. Backend Processing
1. **File Upload**: `.apkg` file is uploaded to `backend/uploads/` via multer
2. **Python Parser**: Backend calls `python3 backend/services/parse_anki.py <file_path>`
3. **Parser Output**: Python script creates:
   - `<filename>/cards.json` - Contains all cards with front/back content and media references
   - `<filename>/media/images/` - Extracted image files
   - `<filename>/media/audio/` - Extracted audio files
4. **Format Conversion**: Backend reads `cards.json` and converts to database format:
   - `front.content` → `question`
   - `back.content` → `answer`
   - `front.media.images[0]` → `questionImage` (first image)
   - `back.media.images[0]` → `answerImage` (first image)
   - `front.media.audio[0]` → `questionAudio` (first audio)
   - `back.media.audio[0]` → `answerAudio` (first audio)
5. **Media Copying**: Media files are copied from parsed output to:
   - `uploads/anki-media/<deckName>/images/`
   - `uploads/anki-media/<deckName>/audio/`
6. **Path Format**: Media paths stored in database as `/uploads/anki-media/<deckName>/images/<filename>`
7. **Database Save**: FlashcardSet is saved with all cards and media paths
8. **Cleanup**:
   - ✅ Deletes uploaded `.apkg` file
   - ✅ Deletes parsed output directory (`<filename>/` with `cards.json` and `media/` folder)
   - ✅ Keeps media files in `uploads/anki-media/` for serving

### 3. Frontend Display
- **Flashcard Component**: Displays images and audio using `formatImagePath()` helper
- **Review Session**: Displays images and audio with path normalization
- **Media Serving**: Files are served via `/uploads` static route
- **Path Format**: All paths are normalized to start with `/` for proper serving

## File Structure

```
backend/
  services/
    parse_anki.py          # Python script to parse .apkg files
    ankiParserService.js   # Node.js service to call Python and convert format
  uploads/
    anki-media/
      <deckName>/
        images/
          <image files>
        audio/
          <audio files>
```

## Database Schema

Flashcards are stored with:
```javascript
{
  question: "Cleaned HTML content",
  answer: "Cleaned HTML content",
  questionImage: "/uploads/anki-media/deckName/images/file.png",
  answerImage: "/uploads/anki-media/deckName/images/file.png",
  questionAudio: "/uploads/anki-media/deckName/audio/file.mp3",
  answerAudio: "/uploads/anki-media/deckName/audio/file.mp3",
  section: "Anki Import",
  difficulty: "medium"
}
```

## Requirements

1. **Python 3**: Must be installed and available in PATH
2. **Python Script**: `backend/services/parse_anki.py` must be executable
3. **Dependencies**: Python script uses standard library (zipfile, sqlite3, json, pathlib)

## Error Handling

- Python script errors are caught and reported
- Missing media files are logged but don't fail the import
- Cleanup errors are logged but don't fail the import
- Invalid .apkg files return clear error messages

## Testing Checklist

- [ ] Upload .apkg file via frontend
- [ ] Verify deck is created in database
- [ ] Verify cards have correct question/answer
- [ ] Verify images are displayed in Flashcard component
- [ ] Verify audio plays in Flashcard component
- [ ] Verify images are displayed in Review Session
- [ ] Verify audio plays in Review Session
- [ ] Verify .apkg file is deleted after import
- [ ] Verify parsed output directory is deleted after import
- [ ] Verify media files remain in uploads/anki-media/

