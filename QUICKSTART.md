# 🚀 Quick Start Guide

Get your AI Flashcard application up and running in **2 MINUTES** with Docker!

## 🐳 Docker Quick Start (Easiest)

### Prerequisites
- [Docker Desktop](https://www.docker.com/products/docker-desktop) installed
- Gemini API Key from [Google AI Studio](https://makersuite.google.com/app/apikey)

### Step 1: Set Your API Key (30 seconds)

```bash
cd /Users/saeed/Code/flashcard
echo "GEMINI_API_KEY=your_actual_api_key_here" > .env
```

Replace `your_actual_api_key_here` with your real API key.

### Step 2: Start Everything (90 seconds)

```bash
docker-compose up --build
```

Wait for the build to complete. You'll see:
```
✔ Container flashcard-mongodb   Started
✔ Container flashcard-backend   Started  
✔ Container flashcard-frontend  Started
```

### Step 3: Open Your Browser

Visit: **http://localhost:3000** 🎉

That's it! Upload a file and start creating flashcards!

---

## 💻 Manual Setup (Without Docker)

If you prefer to run without Docker, follow these steps:

### Step 1: Install Dependencies (2 minutes)

```bash
# Backend
cd /Users/saeed/Code/flashcard/backend
npm install

# Frontend (in new terminal)
cd /Users/saeed/Code/flashcard/frontend
npm install
```

### Step 2: Configure Environment

Create `backend/.env`:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/flashcard
GEMINI_API_KEY=your_actual_api_key_here
```

### Step 3: Start MongoDB

```bash
# macOS
brew services start mongodb-community

# Linux
sudo systemctl start mongod

# Or run directly
mongod
```

### Step 4: Start the Application

Terminal 1 - Backend:
```bash
cd /Users/saeed/Code/flashcard/backend
npm start
```

Terminal 2 - Frontend:
```bash
cd /Users/saeed/Code/flashcard/frontend
npm start
```

Visit: **http://localhost:3000**

---

## 🎯 Quick Commands Reference

### Docker
```bash
# Start
docker-compose up -d

# Stop
docker-compose down

# View logs
docker-compose logs -f

# Rebuild
docker-compose up --build
```

### Manual
```bash
# Backend
cd backend && npm start

# Frontend  
cd frontend && npm start

# MongoDB
mongod
```

---

## 🎨 First Steps

1. **Upload a file** - Drag & drop a PDF or TXT file
2. **Wait for AI** - Gemini AI generates flashcards (10-30 seconds)
3. **Study cards** - Click to flip, use arrow keys to navigate
4. **Download CSV** - Click 📥 to export flashcards

---

## 🐛 Troubleshooting

**Docker not starting?**
```bash
docker-compose down -v
docker-compose up --build
```

**Port already in use?**
- Change ports in `docker-compose.yml`
- Or stop the conflicting service

**MongoDB connection error?**
```bash
# Check MongoDB is running
docker-compose ps mongodb
```

**Need more help?**
- See [DOCKER_SETUP.md](DOCKER_SETUP.md) for Docker details
- See [README.md](README.md) for full documentation

---

**Happy Learning! 📚**
