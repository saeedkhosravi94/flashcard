#!/bin/bash

# Safe server update script
# This script will update the server to match the remote repository

echo "🔄 Updating server from remote repository..."

# Change to your project directory (update this path)
# cd /path/to/your/flashcard/project

# Check if there are uncommitted changes
if [ -n "$(git status --porcelain)" ]; then
    echo "⚠️  Uncommitted changes detected."
    echo "Stashing changes..."
    git stash save "Server update $(date +%Y-%m-%d_%H-%M-%S)"
    STASHED=true
else
    STASHED=false
    echo "✅ No uncommitted changes"
fi

# Fetch latest changes
echo "📥 Fetching latest changes from remote..."
git fetch origin

# Check current branch
CURRENT_BRANCH=$(git branch --show-current)
echo "📍 Current branch: $CURRENT_BRANCH"

# Switch to main if not already on it
if [ "$CURRENT_BRANCH" != "main" ]; then
    echo "🔄 Switching to main branch..."
    git checkout main
fi

# Reset to match remote (this will discard any local commits)
echo "🔄 Resetting to match remote repository..."
git reset --hard origin/main

# Clean untracked files (optional - uncomment if needed)
# echo "🧹 Cleaning untracked files..."
# git clean -fd

# Restore stashed changes if any
if [ "$STASHED" = true ]; then
    echo "📦 Restoring stashed changes..."
    git stash pop
    if [ $? -ne 0 ]; then
        echo "⚠️  Warning: There were conflicts when restoring stashed changes"
        echo "   Resolve them manually with: git stash list"
    fi
fi

# Show current status
echo ""
echo "✅ Update complete!"
echo "📍 Current commit: $(git log --oneline -1)"
echo ""
echo "📊 Status:"
git status --short


