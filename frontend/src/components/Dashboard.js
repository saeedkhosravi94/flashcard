import React, { useState, useRef } from 'react';
import './Dashboard.css';
import NewDeckForm from './NewDeckForm';

function Dashboard({ onFileUpload, onDeckCreated, loading, showCreateDeckForm, onCloseCreateDeckForm }) {
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showLocalForm, setShowLocalForm] = useState(false);
  const fileInputRef = useRef(null);
  
  // Use either the prop or local state for showing the form
  const showForm = showCreateDeckForm || showLocalForm;

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = async (file) => {
    setError('');
    setSuccess('');

    console.log('File selected:', file.name, file.type, file.size);

    const allowedTypes = ['application/pdf', 'text/plain', 'application/msword', 
                          'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    
    if (!allowedTypes.includes(file.type)) {
      setError('Please upload a PDF or text file');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('File size must be less than 10MB');
      return;
    }

    if (file.size === 0) {
      setError('The file appears to be empty. Please choose a different file.');
      return;
    }

    try {
      console.log('Starting upload...');
      await onFileUpload(file);
      setSuccess(`Successfully generated flashcards from ${file.name}!`);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err) {
      console.error('Upload error:', err);
      
      // Extract the most detailed error message available
      let errorMessage = 'Failed to upload file. Please try again.';
      
      if (err.response?.data?.error) {
        // Backend returned a specific error
        errorMessage = err.response.data.error;
      } else if (err.response?.statusText) {
        // HTTP error without custom message
        errorMessage = `Server error: ${err.response.statusText}`;
      } else if (err.message) {
        // Generic error with message
        errorMessage = err.message;
      }
      
      setError(errorMessage);
    }
  };

  const onButtonClick = () => {
    fileInputRef.current.click();
  };

  const handleDeckCreated = (newDeck) => {
    setSuccess(`Deck "${newDeck.title}" created! Start adding flashcards now.`);
    setShowLocalForm(false);
    
    // Notify parent component
    if (onDeckCreated) {
      onDeckCreated(newDeck);
    }
  };

  const handleCloseForm = () => {
    setShowLocalForm(false);
    if (onCloseCreateDeckForm) {
      onCloseCreateDeckForm();
    }
  };

  return (
    <div className="dashboard">
      <div className="dashboard-content">
        <div className="upload-icon">📚</div>
        <h2>Create Flashcard Collection</h2>
        <p className="dashboard-description">
          Generate flashcards from files or create your own deck from scratch
        </p>

        <div
          className={`upload-area ${dragActive ? 'drag-active' : ''}`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <input
            ref={fileInputRef}
            type="file"
            id="file-upload"
            accept=".pdf,.txt,.doc,.docx"
            onChange={handleChange}
            style={{ display: 'none' }}
          />
          
          {loading ? (
            <div className="loading">
              <div className="spinner"></div>
              <p>Generating flashcards with AI...</p>
              <p className="loading-subtext">
                Large documents may take several minutes to process.<br/>
                We're intelligently analyzing your content section by section.
              </p>
            </div>
          ) : (
            <>
              <div className="upload-icon-large">📄</div>
              <p className="upload-text">Drag and drop your file here</p>
              <p className="upload-or">or</p>
              <button className="upload-button" onClick={onButtonClick}>
                Choose File
              </button>
              <p className="upload-formats">Supported formats: PDF, TXT (Max 10MB)</p>
            </>
          )}
        </div>

        {error && (
          <div className="message error-message">
            ❌ {error}
          </div>
        )}

        {success && (
          <div className="message success-message">
            ✅ {success}
          </div>
        )}

        <div className="create-options">
          <div className="option-divider">
            <span>OR</span>
          </div>
          
          <button 
            className="create-deck-button" 
            onClick={() => setShowLocalForm(true)}
            disabled={loading}
          >
            <span className="button-icon">➕</span>
            <span className="button-text">Create Empty Deck</span>
            <span className="button-desc">Build your own flashcard collection</span>
          </button>
        </div>

        <div className="features">
          <div className="feature">
            <div className="feature-icon">🤖</div>
            <h3>AI-Powered</h3>
            <p>Gemini AI extracts key concepts</p>
          </div>
          <div className="feature">
            <div className="feature-icon">⚡</div>
            <h3>Smart Processing</h3>
            <p>Intelligently chunked by topics</p>
          </div>
          <div className="feature">
            <div className="feature-icon">✍️</div>
            <h3>Manual Creation</h3>
            <p>Add your own cards anytime</p>
          </div>
        </div>
      </div>

      {showForm && (
        <NewDeckForm
          onDeckCreated={handleDeckCreated}
          onCancel={handleCloseForm}
        />
      )}
    </div>
  );
}

export default Dashboard;

