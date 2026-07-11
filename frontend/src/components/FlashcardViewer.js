import React, { useState, useEffect, useCallback } from 'react';
import { FaFire, FaFile, FaSearch } from 'react-icons/fa';
import { FaCircle, FaCircleHalfStroke } from 'react-icons/fa6';
import './FlashcardViewer.css';
import Flashcard from './Flashcard';
import AddCardForm from './AddCardForm';
import EditCardForm from './EditCardForm';
import ConfirmationModal from './ConfirmationModal';
import CardThumbnailSidebar from './CardThumbnailSidebar';

function FlashcardViewer({ flashcardSet, onFlashcardSetUpdate, onClose, onRegisterCallbacks }) {
  // Load saved position from localStorage for this specific deck
  const getSavedPosition = (deckId) => {
    const saved = localStorage.getItem(`flashcard_position_${deckId}`);
    return saved ? parseInt(saved, 10) : 0;
  };

  const [currentIndex, setCurrentIndex] = useState(() => getSavedPosition(flashcardSet._id));
  const [showAddForm, setShowAddForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [localFlashcardSet, setLocalFlashcardSet] = useState(flashcardSet);
  const [difficultyFilter, setDifficultyFilter] = useState('all');
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [editingCardIndex, setEditingCardIndex] = useState(null); // Lock the card being edited

  // Define this before it's used in useEffect
  const handleDifficultyChange = useCallback((newDifficulty) => {
    setDifficultyFilter(newDifficulty);
    setCurrentIndex(0); // Reset to first card when filter changes
  }, []);

  // Register callbacks with parent for the controls bar
  useEffect(() => {
    if (onRegisterCallbacks) {
      // Compute filtered cards for the callback
      const filteredCards = difficultyFilter === 'all' 
        ? localFlashcardSet.cards 
        : localFlashcardSet.cards.filter(card => (card.difficulty || 'medium') === difficultyFilter);
      
      onRegisterCallbacks({
        onEdit: () => {
          // Lock the current card index when opening edit modal
          const currentCard = filteredCards[currentIndex];
          if (currentCard) {
            const actualIndex = localFlashcardSet.cards.findIndex(card => 
              card.question === currentCard.question && 
              card.answer === currentCard.answer
            );
            setEditingCardIndex(actualIndex !== -1 ? actualIndex : currentIndex);
          } else {
            // Fallback: use currentIndex directly if card not found
            setEditingCardIndex(currentIndex);
          }
          setShowEditForm(true);
        },
        onDelete: () => setShowDeleteConfirm(true),
        onAdd: () => setShowAddForm(true),
        difficultyFilter: difficultyFilter,
        onDifficultyChange: handleDifficultyChange,
        cards: localFlashcardSet.cards
      });
    }
  }, [onRegisterCallbacks, difficultyFilter, handleDifficultyChange, localFlashcardSet.cards, currentIndex]); // Include cards array and currentIndex

  // Update parent with current index only (avoid infinite loop)
  useEffect(() => {
    if (flashcardSet && onFlashcardSetUpdate) {
      // Only update if currentIndex has actually changed
      const updatedSet = {
        ...flashcardSet,
        currentIndex
      };
      onFlashcardSetUpdate(updatedSet);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex]); // Only depend on currentIndex, not the entire flashcardSet

  // Save current position to localStorage whenever it changes
  useEffect(() => {
    if (flashcardSet?._id) {
      localStorage.setItem(`flashcard_position_${flashcardSet._id}`, currentIndex.toString());
    }
  }, [currentIndex, flashcardSet?._id]);

  // Reset state when flashcardSet prop changes (deck switching)
  // Only reset position when switching to a different deck (different _id)
  useEffect(() => {
    const isNewDeck = !localFlashcardSet || (flashcardSet._id !== localFlashcardSet._id);
    
    // Only update if it's a new deck OR if cards were added/removed/modified
    const cardsChanged = localFlashcardSet && 
      (localFlashcardSet.cards.length !== flashcardSet.cards.length);
    
    if (isNewDeck || cardsChanged) {
      setLocalFlashcardSet(flashcardSet);
      
      if (isNewDeck) {
        // Load the saved position for this deck
        const savedPosition = getSavedPosition(flashcardSet._id);
        setCurrentIndex(savedPosition);
        setShowAddForm(false);
        setDifficultyFilter('all');
      } else if (cardsChanged) {
        setLocalFlashcardSet(flashcardSet);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flashcardSet._id, flashcardSet.cards.length]);

  const currentSet = localFlashcardSet || flashcardSet;
  
  // Filter cards by difficulty
  const filteredCards = difficultyFilter === 'all' 
    ? currentSet.cards 
    : currentSet.cards.filter(card => (card.difficulty || 'medium') === difficultyFilter);

  // Safety check: ensure currentIndex is within bounds
  useEffect(() => {
    if (filteredCards.length > 0 && currentIndex >= filteredCards.length) {
      setCurrentIndex(0);
    }
  }, [filteredCards.length, currentIndex]);

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % filteredCards.length);
  };

  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + filteredCards.length) % filteredCards.length);
  };
  
  const handleUpdateCardDifficulty = async (newDifficulty) => {
    try {
      // Find the actual card index in the original array
      const actualCard = filteredCards[currentIndex];
      const actualCardIndex = currentSet.cards.findIndex(card => 
        card.question === actualCard.question && card.answer === actualCard.answer
      );
      
      if (actualCardIndex === -1) {
        console.error('Could not find card to update');
        return;
      }
      
      // Store the current card details and its position in the FULL array
      const currentCardQuestion = actualCard.question;
      const currentCardAnswer = actualCard.answer;
      
      const response = await fetch(`/api/flashcards/${currentSet._id}/cards/${actualCardIndex}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: actualCard.question,
          answer: actualCard.answer,
          section: actualCard.section,
          difficulty: newDifficulty
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update card difficulty');
      }
      
      // Refresh the flashcard set
      const refreshResponse = await fetch(`/api/flashcards/${currentSet._id}`);
      if (refreshResponse.ok) {
        const updatedSet = await refreshResponse.json();
        
        // Strategy: Try to stay on the same card if viewing "All" or if it still matches the filter
        // Find the updated card in the filtered set and maintain position
        const newFilteredCards = difficultyFilter === 'all' 
          ? updatedSet.cards 
          : updatedSet.cards.filter(card => (card.difficulty || 'medium') === difficultyFilter);
        
        // Find the card by its question and answer (more reliable than index)
        const newIndex = newFilteredCards.findIndex(card => 
          card.question === currentCardQuestion && card.answer === currentCardAnswer
        );
        
        let targetIndex = 0;
        
        if (newIndex !== -1) {
          // Card is still in the filtered view, stay on it
          targetIndex = newIndex;
        } else {
          // Card no longer matches the filter
          // Try to stay on the same position if possible, otherwise go to first or last valid card
          if (newFilteredCards.length > 0) {
            // Try to stay close to the same position
            targetIndex = Math.min(currentIndex, newFilteredCards.length - 1);
          } else {
            targetIndex = 0;
          }
        }
        
        // Update state in a single batch to avoid race conditions
        // First update the flashcard set
        setLocalFlashcardSet(updatedSet);
        
        // Then update the index using a functional update to ensure it happens after the set update
        setCurrentIndex(() => targetIndex);
        
        // Notify parent if callback provided
        if (onFlashcardSetUpdate) {
          onFlashcardSetUpdate(updatedSet);
        }
      }
    } catch (error) {
      console.error('Error updating card difficulty:', error);
    }
  };

  const handleKeyPress = (e) => {
    // Don't allow navigation when modals are open
    if (showAddForm || showEditForm || showDeleteConfirm) {
      return;
    }
    
    if (e.key === 'ArrowRight') {
      handleNext();
    } else if (e.key === 'ArrowLeft') {
      handlePrevious();
    }
  };

  const handleCardAdded = async (data) => {
    // Refresh the flashcard set from server to get the updated cards
    try {
      const response = await fetch(`/api/flashcards/${currentSet._id}`);
      if (response.ok) {
        const updatedSet = await response.json();
        setLocalFlashcardSet(updatedSet);
        
        // Move to the newly added card (last card)
        setCurrentIndex(updatedSet.cards.length - 1);
        
        // Notify parent if callback provided
        if (onFlashcardSetUpdate) {
          onFlashcardSetUpdate(updatedSet);
        }
      }
    } catch (error) {
      console.error('Error refreshing flashcard set:', error);
    }
    
    setShowAddForm(false);
  };

  const handleCardUpdated = async () => {
    // Refresh the flashcard set from server to get the updated cards
    try {
      const response = await fetch(`/api/flashcards/${currentSet._id}`);
      if (response.ok) {
        const updatedSet = await response.json();
        setLocalFlashcardSet(updatedSet);
        
        // Notify parent if callback provided
        if (onFlashcardSetUpdate) {
          onFlashcardSetUpdate(updatedSet);
        }
      }
    } catch (error) {
      console.error('Error refreshing flashcard set:', error);
    }
    
    setShowEditForm(false);
    setEditingCardIndex(null); // Clear the locked index
  };

  const handleCardReorder = (updatedSet) => {
    setLocalFlashcardSet(updatedSet);
    
    // Notify parent if callback provided
    if (onFlashcardSetUpdate) {
      onFlashcardSetUpdate(updatedSet);
    }
  };

  const handleDeleteCard = async () => {
    setShowDeleteConfirm(false);

    try {
      // Find the actual card index in the original array
      const actualCard = filteredCards[currentIndex];
      const actualCardIndex = currentSet.cards.findIndex(card => 
        card.question === actualCard.question && card.answer === actualCard.answer
      );

      const response = await fetch(`/api/flashcards/${currentSet._id}/cards/${actualCardIndex}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete card');
      }

      // Refresh the flashcard set
      const updatedResponse = await fetch(`/api/flashcards/${currentSet._id}`);
      if (updatedResponse.ok) {
        const updatedSet = await updatedResponse.json();
        setLocalFlashcardSet(updatedSet);
        
        // Adjust current index if needed
        if (currentIndex >= updatedSet.cards.length && updatedSet.cards.length > 0) {
          setCurrentIndex(updatedSet.cards.length - 1);
        } else if (updatedSet.cards.length === 0) {
          setCurrentIndex(0);
        }
        
        // Notify parent if callback provided
        if (onFlashcardSetUpdate) {
          onFlashcardSetUpdate(updatedSet);
        }
      }
    } catch (error) {
      console.error('Error deleting card:', error);
      alert('Failed to delete card. Please try again.');
    }
  };

  // Handle empty deck case or no cards matching filter
  if (currentSet.cards.length === 0) {
    return (
      <div className="flashcard-viewer empty-state">
        <div className="empty-content">
          <FaFile className="empty-icon" />
          <h2>No Cards Yet</h2>
          <p>Add your first flashcard to get started!</p>
          <button className="add-first-card-button" onClick={() => setShowAddForm(true)}>
            ➕ Add First Card
          </button>
        </div>
        
        {showAddForm && (
          <AddCardForm
            flashcardSetId={currentSet._id}
            onCardAdded={handleCardAdded}
            onCancel={() => setShowAddForm(false)}
          />
        )}
      </div>
    );
  }
  
  if (filteredCards.length === 0) {
    return (
      <div className="flashcard-viewer empty-state">
        <div className="empty-content">
          <h2>{currentSet.title}</h2>
          <div className="difficulty-filter-bar">
            <button 
              className={`filter-btn ${difficultyFilter === 'all' ? 'active' : ''}`}
              onClick={() => handleDifficultyChange('all')}
            >
              All ({currentSet.cards.length})
            </button>
            <button 
              className={`filter-btn easy ${difficultyFilter === 'easy' ? 'active' : ''}`}
              onClick={() => handleDifficultyChange('easy')}
            >
              <FaCircle /> Easy ({currentSet.cards.filter(c => (c.difficulty || 'medium') === 'easy').length})
            </button>
            <button 
              className={`filter-btn medium ${difficultyFilter === 'medium' ? 'active' : ''}`}
              onClick={() => handleDifficultyChange('medium')}
            >
              <FaCircleHalfStroke /> Medium ({currentSet.cards.filter(c => (c.difficulty || 'medium') === 'medium').length})
            </button>
            <button 
              className={`filter-btn hard ${difficultyFilter === 'hard' ? 'active' : ''}`}
              onClick={() => handleDifficultyChange('hard')}
            >
              <FaFire /> Hard ({currentSet.cards.filter(c => (c.difficulty || 'medium') === 'hard').length})
            </button>
          </div>
          <FaSearch className="empty-icon" />
          <p>No cards found with <strong>{difficultyFilter}</strong> difficulty.</p>
          <p>Try a different filter or add more cards!</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`flashcard-viewer ${sidebarVisible ? 'sidebar-visible' : 'sidebar-hidden'}`} onKeyDown={handleKeyPress} tabIndex="0">
      <div className="flashcard-viewer-content">
        <div className="flashcard-container">
          <Flashcard
            question={filteredCards[currentIndex]?.question}
            answer={filteredCards[currentIndex]?.answer}
            difficulty={filteredCards[currentIndex]?.difficulty}
            questionImage={filteredCards[currentIndex]?.questionImage}
            answerImage={filteredCards[currentIndex]?.answerImage}
            questionAudio={filteredCards[currentIndex]?.questionAudio}
            answerAudio={filteredCards[currentIndex]?.answerAudio}
            onDifficultyChange={handleUpdateCardDifficulty}
            onNext={handleNext}
            onPrevious={handlePrevious}
            hasNext={currentIndex < filteredCards.length - 1}
            hasPrevious={currentIndex > 0}
            currentCardNumber={currentIndex + 1}
            totalCards={filteredCards.length}
            navigationDisabled={showAddForm || showEditForm || showDeleteConfirm}
          />
        </div>

        {/* Card Thumbnail Sidebar - Show all cards, not filtered */}
        <CardThumbnailSidebar
          cards={currentSet.cards}
          currentIndex={(() => {
            // Find the actual index in the full cards array
            if (filteredCards.length === 0 || currentIndex >= filteredCards.length) return 0;
            const currentCard = filteredCards[currentIndex];
            const fullIndex = currentSet.cards.findIndex(card => 
              card.question === currentCard.question && 
              card.answer === currentCard.answer
            );
            return fullIndex !== -1 ? fullIndex : 0;
          })()}
          onCardSelect={(newIndex) => {
            // Don't allow card selection when modals are open
            if (showAddForm || showEditForm || showDeleteConfirm) {
              return;
            }
            
            // Find the card in filteredCards and set the index
            const selectedCard = currentSet.cards[newIndex];
            const filteredIndex = filteredCards.findIndex(card =>
              card.question === selectedCard.question &&
              card.answer === selectedCard.answer
            );
            if (filteredIndex !== -1) {
              setCurrentIndex(filteredIndex);
            } else {
              // Card is filtered out, switch to "all" filter to show it
              handleDifficultyChange('all');
              // After filter changes, find the card
              setTimeout(() => {
                const allCards = currentSet.cards;
                const targetIndex = allCards.findIndex(card =>
                  card.question === selectedCard.question &&
                  card.answer === selectedCard.answer
                );
                if (targetIndex !== -1) {
                  setCurrentIndex(targetIndex);
                }
              }, 0);
            }
          }}
          onReorder={handleCardReorder}
          deckId={currentSet._id}
          onVisibilityChange={setSidebarVisible}
          disabled={showAddForm || showEditForm || showDeleteConfirm}
        />
      </div>

      <div className="navigation">
        <button
          className="nav-button prev"
          onClick={handlePrevious}
          disabled={filteredCards.length <= 1}
          title="Previous card"
        >
          ←
        </button>
        
        <div className="navigation-center">
          <div className="card-dots">
            {(() => {
              const maxDotsPerPage = 50;
              const currentPage = Math.floor(currentIndex / maxDotsPerPage);
              const startIndex = currentPage * maxDotsPerPage;
              const endIndex = Math.min(startIndex + maxDotsPerPage, filteredCards.length);
              const visibleCards = filteredCards.slice(startIndex, endIndex);
              
              return (
                <>
                  {startIndex > 0 && (
                    <span className="dot-pagination">
                      {startIndex + 1}-{endIndex}
                    </span>
                  )}
                  {visibleCards.map((card, i) => {
                    const actualIndex = startIndex + i;
                    return (
                      <span
                        key={actualIndex}
                        className={`dot ${actualIndex === currentIndex ? 'active' : ''} difficulty-${card.difficulty || 'medium'}`}
                        onClick={() => setCurrentIndex(actualIndex)}
                        title={`Card ${actualIndex + 1}`}
                      />
                    );
                  })}
                  {endIndex < filteredCards.length && (
                    <span className="dot-pagination">
                      {endIndex + 1}-{Math.min(endIndex + maxDotsPerPage, filteredCards.length)}
                    </span>
                  )}
                </>
              );
            })()}
          </div>
          
          <div className="keyboard-hint">
            Use ← → arrow keys to navigate
          </div>
        </div>

        <button
          className="nav-button next"
          onClick={handleNext}
          disabled={filteredCards.length <= 1}
          title="Next card"
        >
          →
        </button>
      </div>

      {showAddForm && (
        <AddCardForm
          flashcardSetId={currentSet._id}
          onCardAdded={handleCardAdded}
          onCancel={() => setShowAddForm(false)}
        />
      )}

      {showEditForm && editingCardIndex !== null && localFlashcardSet.cards[editingCardIndex] && (
        <EditCardForm
          flashcardSetId={currentSet._id}
          card={localFlashcardSet.cards[editingCardIndex]}
          cardIndex={editingCardIndex}
          onCardUpdated={handleCardUpdated}
          onCancel={() => {
            setShowEditForm(false);
            setEditingCardIndex(null);
          }}
        />
      )}

      <ConfirmationModal
        isOpen={showDeleteConfirm}
        onConfirm={handleDeleteCard}
        onCancel={() => setShowDeleteConfirm(false)}
        title="Delete Card"
        message="Are you sure you want to delete this card? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
      />
    </div>
  );
}

export default FlashcardViewer;

