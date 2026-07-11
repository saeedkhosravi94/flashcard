import React, { createContext, useContext, useState, useEffect } from 'react';
import { applyTheme } from './themes';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('theme');
    return saved ? saved === 'dark' : true; // Default to dark theme
  });

  const [currentThemeId, setCurrentThemeId] = useState(() => {
    const saved = localStorage.getItem('selectedTheme');
    return saved || 'ocean-black';
  });

  useEffect(() => {
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    localStorage.setItem('selectedTheme', currentThemeId);
    applyTheme(currentThemeId, isDark ? 'dark' : 'light');
  }, [isDark, currentThemeId]);

  const toggleTheme = () => {
    setIsDark(prev => !prev);
  };

  const setTheme = (themeId) => {
    setCurrentThemeId(themeId);
  };

  return (
    <ThemeContext.Provider value={{ 
      isDark, 
      toggleTheme, 
      currentThemeId, 
      setTheme 
    }}>
      {children}
    </ThemeContext.Provider>
  );
};

