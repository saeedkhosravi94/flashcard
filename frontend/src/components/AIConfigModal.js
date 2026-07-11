import React, { useState } from 'react';
import { FaTimes, FaFile, FaRobot, FaBolt, FaFlask, FaGraduationCap, FaWind, FaCreditCard, FaDollarSign, FaTheaterMasks, FaCrown, FaBalanceScale, FaChartBar } from 'react-icons/fa';
import './AIConfigModal.css';

const AI_MODELS = [
  // Google Gemini Models (Free)
  {
    id: 'gemini-2.5-flash',
    name: 'Gemini 2.5 Flash',
    provider: 'Google',
    free: true,
    description: 'Fast and efficient - Default model (Free)'
  },
  {
    id: 'gemini-2.0-flash-exp',
    name: 'Gemini 2.0 Flash Experimental',
    provider: 'Google',
    free: true,
    description: 'Latest experimental features (Free)'
  },
  {
    id: 'gemini-1.5-pro',
    name: 'Gemini 1.5 Pro',
    provider: 'Google',
    free: true,
    description: 'Advanced reasoning - Extended context (Free)'
  },
  {
    id: 'gemini-1.5-flash',
    name: 'Gemini 1.5 Flash',
    provider: 'Google',
    free: true,
    description: 'Speed optimized version (Free)'
  },
  
  // OpenAI Models
  {
    id: 'gpt-4o',
    name: 'GPT-4o',
    provider: 'OpenAI',
    free: false,
    description: 'Latest GPT-4 with multimodal capabilities'
  },
  {
    id: 'gpt-4o-mini',
    name: 'GPT-4o Mini',
    provider: 'OpenAI',
    free: false,
    description: 'Affordable and intelligent, faster than GPT-4'
  },
  {
    id: 'gpt-4-turbo',
    name: 'GPT-4 Turbo',
    provider: 'OpenAI',
    free: false,
    description: 'Enhanced GPT-4 with 128K context window'
  },
  {
    id: 'gpt-4',
    name: 'GPT-4',
    provider: 'OpenAI',
    free: false,
    description: 'Most capable model for complex tasks'
  },
  {
    id: 'gpt-3.5-turbo',
    name: 'GPT-3.5 Turbo',
    provider: 'OpenAI',
    free: false,
    description: 'Fast and cost-effective'
  },
  {
    id: 'gpt-3.5-turbo-16k',
    name: 'GPT-3.5 Turbo 16K',
    provider: 'OpenAI',
    free: false,
    description: 'Extended context version of GPT-3.5'
  },
  
  // Anthropic Claude Models
  {
    id: 'claude-3-5-sonnet-20241022',
    name: 'Claude 3.5 Sonnet',
    provider: 'Anthropic',
    free: false,
    description: 'Most intelligent model - Best for complex tasks'
  },
  {
    id: 'claude-3-opus-20240229',
    name: 'Claude 3 Opus',
    provider: 'Anthropic',
    free: false,
    description: 'Top-tier intelligence for difficult problems'
  },
  {
    id: 'claude-3-sonnet-20240229',
    name: 'Claude 3 Sonnet',
    provider: 'Anthropic',
    free: false,
    description: 'Balanced performance and speed'
  },
  {
    id: 'claude-3-haiku-20240307',
    name: 'Claude 3 Haiku',
    provider: 'Anthropic',
    free: false,
    description: 'Fastest and most compact Claude model'
  }
];

function AIConfigModal({ fileName, onConfirm, onCancel }) {
  const [customPrompt, setCustomPrompt] = useState('');
  const [selectedModel, setSelectedModel] = useState('gemini-2.5-flash');
  const [apiKey, setApiKey] = useState('');
  const [numCards, setNumCards] = useState(''); // Empty = auto-decide

  const selectedModelInfo = AI_MODELS.find(m => m.id === selectedModel);
  const requiresApiKey = selectedModelInfo && !selectedModelInfo.free;

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (requiresApiKey && !apiKey.trim()) {
      alert('Please provide an API key for this model');
      return;
    }

    // If numCards is empty, pass null to let AI decide based on content
    const finalNumCards = numCards === '' ? null : parseInt(numCards);

    onConfirm({
      customPrompt: customPrompt.trim(),
      model: selectedModel,
      apiKey: requiresApiKey ? apiKey.trim() : null,
      numCards: finalNumCards
    });
  };

  return (
    <div className="ai-config-modal-overlay">
      <div className="ai-config-modal" onClick={(e) => e.stopPropagation()}>
        <div className="ai-config-header">
          <h2><FaRobot /> Configure AI Generation</h2>
          <button className="ai-config-close" onClick={onCancel}><FaTimes /></button>
        </div>

        <div className="ai-config-body">
          <div className="ai-config-file-info">
            <FaFile className="file-icon" />
            <span className="file-name">{fileName}</span>
          </div>

          <form onSubmit={handleSubmit}>
            {/* Model Selection */}
            <div className="form-group">
              <label htmlFor="model-select">
                AI Model
                <span className="label-hint">Choose which AI to generate flashcards</span>
              </label>
              <select
                id="model-select"
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="ai-config-select"
              >
                {AI_MODELS.map(model => (
                  <option key={model.id} value={model.id}>
                    {model.name} {model.free ? '(Free)' : `(${model.provider})`}
                  </option>
                ))}
              </select>
              {selectedModelInfo && (
                <div className={`model-info ${selectedModelInfo.free ? 'free' : 'paid'}`}>
                  <span className="model-badge">
                    {selectedModelInfo.free ? '✓ Free' : <><FaCreditCard /> Requires API Key</>}
                  </span>
                  <span className="model-description">{selectedModelInfo.description}</span>
                </div>
              )}
            </div>

            {/* Custom Prompt - Moved up to be more visible */}
            <div className="form-group custom-prompt-group">
              <label htmlFor="custom-prompt">
                <FaRobot style={{ marginRight: '0.5rem' }} />
                Custom Instructions (Optional)
                <span className="label-hint">Write your own prompt to guide how the AI generates flashcards. Format and ethics requirements are automatically enforced.</span>
              </label>
              <textarea
                id="custom-prompt"
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                placeholder="e.g., Focus on definitions and examples, use simple language, include mnemonics, create cards for beginners, emphasize practical applications..."
                className="ai-config-textarea"
                rows="6"
              />
              <p className="field-note" style={{ marginTop: '8px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                💡 Tip: You can write anything you want here. The system will automatically add format requirements (JSON structure) and ethics guidelines.
              </p>
            </div>

            {/* API Key (if required) */}
            {requiresApiKey && (
              <div className="form-group">
                <label htmlFor="api-key">
                  API Key *
                  <span className="label-hint">Your {selectedModelInfo.provider} API key</span>
                </label>
                <input
                  type="password"
                  id="api-key"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={`Enter your ${selectedModelInfo.provider} API key`}
                  className="ai-config-input"
                  required
                />
                <p className="api-key-note">
                  Your API key is only used for this request and not stored
                </p>
              </div>
            )}

            {/* Number of Cards */}
            <div className="form-group">
              <label htmlFor="num-cards">
                Number of Flashcards (Optional)
                <span className="label-hint">Leave empty to auto-calculate based on content length</span>
              </label>
              <input
                type="number"
                id="num-cards"
                value={numCards}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === '') {
                    setNumCards('');
                  } else {
                    const num = parseInt(value);
                    if (!isNaN(num)) {
                      setNumCards(Math.max(1, Math.min(200, num)));
                    }
                  }
                }}
                min="1"
                max="200"
                placeholder="Auto (based on content)"
                className="ai-config-input"
              />
              {numCards !== '' && (
                <p className="field-note">
                  <FaChartBar /> Will generate exactly {numCards} flashcards
                </p>
              )}
              {numCards === '' && (
                <p className="field-note">
                  <FaRobot /> AI will automatically determine optimal number based on content
                </p>
              )}
            </div>

            {/* Action Buttons */}
            <div className="ai-config-actions">
              <button type="button" onClick={onCancel} className="btn-secondary">
                Cancel
              </button>
              <button type="submit" className="btn-primary">
                Generate Flashcards
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default AIConfigModal;

