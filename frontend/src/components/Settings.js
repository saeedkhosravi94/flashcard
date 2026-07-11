import React, { useState } from 'react';
import { FaCog, FaTimes, FaPalette, FaFont, FaRuler, FaSquare, FaBolt } from 'react-icons/fa';
import './Settings.css';
import { useSettings } from '../contexts/SettingsContext';
import { useTheme } from '../ThemeContext';
import { themes } from '../themes';
import CustomThemeEditor from './CustomThemeEditor';

function Settings({ onClose }) {
  const { settings, updateSetting, resetSettings } = useSettings();
  const { currentThemeId, setTheme } = useTheme();
  const [showCustomThemeEditor, setShowCustomThemeEditor] = useState(false);

  return (
    <div className="settings-overlay">
      <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
        <div className="settings-header">
          <h2><FaCog /> Card Settings</h2>
          <button className="close-btn" onClick={onClose}><FaTimes /></button>
        </div>

        <div className="settings-content">
          {/* Theme Selector */}
          <div className="setting-group">
            <label className="setting-label">
              <span className="label-icon"><FaPalette /></span>
              Color Theme
            </label>
            <select 
              value={currentThemeId}
              onChange={(e) => setTheme(e.target.value)}
              className="setting-select theme-select"
            >
              {Object.entries(themes).map(([id, theme]) => (
                <option key={id} value={id}>
                  {theme.name}
                </option>
              ))}
              <option value="custom">Custom Theme</option>
            </select>
            <button 
              className="edit-custom-theme-btn"
              onClick={() => setShowCustomThemeEditor(true)}
              title="Edit custom theme"
            >
              <FaCog /> Edit Custom Theme
            </button>
          </div>

          {/* Font Family */}
          <div className="setting-group">
            <label className="setting-label">
              <span className="label-icon"><FaFont /></span>
              Font Family
            </label>
            <select 
              value={settings.cardFont}
              onChange={(e) => updateSetting('cardFont', e.target.value)}
              className="setting-select"
            >
              <option value="Inter">Inter (Default)</option>
              <option value="Georgia">Georgia (Serif)</option>
              <option value="'Courier New'">Courier New (Mono)</option>
              <option value="Arial">Arial (Sans-serif)</option>
              <option value="'Times New Roman'">Times New Roman</option>
              <option value="Verdana">Verdana</option>
              <option value="'Comic Sans MS'">Comic Sans MS</option>
              <option value="'Trebuchet MS'">Trebuchet MS</option>
            </select>
          </div>

          {/* Font Size */}
          <div className="setting-group">
            <label className="setting-label">
              <span className="label-icon"><FaRuler /></span>
              Font Size
            </label>
            <div className="setting-options">
              {['small', 'medium', 'large', 'extra-large'].map(size => (
                <button
                  key={size}
                  className={`setting-option ${settings.cardFontSize === size ? 'active' : ''}`}
                  onClick={() => updateSetting('cardFontSize', size)}
                >
                  {size === 'extra-large' ? 'XL' : size.charAt(0).toUpperCase() + size.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Card Style */}
          <div className="setting-group">
            <label className="setting-label">
              <span className="label-icon"><FaPalette /></span>
              Card Style
            </label>
            <div className="setting-options">
              {[
                { value: 'default', label: 'Default' },
                { value: 'minimal', label: 'Minimal' },
                { value: 'bold', label: 'Bold' },
                { value: 'elegant', label: 'Elegant' }
              ].map(style => (
                <button
                  key={style.value}
                  className={`setting-option ${settings.cardStyle === style.value ? 'active' : ''}`}
                  onClick={() => updateSetting('cardStyle', style.value)}
                >
                  {style.label}
                </button>
              ))}
            </div>
          </div>

          {/* Border Radius */}
          <div className="setting-group">
            <label className="setting-label">
              <span className="label-icon"><FaSquare /></span>
              Corner Radius
            </label>
            <div className="setting-options">
              {[
                { value: 'none', label: 'None' },
                { value: 'small', label: 'Small' },
                { value: 'medium', label: 'Medium' },
                { value: 'large', label: 'Large' },
                { value: 'round', label: 'Round' }
              ].map(radius => (
                <button
                  key={radius.value}
                  className={`setting-option ${settings.cardBorderRadius === radius.value ? 'active' : ''}`}
                  onClick={() => updateSetting('cardBorderRadius', radius.value)}
                >
                  {radius.label}
                </button>
              ))}
            </div>
          </div>

          {/* Animation Speed */}
          <div className="setting-group">
            <label className="setting-label">
              <span className="label-icon"><FaBolt /></span>
              Flip Animation
            </label>
            <div className="setting-options">
              {[
                { value: 'none', label: 'None' },
                { value: 'fast', label: 'Fast' },
                { value: 'smooth', label: 'Smooth' },
                { value: 'slow', label: 'Slow' }
              ].map(anim => (
                <button
                  key={anim.value}
                  className={`setting-option ${settings.cardAnimation === anim.value ? 'active' : ''}`}
                  onClick={() => updateSetting('cardAnimation', anim.value)}
                >
                  {anim.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="settings-footer">
          <button className="reset-btn" onClick={resetSettings}>
            Reset to Defaults
          </button>
          <button className="done-btn" onClick={onClose}>
            Done
          </button>
        </div>

        {/* Custom Theme Editor Modal */}
        <CustomThemeEditor 
          isOpen={showCustomThemeEditor}
          onClose={() => setShowCustomThemeEditor(false)}
        />
      </div>
    </div>
  );
}

export default Settings;

