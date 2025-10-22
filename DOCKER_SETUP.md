# 🐳 Docker Setup Guide

Running the AI Flashcard application with Docker is the easiest way to get started! Everything is containerized and configured.

## Prerequisites

- [Docker](https://www.docker.com/get-started) installed on your system
- [Docker Compose](https://docs.docker.com/compose/install/) (usually comes with Docker Desktop)
- Gemini API Key from [Google AI Studio](https://makersuite.google.com/app/apikey)

## 🚀 Quick Start (3 Steps)

### Step 1: Set Your Gemini API Key

Create a `.env` file in the project root:

```bash
cd /Users/saeed/Code/flashcard
echo "GEMINI_API_KEY=your_actual_api_key_here" > .env
```

Or create the file manually:
```env
GEMINI_API_KEY=your_actual_api_key_here
```

### Step 2: Build and Start All Services

```bash
docker-compose up --build
```

This single command will:
- ✅ Build the backend Node.js API
- ✅ Build the frontend React app
- ✅ Start MongoDB database
- ✅ Connect everything together
- ✅ Set up networking

### Step 3: Open Your Browser

Navigate to: **http://localhost:3000**

That's it! 🎉 The application is ready to use!

## 📦 What's Running?

When you start with `docker-compose up`, you get:

| Service | Container Name | Port | Description |
|---------|---------------|------|-------------|
| Frontend | flashcard-frontend | 3000 | React app with Nginx |
| Backend | flashcard-backend | 5000 | Node.js API server |
| Database | flashcard-mongodb | 27017 | MongoDB database |

## 🛠️ Common Commands

### Start the Application
```bash
# Start in foreground (see logs)
docker-compose up

# Start in background (detached mode)
docker-compose up -d

# Build and start
docker-compose up --build
```

### Stop the Application
```bash
# Stop all containers
docker-compose down

# Stop and remove volumes (⚠️ deletes all data)
docker-compose down -v
```

### View Logs
```bash
# All services
docker-compose logs

# Follow logs in real-time
docker-compose logs -f

# Specific service
docker-compose logs backend
docker-compose logs frontend
docker-compose logs mongodb
```

### Restart a Service
```bash
# Restart backend only
docker-compose restart backend

# Restart all services
docker-compose restart
```

### Rebuild After Code Changes
```bash
# Rebuild specific service
docker-compose build backend
docker-compose build frontend

# Rebuild and restart
docker-compose up --build -d
```

### Check Service Status
```bash
docker-compose ps
```

### Access Container Shell
```bash
# Backend container
docker-compose exec backend sh

# Frontend container
docker-compose exec frontend sh

# MongoDB container
docker-compose exec mongodb mongosh
```

## 🗄️ Data Persistence

MongoDB data is stored in a Docker volume named `mongodb_data`. This means:
- ✅ Your flashcards persist between container restarts
- ✅ Data survives `docker-compose down`
- ❌ Data is deleted with `docker-compose down -v`

### Backup Your Data
```bash
# Export MongoDB data
docker-compose exec mongodb mongodump --out=/data/backup

# Copy backup to host
docker cp flashcard-mongodb:/data/backup ./mongodb_backup
```

### Restore Data
```bash
# Copy backup to container
docker cp ./mongodb_backup flashcard-mongodb:/data/restore

# Restore
docker-compose exec mongodb mongorestore /data/restore
```

## 🔧 Development with Docker

### Hot Reloading (Development Mode)

Create a `docker-compose.dev.yml` for development:

```yaml
version: '3.8'

services:
  backend:
    build:
      context: ./backend
    volumes:
      - ./backend:/app
      - /app/node_modules
    environment:
      - NODE_ENV=development
    command: npm run dev

  frontend:
    build:
      context: ./frontend
      target: builder
    volumes:
      - ./frontend/src:/app/src
      - ./frontend/public:/app/public
    command: npm start
    ports:
      - "3000:3000"
```

Run with:
```bash
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up
```

## 🐛 Troubleshooting

### Port Already in Use
```bash
# Check what's using the port
lsof -i :3000
lsof -i :5000

# Change ports in docker-compose.yml
# For example, change "3000:80" to "3001:80"
```

### Container Won't Start
```bash
# Check logs
docker-compose logs [service-name]

# Rebuild from scratch
docker-compose down -v
docker-compose build --no-cache
docker-compose up
```

### MongoDB Connection Issues
```bash
# Check MongoDB is healthy
docker-compose ps

# View MongoDB logs
docker-compose logs mongodb

# Restart MongoDB
docker-compose restart mongodb
```

### API Key Not Working
```bash
# Verify .env file exists and has correct format
cat .env

# Restart backend after changing .env
docker-compose restart backend
```

### Clear Everything and Start Fresh
```bash
# Stop containers
docker-compose down -v

# Remove images
docker-compose down --rmi all

# Rebuild everything
docker-compose up --build
```

## 📊 Resource Management

### Check Resource Usage
```bash
docker stats
```

### Limit Resources

Edit `docker-compose.yml` to add resource limits:

```yaml
services:
  backend:
    # ... other config ...
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 512M
```

## 🌐 Production Deployment

### Environment Variables

For production, create a `.env.production`:

```env
GEMINI_API_KEY=your_production_api_key
NODE_ENV=production
```

Use it with:
```bash
docker-compose --env-file .env.production up -d
```

### Using Docker Swarm

```bash
# Initialize swarm
docker swarm init

# Deploy stack
docker stack deploy -c docker-compose.yml flashcard
```

### Using Kubernetes

Convert docker-compose to Kubernetes:
```bash
# Install kompose
brew install kompose  # macOS

# Convert
kompose convert

# Deploy
kubectl apply -f .
```

## 🔒 Security Best Practices

1. **Never commit `.env` file** - It contains your API key
2. **Use secrets management** in production (Docker secrets, Kubernetes secrets)
3. **Run containers as non-root user**
4. **Scan images for vulnerabilities**: `docker scan flashcard-backend`
5. **Keep images updated**: Regularly rebuild with latest base images

## 📝 Docker Architecture

```
┌─────────────────────────────────────────┐
│           Docker Network                 │
│        (flashcard-network)               │
│                                          │
│  ┌──────────────┐  ┌─────────────────┐ │
│  │  Frontend    │  │    Backend      │ │
│  │  (Nginx)     │←→│  (Node.js)      │ │
│  │  Port: 3000  │  │  Port: 5000     │ │
│  └──────────────┘  └────────┬────────┘ │
│                              │          │
│                              ↓          │
│                     ┌────────────────┐ │
│                     │   MongoDB      │ │
│                     │   Port: 27017  │ │
│                     └────────────────┘ │
│                              │          │
│                              ↓          │
│                     ┌────────────────┐ │
│                     │  Volume:       │ │
│                     │  mongodb_data  │ │
│                     └────────────────┘ │
└─────────────────────────────────────────┘
```

## ✅ Verification Steps

After starting with Docker, verify everything works:

1. **Check all containers are running**:
   ```bash
   docker-compose ps
   ```
   All should show "Up" status

2. **Check backend health**:
   ```bash
   curl http://localhost:5000/api/health
   ```
   Should return: `{"status":"ok","message":"Server is running"}`

3. **Access frontend**:
   Open http://localhost:3000 in browser

4. **Test upload**:
   Upload a text file and verify flashcards are generated

## 🎯 Next Steps

Now that Docker is set up:
1. Open http://localhost:3000
2. Upload a PDF or text file
3. Watch AI generate flashcards
4. Start studying!

For detailed usage instructions, see the main [README.md](README.md).

---

**Need help?** Check the [troubleshooting section](#-troubleshooting) or open an issue.

