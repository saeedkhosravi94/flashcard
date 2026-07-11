import React, { useState, useRef } from 'react';
import { FaFire, FaTimesCircle, FaRobot, FaUpload, FaStar, FaEdit, FaLightbulb, FaPlus, FaTimes } from 'react-icons/fa';
import { FaCircle, FaCircleHalfStroke } from 'react-icons/fa6';
import axios from 'axios';
import './AddCardForm.css';
import LatexRenderer from './LatexRenderer';
import TextEditorToolbar from './TextEditorToolbar';

function AddCardForm({ flashcardSetId, onCardAdded, onCancel }) {
  const [mode, setMode] = useState('manual'); // 'manual' or 'ai'
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [difficulty, setDifficulty] = useState('medium');
  const [userInstructions, setUserInstructions] = useState('');
  const [aiGeneratedCard, setAiGeneratedCard] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [questionImage, setQuestionImage] = useState(null);
  const [answerImage, setAnswerImage] = useState(null);
  const [questionImagePreview, setQuestionImagePreview] = useState(null);
  const [answerImagePreview, setAnswerImagePreview] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  
  // Audio states
  const [questionAudio, setQuestionAudio] = useState(null);
  const [answerAudio, setAnswerAudio] = useState(null);
  const [questionAudioName, setQuestionAudioName] = useState('');
  const [answerAudioName, setAnswerAudioName] = useState('');
  const [uploadingAudio, setUploadingAudio] = useState(false);
  
  // Refs for textareas
  const questionTextareaRef = useRef(null);
  const answerTextareaRef = useRef(null);

  const handleGenerateAI = async () => {
    // User instructions are optional - AI will use context from existing cards
    setLoading(true);
    setError('');
    setAiGeneratedCard(null);

    try {
      const requestBody = {
        section: 'AI Generated'
      };
      
      // Add user instructions if provided
      if (userInstructions.trim()) {
        requestBody.customPrompt = userInstructions.trim();
      }
      
      const response = await axios.post(`/api/flashcards/${flashcardSetId}/cards/generate-ai`, requestBody);

      const data = response.data;
      
      // Store the generated card for preview
      setAiGeneratedCard(data.card);
      setShowPreview(true);
      
      // Reset form
      setUserInstructions('');
      
      // Wait a moment before notifying parent (so user can see the card)
      setTimeout(() => {
        if (onCardAdded) {
          onCardAdded(data);
        }
      }, 1500);
    } catch (err) {
      const errorMessage = err.response?.data?.error || err.message;
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (file, type) => {
    if (!file) return null;

    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append('image', file);

      const response = await axios.post(`/api/flashcards/${flashcardSetId}/cards/upload-image`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        }
      });

      return response.data.imagePath;
    } catch (err) {
      const errorMessage = err.response?.data?.error || err.message;
      setError(`Image upload failed: ${errorMessage}`);
      return null;
    } finally {
      setUploadingImage(false);
    }
  };

  const handleQuestionImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setQuestionImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setQuestionImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAnswerImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAnswerImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAnswerImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeQuestionImage = () => {
    setQuestionImage(null);
    setQuestionImagePreview(null);
  };

  const removeAnswerImage = () => {
    setAnswerImage(null);
    setAnswerImagePreview(null);
  };

  // Audio handlers
  const handleAudioUpload = async (file, type) => {
    if (!file) return null;

    setUploadingAudio(true);
    try {
      const formData = new FormData();
      formData.append('audio', file);

      const response = await axios.post(`/api/flashcards/${flashcardSetId}/cards/upload-audio`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        }
      });

      return response.data.audioPath;
    } catch (err) {
      const errorMessage = err.response?.data?.error || err.message;
      setError(`Audio upload failed: ${errorMessage}`);
      return null;
    } finally {
      setUploadingAudio(false);
    }
  };

  const handleQuestionAudioChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setQuestionAudio(file);
      setQuestionAudioName(file.name);
    }
  };

  const handleAnswerAudioChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAnswerAudio(file);
      setAnswerAudioName(file.name);
    }
  };

  const removeQuestionAudio = () => {
    setQuestionAudio(null);
    setQuestionAudioName('');
  };

  const removeAnswerAudio = () => {
    setAnswerAudio(null);
    setAnswerAudioName('');
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
      // Upload images first if they exist
      let questionImagePath = null;
      let answerImagePath = null;

      if (questionImage) {
        questionImagePath = await handleImageUpload(questionImage, 'question');
      }
      if (answerImage) {
        answerImagePath = await handleImageUpload(answerImage, 'answer');
      }

      // Upload audio files if they exist
      let questionAudioPath = null;
      let answerAudioPath = null;

      if (questionAudio) {
        questionAudioPath = await handleAudioUpload(questionAudio, 'question');
      }
      if (answerAudio) {
        answerAudioPath = await handleAudioUpload(answerAudio, 'answer');
      }

      const response = await axios.post(`/api/flashcards/${flashcardSetId}/cards`, {
        question: question.trim(),
        answer: answer.trim(),
        section: 'Custom Cards',
        difficulty: difficulty,
        questionImage: questionImagePath,
        answerImage: answerImagePath,
        questionAudio: questionAudioPath,
        answerAudio: answerAudioPath
      });

      const data = response.data;
      
      // Reset form
      setQuestion('');
      setAnswer('');
      setDifficulty('medium');
      setShowPreview(false);
      setQuestionImage(null);
      setAnswerImage(null);
      setQuestionImagePreview(null);
      setAnswerImagePreview(null);
      setQuestionAudio(null);
      setAnswerAudio(null);
      setQuestionAudioName('');
      setAnswerAudioName('');
      
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
    setUserInstructions('');
  };

  return (
    <div className="add-card-overlay">
      <div className="add-card-modal" onClick={(e) => e.stopPropagation()}>
        {loading && (
          <div className="loading-overlay-inline">
            <div className="loading-content">
              <div className="loader"></div>
              <h3>
                {mode === 'ai' ? (
                  <>
                    <FaRobot style={{ marginRight: '0.5rem' }} />
                    AI is Creating Your Flashcard...
                  </>
                ) : uploadingImage ? (
                  <>
                    <FaUpload style={{ marginRight: '0.5rem' }} />
                    Uploading Image...
                  </>
                ) : (
                  <>
                    <FaStar style={{ marginRight: '0.5rem' }} />
                    Adding Card...
                  </>
                )}
              </h3>
              <p className="loading-subtext">
                {mode === 'ai' && 'Gemini AI is analyzing your topic and creating a high-quality flashcard.'}
                {mode === 'manual' && uploadingImage && 'Uploading your image...'}
                {mode === 'manual' && !uploadingImage && 'Saving your flashcard...'}
              </p>
            </div>
          </div>
        )}
        
        <div className="modal-header">
          <h2>
            <FaPlus style={{ marginRight: '0.5rem' }} />
            Add Flashcard
          </h2>
          <button className="close-button" onClick={onCancel} disabled={loading}>
            <FaTimes />
          </button>
        </div>

        {/* Mode Switcher */}
        <div className="mode-switcher">
          <button
            type="button"
            className={`mode-button ${mode === 'manual' ? 'active' : ''}`}
            onClick={() => handleModeSwitch('manual')}
          >
            <FaEdit style={{ marginRight: '0.5rem' }} />
            Manual Entry
          </button>
          <button
            type="button"
            className={`mode-button ${mode === 'ai' ? 'active' : ''}`}
            onClick={() => handleModeSwitch('ai')}
          >
            <FaRobot style={{ marginRight: '0.5rem' }} />
            AI Generated
          </button>
        </div>

        {mode === 'ai' ? (
          // AI Mode
          <div className="ai-mode-content">
            {/* User Instructions - Make it prominent */}
            <div className="form-group user-instructions-group">
              <label htmlFor="user-instructions">
                <span className="instruction-icon"><FaEdit /></span>
                Your Instructions for AI <span className="optional">(Optional)</span>
              </label>
              <textarea
                id="user-instructions"
                value={userInstructions}
                onChange={(e) => setUserInstructions(e.target.value)}
                placeholder="e.g., 'Create a card about photosynthesis', 'Add a card on advanced calculus concepts', 'Generate a vocabulary card with word, pronunciation, and example sentence', 'Create a card suitable for beginners on this topic'..."
                rows="5"
                className="user-instructions-textarea"
                disabled={loading}
              />
              <p className="helper-text instruction-helper">
                <FaLightbulb style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />
                <strong>Tell the AI what card you want to create.</strong> The AI will analyze your existing cards to understand the deck's topic and style, then generate a new card based on your instructions. If you don't provide instructions, the AI will automatically generate a card that continues the same topic and style as your existing cards.
              </p>
            </div>

            {aiGeneratedCard && (
              <div className="ai-success">
                <div className="success-icon"><FaStar /></div>
                <p>AI card generated successfully!</p>
              </div>
            )}

            {error && (
              <div className="error-message">
                <FaTimesCircle /> {error}
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
                disabled={loading}
              >
                {loading ? (
                  <>
                    <FaStar style={{ marginRight: '0.5rem' }} />
                    Generating...
                  </>
                ) : (
                  <>
                    <FaRobot style={{ marginRight: '0.5rem' }} />
                    Generate with AI
                  </>
                )}
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
              <span className="latex-hint">Use $...$ for inline math, $$...$$ for equations</span>
            </label>
            <TextEditorToolbar
              textareaRef={questionTextareaRef}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
            />
            <textarea
              id="question"
              ref={questionTextareaRef}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Enter your question here... (e.g., What is $E = mc^2$?)"
              rows="4"
              required
              className="with-toolbar"
            />
            
            {/* Question Image Upload */}
            <div className="image-upload-section">
              <label htmlFor="questionImage" className="image-upload-label">
                📷 Add Image to Question (Optional)
              </label>
              <input
                type="file"
                id="questionImage"
                accept="image/*"
                onChange={handleQuestionImageChange}
                style={{ display: 'none' }}
              />
              <label htmlFor="questionImage" className="image-upload-button">
                {questionImagePreview ? 'Change Image' : 'Choose Image'}
              </label>
              {questionImagePreview && (
                <div className="image-preview">
                  <img src={questionImagePreview} alt="Question preview" />
                  <button type="button" className="remove-image-btn" onClick={removeQuestionImage}>
                    ✕ Remove
                  </button>
                </div>
              )}
            </div>

            {/* Question Audio Upload */}
            <div className="audio-upload-section">
              <label htmlFor="questionAudio" className="audio-upload-label">
                🔊 Add Audio to Question (Optional)
              </label>
              <input
                type="file"
                id="questionAudio"
                accept="audio/*"
                onChange={handleQuestionAudioChange}
                style={{ display: 'none' }}
              />
              <label htmlFor="questionAudio" className="audio-upload-button">
                {questionAudioName ? 'Change Audio' : 'Choose Audio'}
              </label>
              {questionAudioName && (
                <div className="audio-preview">
                  <span className="audio-name">🎵 {questionAudioName}</span>
                  <button type="button" className="remove-audio-btn" onClick={removeQuestionAudio}>
                    ✕ Remove
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="answer">
              Answer
              <span className="latex-hint">LaTeX supported</span>
            </label>
            <TextEditorToolbar
              textareaRef={answerTextareaRef}
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
            />
            <textarea
              id="answer"
              ref={answerTextareaRef}
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Enter your answer here... (e.g., Einstein's mass-energy equivalence: $$E = mc^2$$)"
              rows="5"
              required
              className="with-toolbar"
            />
            
            {/* Answer Image Upload */}
            <div className="image-upload-section">
              <label htmlFor="answerImage" className="image-upload-label">
                📷 Add Image to Answer (Optional)
              </label>
              <input
                type="file"
                id="answerImage"
                accept="image/*"
                onChange={handleAnswerImageChange}
                style={{ display: 'none' }}
              />
              <label htmlFor="answerImage" className="image-upload-button">
                {answerImagePreview ? 'Change Image' : 'Choose Image'}
              </label>
              {answerImagePreview && (
                <div className="image-preview">
                  <img src={answerImagePreview} alt="Answer preview" />
                  <button type="button" className="remove-image-btn" onClick={removeAnswerImage}>
                    ✕ Remove
                  </button>
                </div>
              )}
            </div>

            {/* Answer Audio Upload */}
            <div className="audio-upload-section">
              <label htmlFor="answerAudio" className="audio-upload-label">
                🔊 Add Audio to Answer (Optional)
              </label>
              <input
                type="file"
                id="answerAudio"
                accept="audio/*"
                onChange={handleAnswerAudioChange}
                style={{ display: 'none' }}
              />
              <label htmlFor="answerAudio" className="audio-upload-button">
                {answerAudioName ? 'Change Audio' : 'Choose Audio'}
              </label>
              {answerAudioName && (
                <div className="audio-preview">
                  <span className="audio-name">🎵 {answerAudioName}</span>
                  <button type="button" className="remove-audio-btn" onClick={removeAnswerAudio}>
                    ✕ Remove
                  </button>
                </div>
              )}
            </div>
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
                <FaCircle /> Easy
              </button>
              <button
                type="button"
                className={`difficulty-btn medium ${difficulty === 'medium' ? 'active' : ''}`}
                onClick={() => setDifficulty('medium')}
              >
                <FaCircleHalfStroke /> Medium
              </button>
              <button
                type="button"
                className={`difficulty-btn hard ${difficulty === 'hard' ? 'active' : ''}`}
                onClick={() => setDifficulty('hard')}
              >
                <FaFire /> Hard
              </button>
            </div>
          </div>

          <div className="form-actions">
            <button
              type="button"
              className="preview-button"
              onClick={() => setShowPreview(!showPreview)}
            >
              {showPreview ? 'Hide Preview' : 'Show Preview'}
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
                <FaTimesCircle /> {error}
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
              disabled={loading || uploadingImage || !question.trim() || !answer.trim()}
            >
              {uploadingImage ? 'Uploading image...' : loading ? 'Adding...' : '✓ Add Card'}
            </button>
          </div>

          <div className="latex-help">
            <details>
              <summary>LaTeX Quick Reference</summary>
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

