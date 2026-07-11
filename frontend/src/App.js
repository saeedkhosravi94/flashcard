import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { FaSun, FaMoon, FaFire, FaEdit, FaTrash, FaPlus } from 'react-icons/fa';
import { FaCircle, FaCircleHalfStroke } from 'react-icons/fa6';
import './App.css';
import Dashboard from './components/Dashboard';
import ReviewPage from './components/ReviewPage';
import Sidebar from './components/Sidebar';
import FlashcardViewer from './components/FlashcardViewer';
import Login from './components/Login';
import Register from './components/Register';
import AuthCallback from './components/AuthCallback';
import UserMenu from './components/UserMenu';
import Settings from './components/Settings';
import AdminLogin from './components/AdminLogin';
import AdminDashboard from './components/AdminDashboard';
import LoadingOverlay from './components/LoadingOverlay';
import ReviewModal from './components/ReviewModal';
import ReviewSession from './components/ReviewSession';
import SEOHead from './components/SEOHead';
import { useTheme } from './ThemeContext';
import { useAuth } from './contexts/AuthContext';
import axios from 'axios';

function MainApp() {
  const { isDark, toggleTheme } = useTheme();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [flashcardSets, setFlashcardSets] = useState([]);
  const [selectedSet, setSelectedSet] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [loadingSubMessage, setLoadingSubMessage] = useState('');
  const refreshReviewStatsRef = useRef(null);
  const previousDeckCountRef = useRef(0);
  const [showCreateDeckForm, setShowCreateDeckForm] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showReviewSession, setShowReviewSession] = useState(false);
  const [reviewDeck, setReviewDeck] = useState(null);
  const [reviewMode, setReviewMode] = useState('standard');
  const [currentPage, setCurrentPage] = useState('dashboard'); // 'dashboard' or 'review'
  // Default sidebar to closed on mobile devices (under 500px)
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    return window.innerWidth > 500;
  });

  // Close sidebar when user logs out or is not authenticated
  useEffect(() => {
    if (!isAuthenticated && !authLoading) {
      setIsSidebarOpen(false);
    }
  }, [isAuthenticated, authLoading]);

  // Disable page scrolling on mobile when viewing flashcards
  useEffect(() => {
    const isMobile = window.innerWidth <= 768;
    if (isMobile && selectedSet) {
      document.body.classList.add('flashcard-viewer-active');
      document.documentElement.classList.add('flashcard-viewer-active');
    } else {
      document.body.classList.remove('flashcard-viewer-active');
      document.documentElement.classList.remove('flashcard-viewer-active');
    }
    
    return () => {
      document.body.classList.remove('flashcard-viewer-active');
      document.documentElement.classList.remove('flashcard-viewer-active');
    };
  }, [selectedSet]);
  
  // Viewer control callbacks refs
  const viewerCallbacksRef = React.useRef({
    onEdit: null,
    onDelete: null,
    onAdd: null,
    difficultyFilter: 'all',
    onDifficultyChange: null,
    cards: []
  });
  
  // Force re-render when viewer callbacks change
  const [, forceUpdate] = useState({});

  // Stable callback for registering viewer callbacks
  const handleRegisterCallbacks = useCallback((callbacks) => {
    viewerCallbacksRef.current = callbacks;
    forceUpdate({});
  }, []);

  const fetchFlashcardSets = useCallback(async () => {
    try {
      const response = await axios.get('/api/flashcards');
      setFlashcardSets(response.data);
      
      // Check if any decks are processing
      const processingDecks = response.data.filter(set => set.processingStatus === 'processing');
      
      return processingDecks.length > 0;
    } catch (error) {
      console.error('Error fetching flashcard sets:', error);
      return false;
    }
  }, []);

  useEffect(() => {
    if (!authLoading) {
      fetchFlashcardSets();
    }
  }, [authLoading, fetchFlashcardSets]);

  // Poll for processing decks and new shared decks
  useEffect(() => {
    if (authLoading || !isAuthenticated) return;
    
    let pollInterval;
    let isPolling = true;
    
    const checkForUpdates = async () => {
      if (!isPolling) return;
      
      const hasProcessing = await fetchFlashcardSets();
      
      // Continue polling if there are processing decks or user is authenticated (for shared decks)
      if (hasProcessing || isAuthenticated) {
        pollInterval = setTimeout(checkForUpdates, 5000); // Poll every 5 seconds
      } else {
        isPolling = false;
      }
    };
    
    // Check immediately for processing decks
    const hasProcessing = flashcardSets.some(set => set.processingStatus === 'processing');
    
    // Start polling if there are processing decks or to check for shared decks
    if (hasProcessing || isAuthenticated) {
      pollInterval = setTimeout(checkForUpdates, 5000); // Start after 5 seconds
    }
    
    return () => {
      isPolling = false;
      if (pollInterval) {
        clearTimeout(pollInterval);
      }
    };
  }, [flashcardSets.length, authLoading, isAuthenticated, fetchFlashcardSets]);

  // Track deck count changes to detect new shared decks
  useEffect(() => {
    if (flashcardSets.length > previousDeckCountRef.current && previousDeckCountRef.current > 0) {
      console.log(`📥 New deck(s) detected! Previous: ${previousDeckCountRef.current}, Current: ${flashcardSets.length}`);
    }
    previousDeckCountRef.current = flashcardSets.length;
  }, [flashcardSets.length]);

  // Listen for authentication changes and refresh flashcard list
  useEffect(() => {
    const handleAuthChange = () => {
      fetchFlashcardSets();
      // Also clear selected set since user context changed
      setSelectedSet(null);
    };

    window.addEventListener('auth-change', handleAuthChange);
    
    return () => {
      window.removeEventListener('auth-change', handleAuthChange);
    };
  }, [fetchFlashcardSets]);

  const handleFileUpload = async (file, aiConfig = {}) => {
    // Check if any deck is currently processing
    const isProcessing = flashcardSets.some(set => set.processingStatus === 'processing');
    if (isProcessing) {
      alert('⚠️ Another deck is currently being generated. Please wait until it completes before uploading a new file.');
      throw new Error('Another deck is processing');
    }

    const formData = new FormData();
    formData.append('file', file);
    
    // Add AI configuration to form data (only if aiConfig is provided and not null)
    if (aiConfig && typeof aiConfig === 'object') {
      if (aiConfig.customPrompt) {
        formData.append('customPrompt', aiConfig.customPrompt);
      }
      if (aiConfig.model) {
        formData.append('model', aiConfig.model);
      }
      if (aiConfig.apiKey) {
        formData.append('apiKey', aiConfig.apiKey);
      }
      if (aiConfig.numCards) {
        formData.append('numCards', aiConfig.numCards);
      }
      
      // Add page range for PDFs if provided
      if (aiConfig.pageFrom && aiConfig.pageTo) {
        formData.append('pageFrom', aiConfig.pageFrom);
        formData.append('pageTo', aiConfig.pageTo);
      }
    }

    setLoading(true);
    setLoadingMessage('📤 Processing Your File...');
    setLoadingSubMessage('Analyzing content and preparing for generation...');
    
    try {
      const response = await axios.post('/api/flashcards/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      setLoading(false);
      setLoadingMessage('');
      setLoadingSubMessage('');
      
      // Check if it's background processing (202 status) or immediate (201 status)
      if (response.status === 202 || response.data.processingStatus === 'processing') {
        // Refresh the deck list to show the processing deck
        await fetchFlashcardSets();
        alert(`✅ Your deck "${response.data.title}" is being generated in the background! You can see the progress in the sidebar. This may take several minutes for large files.`);
      } else {
        // Immediate completion (small file)
        setFlashcardSets([response.data, ...flashcardSets]);
        setSelectedSet(response.data);
      }
      
      return response.data;
    } catch (error) {
      setLoading(false);
      setLoadingMessage('');
      setLoadingSubMessage('');
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

  const handleRenameSet = async (setId, newTitle) => {
    try {
      const response = await axios.patch(`/api/flashcards/${setId}/rename`, { title: newTitle });
      // Update the flashcard set in the list
      setFlashcardSets(flashcardSets.map(set => 
        set._id === setId ? { ...set, title: newTitle } : set
      ));
      // Update selected set if it's the one being renamed
      if (selectedSet && selectedSet._id === setId) {
        setSelectedSet({ ...selectedSet, title: newTitle });
      }
      return response.data;
    } catch (error) {
      console.error('Error renaming flashcard set:', error);
      throw error;
    }
  };

  const handleUploadClick = (folder = null) => {
    setSelectedSet(null);
    setShowCreateDeckForm(folder); // Pass folder to pre-select
  };

  const handleDeckCreated = (newDeck) => {
    // Add new deck to the list
    setFlashcardSets([newDeck, ...flashcardSets]);
    // Select the new deck
    setSelectedSet(newDeck);
    // Close the form
    setShowCreateDeckForm(false);
  };

  const handleCreateDeckClick = (folder = null) => {
    // Deselect any selected deck to show dashboard
    setSelectedSet(null);
    // Show the create deck form with optional folder
    setShowCreateDeckForm(folder);
  };

  const handleFoldersUpdate = async () => {
    // Refresh flashcard sets when folders are updated
    await fetchFlashcardSets();
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

  const handleReviewDeck = (deck) => {
    setReviewDeck(deck);
    // If deck has reviewMode, set it and start review directly
    if (deck.reviewMode) {
      setReviewMode(deck.reviewMode);
      setShowReviewModal(false);
      setShowReviewSession(true);
    } else {
      setShowReviewModal(true);
    }
  };

  const handleStartReview = (mode = 'standard') => {
    setShowReviewModal(false);
    setShowReviewSession(true);
    setReviewMode(mode);
  };

  const handleCloseReview = () => {
    setShowReviewModal(false);
    setShowReviewSession(false);
    setReviewDeck(null);
    // Refresh review stats when closing review
    if (refreshReviewStatsRef.current) {
      refreshReviewStatsRef.current();
    }
    // Refresh flashcard sets to update review dates
    fetchFlashcardSets();
  };

  const handleReviewComplete = () => {
    setShowReviewSession(false);
    setShowReviewModal(false);
    setReviewDeck(null);
    // Navigate to review page in dashboard
    setCurrentPage('review');
    setSelectedSet(null);
    // Refresh review stats when review completes
    if (refreshReviewStatsRef.current) {
      refreshReviewStatsRef.current();
    }
    // Refresh flashcard sets to update review dates
    fetchFlashcardSets();
  };

  if (authLoading) {
    return (
      <div className="App loading-screen">
        <div className="book-loader"></div>
      </div>
    );
  }

  // Determine current page for SEO
  const getPageTitle = () => {
    if (selectedSet) {
      return `${selectedSet.title} - Active Recall Flashcards | ActiveRecaller`;
    }
    if (currentPage === 'review') {
      return 'Review Flashcards - Active Recall Learning | ActiveRecaller';
    }
    return 'Active Recall Flashcards - AI-Powered Learning & Study Tool | ActiveRecaller';
  };

  const getPageDescription = () => {
    if (selectedSet) {
      return `Study ${selectedSet.title} with active recall flashcards. AI-powered learning tool for efficient memorization and spaced repetition.`;
    }
    if (currentPage === 'review') {
      return 'Review your flashcards using active recall method. Spaced repetition algorithm helps you remember better. Free flashcard review tool.';
    }
    return 'Master active recall learning with AI-powered flashcards. Create, study, and review flashcards for efficient learning. Perfect for students, professionals, and lifelong learners.';
  };

  return (
    <div className={`App ${isSidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
      <SEOHead
        title={getPageTitle()}
        description={getPageDescription()}
      />
      {loading && <LoadingOverlay message={loadingMessage} subMessage={loadingSubMessage} />}
      
      <Sidebar
        flashcardSets={flashcardSets}
        selectedSet={selectedSet}
        onSelectSet={handleSelectSet}
        onDeleteSet={handleDeleteSet}
        onDownloadCSV={handleDownloadCSV}
        onRenameSet={handleRenameSet}
        onUploadClick={handleUploadClick}
        onCreateDeckClick={handleCreateDeckClick}
        onFoldersUpdate={handleFoldersUpdate}
        onReviewDeck={handleReviewDeck}
        isOpen={isSidebarOpen}
        onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
        currentPage={currentPage}
        onNavigateToDashboard={() => { setCurrentPage('dashboard'); setSelectedSet(null); }}
        onNavigateToReview={() => { setCurrentPage('review'); setSelectedSet(null); }}
      />
      
      <header className="App-header">
        <div className="App-header-content">
          <h1>
            {!isAuthenticated && (
              <img 
                src={isDark ? '/AR_white.png' : '/AR_black.png'} 
                alt="ActiveRecaller - Active Recall Flashcards for Efficient Learning" 
                className="header-logo"
              />
            )}
{(() => {
              const getTitle = () => {
                if (!isAuthenticated) return 'ActiveRecaller Flashcards';
                if (selectedSet) return selectedSet.title;
                if (currentPage === 'review') return 'Review';
                return 'New Decks';
              };
              
              const title = getTitle();
              // Truncate on mobile (max 20 characters)
              const isMobile = window.innerWidth <= 500;
              if (isMobile && title.length > 20) {
                return title.substring(0, 20) + '...';
              }
              return title;
            })()}
          </h1>
        </div>
        <div className="App-header-actions">
          <button className="theme-toggle icon-btn" onClick={toggleTheme} title={isDark ? 'Light mode' : 'Dark mode'}>
            {isDark ? <FaSun className="theme-toggle-icon" /> : <FaMoon className="theme-toggle-icon" />}
          </button>
          {isAuthenticated ? (
            <UserMenu onOpenSettings={() => setShowSettings(true)} />
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
        {selectedSet && (
          <div className="viewer-controls-bar">
            {/* Progress bar positioned exactly on the top border */}
            <div className="viewer-progress-bar-wrapper">
              <div className="viewer-progress-bar">
                <div
                  className="viewer-progress-fill"
                  style={{ width: `${(((selectedSet.currentIndex || 0) + 1) / selectedSet.cards.length) * 100}%` }}
                />
              </div>
            </div>
            
            <div className="viewer-controls-content">
              <div className="viewer-controls-left">
                <span className="viewer-progress-text desktop-only">
                  Card {(selectedSet.currentIndex || 0) + 1} of {selectedSet.cards.length}
                </span>
              </div>
              
              {/* Difficulty Filter in the middle */}
              <div className="viewer-controls-center">
                {/* Button bar for desktop */}
                <div className="difficulty-filter-bar desktop-only">
                  <button 
                    className={`filter-btn ${viewerCallbacksRef.current.difficultyFilter === 'all' ? 'active' : ''}`}
                    onClick={() => viewerCallbacksRef.current.onDifficultyChange?.('all')}
                    title="Show all cards"
                  >
                    All <span className="filter-count">({viewerCallbacksRef.current.cards?.length || 0})</span>
                  </button>
                  <button 
                    className={`filter-btn easy ${viewerCallbacksRef.current.difficultyFilter === 'easy' ? 'active' : ''}`}
                    onClick={() => viewerCallbacksRef.current.onDifficultyChange?.('easy')}
                    title="Show easy cards"
                  >
                    <FaCircle /> Easy <span className="filter-count">({viewerCallbacksRef.current.cards?.filter(c => (c.difficulty || 'medium') === 'easy').length || 0})</span>
                  </button>
                  <button 
                    className={`filter-btn medium ${viewerCallbacksRef.current.difficultyFilter === 'medium' ? 'active' : ''}`}
                    onClick={() => viewerCallbacksRef.current.onDifficultyChange?.('medium')}
                    title="Show medium cards"
                  >
                    <FaCircleHalfStroke /> Medium <span className="filter-count">({viewerCallbacksRef.current.cards?.filter(c => (c.difficulty || 'medium') === 'medium').length || 0})</span>
                  </button>
                  <button 
                    className={`filter-btn hard ${viewerCallbacksRef.current.difficultyFilter === 'hard' ? 'active' : ''}`}
                    onClick={() => viewerCallbacksRef.current.onDifficultyChange?.('hard')}
                    title="Show hard cards"
                  >
                    <FaFire /> Hard <span className="filter-count">({viewerCallbacksRef.current.cards?.filter(c => (c.difficulty || 'medium') === 'hard').length || 0})</span>
                  </button>
                </div>
                
                {/* Dropdown for mobile */}
                <select 
                  className="difficulty-filter-dropdown mobile-only"
                  value={viewerCallbacksRef.current.difficultyFilter || 'all'}
                  onChange={(e) => viewerCallbacksRef.current.onDifficultyChange?.(e.target.value)}
                >
                  <option value="all">All ({viewerCallbacksRef.current.cards?.length || 0})</option>
                  <option value="easy">○ Easy ({viewerCallbacksRef.current.cards?.filter(c => (c.difficulty || 'medium') === 'easy').length || 0})</option>
                  <option value="medium">◐ Medium ({viewerCallbacksRef.current.cards?.filter(c => (c.difficulty || 'medium') === 'medium').length || 0})</option>
                  <option value="hard">🔥 Hard ({viewerCallbacksRef.current.cards?.filter(c => (c.difficulty || 'medium') === 'hard').length || 0})</option>
                </select>
              </div>
              
              <div className="viewer-controls-right">
                {/* Buttons for desktop */}
                <button className="control-btn desktop-only" onClick={() => viewerCallbacksRef.current.onEdit?.()} title="Edit current card">
                  <FaEdit /> Edit
                </button>
                <button className="control-btn danger desktop-only" onClick={() => viewerCallbacksRef.current.onDelete?.()} title="Delete current card">
                  <FaTrash /> Delete
                </button>
                <button className="control-btn primary desktop-only" onClick={() => viewerCallbacksRef.current.onAdd?.()} title="Add new card">
                  <FaPlus /> Add Card
                </button>
                
                {/* Actions dropdown for mobile */}
                <select 
                  className="actions-dropdown mobile-only"
                  defaultValue=""
                  onChange={(e) => {
                    const action = e.target.value;
                    if (action === 'edit') viewerCallbacksRef.current.onEdit?.();
                    else if (action === 'delete') viewerCallbacksRef.current.onDelete?.();
                    else if (action === 'add') viewerCallbacksRef.current.onAdd?.();
                    e.target.value = ''; // Reset dropdown
                  }}
                >
                  <option value="" disabled>Actions</option>
                  <option value="add">+ Add Card</option>
                  <option value="edit">✎ Edit Card</option>
                  <option value="delete">🗑 Delete Card</option>
                </select>
              </div>
            </div>
          </div>
        )}
        <main className={`App-main ${selectedSet ? 'with-controls' : ''}`}>
          {selectedSet ? (
            <FlashcardViewer 
              flashcardSet={selectedSet}
              onFlashcardSetUpdate={handleFlashcardSetUpdate}
              onClose={() => setSelectedSet(null)}
              onRegisterCallbacks={handleRegisterCallbacks}
            />
          ) : currentPage === 'review' ? (
            <ReviewPage
              onReviewDeck={handleReviewDeck}
              onReviewStatsUpdate={(refreshFn) => { refreshReviewStatsRef.current = refreshFn; }}
            />
          ) : (
            <Dashboard 
              onFileUpload={handleFileUpload} 
              onDeckCreated={handleDeckCreated}
              loading={loading}
              showCreateDeckForm={showCreateDeckForm}
              onCloseCreateDeckForm={() => setShowCreateDeckForm(false)}
              onReviewStatsUpdate={(refreshFn) => { refreshReviewStatsRef.current = refreshFn; }}
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

      {showSettings && (
        <Settings onClose={() => setShowSettings(false)} />
      )}

      {showReviewModal && reviewDeck && (
        <ReviewModal
          deckId={reviewDeck._id}
          deckTitle={reviewDeck.title}
          onClose={handleCloseReview}
          onStartReview={handleStartReview}
        />
      )}

      {showReviewSession && reviewDeck && (
        <ReviewSession
          deckId={reviewDeck._id}
          deckTitle={reviewDeck.title}
          onClose={handleCloseReview}
          onComplete={handleReviewComplete}
          mode={reviewMode}
        />
      )}
    </div>
  );
}

function App() {
  return (
    <Routes>
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/admin/dashboard" element={<AdminDashboard />} />
      <Route path="/*" element={<MainApp />} />
    </Routes>
  );
}

export default App;

