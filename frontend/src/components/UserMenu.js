import React, { useState, useRef, useEffect } from 'react';
import { FaCopy, FaCheckCircle, FaCog } from 'react-icons/fa';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import './UserMenu.css';

function UserMenu({ onOpenSettings }) {
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [userId, setUserId] = useState('');
  const [copied, setCopied] = useState(false);
  const menuRef = useRef(null);

  // Fetch user ID when menu opens
  useEffect(() => {
    if (isOpen && user && !userId) {
      fetchUserId();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, user]);

  const fetchUserId = async () => {
    try {
      const response = await axios.get('/api/flashcards/share/my-id');
      setUserId(response.data.userId);
    } catch (err) {
      console.error('Error fetching user ID:', err);
    }
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await logout();
    setIsOpen(false);
  };

  const copyUserId = () => {
    if (userId) {
      navigator.clipboard.writeText(userId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const getInitials = (name) => {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name[0].toUpperCase();
  };

  return (
    <div className="user-menu" ref={menuRef}>
      <button 
        className="user-menu-trigger"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="User menu"
      >
        {user.profilePicture ? (
          <img 
            src={user.profilePicture} 
            alt={user.name}
            className="user-avatar-img"
          />
        ) : (
          <div className="user-avatar-placeholder">
            {getInitials(user.name)}
          </div>
        )}
      </button>

      {isOpen && (
        <div className="user-menu-dropdown">
          <div className="user-menu-header">
            <div className="user-info">
              <div className="user-name">{user.name}</div>
              <div className="user-email">{user.email}</div>
            </div>
          </div>

          {userId && (
            <>
              <div className="user-menu-divider"></div>
              <div className="user-id-section">
                <div className="user-id-label">Your User ID:</div>
                <div className="user-id-display">
                  <code className="user-id-code">{userId}</code>
                  <button 
                    className="copy-user-id-btn" 
                    onClick={copyUserId}
                    title="Copy User ID"
                  >
                    {copied ? <FaCheckCircle /> : <FaCopy />}
                  </button>
                </div>
                {copied && (
                  <div className="copied-message">Copied!</div>
                )}
              </div>
            </>
          )}
          
          <div className="user-menu-divider"></div>
          
          {onOpenSettings && (
            <button 
              className="user-menu-item"
              onClick={() => {
                onOpenSettings();
                setIsOpen(false);
              }}
            >
              <FaCog />
              Settings
            </button>
          )}
          
          <div className="user-menu-divider"></div>
          
          <button 
            className="user-menu-item"
            onClick={handleLogout}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
}

export default UserMenu;

