# 🚀 START HERE - Your AI Flashcard App

## Welcome! 👋

Your complete ANKI-like flashcard application with AI is ready!

---

## ⚡ Quick Start (2 Minutes)

### Step 1: Get API Key (30 seconds)
Visit: https://makersuite.google.com/app/apikey
- Sign in with Google
- Click "Create API Key"
- Copy the key

### Step 2: Configure (30 seconds)
```bash
cd /Users/saeed/Code/flashcard
echo "GEMINI_API_KEY=paste_your_key_here" > .env
```

### Step 3: Start (1 minute)
```bash
docker-compose up --build
```

Wait for this message:
```
✔ Container flashcard-frontend  Started
```

### Step 4: Use It!
Open: **http://localhost:3000**

Upload a file, watch the AI work! 🎉

---

## 📚 What You Built

### Full-Stack Application
- ✅ **React Frontend** - Beautiful, modern UI
- ✅ **Node.js Backend** - RESTful API
- ✅ **MongoDB Database** - Data persistence
- ✅ **Gemini AI** - Smart flashcard generation
- ✅ **Docker** - One-command deployment

### Features
- 📤 Drag & drop file upload
- 🤖 AI-powered flashcard generation
- 🎴 3D flip card animation
- ⬅️➡️ Keyboard navigation
- 💾 CSV export
- 📊 Progress tracking
- 🗑️ Delete flashcard sets

---

## 🎯 Common Tasks

### Start the App
```bash
docker-compose up -d
```

### Stop the App
```bash
docker-compose down
```

### View Logs
```bash
docker-compose logs -f
```

### Restart Everything
```bash
docker-compose restart
```

### Clean & Rebuild
```bash
docker-compose down -v
docker-compose up --build
```

---

## 📖 Documentation

Pick what you need:

### Just Starting? 
→ **You're reading it!** Keep going below.

### Want Quick Commands?
→ Read **QUICKSTART.md** (2 min read)

### Learning Docker?
→ Read **DOCKER_SETUP.md** (10 min read)

### Need All Docker Commands?
→ Read **DOCKER_COMMANDS.md** (Reference guide)

### Want Full Details?
→ Read **README.md** (Complete documentation)

### Understanding Architecture?
→ Read **PROJECT_OVERVIEW.md** (Technical details)

### Curious About Files?
→ Read **FILES_CREATED.md** (Complete file list)

---

## 🎮 Using the App

### 1. Upload a File

1. Open http://localhost:3000
2. Drag a PDF or TXT file to the upload area
3. Or click "Choose File"
4. Wait 10-30 seconds

### 2. Study Flashcards

1. See your new set in the sidebar
2. Click it to open
3. Click any card to flip
4. Use ← → arrows to navigate

### 3. Export to CSV

1. Click 📥 on any flashcard set
2. File downloads automatically
3. Import to ANKI, Quizlet, etc.

### 4. Delete Sets

1. Click 🗑️ on any set
2. Confirm deletion
3. Set is removed

---

## 🔧 Technology Used

### What You're Running
```
┌─────────────────────────────────┐
│  Browser (localhost:3000)       │
│  React App                      │
└──────────┬──────────────────────┘
           │ HTTP Requests
           ↓
┌─────────────────────────────────┐
│  Backend API (port 5000)        │
│  Node.js + Express              │
└──────────┬──────────────────────┘
           │ Queries
           ↓
┌─────────────────────────────────┐
│  MongoDB (port 27017)           │
│  Database                       │
└─────────────────────────────────┘
```

### Stack
- **M**ongoDB - Database
- **E**xpress - API Framework  
- **R**eact - Frontend
- **N**ode.js - Backend Runtime
- **Docker** - Containerization
- **Gemini AI** - Flashcard Generation

---

## 🐳 Docker Explained

### What Docker Does

Instead of installing MongoDB, Node.js, dependencies...
Docker runs everything in isolated containers.

**One command = Full app running!**

### Your Containers

1. **Frontend Container**
   - React app + Nginx
   - Port: 3000

2. **Backend Container**
   - Node.js + Express
   - Port: 5000

3. **MongoDB Container**
   - Database
   - Port: 27017

### Docker Commands

```bash
# Start everything
docker-compose up

# Stop everything  
docker-compose down

# View what's running
docker-compose ps

# See logs
docker-compose logs -f

# Restart
docker-compose restart
```

---

## 🎨 UI Features

### Beautiful Design
- Purple/pink gradient theme
- Smooth animations
- Responsive (works on phone/tablet/desktop)
- Modern, clean interface

### 3D Flip Animation
- Click a card to flip
- Smooth Z-axis rotation
- Purple front (question)
- Pink back (answer)

### Drag & Drop
- Drag files directly
- Visual feedback
- Error handling
- Loading states

---

## 📁 Important Files

### You Need to Create
- `.env` - Your Gemini API key

### Configuration
- `docker-compose.yml` - Docker setup
- `backend/server.js` - API server
- `frontend/src/App.js` - React app

### Where AI Happens
- `backend/services/geminiService.js`
  - This sends content to Gemini
  - Gets back flashcards
  - Default prompt included

---

## 🔑 API Key Setup

### Get Your Key

1. Go to: https://makersuite.google.com/app/apikey
2. Sign in with Google
3. Click "Create API Key"
4. Copy the key (starts with `AIza...`)

### Add to Project

Create `.env` file:
```bash
echo "GEMINI_API_KEY=AIzaSy..." > .env
```

Or edit manually:
```bash
nano .env
```

Add:
```
GEMINI_API_KEY=AIzaSy...your_actual_key
```

### Restart Backend

```bash
docker-compose restart backend
```

---

## ❓ Troubleshooting

### Port Already in Use?

**Error**: `port is already allocated`

**Fix**:
```bash
# Check what's using port 3000
lsof -i :3000

# Kill it or change ports in docker-compose.yml
```

### Containers Won't Start?

**Fix**:
```bash
docker-compose down -v
docker-compose up --build
```

### MongoDB Issues?

**Fix**:
```bash
# Check MongoDB logs
docker-compose logs mongodb

# Restart it
docker-compose restart mongodb
```

### API Key Not Working?

**Fix**:
```bash
# Check .env exists
cat .env

# Should show: GEMINI_API_KEY=...
# Restart backend
docker-compose restart backend
```

### Build Fails?

**Fix**:
```bash
# Clean everything
docker-compose down -v --rmi all

# Rebuild from scratch
docker-compose build --no-cache
docker-compose up
```

---

## 🎓 Next Steps

### Start Using
1. ✅ Set API key in `.env`
2. ✅ Run `docker-compose up --build`
3. ✅ Open http://localhost:3000
4. ✅ Upload a test file
5. ✅ Study your flashcards!

### Customize
- Change colors in CSS files
- Modify AI prompt in `geminiService.js`
- Add new features
- Deploy to production

### Deploy Online
- AWS, Google Cloud, Azure
- DigitalOcean, Heroku
- Any Docker host

---

## 📞 Getting Help

### Check These First
1. **QUICKSTART.md** - Common issues
2. **DOCKER_SETUP.md** - Docker problems  
3. **README.md** - Full documentation

### Docker Help
```bash
# All Docker commands
docker-compose --help

# Specific command help
docker-compose up --help
```

---

## ✅ Checklist

Before asking for help:

- [ ] Docker Desktop is running
- [ ] `.env` file exists with API key
- [ ] No other services on ports 3000, 5000, 27017
- [ ] Tried `docker-compose down -v && docker-compose up --build`
- [ ] Checked logs with `docker-compose logs`

---

## 🎉 You're Ready!

### The Only Command You Need

```bash
cd /Users/saeed/Code/flashcard
docker-compose up --build
```

Then visit: **http://localhost:3000**

---

## 💡 Pro Tips

1. **Use `make`** - Easier commands
   ```bash
   make up      # Start
   make down    # Stop  
   make logs    # View logs
   ```

2. **Background Mode** - Run without watching logs
   ```bash
   docker-compose up -d
   ```

3. **Development Mode** - Hot reload
   ```bash
   make dev
   ```

4. **Backup Data** - Save your flashcards
   ```bash
   make backup-db
   ```

---

## 🌟 What's Next?

### Learn More
- Explore the code
- Customize the UI
- Modify the AI prompt
- Add new features

### Deploy
- Put it online
- Share with friends
- Use for studying

### Contribute
- Report bugs
- Suggest features
- Improve documentation

---

## 📊 Project Stats

- **40+ Files Created**
- **4,200+ Lines of Code**
- **3 Docker Containers**
- **8 Documentation Files**
- **Full MERN Stack**
- **AI-Powered**

---

**You built something awesome! 🚀**

Now go upload a file and create some flashcards!

```bash
docker-compose up --build
```

**Happy Learning! 📚✨**

