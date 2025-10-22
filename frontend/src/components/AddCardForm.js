import React, { useState } from 'react';
import './AddCardForm.css';
import LatexRenderer from './LatexRenderer';

function AddCardForm({ flashcardSetId, onCardAdded, onCancel }) {
  const [mode, setMode] = useState('manual'); // 'manual' or 'ai'
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [section, setSection] = useState('');
  const [difficulty, setDifficulty] = useState('medium');
  const [aiTopic, setAiTopic] = useState('');
  const [aiGeneratedCard, setAiGeneratedCard] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGenerateAI = async () => {
    if (!aiTopic.trim()) {
      setError('Please enter a topic or prompt for AI generation');
      return;
    }

    if (aiTopic.trim().length < 5) {
      setError('Topic is too short. Please provide at least 5 characters.');
      return;
    }

    setLoading(true);
    setError('');
    setAiGeneratedCard(null);

    try {
      const response = await fetch(`/api/flashcards/${flashcardSetId}/cards/generate-ai`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          topic: aiTopic.trim(),
          section: section.trim() || 'AI Generated'
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to generate AI card');
      }

      const data = await response.json();
      
      // Store the generated card for preview
      setAiGeneratedCard(data.card);
      setShowPreview(true);
      
      // Reset form
      setAiTopic('');
      setSection('');
      
      // Wait a moment before notifying parent (so user can see the card)
      setTimeout(() => {
        if (onCardAdded) {
          onCardAdded(data);
        }
      }, 1500);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!question.trim() || !answer.trim()) {
      setError('Both question and answer are required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`/api/flashcards/${flashcardSetId}/cards`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: question.trim(),
          answer: answer.trim(),
          section: section.trim() || 'Custom Cards',
          difficulty: difficulty
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to add card');
      }

      const data = await response.json();
      
      // Reset form
      setQuestion('');
      setAnswer('');
      setSection('');
      setDifficulty('medium');
      setShowPreview(false);
      
      // Notify parent component
      if (onCardAdded) {
        onCardAdded(data);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleModeSwitch = (newMode) => {
    setMode(newMode);
    setError('');
    setShowPreview(false);
    setAiGeneratedCard(null);
  };

  return (
    <div className="add-card-overlay" onClick={onCancel}>
      <div className="add-card-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>➕ Add Flashcard</h2>
          <button className="close-button" onClick={onCancel}>✕</button>
        </div>

        {/* Mode Switcher */}
        <div className="mode-switcher">
          <button
            type="button"
            className={`mode-button ${mode === 'manual' ? 'active' : ''}`}
            onClick={() => handleModeSwitch('manual')}
          >
            ✍️ Manual Entry
          </button>
          <button
            type="button"
            className={`mode-button ${mode === 'ai' ? 'active' : ''}`}
            onClick={() => handleModeSwitch('ai')}
          >
            🤖 AI Generated
          </button>
        </div>

        {mode === 'ai' ? (
          // AI Mode
          <div className="ai-mode-content">
            <div className="form-group">
              <label htmlFor="aiTopic">
                What would you like to learn about?
                <span className="ai-hint">💡 Enter a topic, concept, or question</span>
              </label>
              <textarea
                id="aiTopic"
                value={aiTopic}
                onChange={(e) => setAiTopic(e.target.value)}
                placeholder="e.g., 'Photosynthesis process', 'Pythagorean theorem', 'French Revolution causes'..."
                rows="3"
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="aiSection">
                Section/Category (Optional)
              </label>
              <input
                type="text"
                id="aiSection"
                value={section}
                onChange={(e) => setSection(e.target.value)}
                placeholder="e.g., Biology, Mathematics, History"
                disabled={loading}
              />
            </div>

            {aiGeneratedCard && (
              <div className="ai-success">
                <div className="success-icon">✨</div>
                <p>AI card generated successfully!</p>
              </div>
            )}

            {error && (
              <div className="error-message">
                ❌ {error}
              </div>
            )}

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
                type="button"
                className="submit-button ai-generate-button"
                onClick={handleGenerateAI}
                disabled={loading || !aiTopic.trim()}
              >
                {loading ? '✨ Generating...' : '🤖 Generate with AI'}
              </button>
            </div>

            {aiGeneratedCard && (
              <div className="preview-section">
                <h3>Generated Card Preview</h3>
                <div className="preview-cards">
                  <div className="preview-card question-preview">
                    <div className="preview-label">Question</div>
                    <LatexRenderer content={aiGeneratedCard.question} />
                  </div>
                  <div className="preview-card answer-preview">
                    <div className="preview-label">Answer</div>
                    <LatexRenderer content={aiGeneratedCard.answer} />
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          // Manual Mode
          <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="question">
              Question
              <span className="latex-hint">💡 Use $...$ for inline math, $$...$$ for equations</span>
            </label>
            <textarea
              id="question"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Enter your question here... (e.g., What is $E = mc^2$?)"
              rows="4"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="answer">
              Answer
              <span className="latex-hint">💡 LaTeX supported</span>
            </label>
            <textarea
              id="answer"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Enter your answer here... (e.g., Einstein's mass-energy equivalence: $$E = mc^2$$)"
              rows="5"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="section">
              Section/Category (Optional)
            </label>
            <input
              type="text"
              id="section"
              value={section}
              onChange={(e) => setSection(e.target.value)}
              placeholder="e.g., Physics, Chapter 5, Custom Notes"
            />
          </div>

          <div className="form-group">
            <label htmlFor="difficulty">
              Difficulty Level
            </label>
            <div className="difficulty-selector">
              <button
                type="button"
                className={`difficulty-btn easy ${difficulty === 'easy' ? 'active' : ''}`}
                onClick={() => setDifficulty('easy')}
              >
                😊 Easy
              </button>
              <button
                type="button"
                className={`difficulty-btn medium ${difficulty === 'medium' ? 'active' : ''}`}
                onClick={() => setDifficulty('medium')}
              >
                🤔 Medium
              </button>
              <button
                type="button"
                className={`difficulty-btn hard ${difficulty === 'hard' ? 'active' : ''}`}
                onClick={() => setDifficulty('hard')}
              >
                🔥 Hard
              </button>
            </div>
          </div>

          <div className="form-actions">
            <button
              type="button"
              className="preview-button"
              onClick={() => setShowPreview(!showPreview)}
            >
              {showPreview ? '📝 Hide Preview' : '👁️ Show Preview'}
            </button>
          </div>

          {showPreview && (question.trim() || answer.trim()) && (
            <div className="preview-section">
              <h3>Preview</h3>
              <div className="preview-cards">
                {question.trim() && (
                  <div className="preview-card question-preview">
                    <div className="preview-label">Question</div>
                    <LatexRenderer content={question} />
                  </div>
                )}
                {answer.trim() && (
                  <div className="preview-card answer-preview">
                    <div className="preview-label">Answer</div>
                    <LatexRenderer content={answer} />
                  </div>
                )}
              </div>
            </div>
          )}

          {error && (
            <div className="error-message">
              ❌ {error}
            </div>
          )}

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
              disabled={loading || !question.trim() || !answer.trim()}
            >
              {loading ? 'Adding...' : '✓ Add Card'}
            </button>
          </div>

          <div className="latex-help">
            <details>
              <summary>📚 LaTeX Quick Reference</summary>
              <div className="latex-examples">
                <p><strong>Inline Math:</strong> <code>$x^2 + y^2 = z^2$</code></p>
                <p><strong>Block Equations:</strong> <code>$$\frac{"{-b \\pm \\sqrt{b^2-4ac}}"}{"{2a}"}$$</code></p>
                <p><strong>Greek Letters:</strong> <code>$\alpha, \beta, \gamma, \pi$</code></p>
                <p><strong>Subscripts/Superscripts:</strong> <code>$H_2O$, $x^2$</code></p>
                <p><strong>Fractions:</strong> <code>$\frac{"{a}"}{"{b}"}$</code></p>
                <p><strong>Square Root:</strong> <code>$\sqrt{"{x}"}$</code></p>
                <p><strong>Summation:</strong> <code>$\sum_{"{i=1}"}^{"{n}"} x_i$</code></p>
              </div>
            </details>
          </div>
        </form>
        )}
      </div>
    </div>
  );
}

export default AddCardForm;

