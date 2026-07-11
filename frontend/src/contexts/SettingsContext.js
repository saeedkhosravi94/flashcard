import React, { createContext, useContext, useState, useEffect } from 'react';

const SettingsContext = createContext();

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};

const defaultSettings = {
  cardFont: 'Inter',
  cardFontSize: 'medium',
  cardStyle: 'default',
  cardBorderRadius: 'medium',
  cardAnimation: 'smooth',
};

export const SettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState(() => {
    const savedSettings = localStorage.getItem('flashcard-settings');
    return savedSettings ? JSON.parse(savedSettings) : defaultSettings;
  });

  useEffect(() => {
    localStorage.setItem('flashcard-settings', JSON.stringify(settings));
    
    // Apply font to document
    document.documentElement.style.setProperty('--card-font', settings.cardFont);
    
    // Apply font size
    const fontSizes = {
      small: '0.9rem',
      medium: '1.25rem',
      large: '1.5rem',
      'extra-large': '1.75rem'
    };
    document.documentElement.style.setProperty('--card-font-size', fontSizes[settings.cardFontSize]);
    
    // Apply border radius
    const borderRadii = {
      none: '0px',
      small: '6px',
      medium: '12px',
      large: '20px',
      round: '30px'
    };
    document.documentElement.style.setProperty('--card-border-radius', borderRadii[settings.cardBorderRadius]);
    
    // Apply animation speed
    const animationSpeeds = {
      none: '0s',
      fast: '0.3s',
      smooth: '0.6s',
      slow: '1s'
    };
    document.documentElement.style.setProperty('--card-animation-speed', animationSpeeds[settings.cardAnimation]);
  }, [settings]);

  const updateSetting = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const resetSettings = () => {
    setSettings(defaultSettings);
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSetting, resetSettings }}>
      {children}
    </SettingsContext.Provider>
  );
};

