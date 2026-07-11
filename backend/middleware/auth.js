const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Middleware to verify JWT token
const auth = async (req, res, next) => {
  try {
    // Get token from header
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'No authentication token, access denied' });
    }
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key-change-this');
    
    // Find user
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }
    
    // Attach user to request object
    req.user = user;
    req.userId = user._id;
    
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(401).json({ error: 'Token is not valid' });
  }
};

// Optional auth middleware - doesn't fail if no token
const optionalAuth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    console.log('🔐 OptionalAuth - Path:', req.path, 'Has token:', !!token);
    
    if (token) {
      console.log('🔐 Token present, verifying...');
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key-change-this');
      console.log('🔐 Token decoded, userId:', decoded.userId);
      
      const user = await User.findById(decoded.userId);
      
      if (user) {
        req.user = user;
        req.userId = user._id;
        console.log('✅ User authenticated:', user.email, 'ID:', user._id);
      } else {
        console.log('❌ User not found for decoded userId:', decoded.userId);
      }
    } else {
      console.log('ℹ️ No token provided, continuing as guest');
    }
    
    next();
  } catch (error) {
    console.error('⚠️ OptionalAuth error:', error.message);
    // Continue without authentication
    next();
  }
};

module.exports = { auth, optionalAuth };

