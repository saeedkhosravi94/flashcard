# ✅ Deployment Configuration Complete for flash.saeedkhosravi.it

## What Has Been Configured

Your application has been fully configured for production deployment on **flash.saeedkhosravi.it** with Google OAuth support.

---

## 🎯 Key Configuration Changes

### 1. **Domain Configuration**
- **Frontend URL**: `https://flash.saeedkhosravi.it`
- **Backend API**: `https://flash.saeedkhosravi.it/api`
- **Google OAuth Callback**: `https://flash.saeedkhosravi.it/api/auth/google/callback`

### 2. **Files Created/Updated**

#### Production Docker Configuration
- ✅ `docker-compose.prod.yml` - Production Docker Compose file
- ✅ `frontend/Dockerfile` - Updated with backend URL build args
- ✅ `frontend/Dockerfile.prod` - Production frontend build
- ✅ `frontend/nginx.prod.conf` - Nginx with SSL and security headers

#### Documentation
- ✅ `PRODUCTION_DEPLOYMENT.md` - Complete deployment guide
- ✅ `env.production.example` - Environment variables template
- ✅ `DEPLOYMENT_GUIDE.md` - Multiple deployment options
- ✅ `QUICK_DEPLOY.md` - Quick deployment guide

---

## 🚀 Next Steps on Your Server

### 1. Pull the Repository
```bash
git clone https://github.com/YOUR_USERNAME/Flashcard.git
cd Flashcard
```

### 2. Set Up SSL Certificates
```bash
# Using Let's Encrypt
sudo certbot certonly --standalone -d flash.saeedkhosravi.it

# Create nginx SSL directory
mkdir -p nginx/ssl
sudo cp /etc/letsencrypt/live/flash.saeedkhosravi.it/fullchain.pem nginx/ssl/
sudo cp /etc/letsencrypt/live/flash.saeedkhosravi.it/privkey.pem nginx/ssl/
sudo chmod 644 nginx/ssl/*.pem
```

### 3. Create .env File
```bash
# Copy the example file
cp env.production.example .env

# Edit with your actual values
nano .env
```

**Required environment variables:**
```env
GEMINI_API_KEY=your_actual_key
JWT_SECRET=generate_64_char_random_string
SESSION_SECRET=generate_64_char_random_string
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

**Generate secrets:**
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 4. Configure Google OAuth
1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Add Authorized redirect URI:
   ```
   https://flash.saeedkhosravi.it/api/auth/google/callback
   ```
3. Add Authorized JavaScript origin:
   ```
   https://flash.saeedkhosravi.it
   ```

### 5. Deploy with Docker
```bash
# Build and start
docker-compose -f docker-compose.prod.yml up -d --build

# Check status
docker-compose -f docker-compose.prod.yml ps

# View logs
docker-compose -f docker-compose.prod.yml logs -f
```

### 6. Verify Deployment
Visit: **https://flash.saeedkhosravi.it**

---

## 📋 Configuration Details

### Docker Compose Production Settings
```yaml
# Frontend: Built with backend URL
REACT_APP_BACKEND_URL=https://flash.saeedkhosravi.it

# Backend Environment:
FRONTEND_URL=https://flash.saeedkhosravi.it
GOOGLE_CALLBACK_URL=https://flash.saeedkhosravi.it/api/auth/google/callback
NODE_ENV=production
```

### Nginx Configuration
- ✅ HTTP to HTTPS redirect
- ✅ SSL/TLS 1.2 and 1.3
- ✅ Security headers (X-Frame-Options, CSP, etc.)
- ✅ Gzip compression
- ✅ API proxy to backend
- ✅ Static file caching
- ✅ 50MB file upload limit
- ✅ Health check endpoint

### Security Features
- ✅ HTTPS enforced
- ✅ Strong SSL ciphers
- ✅ XSS protection headers
- ✅ CORS configured for your domain
- ✅ Secure session and JWT secrets
- ✅ Google OAuth with correct callback

---

## 🔄 Updating Your Deployment

When you make changes:

```bash
# On your local machine
git add -A
git commit -m "Your changes"
git push origin main

# On your server
git pull origin main
docker-compose -f docker-compose.prod.yml up -d --build
```

---

## 📊 Quick Commands Reference

### View Logs
```bash
docker-compose -f docker-compose.prod.yml logs -f
docker-compose -f docker-compose.prod.yml logs -f backend
docker-compose -f docker-compose.prod.yml logs -f frontend
```

### Restart Services
```bash
docker-compose -f docker-compose.prod.yml restart
docker-compose -f docker-compose.prod.yml restart backend
```

### Stop Everything
```bash
docker-compose -f docker-compose.prod.yml down
```

### Backup Database
```bash
docker exec flashcard-mongodb-prod mongodump --archive=/data/db/backup.archive --db=flashcard
docker cp flashcard-mongodb-prod:/data/db/backup.archive ./mongodb_backup_$(date +%Y%m%d).archive
```

---

## ✅ Pre-Deployment Checklist

Before deploying, make sure you have:

- [ ] Domain `flash.saeedkhosravi.it` pointing to your server IP
- [ ] SSL certificates installed in `nginx/ssl/` directory
- [ ] `.env` file created with all required variables
- [ ] Gemini API key obtained
- [ ] JWT and session secrets generated (64 characters each)
- [ ] Google OAuth credentials configured with correct callback URL
- [ ] Docker and Docker Compose installed on server
- [ ] Ports 80 and 443 open in firewall
- [ ] Latest code pulled from GitHub

---

## 🐛 Common Issues & Solutions

### Issue: SSL certificate not found
```bash
# Check if certificates exist
ls -la nginx/ssl/

# Verify certificate paths in nginx.prod.conf
```

### Issue: Can't connect to backend
```bash
# Check backend logs
docker-compose -f docker-compose.prod.yml logs backend

# Verify backend is running
docker-compose -f docker-compose.prod.yml ps
```

### Issue: Google OAuth fails
1. Verify callback URL in Google Console
2. Check GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env
3. Ensure FRONTEND_URL is set correctly

### Issue: CORS errors
- Verify FRONTEND_URL in backend matches your domain
- Check nginx proxy settings
- Clear browser cache

---

## 📞 Support Resources

- **Detailed Guide**: `PRODUCTION_DEPLOYMENT.md`
- **Quick Start**: `QUICK_DEPLOY.md`
- **Environment Template**: `env.production.example`
- **All Options**: `DEPLOYMENT_GUIDE.md`

---

## 🎉 Ready to Deploy!

All configuration is complete. Follow the steps above on your server, and your application will be live at **https://flash.saeedkhosravi.it**!

**Estimated deployment time**: 15-30 minutes (including SSL setup)

Good luck! 🚀📚

