import React, { useState, useRef, useEffect } from 'react';
import { FaFire, FaBolt, FaBook, FaBullseye, FaMoon } from 'react-icons/fa';
import './ReviewPage.css';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';

function ReviewPage({ onReviewDeck, onReviewStatsUpdate }) {
  const [reviewStats, setReviewStats] = useState({ decksWithDueCards: [], totalDueCards: 0 });
  const [loadingReview, setLoadingReview] = useState(false);
  const { isAuthenticated } = useAuth();

  // Fetch review statistics when component mounts
  useEffect(() => {
    if (isAuthenticated) {
      fetchReviewStats();
    }
  }, [isAuthenticated]);

  // Expose fetchReviewStats function to parent via callback
  useEffect(() => {
    if (onReviewStatsUpdate) {
      onReviewStatsUpdate(fetchReviewStats);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onReviewStatsUpdate]);

  const fetchReviewStats = async () => {
    try {
      setLoadingReview(true);
      const response = await axios.get('/api/flashcards/review/stats');
      setReviewStats(response.data);
    } catch (err) {
      console.error('Error fetching review stats:', err);
    } finally {
      setLoadingReview(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="review-page">
        <div className="review-page-content">
          <div className="review-page-empty">
            <FaFire className="review-empty-icon" />
            <h2>Sign in to Review</h2>
            <p>Please sign in to access your review cards</p>
          </div>
        </div>
      </div>
    );
  }

  if (loadingReview) {
    return (
      <div className="review-page">
        <div className="review-page-content">
          <div className="review-loading-state">
            <div className="book-loader"></div>
            <p>Loading review cards...</p>
          </div>
        </div>
      </div>
    );
  }

  if (reviewStats.decksWithDueCards.length === 0) {
    return (
      <div className="review-page">
        <div className="review-page-content">
          <div className="review-page-empty">
            <FaFire className="review-empty-icon" />
            <h2>No Cards Due</h2>
            <p>Great job! You're all caught up. No cards need review right now.</p>
            <p className="review-empty-subtext">Come back later to review more cards!</p>
          </div>
        </div>
      </div>
    );
  }

  // Filter to only show decks with cards due > 0 (extra safety check)
  const validDecks = reviewStats.decksWithDueCards.filter(deck => deck.dueCount > 0);
  const displayDecks = validDecks.slice(0, 10);
  const remainingCount = validDecks.length - 10;

  return (
    <div className="review-page">
      <div className="review-page-content">
        <div className="review-today-section">
          <div className="review-today-header">
            <div className="review-today-title">
              <FaFire className="review-icon" />
              <h3>Review Today</h3>
            </div>
            <div className="review-today-badge">
              {reviewStats.totalDueCards} {reviewStats.totalDueCards === 1 ? 'card' : 'cards'} due
            </div>
          </div>
          
          <div className="review-decks-list">
            {displayDecks.map(deck => (
              <div 
                key={deck._id} 
                className="review-deck-row"
              >
                <div className="review-deck-main">
                  <div className="review-deck-info">
                    <h4 className="review-deck-title">{deck.title}</h4>
                    <div className="review-deck-stats">
                      <span className="due-count">{deck.dueCount} due</span>
                      <span className="total-count">of {deck.totalCards}</span>
                    </div>
                  </div>
                </div>
                <div className="review-mode-buttons">
                  <button 
                    className="review-mode-btn quick"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onReviewDeck) {
                        const deckWithMode = { ...deck, reviewMode: 'quick' };
                        onReviewDeck(deckWithMode);
                      }
                    }}
                    title="Quick Review (10 min, ~20 cards)"
                  >
                    <FaBolt className="mode-icon" />
                    <span className="mode-label">Quick</span>
                  </button>
                  <button 
                    className="review-mode-btn standard"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onReviewDeck) {
                        const deckWithMode = { ...deck, reviewMode: 'standard' };
                        onReviewDeck(deckWithMode);
                      }
                    }}
                    title="Standard Review (All due cards)"
                  >
                    <FaBook className="mode-icon" />
                    <span className="mode-label">Standard</span>
                  </button>
                  <button 
                    className="review-mode-btn focus"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onReviewDeck) {
                        const deckWithMode = { ...deck, reviewMode: 'focus' };
                        onReviewDeck(deckWithMode);
                      }
                    }}
                    title="Focus Review (30 min, ~50 cards)"
                  >
                    <FaBullseye className="mode-icon" />
                    <span className="mode-label">Focus</span>
                  </button>
                  <button 
                    className="review-mode-btn nightly"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onReviewDeck) {
                        const deckWithMode = { ...deck, reviewMode: 'nightly' };
                        onReviewDeck(deckWithMode);
                      }
                    }}
                    title="Nightly Review (15 min, ~30 cards)"
                  >
                    <FaMoon className="mode-icon" />
                    <span className="mode-label">Nightly</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
          
          {remainingCount > 0 && (
            <div className="review-more-info">
              +{remainingCount} more {remainingCount === 1 ? 'deck' : 'decks'} with cards due
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ReviewPage;

