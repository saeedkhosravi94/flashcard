import React, { useState } from 'react';
import './Flashcard.css';
import LatexRenderer from './LatexRenderer';

function Flashcard({ question, answer, difficulty, onDifficultyChange }) {
  const [isFlipped, setIsFlipped] = useState(false);

  const handleFlip = (e) => {
    // Don't flip if clicking on difficulty buttons
    if (e.target.closest('.card-difficulty-selector')) {
      return;
    }
    setIsFlipped(!isFlipped);
  };

  const handleDifficultyClick = (e, newDifficulty) => {
    e.stopPropagation();
    if (onDifficultyChange) {
      onDifficultyChange(newDifficulty);
    }
  };

  return (
    <div className="flashcard" onClick={handleFlip}>
      <div className={`flashcard-inner ${isFlipped ? 'flipped' : ''}`}>
        <div className="flashcard-front">
          <div className="card-label">Question</div>
          <div className="card-content">
            <LatexRenderer content={question} />
          </div>
          <div className="flip-hint">Click to reveal answer</div>
          
          {/* Difficulty Selector */}
          <div className="card-difficulty-selector">
            <button 
              className={`card-difficulty-btn easy ${(difficulty || 'medium') === 'easy' ? 'active' : ''}`}
              onClick={(e) => handleDifficultyClick(e, 'easy')}
              title="Mark as Easy"
            >
              😊
            </button>
            <button 
              className={`card-difficulty-btn medium ${(difficulty || 'medium') === 'medium' ? 'active' : ''}`}
              onClick={(e) => handleDifficultyClick(e, 'medium')}
              title="Mark as Medium"
            >
              🤔
            </button>
            <button 
              className={`card-difficulty-btn hard ${(difficulty || 'medium') === 'hard' ? 'active' : ''}`}
              onClick={(e) => handleDifficultyClick(e, 'hard')}
              title="Mark as Hard"
            >
              🔥
            </button>
          </div>
        </div>
        <div className="flashcard-back">
          <div className="card-label">Answer</div>
          <div className="card-content">
            <LatexRenderer content={answer} />
          </div>
          <div className="flip-hint">Click to see question</div>
          
          {/* Difficulty Selector */}
          <div className="card-difficulty-selector">
            <button 
              className={`card-difficulty-btn easy ${(difficulty || 'medium') === 'easy' ? 'active' : ''}`}
              onClick={(e) => handleDifficultyClick(e, 'easy')}
              title="Mark as Easy"
            >
              😊
            </button>
            <button 
              className={`card-difficulty-btn medium ${(difficulty || 'medium') === 'medium' ? 'active' : ''}`}
              onClick={(e) => handleDifficultyClick(e, 'medium')}
              title="Mark as Medium"
            >
              🤔
            </button>
            <button 
              className={`card-difficulty-btn hard ${(difficulty || 'medium') === 'hard' ? 'active' : ''}`}
              onClick={(e) => handleDifficultyClick(e, 'hard')}
              title="Mark as Hard"
            >
              🔥
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Flashcard;

