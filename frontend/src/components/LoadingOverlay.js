import React from 'react';
import './LoadingOverlay.css';

function LoadingOverlay({ message, subMessage }) {
  return (
    <div className="full-page-loading-overlay">
      <div className="loading-overlay-content">
        <div className="loader"></div>
        {message && <h3 className="loading-message">{message}</h3>}
        {subMessage && <p className="loading-submessage">{subMessage}</p>}
      </div>
    </div>
  );
}

export default LoadingOverlay;

