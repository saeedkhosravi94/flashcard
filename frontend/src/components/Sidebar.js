import React, { useState, useEffect } from 'react';
import { FaFolder, FaFolderOpen, FaFile, FaCopy, FaDownload, FaEye, FaLock, FaInfoCircle, FaEdit, FaTrash, FaPlus, FaBook, FaCircle, FaFire, FaShare, FaTimes } from 'react-icons/fa';
import { BsFilesAlt } from 'react-icons/bs';
import './Sidebar.css';
import { useAuth } from '../contexts/AuthContext';
import ConfirmationModal from './ConfirmationModal';
import CreateFolderModal from './CreateFolderModal';
import ShareDeckModal from './ShareDeckModal';
import RenameModal from './RenameModal';
import axios from 'axios';

function Sidebar({ 
  flashcardSets, 
  selectedSet, 
  onSelectSet, 
  onDeleteSet, 
  onDownloadCSV, 
  onRenameSet, 
  onUploadClick, 
  onFoldersUpdate,
  onReviewDeck,
  isOpen, 
  onToggle,
  currentPage,
  onNavigateToDashboard,
  onNavigateToReview
}) {
  // Helper function to close sidebar on mobile after action
  const handleMobileClose = () => {
    if (window.innerWidth <= 500 && isOpen) {
      onToggle();
    }
  };
  const { isAuthenticated, user } = useAuth();
  const [folders, setFolders] = useState([]);
  const [expandedFolders, setExpandedFolders] = useState(new Set());
  const [contextMenu, setContextMenu] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [loading, setLoading] = useState(false);
  const [longPressTimer, setLongPressTimer] = useState(null);
  const [touchStartPos, setTouchStartPos] = useState(null);
  const [copiedDeck, setCopiedDeck] = useState(null);
  const [showCreateFolderModal, setShowCreateFolderModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareDeck, setShareDeck] = useState(null);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [renameTarget, setRenameTarget] = useState(null); // { type: 'deck' | 'folder', item: deck/folder }
  const [showMobileHint, setShowMobileHint] = useState(() => {
    // Check if hint was dismissed before
    if (typeof window !== 'undefined') {
      return !localStorage.getItem('sidebar-mobile-hint-dismissed');
    }
    return false;
  });
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth <= 500;
    }
    return false;
  });

  // Check if mobile on resize
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 500);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Fetch folders when user authentication state changes
  useEffect(() => {
    if (isAuthenticated && user) {
      fetchFolders();
    } else {
      // Clear folders if not authenticated
      setFolders([]);
      setLoading(false);
    }
  }, [isAuthenticated, user]);

  // Fetch folders
  const fetchFolders = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/folders');
      setFolders(response.data);
      
      // Auto-expand all folders
      const folderIds = response.data.map(f => f._id);
      setExpandedFolders(new Set(folderIds));
    } catch (error) {
      console.error('❌ Error fetching folders:', error);
      if (error.response?.status === 401) {
        console.error('❌ Unauthorized - token may be invalid');
        setFolders([]);
      }
    } finally {
      setLoading(false);
    }
  };

  // Show create folder modal
  const handleCreateFolder = () => {
    setShowCreateFolderModal(true);
    closeContextMenu();
  };

  // Create new folder
  const handleCreateFolderSubmit = async (name) => {
    try {
      const response = await axios.post('/api/folders', { name: name.trim() });
      
      setFolders([...folders, response.data]);
      setExpandedFolders(prev => new Set([...prev, response.data._id]));
      
      if (onFoldersUpdate) onFoldersUpdate();
      
      setShowCreateFolderModal(false);
    } catch (error) {
      console.error('❌ Error creating folder:', error);
      alert(error.response?.data?.error || 'Failed to create folder');
    }
  };

  // Rename folder
  const handleRenameFolder = (folder) => {
    setRenameTarget({ type: 'folder', item: folder });
    setShowRenameModal(true);
    closeContextMenu();
  };

  const handleRenameFolderSubmit = async (newName) => {
    if (!renameTarget || renameTarget.type !== 'folder') return;
    
    const folder = renameTarget.item;
    
    try {
      await axios.patch(`/api/folders/${folder._id}`, { name: newName });
      
      // Update folder list
      setFolders(folders.map(f => 
        f._id === folder._id ? { ...f, name: newName } : f
      ));
      
      if (onFoldersUpdate) onFoldersUpdate();
      
      setShowRenameModal(false);
      setRenameTarget(null);
    } catch (error) {
      console.error('❌ Error renaming folder:', error);
      alert(error.response?.data?.error || 'Failed to rename folder');
    }
  };

  // Delete folder
  const handleDeleteFolder = (folder) => {
    
    const decksInFolder = flashcardSets.filter(set => {
      const setFolderId = set.folder?._id || set.folder;
      return setFolderId === folder._id || setFolderId?.toString() === folder._id?.toString();
    });
    
    setDeleteTarget({ 
      type: 'folder', 
      item: folder,
      deckCount: decksInFolder.length 
    });
    setShowDeleteConfirm(true);
    closeContextMenu();
  };

  // Rename deck
  const handleRenameDeck = (deck) => {
    setRenameTarget({ type: 'deck', item: deck });
    setShowRenameModal(true);
    closeContextMenu();
  };

  const handleRenameDeckSubmit = async (newTitle) => {
    if (!renameTarget || renameTarget.type !== 'deck') return;
    
    const deck = renameTarget.item;
    
    try {
      await axios.patch(`/api/flashcards/${deck._id}/rename`, { title: newTitle });
      
      // Trigger refresh of flashcard sets
      if (onFoldersUpdate) {
        onFoldersUpdate();
      }
      
      setShowRenameModal(false);
      setRenameTarget(null);
    } catch (error) {
      console.error('❌ Error renaming deck:', error);
      alert(error.response?.data?.error || 'Failed to rename deck');
    }
  };

  // Copy deck
  const handleCopyDeck = (deck) => {
    setCopiedDeck(deck);
    closeContextMenu();
  };

  // Paste deck to folder (or no folder if folderId is null)
  const handlePasteDeck = async (folder) => {
    if (!copiedDeck) return;

    try {
      // Duplicate the deck with the target folder (or null for no folder)
      const response = await axios.post(`/api/flashcards/${copiedDeck._id}/duplicate`, {
        folderId: folder ? folder._id : null
      });
      
      // Trigger refresh of flashcard sets
      if (onFoldersUpdate) {
        onFoldersUpdate();
      }
      
      // Clear copied deck
      setCopiedDeck(null);
      
      closeContextMenu();
    } catch (error) {
      console.error('❌ Error pasting deck:', error);
      alert('Failed to copy deck: ' + (error.response?.data?.error || error.message));
    }
  };

  // Confirm delete
  const confirmDelete = async () => {
    if (!deleteTarget) return;

    try {
      if (deleteTarget.type === 'folder') {
        const response = await axios.delete(`/api/folders/${deleteTarget.item._id}`);
        
        // Remove folder from local state
        setFolders(folders.filter(f => f._id !== deleteTarget.item._id));
        
        // Notify parent to refresh flashcard sets (to remove deleted decks)
        if (onFoldersUpdate) onFoldersUpdate();
      } else if (deleteTarget.type === 'deck') {
        onDeleteSet(deleteTarget.item._id);
      }
    } catch (error) {
      console.error('❌ Error deleting:', error);
      alert(error.response?.data?.error || 'Failed to delete');
    }

    setShowDeleteConfirm(false);
    setDeleteTarget(null);
  };

  // Create deck in folder
  const handleCreateDeckInFolder = (folder) => {
    closeContextMenu();
    if (onUploadClick) {
      onUploadClick(folder); // Pass folder to pre-select it
    }
  };

  // Context menu handlers
  const handleContextMenu = (e, item, type) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, item, type });
  };

  const closeContextMenu = () => {
    setContextMenu(null);
  };

  // Long press handlers for mobile
  const handleTouchStart = (e, item, type) => {
    const touch = e.touches[0];
    setTouchStartPos({ x: touch.clientX, y: touch.clientY });
    
    const timer = setTimeout(() => {
      // Trigger context menu after 500ms hold
      setContextMenu({ 
        x: touch.clientX, 
        y: touch.clientY, 
        item, 
        type 
      });
      // Add haptic feedback if available
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
    }, 500);
    
    setLongPressTimer(timer);
  };

  const handleTouchMove = (e) => {
    // Cancel long press if finger moves too much
    if (touchStartPos && longPressTimer) {
      const touch = e.touches[0];
      const deltaX = Math.abs(touch.clientX - touchStartPos.x);
      const deltaY = Math.abs(touch.clientY - touchStartPos.y);
      
      if (deltaX > 10 || deltaY > 10) {
        clearTimeout(longPressTimer);
        setLongPressTimer(null);
      }
    }
  };

  const handleTouchEnd = () => {
    // Clear timer if touch ends before long press duration
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
    setTouchStartPos(null);
  };

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (longPressTimer) {
        clearTimeout(longPressTimer);
      }
    };
  }, [longPressTimer]);

  const toggleFolder = (folderId) => {
    setExpandedFolders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(folderId)) {
        newSet.delete(folderId);
      } else {
        newSet.add(folderId);
      }
      return newSet;
    });
  };

  // Get decks for a specific folder
  const getDecksInFolder = (folderId) => {
    return flashcardSets.filter(set => {
      const setFolderId = set.folder?._id || set.folder;
      return setFolderId === folderId || setFolderId?.toString() === folderId?.toString();
    });
  };

  // Get decks without folder
  const getDecksWithoutFolder = () => {
    return flashcardSets.filter(set => {
      const setFolderId = set.folder?._id || set.folder;
      return !setFolderId;
    });
  };

  // Format date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.ceil((now - date) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Close context menu when clicking outside
  useEffect(() => {
    if (contextMenu) {
      document.addEventListener('click', closeContextMenu);
      return () => document.removeEventListener('click', closeContextMenu);
    }
  }, [contextMenu]);

  // Show login prompt if not authenticated
  if (!isAuthenticated) {
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
            <h3 className="sidebar-title">
              <span className="title-icon">📁</span>
              MY FLASHCARDS
            </h3>
          </div>
          
          <div className="sidebar-explorer">
            <div className="login-prompt">
              <FaLock className="login-prompt-icon" />
              <h3>Sign In Required</h3>
              <p>Please sign in to create and manage your flashcard folders and decks.</p>
            </div>
          </div>
        </aside>
      </>
    );
  }

  const decksWithoutFolder = getDecksWithoutFolder();

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
      
      <aside 
        className={`sidebar ${isOpen ? 'open' : 'closed'}`}
        onContextMenu={(e) => handleContextMenu(e, null, 'empty')}
      >
        <div className="sidebar-header">
          <h3 className="sidebar-title">
            <span className="title-icon">📁</span>
            MY FLASHCARDS
          </h3>
          <div className="header-actions">
            <button 
              className={`nav-btn ${currentPage === 'dashboard' ? 'active' : ''}`}
              onClick={() => {
                onNavigateToDashboard();
                handleMobileClose();
              }}
              title="New Decks"
            >
              <FaPlus />
            </button>
            <button 
              className={`nav-btn ${currentPage === 'review' ? 'active' : ''}`}
              onClick={() => {
                onNavigateToReview();
                handleMobileClose();
              }}
              title="Review"
            >
              <FaFire />
            </button>
            <button 
              className="new-folder-btn" 
              onClick={() => {
                handleCreateFolder();
                handleMobileClose();
              }}
              title="Create new folder"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M14.5 3H7.71l-.85-.85L6.51 2h-5l-.5.5v11l.5.5h13l.5-.5v-10L14.5 3zm-.51 8.49V13h-12V7h4.49l.35-.15.86-.86H14v1.5l-.01 4zm0-6.49h-6.5l-.35.15-.86.86H2v-3h4.29l.85.85.36.15H14l-.01.99z"/>
              </svg>
            </button>
          </div>
        </div>

        <div className="sidebar-explorer">
          {isMobile && isAuthenticated && showMobileHint && (
            <div className="mobile-hint">
              <FaInfoCircle className="hint-icon" />
              <span className="hint-text">Hold touch on items for more options</span>
              <button 
                className="hint-close" 
                onClick={() => {
                  setShowMobileHint(false);
                  localStorage.setItem('sidebar-mobile-hint-dismissed', 'true');
                }}
                aria-label="Dismiss hint"
              >
                <FaTimes />
              </button>
            </div>
          )}
          {loading ? (
            <div className="loading-folders">
              <div className="book-loader"></div>
              <p>Loading...</p>
            </div>
          ) : folders.length === 0 && flashcardSets.length === 0 ? (
            <div className="empty-state">
              <FaFolder className="empty-icon" />
              <p className="empty-text">No folders or decks yet</p>
              <button className="empty-action" onClick={handleCreateFolder}>
                Create First Folder
              </button>
            </div>
          ) : (
            <div className="file-tree">
              {/* User's Folders */}
              {folders.map(folder => {
                const decksInFolder = getDecksInFolder(folder._id);
                return (
                  <div key={folder._id} className="tree-folder">
                  <div 
                    className="tree-folder-header"
                    onClick={() => toggleFolder(folder._id)}
                    onContextMenu={(e) => handleContextMenu(e, folder, 'folder')}
                    onTouchStart={(e) => handleTouchStart(e, folder, 'folder')}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                  >
                    <span className={`folder-chevron ${expandedFolders.has(folder._id) ? 'expanded' : ''}`}>
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M6 4l4 4-4 4V4z"/>
                      </svg>
                    </span>
                    <span className="folder-icon">
                      {expandedFolders.has(folder._id) ? <FaFolderOpen /> : <FaFolder />}
                    </span>
                    <span className="folder-name">{folder.name}</span>
                    <span className="folder-count">{decksInFolder.length}</span>
                  </div>
                    
                    {expandedFolders.has(folder._id) && (
                      <div className="tree-folder-content">
                        {decksInFolder.length === 0 ? (
                          <div className="empty-folder-message">
                            <FaFolder className="empty-folder-icon" />
                            <span className="empty-folder-text">Empty folder</span>
                          </div>
                        ) : (
                          decksInFolder.map(set => {
                            const progressPercent = set.processingStatus === 'processing' && set.processingProgress?.total > 0
                              ? Math.round((set.processingProgress.current / set.processingProgress.total) * 100)
                              : 0;
                            
                            return (
                              <div
                                key={set._id}
                                className={`tree-file ${selectedSet?._id === set._id ? 'selected' : ''} ${set.processingStatus === 'processing' ? 'processing' : ''}`}
                                style={set.processingStatus === 'processing' ? {
                                  '--progress-percent': `${progressPercent}%`
                                } : {}}
                                onClick={() => {
                                  if (set.processingStatus !== 'processing') {
                                    onSelectSet(set._id);
                                    if (onToggle) onToggle();
                                  }
                                }}
                                onContextMenu={(e) => handleContextMenu(e, set, 'deck')}
                                onTouchStart={(e) => handleTouchStart(e, set, 'deck')}
                                onTouchMove={handleTouchMove}
                                onTouchEnd={handleTouchEnd}
                              >
                                <span className="file-icon">{set.processingStatus === 'processing' ? <FaBook className="book-loading" /> : <BsFilesAlt />}</span>
                                <div className="file-info">
                                  <span className="file-name">{set.title}</span>
                                  <span className="file-meta">
                                    {set.processingStatus === 'processing' ? (
                                      `Generating... ${set.processingProgress?.current || 0}/${set.processingProgress?.total || 0}`
                                    ) : (
                                      `${set.cards.length} cards • ${formatDate(set.createdAt)}`
                                    )}
                                  </span>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Decks without folder */}
              {decksWithoutFolder.length > 0 && (
                <div className="tree-folder">
                  <div 
                    className="tree-folder-header uncategorized"
                    onClick={() => toggleFolder('no-folder')}
                  >
                    <span className={`folder-chevron ${expandedFolders.has('no-folder') ? 'expanded' : ''}`}>
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M6 4l4 4-4 4V4z"/>
                      </svg>
                    </span>
                    <span className="folder-icon"><FaFolder /></span>
                    <span className="folder-name">Uncategorized</span>
                    <span className="folder-count">{decksWithoutFolder.length}</span>
                  </div>
                  
                  {expandedFolders.has('no-folder') && (
                    <div className="tree-folder-content">
                      {decksWithoutFolder.map(set => {
                        const progressPercent = set.processingStatus === 'processing' && set.processingProgress?.total > 0
                          ? Math.round((set.processingProgress.current / set.processingProgress.total) * 100)
                          : 0;
                        
                        return (
                          <div
                            key={set._id}
                            className={`tree-file ${selectedSet?._id === set._id ? 'selected' : ''} ${set.processingStatus === 'processing' ? 'processing' : ''}`}
                            style={set.processingStatus === 'processing' ? {
                              '--progress-percent': `${progressPercent}%`
                            } : {}}
                            onClick={() => {
                              if (set.processingStatus !== 'processing') {
                                onSelectSet(set._id);
                                if (onToggle) onToggle();
                              }
                            }}
                            onContextMenu={(e) => handleContextMenu(e, set, 'deck')}
                            onTouchStart={(e) => handleTouchStart(e, set, 'deck')}
                            onTouchMove={handleTouchMove}
                            onTouchEnd={handleTouchEnd}
                          >
                            <span className="file-icon">{set.processingStatus === 'processing' ? '⏳' : <BsFilesAlt />}</span>
                            <div className="file-info">
                              <span className="file-name">{set.title}</span>
                              <span className="file-meta">
                                {set.processingStatus === 'processing' ? (
                                  `Generating... ${set.processingProgress?.current || 0}/${set.processingProgress?.total || 0}`
                                ) : (
                                  `${set.cards.length} cards • ${formatDate(set.createdAt)}`
                                )}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {copiedDeck && (
          <div className="copied-deck-indicator">
            <FaCopy className="copied-icon" />
            <span className="copied-text">"{copiedDeck.title}" copied</span>
            <button 
              className="clear-copy-btn" 
              onClick={() => setCopiedDeck(null)}
              title="Clear copied deck"
            >
              ✕
            </button>
          </div>
        )}

        <div className="sidebar-footer">
          <span className="footer-stat"><FaFolder /> {folders.length}</span>
          <span className="footer-stat"><BsFilesAlt /> {flashcardSets.length}</span>
          <span className="footer-stat"><BsFilesAlt /> {flashcardSets.reduce((sum, set) => sum + set.cards.length, 0)}</span>
        </div>
      </aside>

      {/* Context Menu */}
      {contextMenu && (
        <div 
          className="context-menu" 
          style={{ top: contextMenu.y, left: contextMenu.x }}
        >
          {contextMenu.type === 'deck' && (
            <>
              <div className="context-menu-item" onClick={() => { 
                onSelectSet(contextMenu.item._id); 
                closeContextMenu(); 
                if (onToggle) onToggle();
              }}>
                <FaEye className="context-icon" />
                <span>Open</span>
              </div>
              <div className="context-menu-item" onClick={() => { 
                if (onReviewDeck) {
                  onReviewDeck(contextMenu.item);
                }
                closeContextMenu(); 
              }}>
                <FaFire className="context-icon" />
                <span>Review</span>
              </div>
              <div className="context-menu-divider"></div>
              <div className="context-menu-item" onClick={() => { onDownloadCSV(contextMenu.item._id); closeContextMenu(); }}>
                <FaDownload className="context-icon" />
                <span>Download CSV</span>
              </div>
              {/* Check if user owns the deck - handle both string and object user IDs */}
              {(() => {
                if (!user || !user.id) {
                  // Not authenticated - show only copy option
                  return (
                    <>
                      <div className="context-menu-divider"></div>
                      <div className="context-menu-item" onClick={() => handleCopyDeck(contextMenu.item)}>
                      <FaCopy className="context-icon" />
                      <span>Copy to My Decks</span>
                      </div>
                    </>
                  );
                }
                
                const deckUserId = contextMenu.item.user?._id || contextMenu.item.user;
                const currentUserId = user.id;
                
                // User owns the deck if:
                // 1. Deck has no user (legacy/uncategorized decks)
                // 2. Deck user matches current user
                const isOwner = !deckUserId || 
                  deckUserId === currentUserId || 
                  (deckUserId && currentUserId && deckUserId.toString() === currentUserId.toString());
                
                return isOwner ? (
                  <>
                    <div className="context-menu-divider"></div>
                    <div className="context-menu-item" onClick={() => {
                      setShareDeck(contextMenu.item);
                      setShowShareModal(true);
                      closeContextMenu();
                    }}>
                      <FaShare className="context-icon" />
                      <span>Share</span>
                    </div>
                    <div className="context-menu-item" onClick={() => handleRenameDeck(contextMenu.item)}>
                      <FaEdit className="context-icon" />
                      <span>Rename</span>
                    </div>
                    <div className="context-menu-item" onClick={() => handleCopyDeck(contextMenu.item)}>
                      <FaCopy className="context-icon" />
                      <span>Copy</span>
                    </div>
                    <div className="context-menu-divider"></div>
                    <div className="context-menu-item danger" onClick={() => { setDeleteTarget({ type: 'deck', item: contextMenu.item }); setShowDeleteConfirm(true); closeContextMenu(); }}>
                      <FaTrash className="context-icon" />
                      <span>Delete</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="context-menu-divider"></div>
                    <div className="context-menu-item" onClick={() => handleCopyDeck(contextMenu.item)}>
                      <span className="context-icon">📋</span>
                      <span>Copy to My Decks</span>
                    </div>
                  </>
                );
              })()}
            </>
          )}
          
          {contextMenu.type === 'folder' && (
            <>
              <div className="context-menu-item" onClick={() => { toggleFolder(contextMenu.item._id); closeContextMenu(); }}>
                <span className="context-icon">
                  {expandedFolders.has(contextMenu.item._id) ? <FaFolderOpen /> : <FaFolder />}
                </span>
                <span>{expandedFolders.has(contextMenu.item._id) ? 'Collapse' : 'Expand'}</span>
              </div>
              
              {/* For own folders: allow creating, pasting, renaming, and deleting */}
              {(() => {
                if (!user || !user.id) return null;
                
                const folderUserId = contextMenu.item.user?._id || contextMenu.item.user;
                const currentUserId = user.id;
                
                // User owns the folder if:
                // 1. Folder has no user (legacy/uncategorized folders)
                // 2. Folder user matches current user
                const isOwner = !folderUserId || 
                  folderUserId === currentUserId || 
                  (folderUserId && currentUserId && folderUserId.toString() === currentUserId.toString());
                
                return isOwner ? (
                  <>
                    <div className="context-menu-divider"></div>
                    <div className="context-menu-item" onClick={() => handleCreateDeckInFolder(contextMenu.item)}>
                      <span className="context-icon">▢</span>
                      <span>New Deck in Folder</span>
                    </div>
                    {copiedDeck && (
                      <div className="context-menu-item" onClick={() => handlePasteDeck(contextMenu.item)}>
                        <span className="context-icon">▢</span>
                        <span>Paste "{copiedDeck.title}"</span>
                      </div>
                    )}
                    <div className="context-menu-item" onClick={() => handleRenameFolder(contextMenu.item)}>
                      <span className="context-icon">✏️</span>
                      <span>Rename Folder</span>
                    </div>
                    <div className="context-menu-divider"></div>
                    <div className="context-menu-item danger" onClick={() => handleDeleteFolder(contextMenu.item)}>
                      <span className="context-icon">🗑️</span>
                      <span>Delete Folder</span>
                    </div>
                  </>
                ) : null;
              })()}
            </>
          )}
          
          {contextMenu.type === 'empty' && (
            <>
              <div className="context-menu-item" onClick={() => { handleCreateDeckInFolder(null); }}>
                <FaFile className="context-icon" />
                <span>New Deck</span>
              </div>
              <div className="context-menu-item" onClick={handleCreateFolder}>
                <FaFolder className="context-icon" />
                <span>New Folder</span>
              </div>
              {copiedDeck && (
                <>
                  <div className="context-menu-divider"></div>
                  <div className="context-menu-item" onClick={() => handlePasteDeck(null)}>
                    <span className="context-icon">📋</span>
                    <span>Paste "{copiedDeck.title}"</span>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      )}

      <ConfirmationModal
        isOpen={showDeleteConfirm}
        onConfirm={confirmDelete}
        onCancel={() => { setShowDeleteConfirm(false); setDeleteTarget(null); }}
        title={deleteTarget?.type === 'folder' ? 'Delete Folder' : 'Delete Deck'}
        message={
          deleteTarget?.type === 'folder'
            ? deleteTarget.deckCount > 0
              ? `Are you sure you want to delete the folder "${deleteTarget.item.name}" and all ${deleteTarget.deckCount} deck(s) inside it? This action cannot be undone.`
              : `Are you sure you want to delete the folder "${deleteTarget.item.name}"? This action cannot be undone.`
            : `Are you sure you want to delete "${deleteTarget?.item.title}"? All cards will be permanently deleted.`
        }
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
      />

      <CreateFolderModal
        isOpen={showCreateFolderModal}
        onClose={() => setShowCreateFolderModal(false)}
        onCreateFolder={handleCreateFolderSubmit}
      />
      
      <ShareDeckModal
        isOpen={showShareModal}
        onClose={() => { setShowShareModal(false); setShareDeck(null); }}
        deck={shareDeck}
        onShareSuccess={() => {
          setShowShareModal(false);
          setShareDeck(null);
          if (onFoldersUpdate) onFoldersUpdate();
        }}
      />

      <RenameModal
        isOpen={showRenameModal}
        onClose={() => { setShowRenameModal(false); setRenameTarget(null); }}
        onRename={renameTarget?.type === 'deck' ? handleRenameDeckSubmit : handleRenameFolderSubmit}
        currentName={renameTarget?.type === 'deck' ? renameTarget.item?.title : renameTarget?.item?.name}
        type={renameTarget?.type || 'deck'}
      />
    </>
  );
}

export default Sidebar;
