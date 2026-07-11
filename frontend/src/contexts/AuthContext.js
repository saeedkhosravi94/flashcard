import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';
import { initInactivityTracker, updateLastActivity, clearInactivityTracking, isInactive } from '../utils/inactivityTracker';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('token'));

  // Configure axios to include token in all requests
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      localStorage.setItem('token', token);
    } else {
      delete axios.defaults.headers.common['Authorization'];
      localStorage.removeItem('token');
    }
  }, [token]);

  // Check if user is logged in on mount
  useEffect(() => {
    const checkAuth = async () => {
      const storedToken = localStorage.getItem('token');
      
      if (storedToken) {
        // Check for inactivity before validating token
        if (isInactive()) {
          // User has been inactive for more than 1 day, log them out
          localStorage.removeItem('token');
          delete axios.defaults.headers.common['Authorization'];
          clearInactivityTracking();
          setLoading(false);
          return;
        }

        try {
          axios.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
          const response = await axios.get('/api/auth/me');
          setUser(response.data.user);
          setToken(storedToken);
          // Update last activity on successful auth
          updateLastActivity();
        } catch (error) {
          localStorage.removeItem('token');
          delete axios.defaults.headers.common['Authorization'];
          clearInactivityTracking();
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  const register = async (name, email, password, recaptchaToken) => {
    try {
      const response = await axios.post('/api/auth/register', {
        name,
        email,
        password,
        recaptchaToken
      });
      
      const { token: newToken, user: newUser } = response.data;
      setToken(newToken);
      setUser(newUser);
      
      // Initialize inactivity tracking on successful registration
      updateLastActivity();
      
      // Trigger storage event for other components to know auth changed
      window.dispatchEvent(new Event('auth-change'));
      
      // Refresh the page to load user data
      window.location.reload();
      
      return { success: true };
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Registration failed';
      return { success: false, error: errorMessage };
    }
  };

  const login = async (email, password, recaptchaToken) => {
    try {
      const response = await axios.post('/api/auth/login', {
        email,
        password,
        recaptchaToken
      });
      
      const { token: newToken, user: newUser } = response.data;
      setToken(newToken);
      setUser(newUser);
      
      // Initialize inactivity tracking on successful login
      updateLastActivity();
      
      // Trigger storage event for other components to know auth changed
      window.dispatchEvent(new Event('auth-change'));
      
      // Refresh the page to load user data
      window.location.reload();
      
      return { success: true };
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Login failed';
      return { success: false, error: errorMessage };
    }
  };

  const logout = async () => {
    try {
      await axios.post('/api/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setToken(null);
      setUser(null);
      localStorage.removeItem('token');
      delete axios.defaults.headers.common['Authorization'];
      
      // Clear inactivity tracking on logout
      clearInactivityTracking();
      
      // Trigger storage event for other components to know auth changed
      window.dispatchEvent(new Event('auth-change'));
    }
  };

  // Initialize inactivity tracker when user is authenticated
  useEffect(() => {
    if (user && token) {
      // Set up inactivity tracking
      const cleanup = initInactivityTracker(() => {
        // User has been inactive for 1 day, log them out
        console.log('Session expired due to inactivity (1 day)');
        // Call logout directly
        setToken(null);
        setUser(null);
        localStorage.removeItem('token');
        delete axios.defaults.headers.common['Authorization'];
        clearInactivityTracking();
        window.dispatchEvent(new Event('auth-change'));
      });

      // Cleanup on unmount or when user logs out
      return cleanup;
    }
  }, [user, token]);

  const value = {
    user,
    loading,
    isAuthenticated: !!user,
    register,
    login,
    logout,
    token
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

