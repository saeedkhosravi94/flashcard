#!/bin/bash

# Quick Deploy Script for ActiveRecaller.com
# This deploys the AI model selection feature to production

echo "🚀 Deploying AI Updates to Production..."
echo ""

# Step 1: Commit local changes
echo "📝 Step 1: Committing changes..."
git add .
git commit -m "Add AI model selection to NewDeckForm (Gemini, OpenAI, Claude support)"
git push origin main

echo "✅ Changes pushed to repository"
echo ""

# Step 2: Instructions for production server
echo "📦 Step 2: Deploy on Production Server"
echo ""
echo "Now SSH into your production server and run these commands:"
echo ""
echo "ssh YOUR_SERVER_USER@activerecaller.com"
echo "cd /path/to/flashcard"
echo "git pull origin main"
echo "docker-compose down"
echo "docker-compose build --no-cache backend frontend"
echo "docker-compose up -d"
echo ""
echo "Then verify:"
echo "docker-compose ps"
echo "docker-compose logs backend --tail=20"
echo ""
echo "Test at: https://activerecaller.com"

