import React, { useState, useEffect, useRef } from 'react';
import { FaFire, FaTimesCircle, FaCheckCircle } from 'react-icons/fa';
import { FaCircle, FaCircleHalfStroke } from 'react-icons/fa6';
import './AddCardForm.css';
import LatexRenderer from './LatexRenderer';
import TextEditorToolbar from './TextEditorToolbar';

function EditCardForm({ flashcardSetId, card, cardIndex, onCardUpdated, onCancel }) {
  const [question, setQuestion] = useState(card.question || '');
  const [answer, setAnswer] = useState(card.answer || '');
  const [section, setSection] = useState(card.section || '');
  const [difficulty, setDifficulty] = useState(card.difficulty || 'medium');
  const [showPreview, setShowPreview] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [questionImage, setQuestionImage] = useState(card.questionImage || null);
  const [answerImage, setAnswerImage] = useState(card.answerImage || null);
  const [questionImagePreview, setQuestionImagePreview] = useState(card.questionImage || null);
  const [answerImagePreview, setAnswerImagePreview] = useState(card.answerImage || null);
  const [uploadingImage, setUploadingImage] = useState(false);
  
  // Refs for textareas
  const questionTextareaRef = useRef(null);
  const answerTextareaRef = useRef(null);

  // Image upload handler
  const handleImageUpload = async (file, type) => {
    if (!file) return null;

    setUploadingImage(true);
    setError('');

    const formData = new FormData();
    formData.append('image', file);

    try {
      const response = await fetch(`/api/flashcards/${flashcardSetId}/cards/upload-image`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to upload image');
      }

      const data = await response.json();
      return data.imagePath;
    } catch (err) {
      setError(`Failed to upload ${type} image: ${err.message}`);
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!question.trim() || !answer.trim()) {
      setError('Both question and answer are required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Upload images if they are new files (not existing URLs)
      let questionImagePath = questionImage;
      let answerImagePath = answerImage;

      if (questionImage && typeof questionImage !== 'string') {
        questionImagePath = await handleImageUpload(questionImage, 'question');
        if (!questionImagePath) {
          throw new Error('Failed to upload question image');
        }
      }

      if (answerImage && typeof answerImage !== 'string') {
        answerImagePath = await handleImageUpload(answerImage, 'answer');
        if (!answerImagePath) {
          throw new Error('Failed to upload answer image');
        }
      }

      const cardData = {
        question: question.trim(),
        answer: answer.trim(),
        section: section.trim() || 'General',
        difficulty,
        questionImage: questionImagePath,
        answerImage: answerImagePath,
      };

      const response = await fetch(`/api/flashcards/${flashcardSetId}/cards/${cardIndex}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(cardData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update card');
      }

      onCardUpdated();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="add-card-overlay">
      <div className="add-card-modal" onClick={(e) => e.stopPropagation()}>
        {loading && (
          <div className="loading-overlay-inline">
            <div className="loading-content">
              <div className="loader"></div>
              <h3>
                {uploadingImage ? '📤 Uploading Image...' : '💾 Saving Changes...'}
              </h3>
              <p className="loading-subtext">
                {uploadingImage ? 'Uploading your image...' : 'Updating your flashcard...'}
              </p>
            </div>
          </div>
        )}
        
        <div className="modal-header">
          <h3>✏️ Edit Flashcard</h3>
          <button className="close-button" onClick={onCancel} disabled={loading}>✕</button>
        </div>

        <form onSubmit={handleSubmit} className="manual-form">
          {error && (
            <div className="error-message">
              <FaTimesCircle /> {error}
            </div>
          )}

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="question">
                Question <span className="required">*</span>
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
                placeholder="Enter your question (supports LaTeX: $$E = mc^2$$)"
                rows="4"
                required
                className="with-toolbar"
              />
            </div>

            <div className="form-group">
              <label htmlFor="answer">
                Answer <span className="required">*</span>
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
                placeholder="Enter the answer (supports LaTeX)"
                rows="4"
                required
                className="with-toolbar"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="section">Section</label>
              <input
                type="text"
                id="section"
                value={section}
                onChange={(e) => setSection(e.target.value)}
                placeholder="e.g., Chapter 1, Unit 2"
              />
            </div>

            <div className="form-group">
              <label htmlFor="difficulty">Difficulty</label>
              <select
                id="difficulty"
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
              >
                <option value="easy">○ Easy</option>
                <option value="medium">◐ Medium</option>
                <option value="hard">● Hard</option>
              </select>
            </div>
          </div>

          {/* Image Upload Section */}
          <div className="form-row">
            <div className="form-group">
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
            </div>

            <div className="form-group">
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
            </div>
          </div>

          {/* Preview Toggle */}
          <button
            type="button"
            className="preview-button"
            onClick={() => setShowPreview(!showPreview)}
          >
            {showPreview ? 'Hide Preview' : 'Show Preview'}
          </button>

          {showPreview && (
            <div className="preview-section">
              <h3>Preview</h3>
              <div className="preview-cards">
                <div className="preview-card question-preview">
                  <div className="preview-label">Question</div>
                  <LatexRenderer content={question} />
                  {questionImagePreview && (
                    <div className="image-preview">
                      <img src={questionImagePreview} alt="Question preview" />
                    </div>
                  )}
                </div>
                <div className="preview-card answer-preview">
                  <div className="preview-label">Answer</div>
                  <LatexRenderer content={answer} />
                  {answerImagePreview && (
                    <div className="image-preview">
                      <img src={answerImagePreview} alt="Answer preview" />
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="button-group">
            <button type="button" className="cancel-button" onClick={onCancel} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="submit-button" disabled={loading || uploadingImage}>
              {loading ? 'Updating...' : uploadingImage ? 'Uploading Image...' : <><FaCheckCircle /> Update Card</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default EditCardForm;

