# 🐳 Docker Commands Cheat Sheet

Quick reference for all Docker commands used in this project.

## 🚀 Quick Start

```bash
# Create .env file with your API key
echo "GEMINI_API_KEY=your_api_key_here" > .env

# Start everything
docker-compose up --build

# Or use make (if you have make installed)
make up
```

## 📋 Essential Commands

### Starting & Stopping

```bash
# Start all services (foreground)
docker-compose up

# Start all services (background/detached)
docker-compose up -d

# Start with rebuild
docker-compose up --build

# Stop all services
docker-compose down

# Stop and remove volumes (deletes all data)
docker-compose down -v

# Stop services without removing
docker-compose stop

# Start stopped services
docker-compose start

# Restart services
docker-compose restart
```

### Building

```bash
# Build all images
docker-compose build

# Build specific service
docker-compose build backend
docker-compose build frontend

# Build with no cache
docker-compose build --no-cache

# Pull latest base images and build
docker-compose build --pull
```

### Viewing Logs

```bash
# View all logs
docker-compose logs

# Follow logs (live updates)
docker-compose logs -f

# View specific service logs
docker-compose logs backend
docker-compose logs frontend
docker-compose logs mongodb

# Follow specific service
docker-compose logs -f backend

# Last 100 lines
docker-compose logs --tail=100

# Logs since timestamp
docker-compose logs --since 2024-01-01T00:00:00
```

### Container Management

```bash
# List running containers
docker-compose ps

# List all containers (including stopped)
docker-compose ps -a

# Execute command in running container
docker-compose exec backend sh
docker-compose exec frontend sh
docker-compose exec mongodb mongosh

# Run one-off command
docker-compose run backend npm install
docker-compose run frontend npm test
```

## 🔍 Inspection & Debugging

### Container Status

```bash
# View container details
docker-compose ps

# View resource usage
docker stats

# Inspect specific container
docker inspect flashcard-backend
docker inspect flashcard-frontend
docker inspect flashcard-mongodb

# View container processes
docker-compose top
```

### Network Inspection

```bash
# List networks
docker network ls

# Inspect network
docker network inspect flashcard_flashcard-network

# Test connectivity between containers
docker-compose exec backend ping mongodb
docker-compose exec frontend ping backend
```

### Volume Management

```bash
# List volumes
docker volume ls

# Inspect volume
docker volume inspect flashcard_mongodb_data

# Remove unused volumes
docker volume prune

# Backup volume
docker run --rm -v flashcard_mongodb_data:/data -v $(pwd):/backup alpine tar czf /backup/mongodb_backup.tar.gz /data
```

## 🛠️ Development Commands

### Development Mode with Hot Reload

```bash
# Start development environment
docker-compose -f docker-compose.dev.yml up

# Or with make
make dev
```

### Shell Access

```bash
# Backend shell
docker-compose exec backend sh

# Frontend shell
docker-compose exec frontend sh

# MongoDB shell
docker-compose exec mongodb mongosh

# Root shell (for debugging)
docker-compose exec -u root backend sh
```

### Live Code Updates

```bash
# Backend changes (with volume mount)
# Edit files locally, container auto-reloads

# Frontend changes (with volume mount)
# Edit files locally, React auto-reloads

# Rebuild after package.json changes
docker-compose restart backend
docker-compose restart frontend
```

## 📊 Monitoring

### Health Checks

```bash
# Check backend health
curl http://localhost:5000/api/health

# Check all services
docker-compose ps

# Or use make
make health
```

### Resource Usage

```bash
# Live stats
docker stats

# Specific container
docker stats flashcard-backend

# No stream (single snapshot)
docker stats --no-stream
```

## 🗄️ Database Commands

### MongoDB Operations

```bash
# Access MongoDB shell
docker-compose exec mongodb mongosh

# Inside mongosh:
use flashcard
db.flashcardsets.find()
db.flashcardsets.count()

# Backup database
docker-compose exec mongodb mongodump --out=/data/backup

# Copy backup to host
docker cp flashcard-mongodb:/data/backup ./mongodb_backup

# Restore database
docker cp ./mongodb_backup flashcard-mongodb:/data/restore
docker-compose exec mongodb mongorestore /data/restore

# Or use make
make backup-db
make restore-db
```

## 🧹 Cleanup Commands

### Remove Everything

```bash
# Stop and remove containers, networks
docker-compose down

# Stop and remove containers, networks, volumes
docker-compose down -v

# Stop and remove everything including images
docker-compose down -v --rmi all

# Or use make
make clean
```

### Prune Unused Resources

```bash
# Remove unused containers
docker container prune

# Remove unused images
docker image prune

# Remove unused volumes
docker volume prune

# Remove unused networks
docker network prune

# Remove everything unused
docker system prune -a

# Remove everything including volumes
docker system prune -a --volumes
```

## 🔄 Update & Rebuild

### After Code Changes

```bash
# Rebuild and restart specific service
docker-compose up -d --build backend
docker-compose up -d --build frontend

# Rebuild everything
docker-compose down
docker-compose up --build -d

# Or use make
make rebuild
```

### After Dependency Changes

```bash
# Rebuild with no cache
docker-compose build --no-cache

# Rebuild specific service with no cache
docker-compose build --no-cache backend
```

### Pull Latest Images

```bash
# Pull latest base images
docker-compose pull

# Rebuild with latest
docker-compose build --pull
```

## 🐛 Troubleshooting

### Container Won't Start

```bash
# Check logs
docker-compose logs backend

# Remove and rebuild
docker-compose down
docker-compose up --build

# Check for port conflicts
lsof -i :3000
lsof -i :5000
lsof -i :27017
```

### Clear Everything & Start Fresh

```bash
# Nuclear option - removes everything
docker-compose down -v --rmi all
docker system prune -af --volumes

# Then rebuild
docker-compose up --build
```

### Container Keeps Restarting

```bash
# Check logs
docker-compose logs [service-name]

# Check health
docker-compose ps

# Run without restart policy
docker-compose up --no-recreate
```

## 📦 Production Commands

### Deploy to Production

```bash
# Build production images
docker-compose build

# Tag images
docker tag flashcard-backend:latest registry.example.com/flashcard-backend:v1.0
docker tag flashcard-frontend:latest registry.example.com/flashcard-frontend:v1.0

# Push to registry
docker push registry.example.com/flashcard-backend:v1.0
docker push registry.example.com/flashcard-frontend:v1.0

# Deploy on production server
docker-compose -f docker-compose.yml up -d --no-build
```

### Scale Services

```bash
# Scale backend to 3 instances
docker-compose up -d --scale backend=3

# Scale frontend to 2 instances
docker-compose up -d --scale frontend=2
```

## 🎯 Makefile Shortcuts

If you have `make` installed, use these convenient shortcuts:

```bash
make help           # Show all available commands
make up             # Start all services
make down           # Stop all services
make logs           # View logs
make rebuild        # Rebuild and restart
make dev            # Start development mode
make clean          # Remove everything
make backup-db      # Backup MongoDB
make health         # Check service health
make install        # First time setup
```

## 📝 Useful One-Liners

```bash
# View only error logs
docker-compose logs | grep ERROR

# Count containers
docker-compose ps -q | wc -l

# Get backend IP address
docker inspect -f '{{range.NetworkSettings.Networks}}{{.IPAddress}}{{end}}' flashcard-backend

# Follow logs of multiple services
docker-compose logs -f backend frontend

# Check if MongoDB is ready
docker-compose exec mongodb mongosh --eval "db.adminCommand('ping')"

# Export environment variables
docker-compose config

# Validate docker-compose.yml
docker-compose config --quiet && echo "Valid!" || echo "Invalid!"
```

## 🆘 Emergency Commands

```bash
# Force stop all containers
docker-compose kill

# Remove stuck containers
docker rm -f $(docker ps -aq)

# Clean Docker cache
docker builder prune -af

# Restart Docker daemon (requires sudo)
sudo systemctl restart docker  # Linux
# or restart Docker Desktop app # macOS/Windows
```

---

**Pro Tip:** Add `alias dc='docker-compose'` to your shell profile for faster typing!

Example:
```bash
dc up -d
dc logs -f
dc down
```

