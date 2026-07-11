import React, { useState, useEffect } from 'react';
import { FaTimesCircle, FaCheckCircle, FaFire, FaTimes, FaBolt, FaBook, FaBullseye, FaMoon, FaPlay } from 'react-icons/fa';
import { FaCircle, FaCircleHalfStroke } from 'react-icons/fa6';
import './ReviewModal.css';
import axios from 'axios';

function ReviewModal({ deckId, deckTitle, onClose, onStartReview }) {
  const [loading, setLoading] = useState(true);
  const [dueCount, setDueCount] = useState(0);
  const [totalCards, setTotalCards] = useState(0);
  const [error, setError] = useState(null);
  const [selectedMode, setSelectedMode] = useState('standard');

  useEffect(() => {
    fetchDueCards();
  }, [deckId]);

  const fetchDueCards = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get(`/api/flashcards/${deckId}/review/due`);
      setDueCount(response.data.dueCount);
      setTotalCards(response.data.totalCards);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching due cards:', err);
      setError(err.response?.data?.error || 'Failed to load review information');
      setLoading(false);
    }
  };

  const handleStart = () => {
    if (dueCount > 0) {
      onStartReview(selectedMode);
    }
  };

  return (
    <div className="review-modal-overlay">
      <div className="review-modal" onClick={(e) => e.stopPropagation()}>
        <button className="review-modal-close" onClick={onClose}>
          <FaTimes />
        </button>
        
        <div className="review-modal-content">
          <FaFire className="review-modal-icon" />
          <h2>Review: {deckTitle}</h2>
          
          {loading ? (
            <div className="review-loading">
              <div className="book-loader"></div>
              <p>Loading review cards...</p>
            </div>
          ) : error ? (
            <div className="review-error">
              <p className="error-message"><FaTimesCircle /> {error}</p>
              <button className="retry-button" onClick={fetchDueCards}>
                Try Again
              </button>
            </div>
          ) : (
            <>
              <div className="review-stats">
                <div className="review-stat">
                  <span className="stat-value">{dueCount}</span>
                  <span className="stat-label">Cards Due</span>
                </div>
                <div className="review-stat-divider"></div>
                <div className="review-stat">
                  <span className="stat-value">{totalCards}</span>
                  <span className="stat-label">Total Cards</span>
                </div>
              </div>
              
              {dueCount === 0 ? (
                <div className="no-cards-due">
                  <FaCheckCircle className="celebration-icon" />
                  <p className="no-cards-message">
                    Great job! No cards due for review right now.
                  </p>
                  <p className="next-review-hint">
                    Come back later to review more cards!
                  </p>
                </div>
              ) : (
                <>
                  <div className="review-info">
                    <p>Review these cards to reinforce your learning.</p>
                    
                    {/* Review Mode Selection */}
                    <div className="review-mode-selection">
                      <label className="review-mode-label">Review Mode:</label>
                      <div className="review-mode-options">
                        <button
                          className={`review-mode-btn ${selectedMode === 'quick' ? 'active' : ''}`}
                          onClick={() => setSelectedMode('quick')}
                        >
                          <span className="mode-icon"><FaBolt /></span>
                          <span className="mode-name">Quick</span>
                          <span className="mode-desc">10 min, ~20 cards</span>
                        </button>
                        <button
                          className={`review-mode-btn ${selectedMode === 'standard' ? 'active' : ''}`}
                          onClick={() => setSelectedMode('standard')}
                        >
                          <span className="mode-icon"><FaBook /></span>
                          <span className="mode-name">Standard</span>
                          <span className="mode-desc">All due cards</span>
                        </button>
                        <button
                          className={`review-mode-btn ${selectedMode === 'focus' ? 'active' : ''}`}
                          onClick={() => setSelectedMode('focus')}
                        >
                          <span className="mode-icon"><FaBullseye /></span>
                          <span className="mode-name">Focus</span>
                          <span className="mode-desc">30 min, ~50 cards</span>
                        </button>
                        <button
                          className={`review-mode-btn ${selectedMode === 'nightly' ? 'active' : ''}`}
                          onClick={() => setSelectedMode('nightly')}
                        >
                          <span className="mode-icon"><FaMoon /></span>
                          <span className="mode-name">Nightly</span>
                          <span className="mode-desc">15 min, ~30 cards</span>
                        </button>
                      </div>
                    </div>

                    <div className="review-intervals">
                      <div className="interval-item">
                        <FaCircle className="interval-icon easy" />
                        <span className="interval-text">Easy: Adaptive interval</span>
                      </div>
                      <div className="interval-item">
                        <FaCircleHalfStroke className="interval-icon medium" />
                        <span className="interval-text">Medium: Adaptive interval</span>
                      </div>
                      <div className="interval-item">
                        <FaFire className="interval-icon hard" />
                        <span className="interval-text">Hard: Adaptive interval</span>
                      </div>
                    </div>
                  </div>
                  
                  <button className="start-review-button" onClick={handleStart}>
                    <span className="button-icon"><FaPlay /></span>
                    Start {selectedMode === 'quick' ? 'Quick' : selectedMode === 'focus' ? 'Focus' : selectedMode === 'nightly' ? 'Nightly' : ''} Review
                  </button>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default ReviewModal;

