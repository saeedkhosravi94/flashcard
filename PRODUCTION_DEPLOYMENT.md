# Production Deployment Guide for flash.saeedkhosravi.it

## 🚀 Deployment Steps

### Prerequisites on Your Server
- Docker and Docker Compose installed
- Domain `flash.saeedkhosravi.it` pointing to your server IP
- SSL certificates ready (or use Let's Encrypt)
- Ports 80, 443, and 5000 available

---

## Step 1: Prepare SSL Certificates

### Option A: Using Let's Encrypt (Recommended)
```bash
# Install certbot
sudo apt-get update
sudo apt-get install certbot

# Get SSL certificates
sudo certbot certonly --standalone -d flash.saeedkhosravi.it

# Create SSL directory for Docker
mkdir -p nginx/ssl
sudo cp /etc/letsencrypt/live/flash.saeedkhosravi.it/fullchain.pem nginx/ssl/
sudo cp /etc/letsencrypt/live/flash.saeedkhosravi.it/privkey.pem nginx/ssl/
sudo chmod 644 nginx/ssl/*.pem
```

### Option B: Using Existing Certificates
```bash
# Create SSL directory
mkdir -p nginx/ssl

# Copy your certificates
cp /path/to/fullchain.pem nginx/ssl/
cp /path/to/privkey.pem nginx/ssl/
chmod 644 nginx/ssl/*.pem
```

---

## Step 2: Clone Repository on Server

```bash
# Clone your repository
git clone https://github.com/YOUR_USERNAME/Flashcard.git
cd Flashcard

# Or pull latest changes if already cloned
git pull origin main
```

---

## Step 3: Create Environment File

```bash
# Create .env file
nano .env
```

Add the following content (replace with your actual values):

```env
# API Keys
GEMINI_API_KEY=your_actual_gemini_api_key_here

# Security Secrets
# Generate using: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
JWT_SECRET=your_actual_64_character_jwt_secret_here
SESSION_SECRET=your_actual_64_character_session_secret_here

# Google OAuth Configuration
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
```

**Generate secrets on your local machine:**
```bash
# Run this twice to get two different secrets
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

---

## Step 4: Configure Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Select your project or create a new one
3. Go to "Credentials" → "OAuth 2.0 Client IDs"
4. Add these **Authorized redirect URIs**:
   ```
   https://flash.saeedkhosravi.it/api/auth/google/callback
   ```
5. Add **Authorized JavaScript origins**:
   ```
   https://flash.saeedkhosravi.it
   ```
6. Save and copy your Client ID and Client Secret to `.env`

---

## Step 5: Build and Deploy with Docker Compose

```bash
# Build and start containers
docker-compose -f docker-compose.prod.yml up -d --build

# Check if containers are running
docker-compose -f docker-compose.prod.yml ps

# View logs
docker-compose -f docker-compose.prod.yml logs -f
```

---

## Step 6: Verify Deployment

### Check Services
```bash
# Check backend health
curl http://localhost:5000/api/health

# Check frontend
curl http://localhost/health
```

### Access Your App
Open your browser and go to: **https://flash.saeedkhosravi.it**

---

## 🔄 Updating the Application

When you want to deploy updates:

```bash
# Pull latest code
git pull origin main

# Rebuild and restart containers
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d --build

# Or use this one-liner
docker-compose -f docker-compose.prod.yml up -d --build --force-recreate
```

---

## 🔧 Useful Docker Commands

### View Logs
```bash
# All services
docker-compose -f docker-compose.prod.yml logs -f

# Specific service
docker-compose -f docker-compose.prod.yml logs -f backend
docker-compose -f docker-compose.prod.yml logs -f frontend
docker-compose -f docker-compose.prod.yml logs -f mongodb
```

### Restart Services
```bash
# Restart all
docker-compose -f docker-compose.prod.yml restart

# Restart specific service
docker-compose -f docker-compose.prod.yml restart backend
```

### Stop Services
```bash
# Stop all containers
docker-compose -f docker-compose.prod.yml down

# Stop and remove volumes (⚠️ deletes database)
docker-compose -f docker-compose.prod.yml down -v
```

### Access Container Shell
```bash
# Backend
docker exec -it flashcard-backend-prod sh

# Frontend
docker exec -it flashcard-frontend-prod sh

# MongoDB
docker exec -it flashcard-mongodb-prod mongosh flashcard
```

---

## 🗄️ Database Management

### Backup MongoDB
```bash
# Create backup
docker exec flashcard-mongodb-prod mongodump --archive=/data/db/backup.archive --db=flashcard

# Copy backup to host
docker cp flashcard-mongodb-prod:/data/db/backup.archive ./mongodb_backup_$(date +%Y%m%d).archive
```

### Restore MongoDB
```bash
# Copy backup to container
docker cp ./mongodb_backup.archive flashcard-mongodb-prod:/data/db/

# Restore
docker exec flashcard-mongodb-prod mongorestore --archive=/data/db/mongodb_backup.archive --db=flashcard
```

---

## 🔒 Security Checklist

- ✅ SSL certificates installed and configured
- ✅ Strong JWT and session secrets generated
- ✅ Google OAuth callback URL configured correctly
- ✅ Firewall configured (only ports 80, 443, and 22 open)
- ✅ Regular backups scheduled
- ✅ Docker containers set to restart automatically
- ✅ `.env` file not committed to git
- ✅ File upload size limits configured (50MB max)

### Configure Firewall (if using UFW)
```bash
sudo ufw allow 22/tcp   # SSH
sudo ufw allow 80/tcp   # HTTP
sudo ufw allow 443/tcp  # HTTPS
sudo ufw enable
```

---

## 📊 Monitoring

### Check Resource Usage
```bash
# Container stats
docker stats

# Disk usage
docker system df

# Clean up unused resources
docker system prune -a
```

### Set Up Auto-Renewal for SSL (Let's Encrypt)
```bash
# Test renewal
sudo certbot renew --dry-run

# Add cron job for auto-renewal
sudo crontab -e

# Add this line (runs every day at 2am)
0 2 * * * certbot renew --quiet --post-hook "docker-compose -f /path/to/Flashcard/docker-compose.prod.yml restart frontend"
```

---

## 🐛 Troubleshooting

### Issue: Cannot connect to backend
**Solution:**
```bash
# Check if backend is running
docker-compose -f docker-compose.prod.yml ps
docker-compose -f docker-compose.prod.yml logs backend

# Restart backend
docker-compose -f docker-compose.prod.yml restart backend
```

### Issue: SSL certificate errors
**Solution:**
```bash
# Verify certificates exist
ls -la nginx/ssl/

# Check certificate validity
openssl x509 -in nginx/ssl/fullchain.pem -text -noout

# Restart frontend to reload certificates
docker-compose -f docker-compose.prod.yml restart frontend
```

### Issue: Google OAuth not working
**Solution:**
1. Verify callback URL in Google Console: `https://flash.saeedkhosravi.it/api/auth/google/callback`
2. Check environment variables:
   ```bash
   docker exec flashcard-backend-prod env | grep GOOGLE
   ```
3. Ensure FRONTEND_URL and GOOGLE_CALLBACK_URL are correct

### Issue: Database connection failed
**Solution:**
```bash
# Check MongoDB is running
docker-compose -f docker-compose.prod.yml ps mongodb

# Check MongoDB logs
docker-compose -f docker-compose.prod.yml logs mongodb

# Test MongoDB connection
docker exec flashcard-mongodb-prod mongosh --eval "db.adminCommand('ping')"
```

### Issue: CORS errors
**Solution:**
- Verify FRONTEND_URL in backend environment matches your domain
- Check nginx.prod.conf proxy settings
- Clear browser cache and try again

---

## 🎯 Performance Optimization

### Enable Gzip Compression
Already configured in `nginx.prod.conf` ✅

### MongoDB Indexes
```bash
# Connect to MongoDB
docker exec -it flashcard-mongodb-prod mongosh flashcard

# Create indexes for better performance
db.flashcardsets.createIndex({ "userId": 1 })
db.flashcardsets.createIndex({ "createdAt": -1 })
db.users.createIndex({ "email": 1 }, { unique: true })
```

### Monitor and Set Memory Limits
Edit `docker-compose.prod.yml` to add resource limits:
```yaml
services:
  backend:
    deploy:
      resources:
        limits:
          memory: 2G
        reservations:
          memory: 1G
```

---

## 📞 Quick Reference

### Environment Variables
- **GEMINI_API_KEY**: Get from https://makersuite.google.com/app/apikey
- **JWT_SECRET**: Random 64-char string for JWT tokens
- **SESSION_SECRET**: Random 64-char string for sessions
- **GOOGLE_CLIENT_ID**: From Google Cloud Console
- **GOOGLE_CLIENT_SECRET**: From Google Cloud Console

### Important URLs
- **Application**: https://flash.saeedkhosravi.it
- **Google OAuth Callback**: https://flash.saeedkhosravi.it/api/auth/google/callback
- **Backend Health Check**: https://flash.saeedkhosravi.it/api/health

### Docker Compose Files
- **Development**: `docker-compose.yml`
- **Production**: `docker-compose.prod.yml`

---

## ✅ Post-Deployment Checklist

- [ ] Application loads at https://flash.saeedkhosravi.it
- [ ] SSL certificate is valid (no browser warnings)
- [ ] Backend API responds at /api/health
- [ ] Google OAuth login works
- [ ] Can create and view flashcard sets
- [ ] File upload works (test with PDF)
- [ ] AI card generation works (test Gemini API)
- [ ] Dark/light theme toggle works
- [ ] Mobile responsive design works
- [ ] Database persists after container restart
- [ ] Logs are accessible and clean
- [ ] Backups configured and tested

---

## 🎉 Success!

Your flashcard app should now be live at **https://flash.saeedkhosravi.it**!

For any issues, check the logs:
```bash
docker-compose -f docker-compose.prod.yml logs -f
```

Happy studying! 📚✨

