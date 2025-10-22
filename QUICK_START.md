# ⚡ Quick Start - New Features

## 🎯 What You Can Do Now

1. **📚 Upload large documents** - Get hundreds of organized flashcards
2. **📐 Beautiful math equations** - Automatic LaTeX rendering
3. **✍️ Add your own cards** - Full customization with LaTeX support

---

## 🚀 Getting Started (3 Steps)

### Step 1: Install Dependencies
```bash
cd /Users/saeed/Code/flashcard/frontend
npm install
```

### Step 2: Start the App
```bash
# If using Docker:
cd /Users/saeed/Code/flashcard
make dev

# If running manually:
# Terminal 1:
cd /Users/saeed/Code/flashcard/backend && npm start

# Terminal 2:
cd /Users/saeed/Code/flashcard/frontend && npm start
```

### Step 3: Open Your Browser
```
http://localhost:3000
```

---

## 🎬 Try These Features Right Now

### Test 1: Smart Chunking (30 seconds)
1. Upload any PDF (the bigger the better!)
2. Watch the backend console: "Document split into X chunks"
3. See hundreds of flashcards generated (not just 25!)
4. Notice section badges showing which part of the document

### Test 2: LaTeX Rendering (1 minute)
1. Click any flashcard set
2. Click "➕ Add Card" (green button top-right)
3. Enter this question: `What is Einstein's equation?`
4. Enter this answer: `$E = mc^2$ means energy equals mass times the speed of light squared`
5. Click "👁️ Show Preview"
6. See the beautiful equation!
7. Click "✓ Add Card"

### Test 3: Manual Cards (2 minutes)
1. Stay in the same flashcard set
2. Click "➕ Add Card" again
3. Try this physics example:

**Question:**
```
What is Newton's second law?
```

**Answer:**
```
Newton's second law states that $$F = ma$$ where:
- $F$ is the net force
- $m$ is the mass
- $a$ is the acceleration
```

**Section:**
```
Classical Mechanics
```

4. Click "Show Preview" - see both inline and block equations
5. Click "Add Card"
6. Navigate to your new card - it's the last one!

---

## 💡 LaTeX Cheat Sheet

### Quick Examples to Copy-Paste

**Basic Math:**
```
Pythagorean theorem: $a^2 + b^2 = c^2$
```

**Fractions:**
```
The golden ratio: $\phi = \frac{1 + \sqrt{5}}{2}$
```

**Chemistry:**
```
Water molecule: $H_2O$
Photosynthesis: $6CO_2 + 6H_2O \rightarrow C_6H_{12}O_6 + 6O_2$
```

**Physics:**
```
Kinetic energy: $$KE = \frac{1}{2}mv^2$$
```

**Calculus:**
```
Derivative of sine: $\frac{d}{dx}\sin(x) = \cos(x)$
```

Just copy any of these into the question or answer field!

---

## 📊 What Changed from Before?

| What | Before | After |
|------|--------|-------|
| **400-page book** | 25 cards | 500+ cards |
| **Math equations** | Plain text | Beautiful LaTeX |
| **Add your cards** | ❌ Can't | ✅ Yes! |
| **Organization** | None | Section badges |

---

## 🎓 Real Example Workflow

**Scenario:** Studying for Calculus Midterm

1. **Upload** your calculus textbook PDF
2. **Wait** 2-3 minutes for processing
3. **Get** 400+ flashcards with LaTeX equations
4. **Review** flashcards organized by chapter
5. **Add** 15 practice problems from homework
6. **Use** LaTeX for all formulas
7. **Download** CSV to import into Anki
8. **Study** anywhere!

---

## 🆘 Quick Help

**LaTeX not showing?**
```bash
cd /Users/saeed/Code/flashcard/frontend
npm install
# Then restart the app and hard refresh browser (Cmd+Shift+R)
```

**Add Card button not there?**
- Make sure you opened a flashcard set (not the dashboard)
- Make sure backend is running

**Need more examples?**
- Click "Add Card" button
- Click "📚 LaTeX Quick Reference" at the bottom
- See tons of examples!

---

## 📚 Full Documentation

- **Complete guide:** `LATEX_AND_MANUAL_CARDS.md`
- **Chunking details:** `INTELLIGENT_CHUNKING_FEATURE.md`
- **Testing guide:** `TESTING_LARGE_DOCUMENTS.md`
- **Installation:** `INSTALLATION_INSTRUCTIONS.md`
- **Overview:** `NEW_FEATURES_SUMMARY.md`

---

## ✨ Pro Tips

1. **Large PDFs are now GOOD** - Upload entire textbooks!
2. **Preview is your friend** - Always preview LaTeX before adding
3. **Sections organize everything** - Use them!
4. **Mix AI + Manual** - Best of both worlds
5. **CSV export is powerful** - Works with Anki, Quizlet, etc.

---

## 🎉 You're Ready!

**Everything is installed and ready to use.**

Try uploading a textbook or creating a manual card right now!

Need help? All the documentation is in the project folder.

Happy studying! 📖✨

