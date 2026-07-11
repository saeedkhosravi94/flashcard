import React, { useState } from 'react';
import { FaTimes } from 'react-icons/fa';
import './AICardGenerator.css';

function AICardGenerator({ flashcardSetId, deckTitle, onCardsGenerated, onCancel, onSwitchToManual }) {
  const [numCards, setNumCards] = useState(10);
  const [focus, setFocus] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (numCards < 1 || numCards > 50) {
      setError('Please enter a number between 1 and 50');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`/api/flashcards/${flashcardSetId}/generate-more`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          numCards: parseInt(numCards),
          focus: focus.trim() || null
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to generate cards');
      }

      const data = await response.json();
      
      // Reset form
      setNumCards(10);
      setFocus('');
      
      // Notify parent component
      if (onCardsGenerated) {
        onCardsGenerated(data);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ai-generator-overlay">
      <div className="ai-generator-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>🤖 Generate More Cards with AI</h2>
          <button className="close-button" onClick={onCancel}><FaTimes /></button>
        </div>

        <div className="ai-info">
          <p>Gemini AI will generate more flashcards for your deck:</p>
          <p className="deck-name">"{deckTitle}"</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="num-cards">
              Number of Cards to Generate
            </label>
            <input
              type="number"
              id="num-cards"
              value={numCards}
              onChange={(e) => setNumCards(e.target.value)}
              min="1"
              max="50"
              required
            />
            <p className="helper-text">
              Generate between 1 and 50 flashcards (recommended: 5-15)
            </p>
          </div>

          <div className="form-group">
            <label htmlFor="focus">
              Specific Focus (Optional)
            </label>
            <textarea
              id="focus"
              value={focus}
              onChange={(e) => setFocus(e.target.value)}
              placeholder="e.g., 'Focus on advanced concepts' or 'Include more examples' or 'Cover specific topic X'"
              rows="4"
            />
            <p className="helper-text">
              💡 Leave empty to continue the same topic, or specify what you want the new cards to focus on
            </p>
          </div>

          {error && (
            <div className="error-message">
              ❌ {error}
            </div>
          )}

          <div className="info-box">
            <p>
              <strong>✨ AI will generate:</strong>
            </p>
            <ul>
              <li>🎯 High-quality questions and answers</li>
              <li>📐 LaTeX formatting for formulas</li>
              <li>🧠 Multiple cognitive levels</li>
              <li>🏷️ Automatically tagged as "AI Generated"</li>
            </ul>
          </div>

          <div className="button-group">
            <button
              type="button"
              className="manual-button"
              onClick={onSwitchToManual}
              disabled={loading}
            >
              ✏️ Add Manually Instead
            </button>
            <button
              type="button"
              className="cancel-button"
              onClick={onCancel}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="submit-button"
              disabled={loading || numCards < 1 || numCards > 50}
            >
              {loading ? '🤖 Generating...' : `✨ Generate ${numCards} Card${numCards !== 1 ? 's' : ''}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AICardGenerator;

