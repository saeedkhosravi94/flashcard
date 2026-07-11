import React, { useState, useEffect } from 'react';
import { FaSun, FaMoon, FaCopy, FaExclamationTriangle, FaInfoCircle } from 'react-icons/fa';
import './CustomThemeEditor.css';
import { themes, getThemeVariables } from '../themes';
import { useTheme } from '../ThemeContext';

function CustomThemeEditor({ isOpen, onClose }) {
  const { isDark, currentThemeId } = useTheme();
  const [customTheme, setCustomTheme] = useState(() => {
    const saved = localStorage.getItem('customTheme');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse custom theme:', e);
      }
    }
    // Default to current theme
    return {
      light: getThemeVariables(currentThemeId === 'custom' ? 'modern-teal' : currentThemeId, 'light'),
      dark: getThemeVariables(currentThemeId === 'custom' ? 'modern-teal' : currentThemeId, 'dark')
    };
  });

  const [jsonInput, setJsonInput] = useState('');
  const [error, setError] = useState('');
  const [mode, setMode] = useState('light');

  useEffect(() => {
    if (isOpen) {
      setJsonInput(JSON.stringify(customTheme, null, 2));
      setError('');
      setMode(isDark ? 'dark' : 'light');
    }
  }, [isOpen, customTheme, isDark]);

  const handleSave = () => {
    try {
      const parsed = JSON.parse(jsonInput);
      
      // Validate structure
      if (!parsed.light || !parsed.dark) {
        setError('Theme must have both "light" and "dark" properties');
        return;
      }
      
      // Validate all required variables
      const requiredVars = Object.keys(themes['modern-teal'].light);
      const missingLight = requiredVars.filter(v => !(v in parsed.light));
      const missingDark = requiredVars.filter(v => !(v in parsed.dark));
      
      if (missingLight.length > 0 || missingDark.length > 0) {
        setError(`Missing variables: ${[...missingLight, ...missingDark].join(', ')}`);
        return;
      }
      
      // Save to localStorage
      localStorage.setItem('customTheme', JSON.stringify(parsed));
      setCustomTheme(parsed);
      setError('');
      alert('✅ Custom theme saved successfully! Select "Custom Theme" in the theme dropdown to use it.');
      onClose();
    } catch (e) {
      setError(`Invalid JSON: ${e.message}`);
    }
  };

  const handleReset = () => {
    if (window.confirm('Reset custom theme to current theme values?')) {
      const baseThemeId = currentThemeId === 'custom' ? 'modern-teal' : currentThemeId;
      const newTheme = {
        light: getThemeVariables(baseThemeId, 'light'),
        dark: getThemeVariables(baseThemeId, 'dark')
      };
      setCustomTheme(newTheme);
      setJsonInput(JSON.stringify(newTheme, null, 2));
      setError('');
    }
  };

  const handleCopyTemplate = () => {
    const template = {
      light: themes['modern-teal'].light,
      dark: themes['modern-teal'].dark
    };
    setJsonInput(JSON.stringify(template, null, 2));
    setError('');
  };

  if (!isOpen) return null;

  return (
    <div className="custom-theme-overlay">
      <div className="custom-theme-modal" onClick={(e) => e.stopPropagation()}>
        <div className="custom-theme-header">
          <h2>🎨 Custom Theme Editor</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="custom-theme-body">
          <div className="theme-editor-info">
            <FaInfoCircle className="info-icon" />
            <div>
              <strong>Edit your custom theme:</strong>
              <p>Modify the JSON below to create your personalized color scheme. Both light and dark modes are required.</p>
            </div>
          </div>

          <div className="mode-selector">
            <button 
              className={`mode-btn ${mode === 'light' ? 'active' : ''}`}
              onClick={() => setMode('light')}
            >
              <FaSun /> Light Preview
            </button>
            <button 
              className={`mode-btn ${mode === 'dark' ? 'active' : ''}`}
              onClick={() => setMode('dark')}
            >
              <FaMoon /> Dark Preview
            </button>
          </div>

          <div className="theme-preview-section">
            <h3>Current Preview ({mode}):</h3>
            <div className={`theme-preview-box ${mode}`}>
              {(() => {
                try {
                  const parsed = JSON.parse(jsonInput);
                  const vars = parsed[mode];
                  if (!vars) return <div>Invalid theme structure</div>;
                  
                  return (
                    <div className="preview-colors">
                      <div className="color-row">
                        <div className="color-item" style={{ background: vars['bg-primary'] }}>
                          <span>bg-primary</span>
                        </div>
                        <div className="color-item" style={{ background: vars['bg-secondary'] }}>
                          <span>bg-secondary</span>
                        </div>
                        <div className="color-item" style={{ background: vars['accent-color'] }}>
                          <span>accent</span>
                        </div>
                      </div>
                      <div className="preview-card" style={{ 
                        background: vars['card-bg'],
                        color: vars['text-primary'],
                        borderColor: vars['border-color']
                      }}>
                        <h4>Sample Card</h4>
                        <p style={{ color: vars['text-secondary'] }}>This is how your cards will look</p>
                        <button style={{ 
                          background: vars['accent-color'],
                          color: vars['accent-text']
                        }}>
                          Action Button
                        </button>
                      </div>
                    </div>
                  );
                } catch (e) {
                  return <div className="preview-error">Invalid JSON - fix errors to see preview</div>;
                }
              })()}
            </div>
          </div>

          <div className="json-editor-section">
            <div className="editor-header">
              <h3>Theme JSON:</h3>
              <button className="copy-template-btn" onClick={handleCopyTemplate}>
                <FaCopy /> Copy Template
              </button>
            </div>
            <textarea
              className="json-editor"
              value={jsonInput}
              onChange={(e) => {
                setJsonInput(e.target.value);
                setError('');
              }}
              spellCheck={false}
            />
            {error && (
              <div className="editor-error">
                <FaExclamationTriangle className="error-icon" />
                {error}
              </div>
            )}
          </div>

          <div className="variable-reference">
            <details>
              <summary>📖 Variable Reference</summary>
              <div className="variable-list">
                <div className="variable-category">
                  <strong>Backgrounds:</strong>
                  <code>bg-primary</code>, <code>bg-secondary</code>, <code>bg-tertiary</code>
                </div>
                <div className="variable-category">
                  <strong>Text:</strong>
                  <code>text-primary</code>, <code>text-secondary</code>, <code>text-tertiary</code>
                </div>
                <div className="variable-category">
                  <strong>Accents:</strong>
                  <code>accent-color</code>, <code>accent-hover</code>, <code>accent-text</code>
                </div>
                <div className="variable-category">
                  <strong>Borders:</strong>
                  <code>border-color</code>, <code>border-hover</code>
                </div>
                <div className="variable-category">
                  <strong>Cards:</strong>
                  <code>card-bg</code>, <code>card-shadow</code>, <code>card-shadow-hover</code>
                </div>
                <div className="variable-category">
                  <strong>Others:</strong>
                  <code>input-bg</code>, <code>input-border</code>, <code>overlay-bg</code>, 
                  <code>success-color</code>, <code>error-color</code>, 
                  <code>primary-gradient-start</code>, <code>primary-gradient-end</code>
                </div>
              </div>
            </details>
          </div>
        </div>

        <div className="custom-theme-footer">
          <button className="reset-btn" onClick={handleReset}>
            Reset to Current
          </button>
          <div className="action-buttons">
            <button className="cancel-btn" onClick={onClose}>
              Cancel
            </button>
            <button className="save-btn" onClick={handleSave}>
              Save Custom Theme
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CustomThemeEditor;

