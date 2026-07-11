import React, { useState, useEffect } from 'react';
import { FaFolder, FaInfoCircle, FaTimes } from 'react-icons/fa';
import './CreateFolderModal.css';

function CreateFolderModal({ isOpen, onClose, onCreateFolder }) {
  const [folderName, setFolderName] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setFolderName('');
      setError('');
    }
  }, [isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const trimmedName = folderName.trim();
    
    if (!trimmedName) {
      setError('Folder name cannot be empty');
      return;
    }
    
    if (trimmedName.length < 2) {
      setError('Folder name must be at least 2 characters');
      return;
    }
    
    if (trimmedName.length > 50) {
      setError('Folder name must be less than 50 characters');
      return;
    }
    
    onCreateFolder(trimmedName);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="create-folder-modal-overlay">
      <div className="create-folder-modal" onClick={(e) => e.stopPropagation()}>
        <div className="create-folder-header">
          <h2>Create New Folder</h2>
          <button className="close-btn" onClick={onClose} title="Close">
            <FaTimes />
          </button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="create-folder-body">
            <FaFolder className="folder-icon-display" />
            
            <div className="form-group">
              <label htmlFor="folder-name">Folder Name</label>
              <input
                id="folder-name"
                type="text"
                value={folderName}
                onChange={(e) => {
                  setFolderName(e.target.value);
                  setError('');
                }}
                onKeyDown={handleKeyDown}
                placeholder="Enter folder name..."
                autoFocus
                maxLength={50}
              />
              {error && <div className="error-message">{error}</div>}
            </div>
            
            <div className="folder-info">
              <FaInfoCircle className="info-icon" />
              <span>Organize your flashcard decks into folders</span>
            </div>
          </div>
          
          <div className="create-folder-footer">
            <button type="button" className="cancel-btn" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="create-btn">
              Create Folder
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CreateFolderModal;

