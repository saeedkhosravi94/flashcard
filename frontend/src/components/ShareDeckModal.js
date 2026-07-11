import React, { useState, useEffect } from 'react';
import { FaShare, FaTimes, FaCheckCircle, FaTimesCircle, FaCopy, FaInfoCircle } from 'react-icons/fa';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import './ShareDeckModal.css';

function ShareDeckModal({ isOpen, onClose, deck, onShareSuccess }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [userIdInput, setUserIdInput] = useState('');
  const [myUserId, setMyUserId] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen && deck) {
      fetchMyUserId();
      setUserIdInput('');
      setError('');
      setSuccess('');
    }
  }, [isOpen, deck]);

  const fetchMyUserId = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/flashcards/share/my-id');
      setMyUserId(response.data.userId);
    } catch (err) {
      console.error('Error fetching user ID:', err);
    } finally {
      setLoading(false);
    }
  };

  const copyUserId = () => {
    if (myUserId) {
      navigator.clipboard.writeText(myUserId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleShare = async () => {
    if (!userIdInput || !userIdInput.trim()) {
      setError('Please enter a User ID');
      return;
    }

    try {
      setSharing(true);
      setError('');
      setSuccess('');
      
      const response = await axios.post(`/api/flashcards/${deck._id}/share`, {
        userId: userIdInput.trim()
      });

      setSuccess(response.data.message);
      
      // Close modal after 1.5 seconds
      setTimeout(() => {
        if (onShareSuccess) onShareSuccess();
        onClose();
        setUserIdInput('');
      }, 1500);
    } catch (err) {
      console.error('Error sharing deck:', err);
      setError(err.response?.data?.error || 'Failed to share deck. Please check the User ID and try again.');
    } finally {
      setSharing(false);
    }
  };

  if (!isOpen || !deck) return null;

  return (
    <div className="share-deck-modal-overlay">
      <div className="share-deck-modal" onClick={(e) => e.stopPropagation()}>
        <div className="share-deck-header">
          <h2>
            <FaShare className="share-icon" />
            Share Deck
          </h2>
          <button className="close-button" onClick={onClose} disabled={sharing}>
            <FaTimes />
          </button>
        </div>

        <div className="share-deck-body">
          <div className="deck-info">
            <p className="deck-title-label">Deck:</p>
            <p className="deck-title">{deck.title}</p>
          </div>

          {/* Show user's own ID */}
          {myUserId && (
            <div className="my-user-id-section">
              <div className="my-user-id-header">
                <FaInfoCircle className="info-icon" />
                <span>Your User ID (share this with others):</span>
              </div>
              <div className="user-id-display">
                <code className="user-id-code">{myUserId}</code>
                <button 
                  className="copy-user-id-btn" 
                  onClick={copyUserId}
                  title="Copy User ID"
                >
                  {copied ? <FaCheckCircle /> : <FaCopy />}
                </button>
              </div>
              {copied && (
                <p className="copied-message">User ID copied to clipboard!</p>
              )}
            </div>
          )}

          <div className="user-selection">
            <label htmlFor="user-id-input">Enter User ID to share with:</label>
            <input
              id="user-id-input"
              type="text"
              value={userIdInput}
              onChange={(e) => {
                setUserIdInput(e.target.value);
                setError('');
              }}
              placeholder="Paste or type User ID here"
              disabled={sharing || loading}
              className="user-id-input"
            />
            <p className="input-hint">Ask the recipient for their User ID to share this deck with them.</p>
          </div>

          {error && (
            <div className="error-message">
              <FaTimesCircle /> {error}
            </div>
          )}

          {success && (
            <div className="success-message">
              <FaCheckCircle /> {success}
            </div>
          )}
        </div>

        <div className="share-deck-footer">
          <button className="cancel-button" onClick={onClose} disabled={sharing}>
            Cancel
          </button>
          <button
            className="share-button"
            onClick={handleShare}
            disabled={sharing || !userIdInput.trim() || loading}
          >
            {sharing ? 'Sharing...' : 'Share Deck'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ShareDeckModal;

