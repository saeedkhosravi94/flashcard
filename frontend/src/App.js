import React, { useState, useEffect, useCallback } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import './App.css';
import Dashboard from './components/Dashboard';
import Sidebar from './components/Sidebar';
import FlashcardViewer from './components/FlashcardViewer';
import Login from './components/Login';
import Register from './components/Register';
import AuthCallback from './components/AuthCallback';
import UserMenu from './components/UserMenu';
import { useTheme } from './ThemeContext';
import { useAuth } from './contexts/AuthContext';
import axios from 'axios';

function MainApp() {
  const { isDark, toggleTheme } = useTheme();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [flashcardSets, setFlashcardSets] = useState([]);
  const [selectedSet, setSelectedSet] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showCreateDeckForm, setShowCreateDeckForm] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  // Default sidebar to closed on mobile devices (under 500px)
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    return window.innerWidth > 500;
  });

  const fetchFlashcardSets = useCallback(async () => {
    try {
      console.log('Fetching flashcard sets...');
      const response = await axios.get('/api/flashcards');
      console.log('Received', response.data.length, 'flashcard sets');
      setFlashcardSets(response.data);
    } catch (error) {
      console.error('Error fetching flashcard sets:', error);
    }
  }, []);

  useEffect(() => {
    if (!authLoading) {
      fetchFlashcardSets();
    }
  }, [authLoading, fetchFlashcardSets]);

  // Listen for authentication changes and refresh flashcard list
  useEffect(() => {
    const handleAuthChange = () => {
      console.log('🔄 Auth state changed, refreshing flashcard sets...');
      fetchFlashcardSets();
      // Also clear selected set since user context changed
      setSelectedSet(null);
    };

    window.addEventListener('auth-change', handleAuthChange);
    
    return () => {
      window.removeEventListener('auth-change', handleAuthChange);
    };
  }, [fetchFlashcardSets]);

  const handleFileUpload = async (file) => {
    const formData = new FormData();
    formData.append('file', file);

    setLoading(true);
    try {
      const response = await axios.post('/api/flashcards/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      setFlashcardSets([response.data, ...flashcardSets]);
      setSelectedSet(response.data);
      setLoading(false);
      return response.data;
    } catch (error) {
      setLoading(false);
      throw error;
    }
  };

  const handleSelectSet = async (setId) => {
    try {
      const response = await axios.get(`/api/flashcards/${setId}`);
      setSelectedSet(response.data);
    } catch (error) {
      console.error('Error fetching flashcard set:', error);
    }
  };

  const handleDeleteSet = async (setId) => {
    try {
      await axios.delete(`/api/flashcards/${setId}`);
      setFlashcardSets(flashcardSets.filter(set => set._id !== setId));
      if (selectedSet && selectedSet._id === setId) {
        setSelectedSet(null);
      }
    } catch (error) {
      console.error('Error deleting flashcard set:', error);
    }
  };

  const handleDownloadCSV = async (setId) => {
    try {
      const response = await axios.get(`/api/flashcards/${setId}/download-csv`, {
        responseType: 'blob',
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      const set = flashcardSets.find(s => s._id === setId);
      link.setAttribute('download', `${set.title}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Error downloading CSV:', error);
    }
  };

  const handleUploadClick = () => {
    setSelectedSet(null);
  };

  const handleDeckCreated = (newDeck) => {
    // Add new deck to the list
    setFlashcardSets([newDeck, ...flashcardSets]);
    // Select the new deck
    setSelectedSet(newDeck);
    // Close the form
    setShowCreateDeckForm(false);
  };

  const handleCreateDeckClick = () => {
    // Deselect any selected deck to show dashboard
    setSelectedSet(null);
    // Show the create deck form
    setShowCreateDeckForm(true);
  };

  const handleFlashcardSetUpdate = (updatedSet) => {
    // Update the flashcard set in the list when cards are added/modified
    setFlashcardSets(flashcardSets.map(set => 
      set._id === updatedSet._id ? updatedSet : set
    ));
    // Update the selected set if it's the one being modified
    if (selectedSet && selectedSet._id === updatedSet._id) {
      setSelectedSet(updatedSet);
    }
  };

  if (authLoading) {
    return (
      <div className="App loading-screen">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div className={`App ${isSidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
      <Sidebar
        flashcardSets={flashcardSets}
        selectedSet={selectedSet}
        onSelectSet={handleSelectSet}
        onDeleteSet={handleDeleteSet}
        onDownloadCSV={handleDownloadCSV}
        onUploadClick={handleUploadClick}
        onCreateDeckClick={handleCreateDeckClick}
        isOpen={isSidebarOpen}
        onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
      />
      
      <header className="App-header">
        <div className="App-header-content">
          <h1>AI Flashcards</h1>
        </div>
        <div className="App-header-actions">
          <button className="theme-toggle" onClick={toggleTheme}>
            <span className="theme-toggle-icon">{isDark ? '☀️' : '🌙'}</span>
            <span>{isDark ? 'Light' : 'Dark'}</span>
          </button>
          {isAuthenticated ? (
            <UserMenu />
          ) : (
            <div className="auth-buttons">
              <button className="btn-login" onClick={() => setShowLogin(true)}>
                Sign In
              </button>
              <button className="btn-register" onClick={() => setShowRegister(true)}>
                Sign Up
              </button>
            </div>
          )}
        </div>
      </header>
      
      <div className="App-container">
        <main className="App-main">
          {!selectedSet ? (
            <Dashboard 
              onFileUpload={handleFileUpload} 
              onDeckCreated={handleDeckCreated}
              loading={loading}
              showCreateDeckForm={showCreateDeckForm}
              onCloseCreateDeckForm={() => setShowCreateDeckForm(false)}
            />
          ) : (
            <FlashcardViewer 
              flashcardSet={selectedSet}
              onFlashcardSetUpdate={handleFlashcardSetUpdate}
            />
          )}
        </main>
      </div>

      {showLogin && (
        <Login 
          onClose={() => setShowLogin(false)}
          onSwitchToRegister={() => {
            setShowLogin(false);
            setShowRegister(true);
          }}
        />
      )}

      {showRegister && (
        <Register 
          onClose={() => setShowRegister(false)}
          onSwitchToLogin={() => {
            setShowRegister(false);
            setShowLogin(true);
          }}
        />
      )}
    </div>
  );
}

function App() {
  return (
    <Routes>
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route path="/*" element={<MainApp />} />
    </Routes>
  );
}

export default App;

