# Authentication Quick Start

## 🚀 Quick Setup (5 minutes)

### 1. Add Environment Variables

Add these to your `.env` file in the project root:

```bash
# Required for authentication
JWT_SECRET=your_super_secret_jwt_key_here
SESSION_SECRET=your_session_secret_here

# Optional - for Google Sign-In
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

**Generate secure secrets:**
```bash
# On macOS/Linux
openssl rand -hex 64

# Or using Node.js
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 2. Start the Application

```bash
# With Docker
docker-compose down
docker-compose up --build

# Or manually
cd backend && npm install && npm run dev
cd frontend && npm install && npm start
```

### 3. Test It Out!

1. Open `http://localhost:3000`
2. Click **"Sign Up"** button in the top-right
3. Create an account
4. Start creating flashcards!

## ✨ Features

### Local Authentication (Email/Password)
- ✅ **Register**: Create account with name, email, and password
- ✅ **Login**: Sign in with your credentials
- ✅ **Logout**: Securely sign out
- ✅ **Session Persistence**: Stay logged in across page refreshes

### Google OAuth (Optional)
- ✅ **Sign in with Google**: One-click authentication
- ✅ **Auto-account linking**: Links Google account to existing email
- ✅ **Profile pictures**: Automatic avatar from Google

### User Features
- ✅ **Private flashcards**: Your flashcards are only visible to you
- ✅ **User menu**: Access your account info
- ✅ **Guest mode**: App still works without login

## 🔐 Google OAuth Setup (Optional)

If you want "Sign in with Google" functionality:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a project
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add redirect URI: `http://localhost:5000/api/auth/google/callback`
6. Copy Client ID and Secret to `.env`

**Without Google OAuth**: The regular email/password authentication will work fine!

## 📱 How to Use

### For Users

**Sign Up:**
1. Click "Sign Up" button
2. Enter name, email, and password (min 6 characters)
3. Click "Sign Up" or "Continue with Google"
4. You're logged in!

**Sign In:**
1. Click "Sign In" button
2. Enter email and password
3. Click "Sign In" or "Continue with Google"

**Sign Out:**
1. Click your avatar/name in top-right
2. Click "Sign Out"

### For Developers

**Check if user is logged in:**
```jsx
import { useAuth } from './contexts/AuthContext';

function MyComponent() {
  const { isAuthenticated, user } = useAuth();
  
  if (isAuthenticated) {
    console.log(`Logged in as: ${user.name}`);
  }
}
```

**Require authentication:**
```jsx
function MyComponent() {
  const { isAuthenticated } = useAuth();
  
  if (!isAuthenticated) {
    return <div>Please sign in</div>;
  }
  
  return <div>Protected content</div>;
}
```

**Make authenticated API calls:**
```jsx
// Tokens are automatically included in all axios requests!
const response = await axios.get('/api/flashcards');
```

## 🔧 Troubleshooting

### "Cannot find module" errors
```bash
cd backend && npm install
cd ../frontend && npm install
```

### Authentication not working
1. Check `.env` file has JWT_SECRET
2. Restart Docker containers: `docker-compose restart`
3. Clear browser localStorage: `localStorage.clear()` in console

### Google OAuth not working
- Google OAuth is optional! You can skip it and use email/password
- If you want it, make sure redirect URI is correct in Google Console
- Check GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are set

### Can't see my flashcards after login
- This is normal! New accounts start with no flashcards
- Create some flashcards - they'll be saved to your account

## 🎯 What's New

The authentication system adds:

1. **User accounts** - Each user has their own flashcard sets
2. **Secure login** - JWT tokens for authentication
3. **Google Sign-In** - Quick OAuth authentication
4. **User profile** - Name and profile picture
5. **Privacy** - Your flashcards are private to you

## 🔒 Security

- ✅ Passwords are hashed with bcrypt
- ✅ JWT tokens for stateless auth
- ✅ Tokens expire after 30 days
- ✅ Secure session management
- ✅ CORS protection
- ✅ SQL injection protection (MongoDB)

## 📚 More Info

For detailed documentation, see [AUTHENTICATION_SETUP.md](./AUTHENTICATION_SETUP.md)

## ❓ FAQ

**Q: Do I need to create an account?**
A: No! The app still works without login (guest mode).

**Q: Is my data secure?**
A: Yes! Passwords are hashed, and communication uses secure protocols.

**Q: Can I use my Google account?**
A: Yes, if you set up Google OAuth. Otherwise, use email/password.

**Q: What if I forget my password?**
A: Currently, there's no password reset. Use Google Sign-In or create a new account.

**Q: Can others see my flashcards?**
A: No, your flashcards are private to your account.

**Q: Do I need to logout?**
A: Not required, but recommended on shared computers.

---

🎉 **That's it!** Start creating flashcards with your new account!

