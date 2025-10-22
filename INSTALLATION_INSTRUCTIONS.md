# Installation Instructions - Updated Features

## Quick Setup for New Features

If you already have the flashcard app installed, follow these steps to add LaTeX rendering and manual card addition:

### 1. Install Frontend Dependencies

```bash
cd /Users/saeed/Code/flashcard/frontend
npm install
```

This will install the new dependencies from the updated `package.json`:
- `katex@^0.16.9` - LaTeX rendering engine
- `react-katex@^3.0.1` - React bindings for KaTeX

### 2. Restart the Application

#### If using Docker:
```bash
cd /Users/saeed/Code/flashcard
make dev
```

#### If running manually:

**Terminal 1 - Backend:**
```bash
cd /Users/saeed/Code/flashcard/backend
npm start
```

**Terminal 2 - Frontend:**
```bash
cd /Users/saeed/Code/flashcard/frontend
npm start
```

### 3. Verify Installation

1. **Open the app** in your browser (usually http://localhost:3000)

2. **Test LaTeX rendering:**
   - Upload a PDF with math content, OR
   - Click any flashcard set
   - Click "➕ Add Card"
   - Enter: Question: `What is $E = mc^2$?`
   - Enter: Answer: `Energy equals mass times the speed of light squared`
   - Click "Show Preview" - you should see the equation rendered

3. **Test manual card addition:**
   - Click "Add Card" button
   - Fill in the form
   - Click "✓ Add Card"
   - Verify the card appears in your collection

### 4. Troubleshooting

#### If npm install fails:
```bash
cd /Users/saeed/Code/flashcard/frontend
rm -rf node_modules package-lock.json
npm install
```

#### If LaTeX doesn't render:
1. Hard refresh your browser (Cmd+Shift+R on Mac, Ctrl+Shift+R on Windows)
2. Clear browser cache
3. Check browser console for errors
4. Verify katex CSS is loading (should see math fonts)

#### If "Add Card" button doesn't appear:
1. Make sure you're on a flashcard set page (not the dashboard)
2. Check backend is running (http://localhost:5000/api/flashcards should return data)
3. Check browser console for JavaScript errors

---

## Fresh Installation (From Scratch)

If you're setting up the entire project for the first time:

### Prerequisites
- Node.js (v14 or higher)
- MongoDB (running locally or cloud instance)
- npm or yarn

### Step 1: Clone and Setup

```bash
cd /Users/saeed/Code/flashcard

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### Step 2: Environment Setup

Create `backend/.env`:
```env
GEMINI_API_KEY=your_gemini_api_key_here
MONGODB_URI=mongodb://localhost:27017/flashcards
PORT=5000
```

### Step 3: Start Services

**Terminal 1 - MongoDB:**
```bash
mongod --dbpath /path/to/your/db
```

**Terminal 2 - Backend:**
```bash
cd /Users/saeed/Code/flashcard/backend
npm start
```

**Terminal 3 - Frontend:**
```bash
cd /Users/saeed/Code/flashcard/frontend
npm start
```

### Step 4: Verify Everything Works

1. **Backend:** http://localhost:5000/api/flashcards (should return [])
2. **Frontend:** http://localhost:3000 (should show upload interface)
3. **Upload a PDF** to test AI generation
4. **Click "Add Card"** to test manual addition
5. **Look for LaTeX** in any math/science flashcards

---

## Docker Installation

### Using Docker Compose

```bash
cd /Users/saeed/Code/flashcard

# Build and start all services
docker-compose up --build

# Or use the Makefile
make dev
```

The app will be available at:
- Frontend: http://localhost:3000
- Backend: http://localhost:5000
- MongoDB: localhost:27017

---

## Package Details

### New Frontend Dependencies

```json
{
  "katex": "^0.16.9",
  "react-katex": "^3.0.1"
}
```

**katex:** Fast math rendering library
- Size: ~300KB (minified)
- Supports all standard LaTeX math commands
- Server-side rendering capable
- No external dependencies

**react-katex:** React wrapper for KaTeX
- Makes integration with React simple
- Handles component lifecycle
- Provides error boundaries

### Existing Dependencies (No Changes)

Backend:
- express
- mongoose
- multer
- pdf-parse
- @google/generative-ai

Frontend:
- react
- react-dom
- axios

---

## File Structure After Installation

```
flashcard/
├── backend/
│   ├── routes/
│   │   └── flashcards.js (✨ UPDATED - add/edit/delete card endpoints)
│   ├── services/
│   │   ├── contentChunker.js (✨ NEW)
│   │   ├── fileParser.js (✨ UPDATED)
│   │   └── geminiService.js (✨ UPDATED - LaTeX prompts)
│   └── ...
├── frontend/
│   ├── package.json (✨ UPDATED - new dependencies)
│   ├── src/
│   │   └── components/
│   │       ├── AddCardForm.js (✨ NEW)
│   │       ├── AddCardForm.css (✨ NEW)
│   │       ├── LatexRenderer.js (✨ NEW)
│   │       ├── Flashcard.js (✨ UPDATED)
│   │       ├── Flashcard.css (✨ UPDATED)
│   │       ├── FlashcardViewer.js (✨ UPDATED)
│   │       └── FlashcardViewer.css (✨ UPDATED)
│   └── ...
└── Documentation/
    ├── LATEX_AND_MANUAL_CARDS.md (✨ NEW)
    ├── INTELLIGENT_CHUNKING_FEATURE.md (✨ NEW)
    └── TESTING_LARGE_DOCUMENTS.md (✨ NEW)
```

---

## Verification Checklist

After installation, verify:

- [ ] Backend starts without errors
- [ ] Frontend starts without errors
- [ ] MongoDB connection successful
- [ ] Can upload PDF files
- [ ] AI generates flashcards with LaTeX (for math content)
- [ ] Can view flashcards
- [ ] LaTeX renders correctly (equations look proper, not raw text)
- [ ] "Add Card" button appears in viewer
- [ ] Can open Add Card form
- [ ] Preview shows LaTeX rendering
- [ ] Can submit new cards
- [ ] New cards appear in collection
- [ ] Can download CSV with all cards
- [ ] CSV includes section information

---

## Getting Help

If you encounter issues:

1. **Check the logs:**
   - Backend: Terminal running `npm start`
   - Frontend: Browser console (F12)
   - Network tab for API calls

2. **Common issues:**
   - Port conflicts: Change ports in .env
   - MongoDB not running: Start MongoDB service
   - Missing dependencies: Run `npm install` again
   - LaTeX not rendering: Hard refresh browser

3. **Documentation:**
   - LaTeX support: See `LATEX_AND_MANUAL_CARDS.md`
   - Chunking feature: See `INTELLIGENT_CHUNKING_FEATURE.md`
   - Testing: See `TESTING_LARGE_DOCUMENTS.md`

---

## What's New Summary

✅ **LaTeX Rendering** - Math equations display beautifully  
✅ **Manual Card Addition** - Add your own flashcards  
✅ **Intelligent Chunking** - Better handling of large documents  
✅ **Section Organization** - Cards grouped by topics  
✅ **Live Preview** - See cards before adding them  

Enjoy your enhanced flashcard app! 🎓

