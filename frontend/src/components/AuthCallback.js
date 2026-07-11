import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { updateLastActivity } from '../utils/inactivityTracker';

function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const handleCallback = async () => {
      // Get token from URL query parameters
      const params = new URLSearchParams(window.location.search);
      const token = params.get('token');

      if (token) {
        // Save token to localStorage FIRST - this is critical
        localStorage.setItem('token', token);
        
        // Force a synchronous write to ensure token is saved
        // Some browsers may delay localStorage writes
        if (localStorage.getItem('token') !== token) {
          // Retry if not saved
          localStorage.setItem('token', token);
        }
        
        // Set axios default header immediately - BEFORE any requests
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

        // Verify token is valid
        try {
          const response = await axios.get('/api/auth/me');
          if (response.data && response.data.user) {
            // Token is valid - ensure it's saved and reload
            // Double-check token is in localStorage before reload
            localStorage.setItem('token', token);
            
            // Initialize inactivity tracking on successful OAuth login
            updateLastActivity();
            
            // Small delay to ensure localStorage is flushed
            await new Promise(resolve => setTimeout(resolve, 50));
            
            // Verify token is still there before reload
            if (localStorage.getItem('token') === token) {
              // Use window.location.replace to avoid adding to history
              window.location.replace('/');
            } else {
              // If token was lost, save it again and reload
              localStorage.setItem('token', token);
              window.location.replace('/');
            }
          } else {
            throw new Error('Invalid token response');
          }
        } catch (error) {
          console.error('Error verifying token:', error);
          localStorage.removeItem('token');
          delete axios.defaults.headers.common['Authorization'];
          navigate('/?error=auth_failed', { replace: true });
        }
      } else {
        // Check for error in URL
        const error = params.get('error');
        if (error) {
          navigate(`/?error=${error}`, { replace: true });
        } else {
          navigate('/?error=auth_failed', { replace: true });
        }
      }
    };

    handleCallback();
  }, [navigate]);

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      fontSize: '18px',
      color: 'var(--text-primary)'
    }}>
      Completing sign in...
    </div>
  );
}

export default AuthCallback;

