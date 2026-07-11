import React, { useState, useEffect } from 'react';
import { FaFile, FaInfoCircle, FaExclamationTriangle, FaTimes } from 'react-icons/fa';
import './PageRangeSelector.css';

function PageRangeSelector({ pdfInfo, onConfirm, onCancel }) {
  const [pageFrom, setPageFrom] = useState(1);
  const [pageTo, setPageTo] = useState(Math.min(50, pdfInfo.numPages));
  const [error, setError] = useState('');

  useEffect(() => {
    // Set default to first 50 pages or total pages if less
    setPageTo(Math.min(50, pdfInfo.numPages));
  }, [pdfInfo.numPages]);

  const validateRange = () => {
    if (pageFrom < 1) {
      setError('Start page must be at least 1');
      return false;
    }
    if (pageFrom > pdfInfo.numPages) {
      setError(`Start page cannot exceed ${pdfInfo.numPages}`);
      return false;
    }
    if (pageTo < pageFrom) {
      setError('End page must be greater than or equal to start page');
      return false;
    }
    if (pageTo > pdfInfo.numPages) {
      setError(`End page cannot exceed ${pdfInfo.numPages}`);
      return false;
    }
    if (pageTo - pageFrom + 1 > 50) {
      setError('Maximum 50 pages can be selected at once');
      return false;
    }
    return true;
  };

  const handleConfirm = () => {
    if (validateRange()) {
      onConfirm(pageFrom, pageTo);
    }
  };

  const handleFromChange = (value) => {
    const num = parseInt(value);
    if (!isNaN(num)) {
      setPageFrom(num);
      setError('');
    } else if (value === '') {
      setPageFrom('');
    }
  };

  const handleToChange = (value) => {
    const num = parseInt(value);
    if (!isNaN(num)) {
      setPageTo(num);
      setError('');
    } else if (value === '') {
      setPageTo('');
    }
  };

  const pageCount = pageTo && pageFrom ? pageTo - pageFrom + 1 : 0;

  return (
    <div className="page-range-modal-overlay">
      <div className="page-range-modal" onClick={(e) => e.stopPropagation()}>
        <div className="page-range-header">
          <h2><FaFile /> Select Page Range</h2>
          <button className="page-range-close" onClick={onCancel}><FaTimes /></button>
        </div>

        <div className="page-range-body">
          <div className="pdf-info">
            <div className="pdf-info-item">
              <span className="info-label"><FaFile /> File:</span>
              <span className="info-value">{pdfInfo.fileName}</span>
            </div>
            <div className="pdf-info-item">
              <span className="info-label"><FaFile /> Total Pages:</span>
              <span className="info-value">{pdfInfo.numPages}</span>
            </div>
          </div>

          <div className="page-range-notice">
            <FaInfoCircle className="notice-icon" />
            <span className="notice-text">
              Select up to 50 pages from this PDF to generate flashcards. 
              This helps process large documents more efficiently.
            </span>
          </div>

          <div className="page-range-inputs">
            <div className="input-group">
              <label htmlFor="page-from">From Page</label>
              <input
                type="number"
                id="page-from"
                min="1"
                max={pdfInfo.numPages}
                value={pageFrom}
                onChange={(e) => handleFromChange(e.target.value)}
                className="page-input"
              />
            </div>

            <div className="range-divider">—</div>

            <div className="input-group">
              <label htmlFor="page-to">To Page</label>
              <input
                type="number"
                id="page-to"
                min={pageFrom}
                max={pdfInfo.numPages}
                value={pageTo}
                onChange={(e) => handleToChange(e.target.value)}
                className="page-input"
              />
            </div>
          </div>

          <div className="page-range-summary">
            <div className={`summary-badge ${pageCount > 50 ? 'error' : ''}`}>
              <span className="summary-label">Selected Pages:</span>
              <span className="summary-value">{pageCount}</span>
            </div>
            {pageCount > 50 && (
              <div className="summary-error">
                <FaExclamationTriangle className="error-icon" />
                <span>Maximum 50 pages allowed</span>
              </div>
            )}
          </div>

          {error && (
            <div className="page-range-error">
              <FaExclamationTriangle className="error-icon" />
              <span>{error}</span>
            </div>
          )}

          <div className="quick-select">
            <span className="quick-select-label">Quick Select:</span>
            <div className="quick-select-buttons">
              <button 
                onClick={() => { setPageFrom(1); setPageTo(Math.min(50, pdfInfo.numPages)); setError(''); }}
                className="quick-btn"
              >
                First 50
              </button>
              <button 
                onClick={() => { setPageFrom(1); setPageTo(Math.min(25, pdfInfo.numPages)); setError(''); }}
                className="quick-btn"
              >
                First 25
              </button>
              <button 
                onClick={() => { 
                  setPageFrom(Math.max(1, pdfInfo.numPages - 49)); 
                  setPageTo(pdfInfo.numPages); 
                  setError(''); 
                }}
                className="quick-btn"
              >
                Last 50
              </button>
              <button 
                onClick={() => { setPageFrom(1); setPageTo(pdfInfo.numPages); setError(''); }}
                className="quick-btn"
                disabled={pdfInfo.numPages > 50}
              >
                All Pages {pdfInfo.numPages > 50 ? '(Too many)' : ''}
              </button>
            </div>
          </div>
        </div>

        <div className="page-range-actions">
          <button onClick={onCancel} className="btn-secondary">
            Cancel
          </button>
          <button onClick={handleConfirm} className="btn-primary">
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}

export default PageRangeSelector;

