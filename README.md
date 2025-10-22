# 🧠 AI Flashcards - ANKI-like Application with Gemini AI

A modern, AI-powered flashcard application built with the MERN stack (MongoDB, Express, React, Node.js) and integrated with Google's Gemini AI to automatically generate flashcards from uploaded documents.

## 🐳 Fully Dockerized!

This application is **100% Docker-ready**. Get started in 2 minutes:

```bash
echo "GEMINI_API_KEY=your_api_key" > .env
docker-compose up --build
```

Then open http://localhost:3000 🎉

## ✨ Features

- 📤 **File Upload**: Upload PDF or text files through a beautiful drag-and-drop interface
- 🤖 **AI-Powered Generation**: Gemini AI automatically extracts key concepts and generates flashcards
- 💾 **CSV Export**: Download flashcards as CSV files for use in other applications
- 🎴 **Interactive Flashcards**: Beautiful card flip animation with 3D rotation on Z-axis
- 📊 **Progress Tracking**: Visual progress bar and card navigation
- 💼 **Multiple Sets**: Manage multiple flashcard sets with a clean sidebar interface
- 🎨 **Modern UI**: Beautiful gradient design with smooth animations

## 🛠️ Technology Stack

### Backend
- **Node.js** & **Express.js**: Server and API
- **MongoDB**: Database for storing flashcard sets
- **Mongoose**: ODM for MongoDB
- **Multer**: File upload handling
- **Google Gemini AI**: AI-powered flashcard generation
- **pdf-parse**: PDF text extraction

### Frontend
- **React**: UI framework
- **Axios**: HTTP client
- **CSS3**: Animations and styling

## 📋 Prerequisites

Before running this application, make sure you have:

- **Node.js** (v16 or higher) installed
- **MongoDB** installed and running locally, or a MongoDB Atlas account
- **Google Gemini API Key** (Get it from [Google AI Studio](https://makersuite.google.com/app/apikey))

## 🚀 Installation & Setup

### Option 1: Docker (Recommended ⭐)

The easiest way to run the application is with Docker:

```bash
# 1. Create .env file with your Gemini API key
echo "GEMINI_API_KEY=your_actual_api_key_here" > .env

# 2. Start everything with one command
docker-compose up --build

# 3. Open http://localhost:3000 in your browser
```

That's it! See [DOCKER_SETUP.md](DOCKER_SETUP.md) for detailed Docker instructions.

### Option 2: Manual Setup

#### 1. Clone the Repository

```bash
cd /Users/saeed/Code/flashcard
```

#### 2. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Create .env file
cp .env.example .env
```

Edit the `.env` file and add your configuration:

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/flashcard
GEMINI_API_KEY=your_gemini_api_key_here
```

**Important**: Replace `your_gemini_api_key_here` with your actual Gemini API key.

#### 3. Frontend Setup

```bash
# Navigate to frontend directory (from project root)
cd ../frontend

# Install dependencies
npm install
```

## 🎯 Running the Application

### With Docker

```bash
# Start all services
docker-compose up -d

# Stop all services
docker-compose down
```

### Manual Setup

#### Start MongoDB

Make sure MongoDB is running on your system:

```bash
# If using local MongoDB
mongod

# Or if using MongoDB as a service
brew services start mongodb-community  # macOS
sudo systemctl start mongod            # Linux
```

#### Start Backend Server

```bash
# From the backend directory
cd backend
npm start

# For development with auto-reload
npm run dev
```

The backend server will start on `http://localhost:5000`

#### Start Frontend Development Server

```bash
# From the frontend directory (in a new terminal)
cd frontend
npm start
```

The React app will open automatically in your browser at `http://localhost:3000`

## 📖 How to Use

1. **Upload a File**
   - Click on the upload area or drag and drop a PDF/TXT file
   - The AI will automatically process the file and generate flashcards
   - Wait a few seconds for the AI to analyze the content

2. **View Flashcards**
   - Click on any flashcard set in the sidebar
   - Click on a card to flip it and reveal the answer
   - Use arrow keys (← →) or navigation buttons to move between cards

3. **Download CSV**
   - Click the 📥 download icon on any flashcard set in the sidebar
   - The CSV file will be downloaded to your computer

4. **Delete Sets**
   - Click the 🗑️ delete icon on any flashcard set
   - Confirm the deletion

## 🎨 Features in Detail

### AI Flashcard Generation

The application uses Google's Gemini AI with a carefully crafted prompt to:
- Extract key concepts, definitions, and important facts
- Create clear, concise questions
- Generate comprehensive answers
- Produce 10-20+ flashcards depending on content length

### 3D Card Flip Animation

The flashcards feature a smooth 3D rotation animation on the Z-axis when clicked:
- Front side displays the question in a purple gradient
- Back side shows the answer in a pink-red gradient
- Smooth transition with CSS3 transforms

### File Support

Supported file formats:
- PDF (`.pdf`)
- Plain Text (`.txt`)
- Word Documents (`.doc`, `.docx`)

Maximum file size: 10MB

## 📁 Project Structure

```
flashcard/
├── docker-compose.yml        # Docker orchestration
├── .env                      # Environment variables (create this)
├── README.md                 # Main documentation
├── DOCKER_SETUP.md          # Docker instructions
├── QUICKSTART.md            # Quick start guide
├── PROJECT_OVERVIEW.md      # Architecture details
│
├── backend/
│   ├── config/
│   │   ├── database.js       # MongoDB connection
│   │   └── multer.js         # File upload configuration
│   ├── models/
│   │   └── FlashcardSet.js   # Mongoose schema
│   ├── routes/
│   │   └── flashcards.js     # API routes
│   ├── services/
│   │   ├── geminiService.js  # AI integration
│   │   └── fileParser.js     # File parsing
│   ├── uploads/              # Temporary file storage
│   ├── Dockerfile            # Backend container config
│   ├── .dockerignore
│   ├── .gitignore
│   ├── package.json
│   └── server.js            # Express server
│
└── frontend/
    ├── public/
    │   └── index.html
    ├── src/
    │   ├── components/
    │   │   ├── Dashboard.js      # File upload UI
    │   │   ├── Dashboard.css
    │   │   ├── Sidebar.js        # Flashcard sets list
    │   │   ├── Sidebar.css
    │   │   ├── FlashcardViewer.js # Card viewer with navigation
    │   │   ├── FlashcardViewer.css
    │   │   ├── Flashcard.js       # Individual flip card
    │   │   └── Flashcard.css
    │   ├── App.js               # Main app component
    │   ├── App.css
    │   ├── index.js
    │   └── index.css
    ├── Dockerfile            # Frontend container config
    ├── nginx.conf           # Nginx configuration
    ├── .dockerignore
    ├── .gitignore
    └── package.json
```

## 🔧 API Endpoints

### GET `/api/flashcards`
Get all flashcard sets

### GET `/api/flashcards/:id`
Get a specific flashcard set

### POST `/api/flashcards/upload`
Upload a file and generate flashcards
- Body: multipart/form-data with `file` field

### GET `/api/flashcards/:id/download-csv`
Download flashcard set as CSV

### DELETE `/api/flashcards/:id`
Delete a flashcard set

### GET `/api/health`
Health check endpoint

## 🐛 Troubleshooting

### MongoDB Connection Issues
```bash
# Make sure MongoDB is running
mongod --version

# Check if MongoDB service is active
brew services list  # macOS
sudo systemctl status mongod  # Linux
```

### Port Already in Use
If port 5000 or 3000 is already in use:
```bash
# Change PORT in backend/.env
PORT=5001

# Frontend will automatically use the next available port
```

### Gemini API Issues
- Verify your API key is correct
- Check your API quota at [Google AI Studio](https://makersuite.google.com/)
- Make sure you have enabled the Gemini API

## 🎯 Future Enhancements

Potential features to add:
- User authentication and personal accounts
- Spaced repetition algorithm
- Study statistics and analytics
- Multiple choice questions
- Mobile app version
- Sharing flashcard sets
- Collaborative study sessions

## 📄 License

MIT License - feel free to use this project for learning or commercial purposes.

## 🤝 Contributing

Contributions are welcome! Feel free to submit issues or pull requests.

## 👨‍💻 Author

Built with ❤️ using MERN stack and Google Gemini AI

---

**Happy Learning! 📚**

