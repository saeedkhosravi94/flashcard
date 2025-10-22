import React, { useState, useEffect } from 'react';
import './FlashcardViewer.css';
import Flashcard from './Flashcard';
import AddCardForm from './AddCardForm';

function FlashcardViewer({ flashcardSet, onFlashcardSetUpdate }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAddForm, setShowAddForm] = useState(false);
  const [localFlashcardSet, setLocalFlashcardSet] = useState(flashcardSet);
  const [difficultyFilter, setDifficultyFilter] = useState('all');

  // Reset state when flashcardSet prop changes (deck switching)
  useEffect(() => {
    setLocalFlashcardSet(flashcardSet);
    setCurrentIndex(0);
    setShowAddForm(false);
    setDifficultyFilter('all');
  }, [flashcardSet]);

  const currentSet = localFlashcardSet || flashcardSet;
  
  // Filter cards by difficulty
  const filteredCards = difficultyFilter === 'all' 
    ? currentSet.cards 
    : currentSet.cards.filter(card => (card.difficulty || 'medium') === difficultyFilter);

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % filteredCards.length);
  };

  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + filteredCards.length) % filteredCards.length);
  };
  
  const handleDifficultyChange = (newDifficulty) => {
    setDifficultyFilter(newDifficulty);
    setCurrentIndex(0); // Reset to first card when filter changes
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
        
        console.log('Card position update:', {
          currentFilter: difficultyFilter,
          totalCards: updatedSet.cards.length,
          filteredCards: newFilteredCards.length,
          oldIndex: currentIndex,
          newIndex: newIndex,
          foundCard: newIndex !== -1
        });
        
        let targetIndex = 0;
        
        if (newIndex !== -1) {
          // Card is still in the filtered view, stay on it
          console.log(`✅ Staying on card at position ${newIndex}`);
          targetIndex = newIndex;
        } else {
          // Card no longer matches the filter
          // Try to stay on the same position if possible, otherwise go to first or last valid card
          if (newFilteredCards.length > 0) {
            // Try to stay close to the same position
            targetIndex = Math.min(currentIndex, newFilteredCards.length - 1);
            console.log(`⚠️ Card not in filter, moving to position ${targetIndex}`);
          } else {
            targetIndex = 0;
            console.log(`⚠️ No cards in filter, going to first`);
          }
        }
        
        // Update state in a single batch to avoid race conditions
        // Use a function to ensure the update happens after localFlashcardSet is updated
        setLocalFlashcardSet(updatedSet);
        
        // Force the index update after a small delay to ensure state is consistent
        setTimeout(() => {
          setCurrentIndex(targetIndex);
          console.log(`📍 Final position set to: ${targetIndex}`);
        }, 0);
        
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

  // Handle empty deck case or no cards matching filter
  if (currentSet.cards.length === 0) {
    return (
      <div className="flashcard-viewer empty-state">
        <div className="empty-content">
          <div className="empty-icon">📚</div>
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
              😊 Easy ({currentSet.cards.filter(c => (c.difficulty || 'medium') === 'easy').length})
            </button>
            <button 
              className={`filter-btn medium ${difficultyFilter === 'medium' ? 'active' : ''}`}
              onClick={() => handleDifficultyChange('medium')}
            >
              🤔 Medium ({currentSet.cards.filter(c => (c.difficulty || 'medium') === 'medium').length})
            </button>
            <button 
              className={`filter-btn hard ${difficultyFilter === 'hard' ? 'active' : ''}`}
              onClick={() => handleDifficultyChange('hard')}
            >
              🔥 Hard ({currentSet.cards.filter(c => (c.difficulty || 'medium') === 'hard').length})
            </button>
          </div>
          <div className="empty-icon">🔍</div>
          <p>No cards found with <strong>{difficultyFilter}</strong> difficulty.</p>
          <p>Try a different filter or add more cards!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flashcard-viewer" onKeyDown={handleKeyPress} tabIndex="0">
      <div className="viewer-header">
        <div className="header-top">
          <h2>{currentSet.title}</h2>
          <button className="add-card-button" onClick={() => setShowAddForm(true)}>
            ➕ Add Card
          </button>
        </div>
        
        {/* Difficulty Filter Bar */}
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
            😊 Easy ({currentSet.cards.filter(c => (c.difficulty || 'medium') === 'easy').length})
          </button>
          <button 
            className={`filter-btn medium ${difficultyFilter === 'medium' ? 'active' : ''}`}
            onClick={() => handleDifficultyChange('medium')}
          >
            🤔 Medium ({currentSet.cards.filter(c => (c.difficulty || 'medium') === 'medium').length})
          </button>
          <button 
            className={`filter-btn hard ${difficultyFilter === 'hard' ? 'active' : ''}`}
            onClick={() => handleDifficultyChange('hard')}
          >
            🔥 Hard ({currentSet.cards.filter(c => (c.difficulty || 'medium') === 'hard').length})
          </button>
        </div>
        
        {filteredCards[currentIndex].section && (
          <div className="section-badge">
            📍 {filteredCards[currentIndex].section}
          </div>
        )}
        
        <div className="progress">
          <span className="progress-text">
            Card {currentIndex + 1} of {filteredCards.length}
          </span>
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${((currentIndex + 1) / filteredCards.length) * 100}%` }}
            />
          </div>
        </div>
      </div>

      <div className="flashcard-container">
        <Flashcard
          question={filteredCards[currentIndex].question}
          answer={filteredCards[currentIndex].answer}
          difficulty={filteredCards[currentIndex].difficulty}
          onDifficultyChange={handleUpdateCardDifficulty}
          key={currentIndex}
        />
      </div>

      <div className="navigation">
        <button
          className="nav-button prev"
          onClick={handlePrevious}
          disabled={filteredCards.length <= 1}
        >
          ← Previous
        </button>
        
        <div className="card-dots">
          {filteredCards.map((card, index) => (
            <span
              key={index}
              className={`dot ${index === currentIndex ? 'active' : ''} difficulty-${card.difficulty || 'medium'}`}
              onClick={() => setCurrentIndex(index)}
            />
          ))}
        </div>

        <button
          className="nav-button next"
          onClick={handleNext}
          disabled={filteredCards.length <= 1}
        >
          Next →
        </button>
      </div>

      <div className="keyboard-hint">
        Use ← → arrow keys to navigate
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

export default FlashcardViewer;

