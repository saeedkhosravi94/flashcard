# 🐳 Docker Configuration Summary

## What's Included

Your AI Flashcard application is now fully Dockerized with:

### ✅ Container Setup
- **Frontend**: React app served by Nginx (production-optimized)
- **Backend**: Node.js/Express API server
- **Database**: MongoDB 7.0

### ✅ Docker Files Created

```
flashcard/
├── docker-compose.yml           # Production orchestration
├── docker-compose.dev.yml       # Development with hot reload
├── Makefile                     # Convenient shortcuts
├── DOCKER_SETUP.md             # Detailed Docker guide
├── DOCKER_COMMANDS.md          # Command reference
├── .env.example                # Environment template
│
├── backend/
│   ├── Dockerfile              # Backend container
│   └── .dockerignore          # Ignore patterns
│
└── frontend/
    ├── Dockerfile              # Production frontend (multi-stage)
    ├── Dockerfile.dev          # Development frontend
    ├── nginx.conf              # Nginx configuration
    └── .dockerignore          # Ignore patterns
```

## 🚀 Getting Started

### 1. Set Up Environment

```bash
# Create .env file
echo "GEMINI_API_KEY=your_actual_api_key_here" > .env
```

### 2. Start Application

**Option A: Docker Compose (Simple)**
```bash
docker-compose up --build
```

**Option B: Make Commands (Easier)**
```bash
make install  # First time setup with interactive prompts
# or
make up       # Just start services
```

### 3. Access Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **MongoDB**: localhost:27017

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────┐
│              Docker Network                      │
│         (flashcard-network)                      │
│                                                  │
│  ┌──────────────────────────────────────────┐  │
│  │  Frontend Container                       │  │
│  │  - React App (built)                      │  │
│  │  - Nginx Server                           │  │
│  │  - Port: 3000 → 80                        │  │
│  └─────────────────┬────────────────────────┘  │
│                    │ /api/* requests            │
│                    ↓                            │
│  ┌──────────────────────────────────────────┐  │
│  │  Backend Container                        │  │
│  │  - Node.js + Express                      │  │
│  │  - Gemini AI Service                      │  │
│  │  - Port: 5000                             │  │
│  └─────────────────┬────────────────────────┘  │
│                    │ MongoDB connection         │
│                    ↓                            │
│  ┌──────────────────────────────────────────┐  │
│  │  MongoDB Container                        │  │
│  │  - MongoDB 7.0                            │  │
│  │  - Port: 27017                            │  │
│  │  - Volume: mongodb_data                   │  │
│  └──────────────────────────────────────────┘  │
│                                                  │
└─────────────────────────────────────────────────┘
```

## 📦 Container Details

### Frontend Container
- **Base Image**: `node:18-alpine` (builder) → `nginx:alpine` (runtime)
- **Build Type**: Multi-stage for optimization
- **Size**: ~50MB (optimized)
- **Features**: 
  - Production-ready build
  - Nginx reverse proxy
  - API proxying to backend
  - Static file serving

### Backend Container
- **Base Image**: `node:18-alpine`
- **Size**: ~150MB
- **Features**:
  - Node.js runtime
  - Express API
  - Gemini AI integration
  - File upload handling
  - Health check endpoint

### MongoDB Container
- **Base Image**: `mongo:7.0`
- **Size**: ~700MB
- **Features**:
  - Persistent volume
  - Health checks
  - Database initialization

## 🔄 Development vs Production

### Production Mode (Default)
```bash
docker-compose up -d
```
- Optimized builds
- No source code mounting
- Production dependencies only
- Nginx serving static files

### Development Mode
```bash
docker-compose -f docker-compose.dev.yml up
# or
make dev
```
- Hot reloading enabled
- Source code mounted
- Development dependencies
- Faster iteration

## 🛠️ Common Tasks

### Start & Stop
```bash
# Start
docker-compose up -d

# Stop
docker-compose down

# Restart
docker-compose restart
```

### View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
```

### Rebuild After Changes
```bash
# Rebuild everything
docker-compose up --build -d

# Rebuild specific service
docker-compose up -d --build backend
```

### Access Containers
```bash
# Backend shell
docker-compose exec backend sh

# Frontend shell
docker-compose exec frontend sh

# MongoDB shell
docker-compose exec mongodb mongosh
```

### Database Operations
```bash
# Backup
make backup-db

# Restore
make restore-db

# Connect to MongoDB
docker-compose exec mongodb mongosh flashcard
```

## 📊 Volumes & Persistence

### Named Volumes
- `mongodb_data`: MongoDB database files

### Bind Mounts
- `./backend/uploads`: File uploads (backend)

### Data Persistence
- Data survives container restarts
- Data survives `docker-compose down`
- Data deleted with `docker-compose down -v`

## 🔍 Health Checks

All services have health checks:

```bash
# Check status
docker-compose ps

# Manual health check
curl http://localhost:5000/api/health
curl http://localhost:3000

# Or use make
make health
```

## 🚀 Deployment Options

### Option 1: Docker Compose (Simple)
```bash
# On production server
docker-compose -f docker-compose.yml up -d
```

### Option 2: Docker Swarm (Scalable)
```bash
docker swarm init
docker stack deploy -c docker-compose.yml flashcard
```

### Option 3: Kubernetes (Enterprise)
```bash
# Convert docker-compose to Kubernetes
kompose convert
kubectl apply -f .
```

### Option 4: Cloud Platforms
- **AWS**: ECS, EKS, or Elastic Beanstalk
- **Google Cloud**: Cloud Run, GKE
- **Azure**: Container Instances, AKS
- **DigitalOcean**: App Platform, Kubernetes

## 🎯 Advantages of Docker Setup

✅ **Consistency**: Same environment everywhere (dev, staging, prod)  
✅ **Easy Setup**: One command to start everything  
✅ **Isolation**: Each service in its own container  
✅ **Scalability**: Easy to scale services  
✅ **Portability**: Run anywhere Docker runs  
✅ **Development**: Hot reload support in dev mode  
✅ **Production**: Optimized builds with multi-stage  
✅ **Networking**: Automatic service discovery  
✅ **Volumes**: Persistent data storage  
✅ **Health Checks**: Automatic service monitoring  

## 📚 Documentation

- **[DOCKER_SETUP.md](DOCKER_SETUP.md)**: Comprehensive Docker guide
- **[DOCKER_COMMANDS.md](DOCKER_COMMANDS.md)**: Command reference
- **[QUICKSTART.md](QUICKSTART.md)**: 2-minute quick start
- **[README.md](README.md)**: Main project documentation

## 🐛 Troubleshooting

### Containers Won't Start
```bash
docker-compose down -v
docker-compose up --build
```

### Port Conflicts
```bash
# Check what's using the port
lsof -i :3000
lsof -i :5000

# Or change ports in docker-compose.yml
```

### MongoDB Issues
```bash
# Check MongoDB logs
docker-compose logs mongodb

# Restart MongoDB
docker-compose restart mongodb
```

### Clean Everything
```bash
# Remove all containers, volumes, images
make clean
# or
docker-compose down -v --rmi all
```

## 🔒 Security Notes

1. **Never commit `.env`** - Contains API keys
2. **Use secrets** in production (Docker secrets, env files)
3. **Update images regularly**: `docker-compose pull`
4. **Scan for vulnerabilities**: `docker scan`
5. **Run as non-root** user (already configured)

## 📈 Next Steps

1. ✅ Set your Gemini API key in `.env`
2. ✅ Start with `docker-compose up --build`
3. ✅ Open http://localhost:3000
4. ✅ Upload a file and test
5. ✅ Deploy to production when ready

## 💡 Pro Tips

- Use `make` commands for convenience
- Enable BuildKit for faster builds: `export DOCKER_BUILDKIT=1`
- Use `.dockerignore` to reduce build context
- Monitor with `docker stats`
- Use development mode for coding: `make dev`

---

**Ready to go!** 🎉

Run `make install` or `docker-compose up --build` to start!

