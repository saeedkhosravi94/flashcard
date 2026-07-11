import React, { useState, useRef, useEffect } from 'react';
import { FaFile, FaCheckCircle, FaTimesCircle } from 'react-icons/fa';
import './Dashboard.css';
import NewDeckForm from './NewDeckForm';
import AIConfigModal from './AIConfigModal';
import PageRangeSelector from './PageRangeSelector';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';

function Dashboard({ onFileUpload, onDeckCreated, loading, showCreateDeckForm, onCloseCreateDeckForm, onReviewStatsUpdate }) {
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showLocalForm, setShowLocalForm] = useState(false);
  const [showAIConfigModal, setShowAIConfigModal] = useState(false);
  const [showPageRangeModal, setShowPageRangeModal] = useState(false);
  const [pendingFile, setPendingFile] = useState(null);
  const [pendingAIConfig, setPendingAIConfig] = useState(null);
  const [pdfInfo, setPdfInfo] = useState(null);
  const { isAuthenticated } = useAuth();
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

    // Check file extension as fallback since CSV MIME types vary by browser/OS
    const fileExtension = file.name.split('.').pop().toLowerCase();
    const allowedExtensions = ['pdf', 'txt', 'doc', 'docx', 'csv', 'apkg'];
    const allowedTypes = ['application/pdf', 'text/plain', 'application/msword', 
                          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                          'text/csv', 'application/csv', 'application/vnd.ms-excel',
                          'application/zip', 'application/x-zip-compressed'];
    
    // Check if it's an .apkg file by extension (MIME type might be application/zip on mobile)
    // On mobile, .apkg files often have application/zip MIME type, so we rely on extension
    const isApkg = fileExtension === 'apkg' || file.name.toLowerCase().endsWith('.apkg') || 
                   (file.type === 'application/zip' && file.name.toLowerCase().endsWith('.apkg'));
    const isCSV = fileExtension === 'csv' || file.type === 'text/csv' || file.type === 'application/csv';
    
    // More lenient check: allow if extension matches OR type matches OR it's a zip file with .apkg extension
    const isValidFile = allowedTypes.includes(file.type) || 
                        allowedExtensions.includes(fileExtension) ||
                        (file.type === 'application/zip' && fileExtension === 'apkg') ||
                        (file.type === 'application/x-zip-compressed' && fileExtension === 'apkg');
    
    if (!isValidFile) {
      setError('Please upload a PDF, text, CSV, or Anki (.apkg) file');
      return;
    }

    // Allow up to 100MB for all supported files
    if (file.size > 100 * 1024 * 1024) {
      setError('File size must be less than 100MB');
      return;
    }

    if (file.size === 0) {
      setError('The file appears to be empty. Please choose a different file.');
      return;
    }

    // CSV and .apkg files don't need AI config - proceed directly
    if (isCSV || isApkg) {
      try {
        await onFileUpload(file, {}); // No AI config needed - pass empty object
        setSuccess(`Successfully imported ${isApkg ? 'Anki deck' : 'CSV file'} from ${file.name}!`);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } catch (err) {
        console.error('Upload error:', err);
        let errorMessage = 'Failed to upload file. Please try again.';
        if (err.response?.data?.error) {
          errorMessage = err.response.data.error;
        } else if (err.response?.statusText) {
          errorMessage = `Server error: ${err.response.statusText}`;
        } else if (err.message) {
          errorMessage = err.message;
        }
        setError(errorMessage);
      }
      return;
    }

    // Show AI configuration modal for other files
    setPendingFile(file);
    setShowAIConfigModal(true);
  };

  const handleAIConfigConfirm = async (config) => {
    setShowAIConfigModal(false);
    setPendingAIConfig(config);
    
    // Check if file is PDF - if so, show page range selector
    if (pendingFile && pendingFile.type === 'application/pdf') {
      try {
        // Get PDF info (page count)
        const formData = new FormData();
        formData.append('file', pendingFile);
        
        const response = await axios.post('/api/flashcards/pdf-info', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        
        setPdfInfo(response.data);
        setShowPageRangeModal(true);
      } catch (err) {
        console.error('Error getting PDF info:', err);
        setError(err.response?.data?.error || 'Failed to read PDF file');
        setPendingFile(null);
        setPendingAIConfig(null);
      }
    } else {
      // Non-PDF file, proceed directly with upload
      try {
        await onFileUpload(pendingFile, config);
        setSuccess(`Successfully generated flashcards from ${pendingFile.name}!`);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        setPendingFile(null);
        setPendingAIConfig(null);
      } catch (err) {
        console.error('Upload error:', err);
        let errorMessage = 'Failed to upload file. Please try again.';
        if (err.response?.data?.error) {
          errorMessage = err.response.data.error;
        } else if (err.response?.statusText) {
          errorMessage = `Server error: ${err.response.statusText}`;
        } else if (err.message) {
          errorMessage = err.message;
        }
        setError(errorMessage);
        setPendingFile(null);
        setPendingAIConfig(null);
      }
    }
  };

  const handlePageRangeConfirm = async (pageFrom, pageTo) => {
    setShowPageRangeModal(false);
    
    try {
      // Add page range to AI config
      const configWithPageRange = {
        ...pendingAIConfig,
        pageFrom,
        pageTo
      };
      
      await onFileUpload(pendingFile, configWithPageRange);
      setSuccess(`Successfully generated flashcards from pages ${pageFrom}-${pageTo} of ${pendingFile.name}!`);
      
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      setPendingFile(null);
      setPendingAIConfig(null);
      setPdfInfo(null);
    } catch (err) {
      console.error('Upload error:', err);
      let errorMessage = 'Failed to upload file. Please try again.';
      if (err.response?.data?.error) {
        errorMessage = err.response.data.error;
      } else if (err.response?.statusText) {
        errorMessage = `Server error: ${err.response.statusText}`;
      } else if (err.message) {
        errorMessage = err.message;
      }
      setError(errorMessage);
      setPendingFile(null);
      setPendingAIConfig(null);
      setPdfInfo(null);
    }
  };

  const handlePageRangeCancel = () => {
    setShowPageRangeModal(false);
    setPendingFile(null);
    setPendingAIConfig(null);
    setPdfInfo(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleAIConfigCancel = () => {
    setShowAIConfigModal(false);
    setPendingFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
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

  // Show empty state when not authenticated
  if (!isAuthenticated) {
    return (
      <div className="dashboard">
        <div className="dashboard-empty-state">
          <img 
            src="/empty_deck.svg" 
            alt="Active Recall Flashcards - AI-powered learning tool for creating and studying flashcards" 
            className="empty-deck-illustration"
          />
          <h1>Welcome to ActiveRecaller Flashcards</h1>
          <p className="empty-state-description">
            Sign in to start creating and managing your flashcard collections. Use AI, Files, or create your own deck from scratch.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <div className="dashboard-content">
        <h1>Create Flashcard Collection</h1>
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
            accept=".pdf,.txt,.doc,.docx,.csv,.apkg,application/pdf,text/plain,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/csv,application/csv,application/vnd.ms-excel,application/zip,application/x-zip-compressed"
            onChange={handleChange}
            style={{ display: 'none' }}
          />
          
          {loading ? (
            <div className="loading">
              <div className="book-loader"></div>
              <p>Generating flashcards with AI...</p>
              <p className="loading-subtext">
                Large documents may take several minutes to process.<br/>
                We're intelligently analyzing your content section by section.
              </p>
            </div>
          ) : (
            <>
              <FaFile className="upload-icon-large" />
              <p className="upload-text">Drag and drop your file here</p>
              <p className="upload-or">or</p>
              <button className="upload-button" onClick={onButtonClick}>
                Choose File
              </button>
              <p className="upload-formats">
                Supported formats: PDF, TXT, CSV, Anki (.apkg) (up to 100MB). CSV and Anki files are imported directly.
              </p>
            </>
          )}
        </div>

        {error && (
          <div className="message error-message">
            <FaTimesCircle /> {error}
          </div>
        )}

        {success && (
          <div className="message success-message">
            <FaCheckCircle /> {success}
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

      </div>

      {showForm && (
        <NewDeckForm
          onDeckCreated={handleDeckCreated}
          onCancel={handleCloseForm}
          preselectedFolder={typeof showCreateDeckForm === 'object' && showCreateDeckForm !== null ? showCreateDeckForm : null}
        />
      )}

      {showAIConfigModal && pendingFile && (
        <AIConfigModal
          fileName={pendingFile.name}
          onConfirm={handleAIConfigConfirm}
          onCancel={handleAIConfigCancel}
        />
      )}

      {showPageRangeModal && pdfInfo && (
        <PageRangeSelector
          pdfInfo={pdfInfo}
          onConfirm={handlePageRangeConfirm}
          onCancel={handlePageRangeCancel}
        />
      )}
    </div>
  );
}

export default Dashboard;


