# 📊 Project Overview - AI Flashcards

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        User Interface                        │
│                      (React Frontend)                        │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────────────┐   │
│  │  Dashboard  │  │   Sidebar   │  │ Flashcard Viewer │   │
│  │             │  │             │  │                  │   │
│  │ File Upload │  │ Sets List   │  │  Flip Animation  │   │
│  └─────────────┘  └─────────────┘  └──────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                           ↕ HTTP/REST API
┌─────────────────────────────────────────────────────────────┐
│                      Backend Server                          │
│                    (Node.js + Express)                       │
│                                                              │
│  ┌──────────────┐  ┌───────────────┐  ┌────────────────┐  │
│  │   Routes     │→ │   Services    │→ │    Database    │  │
│  │              │  │               │  │                │  │
│  │ Upload       │  │ File Parser   │  │   MongoDB      │  │
│  │ Get Sets     │  │ Gemini AI     │  │                │  │
│  │ Download CSV │  │ CSV Generator │  │ FlashcardSets  │  │
│  └──────────────┘  └───────────────┘  └────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                           ↕ API Call
┌─────────────────────────────────────────────────────────────┐
│                    Google Gemini AI                          │
│                                                              │
│  Input: Document Content + Prompt                           │
│  Output: JSON Array of Question/Answer Pairs                │
└─────────────────────────────────────────────────────────────┘
```

## Data Flow

### 1. Upload & Generate Flow
```
User uploads file
    ↓
Frontend sends file to /api/flashcards/upload
    ↓
Backend receives file via Multer
    ↓
File Parser extracts text (PDF/TXT)
    ↓
Gemini Service sends text + prompt to Gemini AI
    ↓
AI generates flashcards (JSON)
    ↓
Convert flashcards to CSV
    ↓
Save to MongoDB
    ↓
Return flashcard set to frontend
    ↓
Display in UI
```

### 2. View Flashcards Flow
```
User clicks set in sidebar
    ↓
Frontend requests /api/flashcards/:id
    ↓
Backend fetches from MongoDB
    ↓
Frontend displays cards
    ↓
User clicks card → Flip animation (CSS transform: rotateY)
    ↓
Use arrow keys → Navigate between cards
```

### 3. Download CSV Flow
```
User clicks download icon
    ↓
Frontend requests /api/flashcards/:id/download-csv
    ↓
Backend returns CSV data
    ↓
Browser downloads file
```

## Key Components

### Backend Components

#### 1. **server.js**
- Main Express application
- Middleware configuration (CORS, JSON parser)
- Route mounting
- Error handling

#### 2. **routes/flashcards.js**
- `GET /` - List all flashcard sets
- `GET /:id` - Get specific set
- `POST /upload` - Upload file & generate flashcards
- `GET /:id/download-csv` - Download CSV
- `DELETE /:id` - Delete set

#### 3. **services/geminiService.js**
- Gemini AI integration
- Default prompt configuration
- Flashcard generation
- CSV conversion

#### 4. **services/fileParser.js**
- PDF parsing (using pdf-parse)
- Text file parsing
- Multi-format support

#### 5. **models/FlashcardSet.js**
- MongoDB schema
- Fields: title, fileName, cards, csvData, createdAt
- Nested flashcard schema (question/answer)

### Frontend Components

#### 1. **App.js**
- Main application container
- State management
- API integration
- Component orchestration

#### 2. **Dashboard.js**
- File upload interface
- Drag & drop support
- Loading states
- Error/success messages
- Feature showcase

#### 3. **Sidebar.js**
- Flashcard sets list
- Active set highlighting
- Download/delete actions
- Empty state

#### 4. **FlashcardViewer.js**
- Card navigation
- Progress tracking
- Keyboard shortcuts
- Card counter with dots

#### 5. **Flashcard.js**
- 3D flip animation
- Question/answer display
- Click to flip interaction
- Gradient styling

## Styling Features

### Color Scheme
- **Primary Gradient**: `#667eea → #764ba2` (Purple)
- **Secondary Gradient**: `#f093fb → #f5576c` (Pink-Red)
- **Background**: Purple gradient backdrop
- **Cards**: White with transparency effects

### Animations
1. **Card Flip**: 3D rotation on Y-axis (0.6s transition)
2. **Hover Effects**: Scale and shadow transformations
3. **Drag & Drop**: Border color and scale changes
4. **Loading Spinner**: Continuous rotation
5. **Button Hover**: Lift effect with shadow

### Responsive Design
- Mobile-friendly breakpoints
- Flexible grid layouts
- Touch-friendly buttons
- Scrollable containers

## Database Schema

```javascript
FlashcardSet {
  _id: ObjectId,
  title: String,
  fileName: String,
  cards: [
    {
      question: String,
      answer: String
    }
  ],
  csvData: String,
  createdAt: Date
}
```

## Environment Variables

### Backend (.env)
```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/flashcard
GEMINI_API_KEY=your_api_key_here
```

### Frontend
Uses proxy configuration in package.json to connect to backend

## Security Features

- File type validation (PDF, TXT only)
- File size limits (10MB max)
- CORS enabled for cross-origin requests
- Input sanitization for CSV export
- MongoDB injection protection via Mongoose

## Performance Optimizations

- Lazy loading of flashcard sets
- Efficient card navigation (no re-fetch)
- CSS transforms for hardware acceleration
- Minimal re-renders with React state
- Database indexing on createdAt

## Browser Compatibility

- Modern browsers (Chrome, Firefox, Safari, Edge)
- ES6+ JavaScript features
- CSS Grid and Flexbox
- CSS3 Transforms and Transitions
- File API for upload

---

**Total Files Created**: 30+
**Lines of Code**: ~2000+
**Technologies**: 10+ (React, Node, Express, MongoDB, Gemini AI, etc.)

