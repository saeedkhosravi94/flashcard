const express = require('express');
const router = express.Router();
const passport = require('../config/passport');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { auth } = require('../middleware/auth');
const { logActivity } = require('../utils/activityLogger');
const { verifyRecaptcha } = require('../utils/recaptcha');

// Generate JWT Token
const generateToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET || 'your-secret-key-change-this',
    { expiresIn: '30d' }
  );
};

// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Public
router.post('/register', async (req, res) => {
  try {
    const { email, password, name, recaptchaToken } = req.body;

    // Validation
    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Please provide all required fields' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Verify reCAPTCHA
    if (recaptchaToken) {
      const recaptchaResult = await verifyRecaptcha(recaptchaToken);
      if (!recaptchaResult.success) {
        return res.status(400).json({ error: 'reCAPTCHA verification failed. Please try again.' });
      }
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    // Create new user
    const user = new User({
      email: email.toLowerCase(),
      password,
      name
    });

    await user.save();

    // Log registration activity
    await logActivity(user._id, 'register', { email: user.email }, req);

    // Generate token
    const token = generateToken(user._id);

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        profilePicture: user.profilePicture
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Error registering user' });
  }
});

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', async (req, res) => {
  try {
    const { email, password, recaptchaToken } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({ error: 'Please provide email and password' });
    }

    // Verify reCAPTCHA
    if (recaptchaToken) {
      const recaptchaResult = await verifyRecaptcha(recaptchaToken);
      if (!recaptchaResult.success) {
        return res.status(400).json({ error: 'reCAPTCHA verification failed. Please try again.' });
      }
    }

    // Find user
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Verify password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Log login activity
    await logActivity(user._id, 'login', { email: user.email }, req);

    // Generate token
    const token = generateToken(user._id);

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        profilePicture: user.profilePicture
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Error logging in' });
  }
});

// @route   GET /api/auth/me
// @desc    Get current user
// @access  Private
router.get('/me', auth, async (req, res) => {
  try {
    res.json({
      user: {
        id: req.user._id,
        email: req.user.email,
        name: req.user.name,
        profilePicture: req.user.profilePicture
      }
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Error fetching user' });
  }
});

// @route   POST /api/auth/logout
// @desc    Logout user
// @access  Private
router.post('/logout', auth, async (req, res) => {
  try {
    // Log logout activity
    await logActivity(req.user._id, 'logout', { email: req.user.email }, req);
    
    // With JWT, logout is handled on the client side by removing the token
    res.json({ message: 'Logout successful' });
  } catch (error) {
    console.error('Logout error:', error);
    res.json({ message: 'Logout successful' }); // Still return success even if logging fails
  }
});

// @route   GET /api/auth/google
// @desc    Initiate Google OAuth login
// @access  Public
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

// @route   GET /api/auth/google/callback
// @desc    Google OAuth callback
// @access  Public
router.get('/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: 'https://activerecaller.com/?error=auth_failed' }),
  async (req, res) => {
    try {
      const user = req.user;
      
      if (!user) {
        console.error('❌ Google OAuth callback: No user object in request');
        const frontendUrl = 'https://activerecaller.com';
        return res.redirect(`${frontendUrl}/?error=auth_failed&reason=no_user`);
      }

      console.log('✅ Google OAuth callback: User authenticated:', user.email, 'ID:', user._id);
      
      // Log login activity
      await logActivity(user._id, 'login', { email: user.email, method: 'google' }, req);

      // Generate JWT token
      const token = jwt.sign(
        { userId: user._id },
        process.env.JWT_SECRET || 'your-secret-key-change-this',
        { expiresIn: '30d' }
      );

      console.log('✅ JWT token generated for user:', user._id);
      console.log('🔗 Redirecting to frontend with token');

      // Redirect to frontend with token
      const frontendUrl = 'https://activerecaller.com';
      const redirectUrl = `${frontendUrl}/auth/callback?token=${token}`;
      console.log('📍 Redirect URL:', redirectUrl.substring(0, 100) + '...');
      
      res.redirect(redirectUrl);
    } catch (error) {
      console.error('❌ Google OAuth callback error:', error);
      console.error('Error stack:', error.stack);
      const frontendUrl = 'https://activerecaller.com';
      res.redirect(`${frontendUrl}/?error=auth_failed&reason=server_error`);
    }
  }
);

module.exports = router;

