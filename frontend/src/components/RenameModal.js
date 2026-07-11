import React, { useState, useEffect } from 'react';
import { FaEdit, FaTimes } from 'react-icons/fa';
import './RenameModal.css';

function RenameModal({ isOpen, onClose, onRename, currentName, type = 'deck' }) {
  const [newName, setNewName] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setNewName(currentName || '');
      setError('');
    }
  }, [isOpen, currentName]);

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const trimmedName = newName.trim();
    
    if (!trimmedName) {
      setError(`${type === 'deck' ? 'Deck' : 'Folder'} name cannot be empty`);
      return;
    }
    
    if (trimmedName.length < 2) {
      setError('Name must be at least 2 characters');
      return;
    }
    
    if (trimmedName.length > 50) {
      setError('Name must be less than 50 characters');
      return;
    }
    
    if (trimmedName === currentName) {
      setError('Name is the same as current name');
      return;
    }
    
    onRename(trimmedName);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="rename-modal-overlay">
      <div className="rename-modal" onClick={(e) => e.stopPropagation()}>
        <div className="rename-header">
          <h2>
            <FaEdit style={{ marginRight: '0.5rem' }} />
            Rename {type === 'deck' ? 'Deck' : 'Folder'}
          </h2>
          <button className="close-btn" onClick={onClose} title="Close">
            <FaTimes />
          </button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="rename-body">
            <div className="form-group">
              <label htmlFor="rename-input">
                {type === 'deck' ? 'Deck' : 'Folder'} Name
              </label>
              <input
                id="rename-input"
                type="text"
                value={newName}
                onChange={(e) => {
                  setNewName(e.target.value);
                  setError('');
                }}
                onKeyDown={handleKeyDown}
                placeholder={`Enter ${type === 'deck' ? 'deck' : 'folder'} name...`}
                autoFocus
                maxLength={50}
              />
              {error && <div className="error-message">{error}</div>}
            </div>
          </div>
          
          <div className="rename-footer">
            <button type="button" className="cancel-btn" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="rename-btn">
              Rename
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default RenameModal;

