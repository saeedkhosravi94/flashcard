# Environment Variables Template

## Backend Environment Variables

Create a `.env` file in the **backend** directory with these variables:

```bash
# ===================================
# SERVER CONFIGURATION
# ===================================
PORT=5000
NODE_ENV=development

# ===================================
# DATABASE
# ===================================
MONGODB_URI=mongodb://mongodb:27017/flashcard

# ===================================
# AI CONFIGURATION
# ===================================
# Get your API key from: https://makersuite.google.com/app/apikey
GEMINI_API_KEY=your_gemini_api_key_here

# ===================================
# AUTHENTICATION - JWT
# ===================================
# IMPORTANT: Generate secure random strings for production!
# Use: openssl rand -hex 64
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
SESSION_SECRET=your_session_secret_change_this_in_production

# ===================================
# GOOGLE OAUTH (OPTIONAL)
# ===================================
# Required only if you want "Sign in with Google" feature
# Get credentials from: https://console.cloud.google.com/
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here

# ===================================
# FRONTEND URL
# ===================================
# Used for OAuth redirects
FRONTEND_URL=http://localhost:3000
```

## Project Root .env

Create a `.env` file in the **project root** (for Docker Compose):

```bash
# AI Configuration
GEMINI_API_KEY=your_gemini_api_key_here

# Authentication
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
SESSION_SECRET=your_session_secret_change_this_in_production

# Google OAuth (Optional)
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
```

## Generate Secure Secrets

### Using OpenSSL (macOS/Linux):
```bash
openssl rand -hex 64
```

### Using Node.js:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### Using Python:
```bash
python -c "import secrets; print(secrets.token_hex(64))"
```

## Getting Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Navigate to **APIs & Services** → **Credentials**
4. Click **Create Credentials** → **OAuth 2.0 Client ID**
5. Configure the consent screen if prompted
6. For Application type, select **Web application**
7. Add authorized redirect URIs:
   - Development: `http://localhost:5000/api/auth/google/callback`
   - Production: `https://yourdomain.com/api/auth/google/callback`
8. Copy the **Client ID** and **Client Secret**

## Getting Gemini API Key

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click **Create API Key**
4. Copy the API key

## Important Notes

### Security

⚠️ **NEVER commit your .env file to version control!**

The `.env` file should be in your `.gitignore`:
```
.env
.env.local
.env.production
```

### Production vs Development

**Development** (localhost):
- Can use simpler secrets (but still change defaults!)
- HTTP is acceptable
- Localhost URLs work

**Production** (deployed):
- MUST use strong, random secrets (64+ characters)
- MUST use HTTPS
- Update FRONTEND_URL to your domain
- Set NODE_ENV=production
- Use environment secrets management (not .env files)

### Optional Variables

These are optional:
- `GOOGLE_CLIENT_ID` - Only needed for Google OAuth
- `GOOGLE_CLIENT_SECRET` - Only needed for Google OAuth

Without Google OAuth, email/password authentication still works perfectly!

### Example Production Values

```bash
# Production example (use your own values!)
JWT_SECRET=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2
SESSION_SECRET=z9y8x7w6v5u4t3s2r1q0p9o8n7m6l5k4j3i2h1g0f9e8d7c6b5a4z3y2x1w0v9u8
GOOGLE_CLIENT_ID=123456789-abcdefghijklmnop.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-abcdefghijk1234567890
FRONTEND_URL=https://flashcards.yourdomain.com
NODE_ENV=production
```

## Verification

To verify your environment variables are loaded:

```bash
# In backend directory
node -e "require('dotenv').config(); console.log('JWT_SECRET:', process.env.JWT_SECRET ? '✓ Set' : '✗ Missing')"
```

Or add to your code:
```javascript
console.log('Environment check:', {
  JWT_SECRET: !!process.env.JWT_SECRET,
  GEMINI_API_KEY: !!process.env.GEMINI_API_KEY,
  GOOGLE_CLIENT_ID: !!process.env.GOOGLE_CLIENT_ID
});
```

## Troubleshooting

### Variables not loading
1. Check `.env` file is in the correct directory
2. No spaces around `=` sign: `JWT_SECRET=value` not `JWT_SECRET = value`
3. No quotes needed: `JWT_SECRET=myvalue` not `JWT_SECRET="myvalue"`
4. Restart your server after changing `.env`

### Docker not seeing variables
1. Variables must be in project root `.env` for docker-compose
2. Restart containers: `docker-compose down && docker-compose up`
3. Check docker-compose.yml environment section

### Google OAuth not working
1. Verify redirect URI exactly matches Google Console
2. Check both Client ID and Secret are set
3. Make sure protocol (http/https) matches
4. Try clearing browser cache and cookies

