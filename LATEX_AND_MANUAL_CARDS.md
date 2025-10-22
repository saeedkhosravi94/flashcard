# LaTeX Rendering & Manual Card Addition Features

## Overview

Two powerful new features have been added to the flashcard application:

1. **LaTeX Rendering** - Full support for mathematical and scientific notation
2. **Manual Card Addition** - Create and add your own custom flashcards to any collection

---

## Feature 1: LaTeX Rendering

### What is LaTeX Support?

The application now automatically renders mathematical and scientific notation using LaTeX, making it perfect for:
- Mathematics courses (calculus, algebra, statistics)
- Physics and chemistry
- Computer science (algorithms, notation)
- Any subject with formulas and equations

### How It Works

#### AI-Generated Content
When you upload a PDF with mathematical content, Gemini AI will automatically:
- Detect mathematical expressions
- Format them using LaTeX notation
- Generate flashcards with properly rendered equations

#### Example AI-Generated Cards:

**Question:** What is the quadratic formula?

**Answer:** The quadratic formula is $$x = \frac{-b \pm \sqrt{b^2-4ac}}{2a}$$ where $a$, $b$, and $c$ are coefficients of the quadratic equation $ax^2 + bx + c = 0$.

**Question:** What is Einstein's mass-energy equivalence?

**Answer:** $E = mc^2$ states that energy ($E$) equals mass ($m$) times the speed of light squared ($c^2$).

### LaTeX Syntax Reference

#### Inline Math (within text)
Use `$...$` for inline equations:
- `$E = mc^2$` → $E = mc^2$
- `$x^2 + y^2 = z^2$` → $x^2 + y^2 = z^2$
- `$\alpha + \beta = \gamma$` → $\alpha + \beta = \gamma$

#### Display Math (block equations)
Use `$$...$$` for centered block equations:
```latex
$$\frac{-b \pm \sqrt{b^2-4ac}}{2a}$$
```

#### Common LaTeX Commands

| What You Want | LaTeX Code | Result |
|---------------|------------|--------|
| Fractions | `$\frac{a}{b}$` | a/b |
| Square root | `$\sqrt{x}$` | √x |
| Exponents | `$x^2$` | x² |
| Subscripts | `$H_2O$` | H₂O |
| Greek letters | `$\alpha, \beta, \gamma$` | α, β, γ |
| Summation | `$\sum_{i=1}^{n} x_i$` | Σ from i=1 to n of x_i |
| Integrals | `$\int_0^1 f(x)dx$` | ∫₀¹ f(x)dx |
| Limits | `$\lim_{x \to \infty} f(x)$` | lim as x→∞ of f(x) |
| Matrix | `$\begin{matrix} a & b \\ c & d \end{matrix}$` | 2×2 matrix |

### Files Modified for LaTeX Support

**Backend:**
- `backend/services/geminiService.js` - Updated prompt to request LaTeX formatting

**Frontend:**
- `frontend/package.json` - Added KaTeX dependencies
- `frontend/src/components/LatexRenderer.js` - NEW: LaTeX rendering component
- `frontend/src/components/Flashcard.js` - Uses LatexRenderer
- `frontend/src/components/Flashcard.css` - LaTeX styling

---

## Feature 2: Manual Card Addition

### What Can You Do?

Now you can:
- ✅ Add your own custom flashcards to any collection
- ✅ Use LaTeX in your manual cards
- ✅ Preview cards before adding them
- ✅ Organize cards with custom sections/categories
- ✅ Edit existing cards (via API)
- ✅ Delete cards (via API)

### How to Add Cards

1. **Open any flashcard set** in the viewer
2. **Click the "➕ Add Card" button** at the top
3. **Fill in the form:**
   - Question field (supports LaTeX)
   - Answer field (supports LaTeX)
   - Section/Category (optional)
4. **Click "👁️ Show Preview"** to see how it will look
5. **Click "✓ Add Card"** to save it

### Creating Cards with LaTeX

The form includes a built-in LaTeX preview and quick reference guide.

**Example: Physics Card**

```
Question: What is Newton's second law?
Answer: Newton's second law states that $F = ma$, where $F$ is force, $m$ is mass, and $a$ is acceleration. This means force equals mass times acceleration.
Section: Classical Mechanics
```

**Example: Chemistry Card**

```
Question: What is the molecular formula for water?
Answer: Water has the molecular formula $H_2O$, consisting of two hydrogen atoms bonded to one oxygen atom.
Section: Basic Chemistry
```

**Example: Calculus Card**

```
Question: What is the derivative of $\sin(x)$?
Answer: The derivative of $\sin(x)$ is $\cos(x)$. This can be proven using the limit definition: $$\frac{d}{dx}\sin(x) = \lim_{h \to 0} \frac{\sin(x+h) - \sin(x)}{h} = \cos(x)$$
Section: Derivatives
```

### The Add Card Form Features

1. **Live LaTeX Preview** - See exactly how your card will render
2. **LaTeX Quick Reference** - Expandable guide with common commands
3. **Section Organization** - Tag cards with custom categories
4. **Validation** - Ensures both question and answer are provided
5. **Auto-navigation** - Automatically jumps to your new card after adding

### API Endpoints

The following endpoints are now available:

#### Add a Card
```http
POST /api/flashcards/:id/cards
Content-Type: application/json

{
  "question": "What is $E = mc^2$?",
  "answer": "Einstein's mass-energy equivalence",
  "section": "Physics"
}
```

#### Update a Card
```http
PUT /api/flashcards/:id/cards/:cardIndex
Content-Type: application/json

{
  "question": "Updated question",
  "answer": "Updated answer",
  "section": "Updated section"
}
```

#### Delete a Card
```http
DELETE /api/flashcards/:id/cards/:cardIndex
```

### Files Modified for Manual Cards

**Backend:**
- `backend/routes/flashcards.js` - Added POST, PUT, DELETE endpoints for cards

**Frontend:**
- `frontend/src/components/AddCardForm.js` - NEW: Form component for adding cards
- `frontend/src/components/AddCardForm.css` - NEW: Styling for the form
- `frontend/src/components/FlashcardViewer.js` - Integrated "Add Card" button
- `frontend/src/components/FlashcardViewer.css` - Added button styling

---

## Combined Usage Example

### Scenario: Studying for Physics Exam

1. **Upload your physics textbook** (400 pages)
   - AI generates 500+ flashcards with LaTeX equations
   - Cards organized by chapters

2. **Review AI-generated cards**
   - See equations properly rendered
   - Navigate by section badges

3. **Add your own practice problems**
   - Click "➕ Add Card"
   - Create custom cards for tricky concepts
   - Use LaTeX for all formulas
   - Tag with "Practice Problems" section

4. **Export everything**
   - Download CSV with all cards (AI + manual)
   - Import to Anki, Quizlet, or other tools
   - CSV includes section information for organization

---

## Installation Requirements

### Backend
No additional packages needed - all backend changes use existing dependencies.

### Frontend
Update your `package.json` with:
```json
{
  "dependencies": {
    "katex": "^0.16.9",
    "react-katex": "^3.0.1"
  }
}
```

Then run:
```bash
cd frontend
npm install
```

---

## Testing the Features

### Test LaTeX Rendering

1. Create a test flashcard with LaTeX:
   - Question: `What is the integral of $x^2$?`
   - Answer: `$$\int x^2 dx = \frac{x^3}{3} + C$$`

2. Verify rendering:
   - Inline math should appear within text
   - Block equations should be centered
   - Symbols should render clearly

### Test Manual Card Addition

1. Open any flashcard set
2. Click "➕ Add Card"
3. Fill in question and answer
4. Click "Show Preview" - verify LaTeX renders
5. Submit the form
6. Verify you're navigated to the new card
7. Refresh page - verify card persists

### Test CSV Export with Sections

1. Add cards to different sections
2. Download CSV
3. Open in spreadsheet
4. Verify "Section" column contains correct categories
5. Verify LaTeX is preserved (as plain text in CSV)

---

## Troubleshooting

### LaTeX Not Rendering

**Problem:** Equations show as plain text (e.g., `$E = mc^2$`)

**Solutions:**
- Ensure `katex` packages are installed
- Check browser console for errors
- Verify LaTeX syntax is correct (no unescaped special characters)
- Refresh page to reload LaTeX library

### Add Card Button Not Appearing

**Problem:** Can't find the "Add Card" button

**Solutions:**
- Ensure you're viewing a flashcard set (not the dashboard)
- Check that flashcard set has loaded properly
- Verify backend is running and accessible

### Cards Not Saving

**Problem:** Added cards disappear after refresh

**Solutions:**
- Check backend logs for errors
- Verify MongoDB connection is active
- Check browser console for network errors
- Ensure flashcard set ID is valid

### LaTeX Errors in Preview

**Problem:** Red error text in preview

**Solutions:**
- Check for unescaped backslashes (use `\\` not `\`)
- Verify matched braces: `{` must have closing `}`
- Check for typos in LaTeX commands
- Refer to LaTeX quick reference in the form

---

## Advanced LaTeX Examples

### Chemistry
```latex
Combustion of methane: $$CH_4 + 2O_2 \rightarrow CO_2 + 2H_2O$$
```

### Physics
```latex
Kinetic energy: $$KE = \frac{1}{2}mv^2$$
Wave equation: $$c = \lambda \nu$$
```

### Mathematics
```latex
Taylor series: $$f(x) = \sum_{n=0}^{\infty} \frac{f^{(n)}(a)}{n!}(x-a)^n$$
```

### Statistics
```latex
Normal distribution: $$f(x) = \frac{1}{\sigma\sqrt{2\pi}} e^{-\frac{1}{2}(\frac{x-\mu}{\sigma})^2}$$
```

### Computer Science
```latex
Big O notation: $$T(n) = O(n \log n)$$
```

---

## Future Enhancements

Potential improvements:
- [ ] Batch import of manual cards (CSV upload)
- [ ] Markdown support in addition to LaTeX
- [ ] Image upload for diagrams
- [ ] Card editing UI (currently API-only)
- [ ] Card reordering/sorting
- [ ] Duplicate card detection
- [ ] Card difficulty ratings
- [ ] Study mode with spaced repetition

---

## Summary

These features transform the flashcard app into a comprehensive study tool:

✅ **LaTeX Support** - Professional math/science notation  
✅ **Manual Addition** - Full control over your flashcard collection  
✅ **Live Preview** - See exactly what you're creating  
✅ **Section Organization** - Keep cards organized by topic  
✅ **Full Integration** - Works seamlessly with AI-generated cards  

Perfect for students, educators, and professionals studying technical subjects!

