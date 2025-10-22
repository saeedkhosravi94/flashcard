import React, { useState } from 'react';
import './NewDeckForm.css';

function NewDeckForm({ onDeckCreated, onCancel }) {
  const [title, setTitle] = useState('');
  const [useAI, setUseAI] = useState(false);
  const [description, setDescription] = useState('');
  const [numCards, setNumCards] = useState(25); // Default to 25 cards
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!title.trim()) {
      setError('Deck title is required');
      return;
    }

    if (useAI && !description.trim()) {
      setError('Please provide a topic or description for AI to generate flashcards');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const requestBody = {
        title: title.trim()
      };

      // Add description and numCards if AI generation is enabled
      if (useAI) {
        requestBody.description = description.trim();
        requestBody.numCards = numCards;
      }

      const response = await fetch('/api/flashcards/create-deck', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create deck');
      }

      const newDeck = await response.json();
      
      // Reset form
      setTitle('');
      setDescription('');
      setUseAI(false);
      
      // Notify parent component
      if (onDeckCreated) {
        onDeckCreated(newDeck);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="new-deck-overlay" onClick={onCancel}>
      <div className="new-deck-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>📚 Create New Deck</h2>
          <button className="close-button" onClick={onCancel}>✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="deck-title">
              Deck Name <span className="required">*</span>
            </label>
            <input
              type="text"
              id="deck-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Physics Exam, Spanish Vocabulary, Biology Chapter 5"
              autoFocus
              required
            />
            <p className="helper-text">
              Choose a descriptive name for your flashcard deck
            </p>
          </div>

          <div className="form-group ai-toggle-section">
            <div className="toggle-container">
              <label className="toggle-label">
                <input
                  type="checkbox"
                  checked={useAI}
                  onChange={(e) => setUseAI(e.target.checked)}
                  className="toggle-checkbox"
                />
                <span className="toggle-slider"></span>
                <span className="toggle-text">
                  🤖 Use AI to Generate Flashcards
                </span>
              </label>
            </div>
            <p className="helper-text">
              {useAI 
                ? 'AI will generate flashcards based on your description' 
                : 'Create an empty deck and add cards manually'}
            </p>
          </div>

          {useAI && (
            <div className="form-group ai-description-group">
              <label htmlFor="deck-description">
                Topic / Description <span className="required">*</span>
              </label>
              <textarea
                id="deck-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g., 'The water cycle and its importance in nature' or 'Key events of World War II' or 'Basic concepts of quantum mechanics'"
                rows="6"
                required
                className="description-textarea"
              />
              <p className="helper-text ai-helper">
                💡 Describe the topic you want to learn. Be as detailed as possible - include key concepts, 
                important facts, or specific areas you want to focus on. The AI will generate comprehensive 
                flashcards based on your description.
              </p>
            </div>
          )}

          {useAI && (
            <div className="form-group card-count-group">
              <label htmlFor="num-cards">
                Number of Cards: <span className="card-count-value">{numCards}</span>
              </label>
              <div className="card-count-controls">
                <input
                  type="range"
                  id="num-cards"
                  min="5"
                  max="100"
                  step="5"
                  value={numCards}
                  onChange={(e) => setNumCards(parseInt(e.target.value))}
                  className="card-count-slider"
                />
                <div className="range-labels">
                  <span>5</span>
                  <span>50</span>
                  <span>100</span>
                </div>
              </div>
              <p className="helper-text">
                🎯 Choose how many flashcards you want AI to generate (5-100 cards)
              </p>
            </div>
          )}

          {error && (
            <div className="error-message">
              ❌ {error}
            </div>
          )}

          <div className="info-box">
            <p>
              <strong>{useAI ? '🤖 AI Generation' : '✨ Manual Creation'}</strong>
            </p>
            {useAI ? (
              <div>
                <p>
                  Gemini AI will analyze your description and create up to {numCards} flashcards with:
                </p>
                <ul>
                  <li>🎯 Comprehensive coverage of key concepts</li>
                  <li>📐 LaTeX formatting for math/science notation</li>
                  <li>🧠 Questions at multiple cognitive levels</li>
                  <li>✨ High-quality Q&A pairs for effective learning</li>
                </ul>
              </div>
            ) : (
              <div>
                <p>
                  After creating your deck, you'll be able to:
                </p>
                <ul>
                  <li>➕ Add flashcards manually (one by one)</li>
                  <li>📐 Use LaTeX for math/science notation</li>
                  <li>🏷️ Organize cards with sections</li>
                  <li>💾 Export to CSV anytime</li>
                </ul>
              </div>
            )}
          </div>

          <div className="button-group">
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
              disabled={loading || !title.trim() || (useAI && !description.trim())}
            >
              {loading ? (useAI ? '🤖 AI Generating...' : 'Creating...') : (useAI ? '✨ Generate with AI' : '✓ Create Empty Deck')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default NewDeckForm;

