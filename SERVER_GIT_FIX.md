# Server Git Pull Troubleshooting Guide

If `git pull` on your server isn't working, follow these steps:

## Quick Diagnostic

Run these commands on your server:

```bash
# 1. Check current status
git status

# 2. Check which branch you're on
git branch

# 3. Fetch latest changes
git fetch origin

# 4. Compare local vs remote
git log HEAD..origin/main --oneline

# 5. Check if you have uncommitted changes
git diff --stat
```

## Common Issues and Solutions

### Issue 1: Uncommitted Changes

**Symptom:** `git pull` says "error: Your local changes to the following files would be overwritten by merge"

**Solution:**
```bash
# Option A: Stash changes (save for later)
git stash
git pull origin main
git stash pop  # Restore your changes

# Option B: Commit changes first
git add .
git commit -m "Server changes"
git pull origin main

# Option C: Discard local changes (⚠️ WARNING: This will delete your changes)
git reset --hard HEAD
git pull origin main
```

### Issue 2: Detached HEAD State

**Symptom:** Git says "HEAD detached at..."

**Solution:**
```bash
git checkout main
git pull origin main
```

### Issue 3: Server is on Different Branch

**Symptom:** You're on a branch other than `main`

**Solution:**
```bash
git checkout main
git pull origin main
```

### Issue 4: Local Branch Diverged from Remote

**Symptom:** Git says "Your branch and 'origin/main' have diverged"

**Solution:**
```bash
# Option A: Reset to match remote (⚠️ WARNING: This will discard local commits)
git fetch origin
git reset --hard origin/main

# Option B: Merge remote changes
git pull origin main --no-rebase

# Option C: Rebase local changes on top of remote
git pull origin main --rebase
```

### Issue 5: Server Has Merge Conflicts

**Symptom:** Git says "Merge conflict in..."

**Solution:**
```bash
# Resolve conflicts manually, then:
git add .
git commit -m "Resolve merge conflicts"
git push origin main
```

## Force Update Server to Match Remote

If you want to force the server to match the remote repository exactly (discarding any local changes):

```bash
# ⚠️ WARNING: This will delete all uncommitted changes and local commits
git fetch origin
git reset --hard origin/main
git clean -fd  # Remove untracked files
```

## Recommended Server Update Script

Create a script on your server for safe updates:

```bash
#!/bin/bash
# update-server.sh

cd /path/to/your/flashcard/project

# Check if there are uncommitted changes
if [ -n "$(git status --porcelain)" ]; then
    echo "⚠️  Uncommitted changes detected. Stashing..."
    git stash
    STASHED=true
else
    STASHED=false
fi

# Fetch and pull
git fetch origin
git pull origin main

# Restore stashed changes if any
if [ "$STASHED" = true ]; then
    echo "Restoring stashed changes..."
    git stash pop
fi

echo "✅ Server updated successfully!"
```

Make it executable:
```bash
chmod +x update-server.sh
```

Then run:
```bash
./update-server.sh
```

## Verify Update

After pulling, verify you're up to date:

```bash
# Check current commit
git log --oneline -1

# Compare with remote
git fetch origin
git log HEAD..origin/main --oneline

# Should show nothing if you're up to date
```

## If Nothing Works

If `git pull` still doesn't work, try:

```bash
# 1. Check git configuration
git config --list | grep remote

# 2. Check if you have the correct permissions
ls -la .git

# 3. Try pulling with verbose output
git pull origin main --verbose

# 4. Check if there are file permission issues
ls -la

# 5. As last resort, clone fresh (backup first!)
cd ..
mv flashcard flashcard-backup
git clone git@github.com:saeedkhosravi94/flashcard.git
# Copy your .env and other config files from backup
```


