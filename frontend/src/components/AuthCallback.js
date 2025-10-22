import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const handleCallback = async () => {
      // Get token from URL query parameters
      const params = new URLSearchParams(window.location.search);
      const token = params.get('token');

      if (token) {
        // Save token to localStorage
        localStorage.setItem('token', token);
        
        // Set axios default header
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

        // Trigger auth change event
        window.dispatchEvent(new Event('auth-change'));

        // Redirect to home page
        window.location.href = '/';
      } else {
        // If no token, redirect to home with error
        navigate('/?error=auth_failed');
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

