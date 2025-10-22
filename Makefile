# Makefile for AI Flashcard Application
# Quick commands for Docker management

.PHONY: help build up down logs clean rebuild dev prod

help: ## Show this help message
	@echo "Available commands:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-15s\033[0m %s\n", $$1, $$2}'

build: ## Build all Docker images
	docker-compose build

up: ## Start all services in background
	docker-compose up -d

down: ## Stop all services
	docker-compose down

logs: ## Show logs from all services
	docker-compose logs -f

clean: ## Remove all containers, volumes, and images
	docker-compose down -v --rmi all

rebuild: ## Rebuild and restart all services
	docker-compose down
	docker-compose up --build -d

dev: ## Start development environment with hot reload
	docker-compose -f docker-compose.dev.yml up --build

prod: ## Start production environment
	docker-compose up -d --build

restart: ## Restart all services
	docker-compose restart

stop: ## Stop all services without removing
	docker-compose stop

start: ## Start existing services
	docker-compose start

ps: ## Show running containers
	docker-compose ps

backend-logs: ## Show backend logs
	docker-compose logs -f backend

frontend-logs: ## Show frontend logs
	docker-compose logs -f frontend

db-logs: ## Show MongoDB logs
	docker-compose logs -f mongodb

shell-backend: ## Open shell in backend container
	docker-compose exec backend sh

shell-frontend: ## Open shell in frontend container
	docker-compose exec frontend sh

shell-db: ## Open MongoDB shell
	docker-compose exec mongodb mongosh

backup-db: ## Backup MongoDB data
	docker-compose exec mongodb mongodump --out=/data/backup
	docker cp flashcard-mongodb:/data/backup ./mongodb_backup_$(shell date +%Y%m%d_%H%M%S)
	@echo "Backup completed!"

restore-db: ## Restore MongoDB from latest backup (requires backup directory)
	@read -p "Enter backup directory path: " backup_dir; \
	docker cp $$backup_dir flashcard-mongodb:/data/restore; \
	docker-compose exec mongodb mongorestore /data/restore

stats: ## Show container resource usage
	docker stats

prune: ## Remove unused Docker resources
	docker system prune -af --volumes

health: ## Check health of all services
	@echo "Checking MongoDB..."
	@curl -s http://localhost:27017 > /dev/null && echo "✓ MongoDB is running" || echo "✗ MongoDB is not responding"
	@echo "Checking Backend..."
	@curl -s http://localhost:5000/api/health > /dev/null && echo "✓ Backend is running" || echo "✗ Backend is not responding"
	@echo "Checking Frontend..."
	@curl -s http://localhost:3000 > /dev/null && echo "✓ Frontend is running" || echo "✗ Frontend is not responding"

install: ## First time setup - build and start everything
	@echo "Creating .env file..."
	@if [ ! -f .env ]; then \
		read -p "Enter your Gemini API key: " api_key; \
		echo "GEMINI_API_KEY=$$api_key" > .env; \
	fi
	@echo "Building and starting services..."
	docker-compose up --build -d
	@echo ""
	@echo "✓ Installation complete!"
	@echo "Open http://localhost:3000 in your browser"

uninstall: ## Remove everything including volumes
	docker-compose down -v --rmi all
	rm -rf mongodb_backup_*
	@echo "Uninstall complete!"

