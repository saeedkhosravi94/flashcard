import React from 'react';
import { FaExclamationTriangle } from 'react-icons/fa';
import './ConfirmationModal.css';

function ConfirmationModal({ 
  isOpen, 
  onConfirm, 
  onCancel, 
  title = 'Confirm Action',
  message = 'Are you sure you want to proceed?',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'danger' // 'danger' or 'warning'
}) {
  if (!isOpen) return null;

  return (
    <div className="confirmation-overlay">
      <div className="confirmation-modal" onClick={(e) => e.stopPropagation()}>
        <div className="confirmation-header">
          <div className={`confirmation-icon ${type}`}>
            <FaExclamationTriangle />
          </div>
          <h2>{title}</h2>
        </div>
        
        <div className="confirmation-body">
          <p>{message}</p>
        </div>
        
        <div className="confirmation-actions">
          <button 
            className="confirmation-cancel-btn" 
            onClick={onCancel}
          >
            {cancelText}
          </button>
          <button 
            className={`confirmation-confirm-btn ${type}`}
            onClick={onConfirm}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmationModal;

