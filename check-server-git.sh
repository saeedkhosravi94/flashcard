#!/bin/bash

# Script to check git status on server
# Run this on your server to diagnose why git pull isn't working

echo "=== Git Status ==="
git status

echo -e "\n=== Current Branch ==="
git branch

echo -e "\n=== Remote URLs ==="
git remote -v

echo -e "\n=== Last 5 Commits (Local) ==="
git log --oneline -5

echo -e "\n=== Last 5 Commits (Remote) ==="
git fetch origin
git log --oneline origin/main -5

echo -e "\n=== Compare Local vs Remote ==="
git log HEAD..origin/main --oneline

echo -e "\n=== Check for uncommitted changes ==="
git diff --stat

echo -e "\n=== Check for untracked files ==="
git ls-files --others --exclude-standard

echo -e "\n=== Recommended Action ==="
LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse origin/main)

if [ "$LOCAL" = "$REMOTE" ]; then
    echo "✅ Local and remote are in sync"
elif [ -n "$(git status --porcelain)" ]; then
    echo "⚠️  You have uncommitted changes. Stash them first:"
    echo "   git stash"
    echo "   git pull"
    echo "   git stash pop"
else
    echo "📥 You are behind remote. Run:"
    echo "   git pull origin main"
    echo ""
    echo "Or if you want to force update to match remote:"
    echo "   git fetch origin"
    echo "   git reset --hard origin/main"
fi


