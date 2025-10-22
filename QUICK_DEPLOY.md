# ⚡ Quick Deploy Guide

## Fastest Way to Deploy (5 minutes)

### Step 1: Get Gemini API Key
1. Go to https://makersuite.google.com/app/apikey
2. Click "Create API Key"
3. Copy the key

### Step 2: Deploy on Railway (Recommended)
1. Go to https://railway.app
2. Sign up with GitHub
3. Click "New Project" → "Deploy from GitHub repo"
4. Select your **Flashcard** repository
5. Railway will detect your docker-compose.yml

### Step 3: Add Environment Variables
In Railway dashboard, add these variables:

**For Backend Service:**
```
GEMINI_API_KEY=<paste_your_key>
MONGODB_URI=mongodb://mongodb:27017/flashcard
JWT_SECRET=<generate_random_64_char_string>
SESSION_SECRET=<generate_random_64_char_string>
NODE_ENV=production
PORT=5000
```

**Generate secrets by running this in terminal:**
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### Step 4: Get Your URLs
After deployment:
1. Copy your frontend URL (e.g., `https://flashcard-production.up.railway.app`)
2. Copy your backend URL

### Step 5: Update URLs
**In Backend variables, add:**
```
FRONTEND_URL=<your_frontend_url>
```

**In Frontend variables, add:**
```
REACT_APP_BACKEND_URL=<your_backend_url>
```

### Step 6: Redeploy
Click "Deploy" again to apply the URL changes.

## ✅ Done!
Your app should be live at your Railway URL!

---

## Alternative: MongoDB Atlas (If Railway MongoDB doesn't work)

1. Go to https://www.mongodb.com/cloud/atlas/register
2. Create free cluster
3. Get connection string
4. Replace MONGODB_URI with your Atlas connection string:
   ```
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/flashcard
   ```

---

## Need More Options?
See full [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) for:
- Render deployment
- Vercel deployment  
- DigitalOcean deployment
- Self-hosted VPS setup

---

## Troubleshooting

**CORS Error?**
- Make sure FRONTEND_URL in backend matches your actual frontend URL

**Can't connect to database?**
- Check MONGODB_URI is correct
- Make sure MongoDB service is running

**Build fails?**
- Verify all environment variables are set
- Check logs in Railway dashboard

