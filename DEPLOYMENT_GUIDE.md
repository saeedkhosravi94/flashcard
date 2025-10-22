# Deployment Guide for AI Flashcard App

This guide covers multiple deployment options for your full-stack flashcard application.

## 🎯 Recommended Deployment Options

### Option 1: Railway (Easiest - Recommended for Beginners)
**Best for:** Quick deployment with minimal configuration
**Cost:** Free tier available, ~$5-20/month for production

#### Steps:
1. **Push to GitHub** (already done!)
2. **Go to [Railway.app](https://railway.app)** and sign up
3. **Create New Project** → "Deploy from GitHub repo"
4. **Select your Flashcard repository**
5. **Railway will auto-detect** your Docker setup
6. **Add Environment Variables** in Railway dashboard:
   ```
   GEMINI_API_KEY=your_gemini_api_key
   JWT_SECRET=your_random_secret_key
   SESSION_SECRET=your_session_secret
   GOOGLE_CLIENT_ID=your_google_client_id (if using OAuth)
   GOOGLE_CLIENT_SECRET=your_google_client_secret
   NODE_ENV=production
   ```
7. **Deploy!** Railway will automatically deploy your app

**Pros:**
- Automatic HTTPS
- Built-in MongoDB (or connect to MongoDB Atlas)
- Auto-deploys on git push
- Easy environment variable management

---

### Option 2: Render (Great Balance)
**Best for:** Production apps with good free tier
**Cost:** Free tier available (with limitations), ~$7-25/month for production

#### Steps:
1. Go to [Render.com](https://render.com)
2. Sign up and connect GitHub
3. Create **three services**:

   **A. MongoDB (Database)**
   - Click "New +" → "MongoDB"
   - Name: flashcard-db
   - Note down the connection string

   **B. Backend (Web Service)**
   - Click "New +" → "Web Service"
   - Connect your repo
   - Root Directory: `backend`
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Environment Variables:
     ```
     MONGODB_URI=<your_render_mongodb_connection_string>
     GEMINI_API_KEY=your_key
     JWT_SECRET=your_secret
     SESSION_SECRET=your_session_secret
     NODE_ENV=production
     PORT=5000
     FRONTEND_URL=<your_frontend_url_after_deployment>
     ```

   **C. Frontend (Static Site)**
   - Click "New +" → "Static Site"
   - Connect your repo
   - Root Directory: `frontend`
   - Build Command: `npm install && npm run build`
   - Publish Directory: `build`
   - Environment Variables:
     ```
     REACT_APP_BACKEND_URL=<your_backend_url>
     ```

**Pros:**
- Free tier includes SSL
- Good for separate frontend/backend
- Automatic deployments
- Better for scaling

---

### Option 3: DigitalOcean App Platform
**Best for:** Professional deployment with more control
**Cost:** ~$12-30/month

#### Steps:
1. Go to [DigitalOcean](https://www.digitalocean.com)
2. Create account and go to "Apps"
3. Click "Create App" → Connect GitHub
4. Select your repository
5. DigitalOcean will detect your docker-compose.yml
6. Add environment variables similar to Railway
7. Deploy!

**Pros:**
- Professional infrastructure
- Good documentation
- Docker support
- Scalable

---

### Option 4: Vercel (Frontend) + Railway/Render (Backend)
**Best for:** Blazing fast frontend
**Cost:** Free frontend, ~$5-15/month backend

#### Frontend on Vercel:
1. Go to [Vercel.com](https://vercel.com)
2. Import your GitHub repository
3. Framework: React
4. Root Directory: `frontend`
5. Build Command: `npm run build`
6. Output Directory: `build`
7. Environment Variables:
   ```
   REACT_APP_BACKEND_URL=<your_backend_url>
   ```

#### Backend on Railway/Render:
Follow the backend steps from Option 1 or 2

**Pros:**
- Lightning-fast frontend with CDN
- Automatic SSL
- Great DX

---

### Option 5: Self-Hosted VPS (Advanced)
**Best for:** Complete control, cost optimization
**Cost:** ~$5-20/month (DigitalOcean Droplet, Linode, etc.)

#### Steps:
1. **Get a VPS** (e.g., DigitalOcean Droplet, $6/month)
2. **SSH into your server**
3. **Install Docker and Docker Compose**:
   ```bash
   curl -fsSL https://get.docker.com -o get-docker.sh
   sudo sh get-docker.sh
   sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
   sudo chmod +x /usr/local/bin/docker-compose
   ```

4. **Clone your repository**:
   ```bash
   git clone https://github.com/yourusername/Flashcard.git
   cd Flashcard
   ```

5. **Create .env file**:
   ```bash
   nano .env
   ```
   Add:
   ```
   GEMINI_API_KEY=your_key
   JWT_SECRET=your_secret
   SESSION_SECRET=your_session_secret
   GOOGLE_CLIENT_ID=your_google_id
   GOOGLE_CLIENT_SECRET=your_google_secret
   ```

6. **Update docker-compose.yml for production**:
   - Change `NODE_ENV=production`
   - Update `FRONTEND_URL` to your domain
   - Remove development volumes

7. **Deploy with Docker Compose**:
   ```bash
   docker-compose up -d
   ```

8. **Set up Nginx as reverse proxy** (optional but recommended):
   ```bash
   sudo apt install nginx certbot python3-certbot-nginx
   ```

9. **Get SSL certificate**:
   ```bash
   sudo certbot --nginx -d yourdomain.com
   ```

**Pros:**
- Full control
- Can be cheaper at scale
- Learn DevOps

**Cons:**
- More maintenance
- Need to manage security updates
- Need domain and DNS setup

---

## 📋 Pre-Deployment Checklist

Before deploying, make sure you:

1. ✅ **Create .env file** with all required variables
2. ✅ **Get Gemini API Key** from [Google AI Studio](https://makersuite.google.com/app/apikey)
3. ✅ **Generate JWT secrets**:
   ```bash
   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
   ```
4. ✅ **Set up MongoDB**:
   - Use MongoDB Atlas (free tier): https://www.mongodb.com/cloud/atlas
   - Or use provider's managed MongoDB
5. ✅ **Configure CORS** in backend for your frontend URL
6. ✅ **Update environment URLs** (frontend URL in backend, backend URL in frontend)
7. ✅ **Test locally** with production-like settings
8. ✅ **Set up Google OAuth** (if using):
   - Go to [Google Cloud Console](https://console.cloud.google.com)
   - Create OAuth 2.0 credentials
   - Add authorized redirect URIs

---

## 🔐 Environment Variables Reference

### Backend (.env):
```env
# Database
MONGODB_URI=mongodb://localhost:27017/flashcard

# Server
PORT=5000
NODE_ENV=production

# API Keys
GEMINI_API_KEY=your_gemini_api_key_here

# Security
JWT_SECRET=your_64_char_random_string
SESSION_SECRET=your_64_char_random_string

# OAuth (Optional)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Frontend URL (for CORS)
FRONTEND_URL=https://your-frontend-domain.com
```

### Frontend (.env):
```env
REACT_APP_BACKEND_URL=https://your-backend-domain.com
```

---

## 🚀 Quick Start with Railway (Recommended)

1. **Create .env file** locally with your secrets
2. **Push to GitHub** (already done!)
3. **Go to Railway.app** → New Project → Deploy from GitHub
4. **Select Flashcard repo**
5. **Add environment variables** from the reference above
6. **Deploy!**
7. **Copy your deployment URL**
8. **Update FRONTEND_URL** in backend env vars
9. **Update REACT_APP_BACKEND_URL** in frontend env vars
10. **Redeploy if needed**

Your app will be live in ~5-10 minutes! 🎉

---

## 📊 Database Options

### MongoDB Atlas (Recommended)
- **Free tier**: 512MB storage
- **Setup**: https://www.mongodb.com/cloud/atlas/register
- **Connection string**: Use in MONGODB_URI

### Railway MongoDB
- **Included** in Railway deployment
- **Automatic** connection

### Render MongoDB
- **$7/month** minimum
- **Managed** and secure

---

## 🔧 Production Optimizations

### 1. Create Production Docker Compose
Create `docker-compose.prod.yml`:
```yaml
services:
  mongodb:
    image: mongo:7.0
    restart: always
    environment:
      MONGO_INITDB_DATABASE: flashcard
    volumes:
      - mongodb_data:/data/db
    networks:
      - flashcard-network

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    restart: always
    environment:
      - PORT=5000
      - MONGODB_URI=mongodb://mongodb:27017/flashcard
      - NODE_ENV=production
    env_file:
      - .env
    depends_on:
      - mongodb
    networks:
      - flashcard-network
    command: npm start

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    restart: always
    ports:
      - "80:80"
    depends_on:
      - backend
    networks:
      - flashcard-network

volumes:
  mongodb_data:

networks:
  flashcard-network:
    driver: bridge
```

### 2. Frontend Build Optimization
Update `frontend/Dockerfile` for production:
```dockerfile
FROM node:18-alpine as build
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### 3. Backend Production Settings
Ensure `backend/server.js` has:
- Proper error handling
- Request rate limiting
- Security headers (helmet)
- CORS with specific origins

---

## 🆘 Troubleshooting

### Issue: CORS errors
**Solution**: Make sure `FRONTEND_URL` in backend matches your actual frontend URL

### Issue: MongoDB connection failed
**Solution**: Check `MONGODB_URI` is correct and MongoDB is accessible

### Issue: Environment variables not loading
**Solution**: Verify env vars are set in deployment platform, not just in .env file

### Issue: Build fails
**Solution**: Check Node version compatibility (use Node 18+)

---

## 📞 Support & Monitoring

Consider adding:
- **Sentry** for error tracking
- **LogRocket** for user session replay
- **Google Analytics** for usage stats
- **UptimeRobot** for monitoring uptime

---

## 🎯 My Recommendation

**For beginners**: Start with **Railway** - it's the easiest and handles everything for you.

**For production apps**: Use **Render** or **DigitalOcean App Platform** - good balance of ease and control.

**For learning/control**: Go with **VPS + Docker** - you'll learn a lot!

Choose based on your:
- Budget
- Technical expertise
- Scaling needs
- Time to deploy

Good luck with your deployment! 🚀

