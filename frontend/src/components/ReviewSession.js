import React, { useState, useEffect, useRef } from 'react';
import { FaCircle, FaCircleHalfStroke } from 'react-icons/fa6';
import { FaFire, FaTimes } from 'react-icons/fa';
import './ReviewSession.css';
import axios from 'axios';
import LatexRenderer from './LatexRenderer';

function ReviewSession({ deckId, deckTitle, onClose, onComplete, mode = 'standard' }) {
  const [loading, setLoading] = useState(true);
  const [cardStartTime, setCardStartTime] = useState(null);
  const [cards, setCards] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [error, setError] = useState(null);
  const [reviewedCount, setReviewedCount] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Audio state
  const [isQuestionAudioPlaying, setIsQuestionAudioPlaying] = useState(false);
  const [isAnswerAudioPlaying, setIsAnswerAudioPlaying] = useState(false);
  const questionAudioRef = useRef(null);
  const answerAudioRef = useRef(null);

  useEffect(() => {
    fetchDueCards();
  }, [deckId, mode]);

  const fetchDueCards = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Try to use scheduled endpoint for priority-based scheduling
      let response;
      try {
        response = await axios.get(`/api/flashcards/${deckId}/review/scheduled`, {
          params: { mode: mode }
        });
        
        if (response.data.scheduled && response.data.scheduled.length > 0) {
          // Get the full deck to find card indices
          const deckResponse = await axios.get(`/api/flashcards/${deckId}`);
          const flashcardSet = deckResponse.data;
          
          const scheduledCards = response.data.scheduled.map((card) => {
            const cardIndex = flashcardSet.cards.findIndex(c => 
              c._id ? c._id.toString() === card._id?.toString() : 
              (c.question === card.question && c.answer === card.answer)
            );
            return {
              ...card,
              cardIndex: cardIndex >= 0 ? cardIndex : 0
            };
          });
          
          setCards(scheduledCards);
          setCardStartTime(Date.now()); // Initialize timer for first card
          setLoading(false);
          return;
        }
      } catch (scheduledErr) {
        // Scheduled endpoint not available, falling back to due endpoint
      }
      
      // Fallback to old endpoint
      response = await axios.get(`/api/flashcards/${deckId}/review/due`);
      
      if (response.data.dueCards.length === 0) {
        onComplete();
        return;
      }
      
      setCards(response.data.dueCards);
      setCardStartTime(Date.now()); // Initialize timer for first card
      setLoading(false);
    } catch (err) {
      console.error('Error fetching due cards:', err);
      setError(err.response?.data?.error || 'Failed to load review cards');
      setLoading(false);
    }
  };

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  // Audio control functions
  const toggleQuestionAudio = (e) => {
    e.stopPropagation();
    e.preventDefault();
    if (questionAudioRef.current) {
      if (isQuestionAudioPlaying) {
        questionAudioRef.current.pause();
        setIsQuestionAudioPlaying(false);
      } else {
        questionAudioRef.current.play().catch(err => {
          console.error('Error playing audio:', err);
        });
        setIsQuestionAudioPlaying(true);
      }
    }
  };

  const toggleAnswerAudio = (e) => {
    e.stopPropagation();
    e.preventDefault();
    if (answerAudioRef.current) {
      if (isAnswerAudioPlaying) {
        answerAudioRef.current.pause();
        setIsAnswerAudioPlaying(false);
      } else {
        answerAudioRef.current.play().catch(err => {
          console.error('Error playing audio:', err);
        });
        setIsAnswerAudioPlaying(true);
      }
    }
  };

  // Handle audio ended event
  useEffect(() => {
    const questionAudio = questionAudioRef.current;
    const answerAudio = answerAudioRef.current;

    const handleQuestionEnded = () => setIsQuestionAudioPlaying(false);
    const handleAnswerEnded = () => setIsAnswerAudioPlaying(false);

    if (questionAudio) {
      questionAudio.addEventListener('ended', handleQuestionEnded);
    }
    if (answerAudio) {
      answerAudio.addEventListener('ended', handleAnswerEnded);
    }

    return () => {
      if (questionAudio) {
        questionAudio.removeEventListener('ended', handleQuestionEnded);
      }
      if (answerAudio) {
        answerAudio.removeEventListener('ended', handleAnswerEnded);
      }
    };
  }, [currentIndex]); // Reset on card change

  // Reset audio playing state when card changes
  useEffect(() => {
    setIsQuestionAudioPlaying(false);
    setIsAnswerAudioPlaying(false);
  }, [currentIndex]);

  const handleDifficultySelect = async (difficulty) => {
    if (isSubmitting) return;
    
    try {
      setIsSubmitting(true);
      const currentCard = cards[currentIndex];
      
      // Calculate response time (from when card was shown to when answer was selected)
      const responseTime = cardStartTime ? Date.now() - cardStartTime : null;
      
      // Update review status on server with response time
      await axios.post(`/api/flashcards/${deckId}/review/update`, {
        cardIndex: currentCard.cardIndex,
        difficulty: difficulty,
        responseTime: responseTime
      });

      setReviewedCount(prev => prev + 1);

      // Move to next card or finish
      if (currentIndex < cards.length - 1) {
        setCurrentIndex(prev => prev + 1);
        setIsFlipped(false);
        setCardStartTime(Date.now()); // Reset timer for next card
        setIsSubmitting(false);
      } else {
        // Completed all cards - close immediately
        setIsSubmitting(false);
        onComplete();
      }
    } catch (err) {
      console.error('Error updating review:', err);
      alert('Failed to save review progress. Please try again.');
      setIsSubmitting(false);
    }
  };

  const handleKeyPress = (e) => {
    if (isSubmitting) return;
    
    const currentCard = cards[currentIndex];
    
    if (e.key === ' ') {
      e.preventDefault();
      
      // If not flipped and question audio exists, play/pause question audio
      if (!isFlipped && currentCard?.questionAudio && questionAudioRef.current) {
        if (isQuestionAudioPlaying) {
          questionAudioRef.current.pause();
          setIsQuestionAudioPlaying(false);
        } else {
          questionAudioRef.current.play().catch(err => {
            console.error('Error playing audio:', err);
          });
          setIsQuestionAudioPlaying(true);
        }
      }
      // If flipped and answer audio exists, play/pause answer audio
      else if (isFlipped && currentCard?.answerAudio && answerAudioRef.current) {
        if (isAnswerAudioPlaying) {
          answerAudioRef.current.pause();
          setIsAnswerAudioPlaying(false);
        } else {
          answerAudioRef.current.play().catch(err => {
            console.error('Error playing audio:', err);
          });
          setIsAnswerAudioPlaying(true);
        }
      }
      // Otherwise, flip the card
      else if (!isFlipped) {
        handleFlip();
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (!isFlipped) {
        handleFlip();
      }
    } else if (isFlipped) {
      if (e.key === '1') {
        handleDifficultySelect('hard');
      } else if (e.key === '2') {
        handleDifficultySelect('medium');
      } else if (e.key === '3') {
        handleDifficultySelect('easy');
      }
    }
  };

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isFlipped, isSubmitting, currentIndex, cards, isQuestionAudioPlaying, isAnswerAudioPlaying]);

  if (loading) {
    return (
      <div className="review-session-fullscreen">
        <div className="review-loading-state">
          <div className="book-loader"></div>
          <p>Loading review cards...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="review-session-fullscreen">
        <button className="review-close-btn" onClick={onClose}>
          ✕
        </button>
        <div className="review-error-state">
          <FaTimes className="error-icon" />
          <h2>Error Loading Cards</h2>
          <p>{error}</p>
          <button className="retry-btn" onClick={fetchDueCards}>
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (cards.length === 0) {
    return null; // Will trigger onComplete in useEffect
  }

  const currentCard = cards[currentIndex];
  const progress = ((currentIndex + 1) / cards.length) * 100;

  return (
    <div className="review-session-fullscreen">
      {/* Header */}
      <div className="review-header">
        <div className="review-header-left">
          <h1 className="review-deck-title" title={deckTitle}>
            {(() => {
              // Truncate on mobile (max 20 characters)
              const isMobile = window.innerWidth <= 500;
              if (isMobile && deckTitle.length > 20) {
                return deckTitle.substring(0, 20) + '...';
              }
              return deckTitle;
            })()}
          </h1>
          <div className="review-progress-text">
            Card {currentIndex + 1} of {cards.length}
          </div>
        </div>
        <button className="review-close-btn" onClick={onClose} title="Exit Review">
          ✕
        </button>
      </div>

      {/* Progress Bar */}
      <div className="review-progress-bar">
        <div className="review-progress-fill" style={{ width: `${progress}%` }}></div>
      </div>

      {/* Card Display */}
      <div className="review-card-container">
        <div 
          className={`review-card ${isFlipped ? 'flipped' : ''}`}
          onClick={!isFlipped ? handleFlip : undefined}
        >
          <div className="review-card-inner">
            {/* Front (Question) */}
            <div className="review-card-face review-card-front">
              <div className="review-card-label">Question</div>
              <div className="review-card-content">
                {currentCard.questionImage && (
                  <img 
                    src={currentCard.questionImage.startsWith('/') ? currentCard.questionImage : `/${currentCard.questionImage}`} 
                    alt="Question" 
                    className="review-card-image"
                  />
                )}
                <div className="review-card-text">
                  <LatexRenderer content={currentCard.question} />
                </div>
                {currentCard.questionAudio && (
                  <>
                    <audio ref={questionAudioRef} src={currentCard.questionAudio.startsWith('/') ? currentCard.questionAudio : `/${currentCard.questionAudio}`} style={{ display: 'none' }} />
                    <button 
                      className="audio-play-btn"
                      onClick={toggleQuestionAudio}
                      onTouchStart={toggleQuestionAudio}
                      onTouchEnd={(e) => e.preventDefault()}
                      title={isQuestionAudioPlaying ? "Pause" : "Play"}
                      aria-label={isQuestionAudioPlaying ? "Pause audio" : "Play audio"}
                    >
                      {isQuestionAudioPlaying ? '၊၊' : '▶'}
                    </button>
                  </>
                )}
              </div>
              <div className="review-flip-hint">
                Click or press Space to reveal answer
              </div>
            </div>

            {/* Back (Answer) */}
            <div className="review-card-face review-card-back">
              <div className="review-card-label">Answer</div>
              <div className="review-card-content">
                {currentCard.answerImage && (
                  <img 
                    src={currentCard.answerImage.startsWith('/') ? currentCard.answerImage : `/${currentCard.answerImage}`} 
                    alt="Answer" 
                    className="review-card-image"
                  />
                )}
                <div className="review-card-text">
                  <LatexRenderer content={currentCard.answer} />
                </div>
                {currentCard.answerAudio && (
                  <>
                    <audio ref={answerAudioRef} src={currentCard.answerAudio.startsWith('/') ? currentCard.answerAudio : `/${currentCard.answerAudio}`} style={{ display: 'none' }} />
                    <button 
                      className="audio-play-btn"
                      onClick={toggleAnswerAudio}
                      onTouchStart={toggleAnswerAudio}
                      onTouchEnd={(e) => e.preventDefault()}
                      title={isAnswerAudioPlaying ? "Pause" : "Play"}
                      aria-label={isAnswerAudioPlaying ? "Pause audio" : "Play audio"}
                    >
                      {isAnswerAudioPlaying ? '၊၊' : '▶'}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Difficulty Buttons (shown when flipped) */}
      {isFlipped && (
        <div className="review-difficulty-buttons">
          <button 
            className="difficulty-btn hard"
            onClick={() => handleDifficultySelect('hard')}
            disabled={isSubmitting}
          >
            <FaFire className="difficulty-icon" />
            <span className="difficulty-label">Hard</span>
            <span className="keyboard-hint">Press 1</span>
          </button>

          <button 
            className="difficulty-btn medium"
            onClick={() => handleDifficultySelect('medium')}
            disabled={isSubmitting}
          >
            <FaCircleHalfStroke className="difficulty-icon" />
            <span className="difficulty-label">Medium</span>
            <span className="keyboard-hint">Press 2</span>
          </button>

          <button 
            className="difficulty-btn easy"
            onClick={() => handleDifficultySelect('easy')}
            disabled={isSubmitting}
          >
            <FaCircle className="difficulty-icon" />
            <span className="difficulty-label">Easy</span>
            <span className="keyboard-hint">Press 3</span>
          </button>
        </div>
      )}

      {/* Keyboard Shortcuts Info */}
      <div className="review-shortcuts">
        <span>Space/Enter: Flip Card</span>
        {isFlipped && <span>1: Hard • 2: Medium • 3: Easy</span>}
      </div>
    </div>
  );
}

export default ReviewSession;

