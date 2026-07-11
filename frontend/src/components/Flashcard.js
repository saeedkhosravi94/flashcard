import React, { useState, useRef, useEffect, useCallback } from 'react';
import { FaCircle, FaCircleHalfStroke } from 'react-icons/fa6';
import { FaFire } from 'react-icons/fa';
import './Flashcard.css';
import LatexRenderer from './LatexRenderer';
import { useSettings } from '../contexts/SettingsContext';

function Flashcard({ question, answer, difficulty, onDifficultyChange, onNext, onPrevious, hasNext, hasPrevious, questionImage, answerImage, questionAudio, answerAudio, currentCardNumber, totalCards, navigationDisabled = false }) {
  const { settings } = useSettings();
  const [isFlipped, setIsFlipped] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const flashcardRef = useRef(null);
  const [touchStart, setTouchStart] = useState(null);
  
  // Audio state
  const [isQuestionAudioPlaying, setIsQuestionAudioPlaying] = useState(false);
  const [isAnswerAudioPlaying, setIsAnswerAudioPlaying] = useState(false);
  const questionAudioRef = useRef(null);
  const answerAudioRef = useRef(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const [dynamicFontSize, setDynamicFontSize] = useState('1.25rem');
  const contentRef = useRef(null);

  // Helper function to ensure image path has leading slash
  const formatImagePath = (path) => {
    if (!path) return null;
    // If path doesn't start with /, add it
    return path.startsWith('/') ? path : `/${path}`;
  };

  // Reset flip state when question or answer changes
  useEffect(() => {
    setIsFlipped(false);
  }, [question, answer]);

  // Calculate dynamic font size based on content length
  useEffect(() => {
    const calculateFontSize = () => {
      const currentContent = isFlipped ? answer : question;
      const hasImage = isFlipped ? answerImage : questionImage;
      
      // Get base font size from CSS variable (set by SettingsContext)
      const fontSizes = {
        small: 0.9,
        medium: 1.25,
        large: 1.5,
        'extra-large': 1.75
      };
      const baseFontSize = fontSizes[settings.cardFontSize] || fontSizes.medium;
      
      // Calculate content length (approximate characters)
      const contentLength = currentContent?.length || 0;
      
      // Adjust font size based on content length and whether there's an image
      let scaleFactor = 1;
      
      if (hasImage) {
        // If there's an image, scale down more aggressively
        if (contentLength > 300) scaleFactor = 0.5;
        else if (contentLength > 200) scaleFactor = 0.6;
        else if (contentLength > 100) scaleFactor = 0.7;
        else if (contentLength > 50) scaleFactor = 0.8;
        else scaleFactor = 0.9;
      } else {
        // No image, less aggressive scaling
        if (contentLength > 500) scaleFactor = 0.6;
        else if (contentLength > 300) scaleFactor = 0.7;
        else if (contentLength > 200) scaleFactor = 0.8;
        else if (contentLength > 100) scaleFactor = 0.9;
        else scaleFactor = 1;
      }
      
      // Calculate final font size (minimum 0.75rem)
      const calculatedSize = Math.max(0.75, baseFontSize * scaleFactor);
      setDynamicFontSize(`${calculatedSize}rem`);
    };
    
    calculateFontSize();
  }, [question, answer, isFlipped, questionImage, answerImage, settings.cardFontSize]);

  const handleFlip = (e) => {
    // Don't flip if clicking on difficulty buttons, fullscreen button, or nav buttons
    if (e.target.closest('.card-difficulty-selector') || 
        e.target.closest('.fullscreen-btn') ||
        e.target.closest('.fullscreen-nav-btn')) {
      return;
    }
    setIsFlipped(!isFlipped);
  };

  const handleDifficultyClick = (e, newDifficulty) => {
    // Only preventDefault on click events (touchstart is passive and can't be prevented)
    if (e.type === 'click') {
      e.preventDefault();
    }
    e.stopPropagation();
    
    // Prevent double-firing on touch devices
    if (e.type === 'touchstart') {
      e.target.dataset.touched = 'true';
    } else if (e.type === 'click' && e.target.dataset.touched) {
      e.target.dataset.touched = '';
      return;
    }
    
    if (onDifficultyChange) {
      onDifficultyChange(newDifficulty);
    }
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
  }, [questionAudio, answerAudio]);

  const toggleFullscreen = (e) => {
    e.stopPropagation(); // Prevent card flip
    
    if (!flashcardRef.current) return;
    
    const supportsFullscreen = document.fullscreenEnabled || 
                               document.webkitFullscreenEnabled || 
                               document.mozFullScreenEnabled ||
                               document.msFullscreenEnabled;
    
    if (!isFullscreen) {
      // Try native fullscreen API (works on mobile with WebKit)
      if (supportsFullscreen) {
        // Try standard API first
        if (flashcardRef.current.requestFullscreen) {
          flashcardRef.current.requestFullscreen().catch((err) => {
            console.error('Fullscreen error:', err);
            // Fallback to CSS fullscreen if native fails
            setIsFullscreen(true);
          });
        } 
        // Try WebKit API (for iOS Safari and older browsers)
        else if (flashcardRef.current.webkitRequestFullscreen) {
          flashcardRef.current.webkitRequestFullscreen();
        } 
        // Try Mozilla API
        else if (flashcardRef.current.mozRequestFullScreen) {
          flashcardRef.current.mozRequestFullScreen();
        } 
        // Try MS API
        else if (flashcardRef.current.msRequestFullscreen) {
          flashcardRef.current.msRequestFullscreen();
        }
        // Fallback to CSS fullscreen if no API is available
        else {
          setIsFullscreen(true);
        }
      } else {
        // No fullscreen support, use CSS fallback
        setIsFullscreen(true);
      }
    } else {
      // Exit fullscreen
      if (document.fullscreenElement || document.webkitFullscreenElement || 
          document.mozFullScreenElement || document.msFullscreenElement) {
        // Try standard API first
        if (document.exitFullscreen) {
          document.exitFullscreen().catch((err) => {
            console.error('Exit fullscreen error:', err);
            setIsFullscreen(false);
          });
        } 
        // Try WebKit API
        else if (document.webkitExitFullscreen) {
          document.webkitExitFullscreen();
        } 
        // Try Mozilla API
        else if (document.mozCancelFullScreen) {
          document.mozCancelFullScreen();
        } 
        // Try MS API
        else if (document.msExitFullscreen) {
          document.msExitFullscreen();
        }
        // Fallback
        else {
          setIsFullscreen(false);
        }
      } else {
        // CSS fullscreen fallback
        setIsFullscreen(false);
      }
    }
  };

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isNativeFullscreen = !!(
        document.fullscreenElement || 
        document.webkitFullscreenElement || 
        document.mozFullScreenElement || 
        document.msFullscreenElement
      );
      setIsFullscreen(isNativeFullscreen);
    };

    // Add listeners for all fullscreen API variants
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, []);

  // Prevent body scroll when in fullscreen mode and ensure focus for keyboard events
  useEffect(() => {
    if (isFullscreen) {
      // Prevent scrolling on both body and html
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
      document.body.style.height = '100%';
      document.documentElement.style.overflow = 'hidden';
      
      // Focus on the flashcard container to capture keyboard events
      // Use requestAnimationFrame to ensure focus happens after fullscreen transition
      requestAnimationFrame(() => {
        if (flashcardRef.current) {
          flashcardRef.current.focus();
        }
      });
    } else {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
      document.body.style.height = '';
      document.documentElement.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
      document.body.style.height = '';
      document.documentElement.style.overflow = '';
    };
  }, [isFullscreen]);

  // Handle keyboard navigation in fullscreen mode with debouncing to prevent double-firing
  const navigationInProgressRef = useRef(false);
  
  // Handle keyboard events for non-fullscreen mode (audio playback)
  const handleGlobalKeyDown = useCallback((e) => {
    if (isFullscreen) return; // Fullscreen mode uses handleKeyDown instead
    if (navigationDisabled) return; // Don't handle keyboard events when navigation is disabled (modals open)
    
    // Space: Play audio if available, otherwise do nothing (flip is handled by click)
    if (e.key === ' ') {
      // Only handle if not in an input field
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        return;
      }
      
      e.preventDefault();
      e.stopPropagation();
      
      // If not flipped and question audio exists, play/pause question audio
      if (!isFlipped && questionAudio && questionAudioRef.current) {
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
      else if (isFlipped && answerAudio && answerAudioRef.current) {
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
    }
  }, [isFullscreen, isFlipped, questionAudio, answerAudio, isQuestionAudioPlaying, isAnswerAudioPlaying, navigationDisabled]);
  
  // Add global keyboard listener for non-fullscreen mode
  useEffect(() => {
    if (!isFullscreen) {
      window.addEventListener('keydown', handleGlobalKeyDown);
      return () => {
        window.removeEventListener('keydown', handleGlobalKeyDown);
      };
    }
  }, [isFullscreen, handleGlobalKeyDown]);
  
  const handleKeyDown = (e) => {
    if (!isFullscreen) return;
    if (navigationDisabled) return; // Don't handle keyboard events when navigation is disabled (modals open)
    
    // Prevent double-firing of navigation
    if (navigationInProgressRef.current && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    
    // Navigation: Left/Right arrows (infinite/circular navigation like non-fullscreen)
    if (e.key === 'ArrowLeft' && onPrevious) {
      e.preventDefault();
      e.stopPropagation();
      navigationInProgressRef.current = true;
      onPrevious();
      setTimeout(() => {
        navigationInProgressRef.current = false;
      }, 300);
    } else if (e.key === 'ArrowRight' && onNext) {
      e.preventDefault();
      e.stopPropagation();
      navigationInProgressRef.current = true;
      onNext();
      setTimeout(() => {
        navigationInProgressRef.current = false;
      }, 300);
    } 
    // Flip card: Up/Down arrows or Space
    else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
      e.stopPropagation();
      setIsFlipped(prev => !prev);
    }
    // Space: Play audio if available, otherwise flip
    else if (e.key === ' ') {
      e.preventDefault();
      e.stopPropagation();
      
      // If not flipped and question audio exists, play/pause question audio
      if (!isFlipped && questionAudio && questionAudioRef.current) {
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
      else if (isFlipped && answerAudio && answerAudioRef.current) {
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
      else {
        setIsFlipped(prev => !prev);
      }
    }
    // Difficulty shortcuts: 1, 2, 3
    else if (e.key === '1' && onDifficultyChange) {
      e.preventDefault();
      e.stopPropagation();
      onDifficultyChange('easy');
    } else if (e.key === '2' && onDifficultyChange) {
      e.preventDefault();
      e.stopPropagation();
      onDifficultyChange('medium');
    } else if (e.key === '3' && onDifficultyChange) {
      e.preventDefault();
      e.stopPropagation();
      onDifficultyChange('hard');
    }
    // ESC key already handled by native fullscreen API
    else if (e.key === 'Escape') {
      e.preventDefault();
    }
  };

  // Swipe detection
  const minSwipeDistance = 50;

  const onTouchStart = (e) => {
    if (!isFullscreen) return; // Only handle swipes in fullscreen
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e) => {
    if (!isFullscreen) return;
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!isFullscreen || !touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe && onNext && hasNext) {
      onNext();
    }
    if (isRightSwipe && onPrevious && hasPrevious) {
      onPrevious();
    }
  };

  const handleNavClick = (e, callback) => {
    e.stopPropagation();
    if (callback) {
      callback();
    }
  };

  return (
    <div 
      className={`flashcard ${isFullscreen ? 'css-fullscreen' : ''}`}
      onClick={handleFlip} 
      ref={flashcardRef}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onKeyDown={handleKeyDown}
      data-style={settings.cardStyle}
      tabIndex={isFullscreen ? 0 : -1}
    >
      <button 
        className="fullscreen-btn" 
        onClick={toggleFullscreen}
        title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
      >
        {isFullscreen ? '✕' : '⛶'}
      </button>

      {/* Keyboard shortcuts hint - only show in fullscreen */}
      {isFullscreen && (
        <div className="keyboard-shortcuts-hint">
          <div className="shortcut-item">← → Navigate</div>
          <div className="shortcut-item">↑ ↓ Flip</div>
          <div className="shortcut-item">1 2 3 Difficulty</div>
        </div>
      )}

      {/* Navigation buttons - only show in fullscreen */}
      {isFullscreen && onPrevious && (
        <button 
          className={`fullscreen-nav-btn prev ${!hasPrevious ? 'disabled' : ''}`}
          onClick={(e) => handleNavClick(e, onPrevious)}
          disabled={!hasPrevious}
          title="Previous Card"
        >
          ‹
        </button>
      )}

      {isFullscreen && onNext && (
        <button 
          className={`fullscreen-nav-btn next ${!hasNext ? 'disabled' : ''}`}
          onClick={(e) => handleNavClick(e, onNext)}
          disabled={!hasNext}
          title="Next Card"
        >
          ›
        </button>
      )}

      <div className={`flashcard-inner ${isFlipped ? 'flipped' : ''}`}>
        <div className="flashcard-front">
          <div className="card-label">
            Question
            {currentCardNumber && totalCards && (
              <span className="card-position"> ({currentCardNumber} of {totalCards})</span>
            )}
          </div>
          <div className="card-content" ref={contentRef} style={{ fontSize: dynamicFontSize }}>
            {questionImage && (
              <div className="card-image">
                <img src={formatImagePath(questionImage)} alt={`Flashcard question illustration for: ${question.substring(0, 50)}${question.length > 50 ? '...' : ''}`} />
              </div>
            )}
            <LatexRenderer content={question} />
            {questionAudio && (
              <>
                <audio ref={questionAudioRef} src={formatImagePath(questionAudio)} style={{ display: 'none' }} />
                <button 
                  className="audio-play-btn"
                  onClick={toggleQuestionAudio}
                  title={isQuestionAudioPlaying ? "Pause" : "Play"}
                >
                  {isQuestionAudioPlaying ? '၊၊' : '▶'}
                </button>
              </>
            )}
          </div>
          <div className="flip-hint">Click to reveal answer</div>
          
          {/* Difficulty Selector - Only show if onDifficultyChange is provided */}
          {onDifficultyChange && (
            <div className="card-difficulty-selector">
              <button 
                className={`card-difficulty-btn easy ${(difficulty || 'medium') === 'easy' ? 'active' : ''}`}
                onClick={(e) => handleDifficultyClick(e, 'easy')}
                onTouchStart={(e) => handleDifficultyClick(e, 'easy')}
                title="Mark as Easy"
              >
                <FaCircle />
              </button>
              <button 
                className={`card-difficulty-btn medium ${(difficulty || 'medium') === 'medium' ? 'active' : ''}`}
                onClick={(e) => handleDifficultyClick(e, 'medium')}
                onTouchStart={(e) => handleDifficultyClick(e, 'medium')}
                title="Mark as Medium"
              >
                <FaCircleHalfStroke />
              </button>
              <button 
                className={`card-difficulty-btn hard ${(difficulty || 'medium') === 'hard' ? 'active' : ''}`}
                onClick={(e) => handleDifficultyClick(e, 'hard')}
                onTouchStart={(e) => handleDifficultyClick(e, 'hard')}
                title="Mark as Hard"
              >
                <FaFire />
              </button>
            </div>
          )}
        </div>
        <div className="flashcard-back">
          <div className="card-label">
            Answer
            {currentCardNumber && totalCards && (
              <span className="card-position"> ({currentCardNumber} of {totalCards})</span>
            )}
          </div>
          <div className="card-content" style={{ fontSize: dynamicFontSize }}>
            {answerImage && (
              <div className="card-image">
                <img src={formatImagePath(answerImage)} alt={`Flashcard answer illustration for: ${answer.substring(0, 50)}${answer.length > 50 ? '...' : ''}`} />
              </div>
            )}
            <LatexRenderer content={answer} />
            {answerAudio && (
              <>
                <audio ref={answerAudioRef} src={formatImagePath(answerAudio)} style={{ display: 'none' }} />
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
          <div className="flip-hint">Click to see question</div>
          
          {/* Difficulty Selector - Only show if onDifficultyChange is provided */}
          {onDifficultyChange && (
            <div className="card-difficulty-selector">
              <button 
                className={`card-difficulty-btn easy ${(difficulty || 'medium') === 'easy' ? 'active' : ''}`}
                onClick={(e) => handleDifficultyClick(e, 'easy')}
                onTouchStart={(e) => handleDifficultyClick(e, 'easy')}
                title="Mark as Easy"
              >
                <FaCircle />
              </button>
              <button 
                className={`card-difficulty-btn medium ${(difficulty || 'medium') === 'medium' ? 'active' : ''}`}
                onClick={(e) => handleDifficultyClick(e, 'medium')}
                onTouchStart={(e) => handleDifficultyClick(e, 'medium')}
                title="Mark as Medium"
              >
                <FaCircleHalfStroke />
              </button>
              <button 
                className={`card-difficulty-btn hard ${(difficulty || 'medium') === 'hard' ? 'active' : ''}`}
                onClick={(e) => handleDifficultyClick(e, 'hard')}
                onTouchStart={(e) => handleDifficultyClick(e, 'hard')}
                title="Mark as Hard"
              >
                <FaFire />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Flashcard;

