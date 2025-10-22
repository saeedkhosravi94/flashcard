import React from 'react';
import './Sidebar.css';
import { useAuth } from '../contexts/AuthContext';

function Sidebar({ flashcardSets, selectedSet, onSelectSet, onDeleteSet, onDownloadCSV, onUploadClick, onCreateDeckClick, isOpen, onToggle }) {
  const { isAuthenticated } = useAuth();
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <>
      {isOpen && <div className="sidebar-overlay" onClick={onToggle}></div>}
      
      <button 
        className={`sidebar-toggle ${isOpen ? 'open' : 'closed'}`}
        onClick={onToggle}
        title={isOpen ? 'Close sidebar' : 'Open sidebar'}
      >
        <span className="hamburger-icon">
          <span></span>
          <span></span>
          <span></span>
        </span>
      </button>
      
      <aside className={`sidebar ${isOpen ? 'open' : 'closed'}`}>
      <div className="sidebar-header">
        <h3>📋 {isAuthenticated ? 'My Sets' : 'Public Sets'}</h3>
        <span className="sets-count">{flashcardSets.length} sets</span>
      </div>

      <div className="sidebar-list">
        {flashcardSets.length === 0 ? (
          <div className="empty-state">
            <p>No flashcard sets yet.</p>
            <p className="empty-hint">Upload a file to get started!</p>
          </div>
        ) : (
          flashcardSets.map((set) => (
            <div
              key={set._id}
              className={`sidebar-item ${selectedSet?._id === set._id ? 'active' : ''}`}
              onClick={() => onSelectSet(set._id)}
            >
              <div className="sidebar-item-header">
                <h4>{set.title}</h4>
                <span className="card-count">{set.cards.length} cards</span>
              </div>
              <p className="sidebar-item-date">{formatDate(set.createdAt)}</p>
              
              <div className="sidebar-item-actions">
                <button
                  className="action-button download"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDownloadCSV(set._id);
                  }}
                  title="Download CSV"
                >
                  📥
                </button>
                <button
                  className="action-button delete"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (window.confirm('Are you sure you want to delete this flashcard set?')) {
                      onDeleteSet(set._id);
                    }
                  }}
                  title="Delete"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="sidebar-footer">
        <button className="create-deck-button-sidebar" onClick={onCreateDeckClick}>
          <span className="upload-icon">➕</span>
          <span className="upload-text">Create New Deck</span>
        </button>
        <button className="upload-new-button" onClick={onUploadClick}>
          <span className="upload-icon">📤</span>
          <span className="upload-text">Upload New File</span>
        </button>
      </div>
    </aside>
    </>
  );
}

export default Sidebar;

