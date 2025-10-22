# Authentication Setup Guide

This guide explains how to set up and use the authentication system in the AI Flashcards application.

## Features

✅ **User Registration** - Create accounts with email and password
✅ **User Login** - Sign in with credentials  
✅ **Google OAuth** - Sign in with Google account
✅ **JWT Authentication** - Secure token-based authentication
✅ **User Sessions** - Persistent login sessions
✅ **Protected Routes** - User-specific flashcard sets
✅ **Logout** - Secure sign out functionality

## Architecture

### Backend (Node.js/Express)
- **JWT Tokens**: JSON Web Tokens for stateless authentication
- **bcryptjs**: Password hashing and verification
- **Passport.js**: Google OAuth 2.0 integration
- **MongoDB**: User data storage

### Frontend (React)
- **AuthContext**: Global authentication state management
- **React Router**: Handling OAuth callbacks
- **Axios Interceptors**: Automatic JWT token injection
- **Protected Components**: User-specific UI

## Setup Instructions

### 1. Backend Configuration

#### Install Dependencies

The required packages are already in `package.json`:
```json
"bcryptjs": "^2.4.3"
"jsonwebtoken": "^9.0.2"
"passport": "^0.7.0"
"passport-google-oauth20": "^2.0.0"
"express-session": "^1.17.3"
"cookie-parser": "^1.4.6"
```

#### Environment Variables

Create a `.env` file in the `backend` directory with the following:

```bash
# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
SESSION_SECRET=your_session_secret_change_this_in_production

# Google OAuth (optional - for Google sign-in)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Frontend URL
FRONTEND_URL=http://localhost:3000
```

### 2. Google OAuth Setup (Optional)

If you want to enable "Sign in with Google":

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable **Google+ API**
4. Go to **Credentials** → **Create Credentials** → **OAuth 2.0 Client ID**
5. Configure consent screen if prompted
6. Application type: **Web application**
7. Add authorized redirect URIs:
   - `http://localhost:5000/api/auth/google/callback` (development)
   - `https://yourdomain.com/api/auth/google/callback` (production)
8. Copy the **Client ID** and **Client Secret** to your `.env` file

### 3. Frontend Configuration

#### Install Dependencies

The required packages are already in `package.json`:
```json
"react-router-dom": "^6.20.0"
```

No additional frontend environment variables are needed (uses relative API paths).

### 4. Docker Configuration

Update your `docker-compose.yml` to include the new environment variables:

```yaml
backend:
  environment:
    - JWT_SECRET=${JWT_SECRET}
    - SESSION_SECRET=${SESSION_SECRET}
    - GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID}
    - GOOGLE_CLIENT_SECRET=${GOOGLE_CLIENT_SECRET}
    - FRONTEND_URL=http://localhost:3000
```

## API Endpoints

### Authentication Routes

#### Register
```http
POST /api/auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123"
}
```

Response:
```json
{
  "message": "User registered successfully",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "...",
    "email": "john@example.com",
    "name": "John Doe"
  }
}
```

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "password123"
}
```

Response: Same as register

#### Get Current User
```http
GET /api/auth/me
Authorization: Bearer <token>
```

Response:
```json
{
  "user": {
    "id": "...",
    "email": "john@example.com",
    "name": "John Doe",
    "profilePicture": null
  }
}
```

#### Logout
```http
POST /api/auth/logout
Authorization: Bearer <token>
```

#### Google OAuth
```http
GET /api/auth/google
```
Redirects to Google OAuth consent screen.

Callback:
```http
GET /api/auth/google/callback
```
Handles OAuth callback and redirects to frontend with token.

## Frontend Usage

### AuthContext

The `AuthContext` provides authentication state and methods:

```jsx
import { useAuth } from './contexts/AuthContext';

function MyComponent() {
  const { 
    user,              // Current user object or null
    isAuthenticated,   // Boolean: is user logged in
    loading,           // Boolean: is auth check in progress
    login,             // Function: (email, password) => Promise
    register,          // Function: (name, email, password) => Promise
    logout,            // Function: () => Promise
    loginWithGoogle    // Function: () => void (redirects)
  } = useAuth();

  // Use these in your component
}
```

### Login Component

```jsx
import Login from './components/Login';

function App() {
  const [showLogin, setShowLogin] = useState(false);

  return (
    <>
      <button onClick={() => setShowLogin(true)}>Sign In</button>
      
      {showLogin && (
        <Login 
          onClose={() => setShowLogin(false)}
          onSwitchToRegister={handleSwitchToRegister}
        />
      )}
    </>
  );
}
```

### Register Component

```jsx
import Register from './components/Register';

function App() {
  const [showRegister, setShowRegister] = useState(false);

  return (
    <>
      <button onClick={() => setShowRegister(true)}>Sign Up</button>
      
      {showRegister && (
        <Register 
          onClose={() => setShowRegister(false)}
          onSwitchToLogin={handleSwitchToLogin}
        />
      )}
    </>
  );
}
```

### User Menu

```jsx
import UserMenu from './components/UserMenu';
import { useAuth } from './contexts/AuthContext';

function Header() {
  const { isAuthenticated } = useAuth();

  return (
    <header>
      {isAuthenticated ? (
        <UserMenu />
      ) : (
        <button>Sign In</button>
      )}
    </header>
  );
}
```

## How It Works

### JWT Token Flow

1. **User registers/logs in** → Server generates JWT token
2. **Token stored** in localStorage and axios defaults
3. **Every API request** includes `Authorization: Bearer <token>` header
4. **Backend middleware** verifies token and attaches user to request
5. **User-specific data** is filtered by userId

### Google OAuth Flow

1. **User clicks "Sign in with Google"** → Redirects to `/api/auth/google`
2. **Google consent screen** → User authorizes
3. **Google callback** → `/api/auth/google/callback` receives user data
4. **Backend creates/finds user** → Generates JWT token
5. **Redirect to frontend** → `/auth/callback?token=<jwt>`
6. **Frontend saves token** → Authenticates user

### Password Security

- Passwords are hashed using **bcryptjs** with salt rounds
- Plain text passwords are never stored
- Password comparison uses secure timing-safe comparison
- Minimum password length: 6 characters

## User Association

Flashcard sets are now associated with users:

```javascript
// FlashcardSet model
{
  title: String,
  cards: [Card],
  user: ObjectId,  // Reference to User
  createdAt: Date
}
```

- **Authenticated users**: Only see their own flashcard sets
- **Guest users**: Can still use the app (legacy support)
- **Optional authentication**: App works with or without login

## Security Best Practices

### Production Deployment

1. **Strong Secrets**: Use long, random strings for JWT_SECRET and SESSION_SECRET
   ```bash
   # Generate secure random strings
   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
   ```

2. **HTTPS Only**: Enable secure cookies in production
   ```javascript
   cookie: {
     secure: true,  // Requires HTTPS
     httpOnly: true,
     sameSite: 'strict'
   }
   ```

3. **Environment Variables**: Never commit `.env` files
4. **CORS Configuration**: Restrict allowed origins
   ```javascript
   app.use(cors({
     origin: process.env.FRONTEND_URL,
     credentials: true
   }));
   ```

5. **Rate Limiting**: Add rate limiting to auth endpoints
6. **Token Expiration**: JWT tokens expire after 30 days
7. **Password Requirements**: Enforce strong passwords

## Troubleshooting

### "No authentication token" error
- Check if token is in localStorage: `localStorage.getItem('token')`
- Verify token is sent in request headers
- Token might be expired (30 day expiration)

### Google OAuth not working
- Verify `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are correct
- Check redirect URI matches Google Console configuration
- Ensure Google+ API is enabled

### CORS errors
- Verify `FRONTEND_URL` in backend `.env`
- Check CORS configuration in `server.js`
- Ensure `credentials: true` in axios requests

### Users can't see their flashcards
- Check if `user` field is being set when creating flashcard sets
- Verify JWT token is valid and contains correct userId
- Check MongoDB for user associations

## Testing

### Manual Testing

1. **Register a new user**
   ```bash
   curl -X POST http://localhost:5000/api/auth/register \
     -H "Content-Type: application/json" \
     -d '{"name":"Test User","email":"test@example.com","password":"password123"}'
   ```

2. **Login**
   ```bash
   curl -X POST http://localhost:5000/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","password":"password123"}'
   ```

3. **Get user info**
   ```bash
   curl -X GET http://localhost:5000/api/auth/me \
     -H "Authorization: Bearer <your_token>"
   ```

4. **Test Google OAuth**
   - Visit: `http://localhost:5000/api/auth/google`
   - Should redirect to Google consent screen

## Migration Notes

For existing deployments with data:

1. **User field is optional** - Existing flashcard sets without users will continue to work
2. **Guest access maintained** - App works without authentication
3. **No breaking changes** - All existing functionality preserved
4. **Gradual adoption** - Users can continue as guests or create accounts

## Support

For issues or questions:
1. Check this documentation
2. Review error logs in browser console and server logs
3. Verify environment variables are set correctly
4. Ensure all dependencies are installed

---

**Note**: This authentication system uses JWT tokens stored in localStorage. For enhanced security in production, consider implementing:
- Refresh tokens
- Token rotation
- HTTP-only cookies for token storage
- Two-factor authentication
- Email verification

