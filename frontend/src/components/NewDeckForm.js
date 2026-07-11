import React, { useState, useEffect } from 'react';
import { FaTimes, FaTimesCircle, FaFile, FaRobot, FaUpload, FaStar, FaEdit, FaLightbulb, FaPlus, FaCheck } from 'react-icons/fa';
import axios from 'axios';
import './NewDeckForm.css';
import AIConfigModal from './AIConfigModal';

function NewDeckForm({ onDeckCreated, onCancel, preselectedFolder }) {
  const [title, setTitle] = useState('');
  const [creationMode, setCreationMode] = useState('manual'); // 'manual', 'ai', or 'upload'
  const [numCards, setNumCards] = useState(25); // Default to 25 cards
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [folders, setFolders] = useState([]);
  const [showAIConfigModal, setShowAIConfigModal] = useState(false);
  const [pendingUpload, setPendingUpload] = useState(false);
  const [aiModel, setAiModel] = useState('gemini-2.5-flash');
  const [customPrompt, setCustomPrompt] = useState('');
  const [apiKey, setApiKey] = useState('');

  // Fetch folders on mount
  useEffect(() => {
    fetchFolders();
  }, []);

  // Set preselected folder when it's provided
  useEffect(() => {
    if (preselectedFolder) {
      setSelectedFolder(preselectedFolder._id);
    }
  }, [preselectedFolder]);

  const fetchFolders = async () => {
    try {
      const response = await axios.get('/api/folders');
      setFolders(response.data);
    } catch (error) {
      console.error('Error fetching folders:', error);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Allow up to 100MB for all files
      if (file.size > 100 * 1024 * 1024) {
        setError('File size must be less than 100MB');
        setSelectedFile(null);
        e.target.value = ''; // Reset file input
        return;
      }

      setError(''); // Clear any previous errors
      setSelectedFile(file);
      // Auto-fill title from filename if empty
      if (!title) {
        const filename = file.name.replace(/\.[^/.]+$/, ''); // Remove extension
        setTitle(filename);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (creationMode === 'upload' && !selectedFile) {
      setError('Please select a file to upload');
      return;
    }

    // For AI mode, customPrompt is required
    if (creationMode === 'ai' && !customPrompt.trim()) {
      setError('Please provide instructions for AI to generate flashcards');
      return;
    }

    // For upload mode, check if file is CSV or .apkg - bypass AI config for these
    if (creationMode === 'upload') {
      const fileExtension = selectedFile?.name.split('.').pop().toLowerCase();
      const isCSV = fileExtension === 'csv' || selectedFile?.type === 'text/csv' || selectedFile?.type === 'application/csv';
      // On mobile, .apkg files often have application/zip MIME type, so we rely on extension
      const isApkg = fileExtension === 'apkg' || selectedFile?.name.toLowerCase().endsWith('.apkg') ||
                     (selectedFile?.type === 'application/zip' && selectedFile?.name.toLowerCase().endsWith('.apkg')) ||
                     (selectedFile?.type === 'application/x-zip-compressed' && selectedFile?.name.toLowerCase().endsWith('.apkg'));
      
      // CSV and .apkg files don't need AI - proceed directly
      if (isCSV || isApkg) {
        await createDeck();
        return;
      }
      
      // For other files, show AI config modal first
      setPendingUpload(true);
      setShowAIConfigModal(true);
      return;
    }

    // For non-upload modes, proceed directly
    await createDeck();
  };

  const handleAIConfigConfirm = async (aiConfig) => {
    setShowAIConfigModal(false);
    setPendingUpload(false);
    await createDeck(aiConfig);
  };

  const handleAIConfigCancel = () => {
    setShowAIConfigModal(false);
    setPendingUpload(false);
  };

  const createDeck = async (aiConfig = null) => {
    setLoading(true);
    setError('');

    try {
      let newDeck;

      if (creationMode === 'upload') {
        // Handle file upload with AI configuration
        const formData = new FormData();
        formData.append('file', selectedFile);

        // Add AI configuration to form data
        if (aiConfig) {
          if (aiConfig.customPrompt) {
            formData.append('customPrompt', aiConfig.customPrompt);
          }
          if (aiConfig.model) {
            formData.append('model', aiConfig.model);
          }
          if (aiConfig.apiKey) {
            formData.append('apiKey', aiConfig.apiKey);
          }
          if (aiConfig.numCards) {
            formData.append('numCards', aiConfig.numCards);
          }
        }

        const response = await axios.post('/api/flashcards/upload', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          }
        });

        newDeck = response.data;
      } else {
        // Handle manual or AI creation
        const requestBody = {
          title: title.trim()
        };

        if (creationMode === 'ai') {
          requestBody.numCards = numCards;
          
          // Add AI configuration
          requestBody.model = aiModel;
          if (customPrompt.trim()) {
            requestBody.customPrompt = customPrompt.trim();
          }
          if (!aiModel.startsWith('gemini-') && apiKey.trim()) {
            requestBody.apiKey = apiKey.trim();
          }
        }

        const response = await axios.post('/api/flashcards/create-deck', requestBody);
        newDeck = response.data;
      }

      // Assign to folder if selected
      if (selectedFolder && newDeck._id) {
        try {
          const folderResponse = await axios.post(`/api/folders/${selectedFolder}/add-deck/${newDeck._id}`);
          newDeck = folderResponse.data.flashcardSet;
        } catch (folderError) {
          console.error('Error assigning to folder:', folderError);
          // Continue anyway, deck was created
        }
      }
      
      // Reset form
      setTitle('');
      setCreationMode('manual');
      setSelectedFile(null);
      setSelectedFolder(null);
      
      // Notify parent component
      if (onDeckCreated) {
        onDeckCreated(newDeck);
      }
    } catch (err) {
      console.error('❌ Error creating deck:', err);
      const errorMessage = err.response?.data?.error || err.message || 'Failed to create deck';
      setError(errorMessage);
      
      // Special handling for authentication errors
      if (err.response?.status === 401) {
        setError('Please sign in to create decks');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="new-deck-overlay">
      <div className="new-deck-modal" onClick={(e) => e.stopPropagation()}>
        {loading && (
          <div className="loading-overlay-inline">
            <div className="loading-content">
              <div className="loader"></div>
              <h3>
                {creationMode === 'ai' && (
                  <>
                    <FaRobot style={{ marginRight: '0.5rem' }} />
                    AI is Generating Your Flashcards...
                  </>
                )}
                {creationMode === 'upload' && (
                  <>
                    <FaUpload style={{ marginRight: '0.5rem' }} />
                    {(() => {
                      const fileExtension = selectedFile?.name.split('.').pop().toLowerCase();
                      const isCSV = fileExtension === 'csv';
                      const isApkg = fileExtension === 'apkg' || selectedFile?.name.toLowerCase().endsWith('.apkg');
                      if (isCSV || isApkg) {
                        return isApkg ? 'Importing Anki Deck...' : 'Importing CSV File...';
                      }
                      return 'Processing Your File...';
                    })()}
                  </>
                )}
                {creationMode === 'manual' && (
                  <>
                    <FaStar style={{ marginRight: '0.5rem' }} />
                    Creating Your Deck...
                  </>
                )}
              </h3>
              <p className="loading-subtext">
                {creationMode === 'ai' && (
                  <>
                    Gemini AI is analyzing your topic and creating {numCards} high-quality flashcards.
                    <br/>This may take 30-60 seconds.
                  </>
                )}
                {creationMode === 'upload' && (
                  <>
                    {(() => {
                      const fileExtension = selectedFile?.name.split('.').pop().toLowerCase();
                      const isCSV = fileExtension === 'csv';
                      const isApkg = fileExtension === 'apkg' || selectedFile?.name.toLowerCase().endsWith('.apkg');
                      if (isCSV) {
                        return 'Importing flashcards directly from CSV file.';
                      }
                      if (isApkg) {
                        return 'Parsing Anki deck and importing flashcards. This may take a moment...';
                      }
                      return 'Extracting content and generating flashcards with AI.\nLarge files may take several minutes.';
                    })()}
                  </>
                )}
                {creationMode === 'manual' && 'Setting up your new deck...'}
              </p>
            </div>
          </div>
        )}
        
        <div className="modal-header">
          <h2><FaFile /> Create New Deck</h2>
          <button className="close-button" onClick={onCancel} disabled={loading}><FaTimes /></button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Mode Selection */}
          <div className="form-group mode-selection">
            <label>Choose Creation Method</label>
            <div className="mode-buttons">
              <button
                type="button"
                className={`mode-button ${creationMode === 'manual' ? 'active' : ''}`}
                onClick={() => setCreationMode('manual')}
              >
                <span className="mode-icon"><FaEdit /></span>
                <span className="mode-label">Manual</span>
              </button>
              <button
                type="button"
                className={`mode-button ${creationMode === 'ai' ? 'active' : ''}`}
                onClick={() => setCreationMode('ai')}
              >
                <span className="mode-icon"><FaRobot /></span>
                <span className="mode-label">AI Generate</span>
              </button>
              <button
                type="button"
                className={`mode-button ${creationMode === 'upload' ? 'active' : ''}`}
                onClick={() => setCreationMode('upload')}
              >
                <span className="mode-icon"><FaUpload /></span>
                <span className="mode-label">Upload File</span>
              </button>
            </div>
          </div>

          {/* Title field - shown for manual and AI modes */}
          {creationMode !== 'upload' && (
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
          )}

          {/* Folder selector - shown for all modes */}
          <div className="form-group">
            <label htmlFor="folder-select">
              Folder <span className="optional">(Optional)</span>
            </label>
            <select
              id="folder-select"
              value={selectedFolder || ''}
              onChange={(e) => setSelectedFolder(e.target.value || null)}
              className="folder-select"
            >
              <option value="">No Folder (Auto-group by first word)</option>
              {folders.map(folder => (
                <option key={folder._id} value={folder._id}>
                  {folder.icon} {folder.name}
                </option>
              ))}
            </select>
            <p className="helper-text">
              Choose a folder to organize your deck, or leave empty for auto-grouping
            </p>
          </div>

          {/* File upload option */}
          {creationMode === 'upload' && (
            <div className="form-group">
              <label htmlFor="file-upload">
                Select File <span className="required">*</span>
              </label>
              <input
                type="file"
                id="file-upload"
                onChange={handleFileChange}
                accept=".pdf,.txt,.doc,.docx,.csv,.apkg,application/pdf,text/plain,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/csv,application/csv,application/vnd.ms-excel,application/zip,application/x-zip-compressed"
                className="file-input"
              />
              {selectedFile && (
                <div className="file-selected">
                  <FaFile className="file-icon" />
                  <span className="file-name">{selectedFile.name}</span>
                  <span className="file-size">
                    ({(selectedFile.size / 1024).toFixed(1)} KB)
                  </span>
                </div>
              )}
              <p className="helper-text">
                Supported formats: PDF, TXT, CSV, Anki (.apkg) (up to 100MB). CSV and Anki files are imported directly without AI.
              </p>
            </div>
          )}

              {/* User Instructions - Make it prominent */}
          {creationMode === 'ai' && (
            <>
              <div className="form-group user-instructions-group">
                <label htmlFor="user-instructions">
                  <span className="instruction-icon"><FaEdit /></span>
                  Your Instructions for AI <span className="required">*</span>
                </label>
                <textarea
                  id="user-instructions"
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  placeholder="e.g., 'front: Italian frequent word, back: definition with an example' or 'Create cards about quantum mechanics for beginners' or 'Generate vocabulary cards with word, pronunciation, and usage example'..."
                  rows="5"
                  className="user-instructions-textarea"
                />
              <p className="helper-text instruction-helper">
                <FaLightbulb style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />
                <strong>Tell the AI exactly how you want your deck created.</strong> Describe what you want to learn, the format of cards (e.g., "front: Italian word, back: definition with example"), difficulty level, focus areas, or any special requirements. The AI will follow your instructions while maintaining proper format and ethical standards.
              </p>
            </div>
            </>
          )}

          {creationMode === 'ai' && (
            <>
              {/* AI Model Selection */}
              <div className="form-group">
                <label htmlFor="ai-model">
                  AI Model
                </label>
                <select
                  id="ai-model"
                  value={aiModel}
                  onChange={(e) => setAiModel(e.target.value)}
                  className="ai-model-select folder-select"
                >
                  <optgroup label="🆓 Free Models (Google Gemini)">
                    <option value="gemini-2.5-flash">Gemini 2.5 Flash (Fast & Free) ⚡</option>
                    <option value="gemini-2.0-flash-exp">Gemini 2.0 Flash Experimental (Free) 🧪</option>
                    <option value="gemini-1.5-pro">Gemini 1.5 Pro (Advanced, Free) 🎓</option>
                    <option value="gemini-1.5-flash">Gemini 1.5 Flash (Free) 💨</option>
                  </optgroup>
                  <optgroup label="OpenAI Models (Requires API Key)">
                    <option value="gpt-4o">GPT-4o (Multimodal)</option>
                    <option value="gpt-4o-mini">GPT-4o Mini (Fast & Affordable)</option>
                    <option value="gpt-4-turbo">GPT-4 Turbo (128K context)</option>
                    <option value="gpt-4">GPT-4 (Most capable)</option>
                    <option value="gpt-3.5-turbo">GPT-3.5 Turbo (Cost-effective)</option>
                  </optgroup>
                  <optgroup label="Anthropic Claude (Requires API Key)">
                    <option value="claude-3-5-sonnet-20241022">Claude 3.5 Sonnet (Most intelligent)</option>
                    <option value="claude-3-opus-20240229">Claude 3 Opus (Top-tier)</option>
                    <option value="claude-3-sonnet-20240229">Claude 3 Sonnet (Balanced)</option>
                    <option value="claude-3-haiku-20240307">Claude 3 Haiku (Fastest)</option>
                  </optgroup>
                </select>
                <p className="helper-text">
                  {aiModel.startsWith('gemini-') ? 
                    'This is a free model from Google' : 
                    'This model requires an API key from ' + (aiModel.startsWith('gpt-') ? 'OpenAI' : 'Anthropic')
                  }
                </p>
              </div>

              {/* API Key field for non-Gemini models */}
              {!aiModel.startsWith('gemini-') && (
                <div className="form-group">
                  <label htmlFor="api-key">
                    API Key <span className="required">*</span>
                  </label>
                  <input
                    type="password"
                    id="api-key"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder={`Enter your ${aiModel.startsWith('gpt-') ? 'OpenAI' : 'Anthropic'} API key`}
                    required={!aiModel.startsWith('gemini-')}
                  />
                  <p className="helper-text">
                    🔒 Your API key is only used for this request and not stored
                  </p>
                </div>
              )}


              {/* Number of Cards */}
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
                  Choose how many flashcards you want AI to generate (5-100 cards)
                </p>
              </div>
            </>
          )}

          {error && (
            <div className="error-message">
              <FaTimesCircle /> {error}
            </div>
          )}

          <div className="info-box">
            <p>
              <strong>
                {creationMode === 'ai' && (
                  <>
                    <FaRobot style={{ marginRight: '0.5rem' }} />
                    AI Generation
                  </>
                )}
                {creationMode === 'manual' && (
                  <>
                    <FaStar style={{ marginRight: '0.5rem' }} />
                    Manual Creation
                  </>
                )}
                {creationMode === 'upload' && (
                  <>
                    <FaUpload style={{ marginRight: '0.5rem' }} />
                    File Upload
                  </>
                )}
              </strong>
            </p>
            {creationMode === 'ai' && (
              <div>
                <p>
                  AI will generate up to {numCards} flashcards based on your instructions:
                </p>
                <ul>
                  <li>Following your specified format and requirements</li>
                  <li>Creating original, educational content</li>
                  <li>Maintaining proper format and ethical standards</li>
                </ul>
              </div>
            )}
            {creationMode === 'manual' && (
              <div>
                <p>
                  After creating your deck, you'll be able to:
                </p>
                <ul>
                  <li>Add flashcards manually (one by one)</li>
                  <li>Use LaTeX for math/science notation</li>
                  <li>Organize cards with sections</li>
                  <li>Export to CSV anytime</li>
                </ul>
              </div>
            )}
            {creationMode === 'upload' && (
              <div>
                <p>
                  Supported file formats:
                </p>
                <ul>
                  <li>PDF - Text will be extracted and converted</li>
                  <li>TXT - Plain text files</li>
                  <li>CSV - Question,Answer format (direct import)</li>
                  <li>Anki (.apkg) - Anki deck files (direct import with media)</li>
                  <li>DOC/DOCX - Word documents</li>
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
              disabled={
                loading || 
                (creationMode !== 'upload' && !title.trim()) || 
                (creationMode === 'ai' && !customPrompt.trim()) ||
                (creationMode === 'ai' && !aiModel.startsWith('gemini-') && !apiKey.trim()) ||
                (creationMode === 'upload' && !selectedFile)
              }
            >
              {loading ? (
                creationMode === 'ai' ? (
                  <>
                    <FaRobot style={{ marginRight: '0.5rem' }} />
                    AI Generating...
                  </>
                ) : creationMode === 'upload' ? (
                  <>
                    <FaUpload style={{ marginRight: '0.5rem' }} />
                    Uploading...
                  </>
                ) : (
                  'Creating...'
                )
              ) : (
                creationMode === 'ai' ? (
                  <>
                    <FaStar style={{ marginRight: '0.5rem' }} />
                    Generate with AI
                  </>
                ) : creationMode === 'upload' ? (
                  <>
                    <FaUpload style={{ marginRight: '0.5rem' }} />
                    Upload & Create
                  </>
                ) : (
                  <>
                    <FaCheck style={{ marginRight: '0.5rem' }} />
                    Create Empty Deck
                  </>
                )
              )}
            </button>
          </div>
        </form>
      </div>

      {/* AI Configuration Modal */}
      {showAIConfigModal && selectedFile && (
        <AIConfigModal
          fileName={selectedFile.name}
          onConfirm={handleAIConfigConfirm}
          onCancel={handleAIConfigCancel}
        />
      )}
    </div>
  );
}

export default NewDeckForm;

