import React from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { FaChevronRight, FaChevronLeft } from 'react-icons/fa';
import LatexRenderer from './LatexRenderer';
import './CardThumbnailSidebar.css';

function SortableCardThumbnail({ card, index, isActive, onClick, disabled = false }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: index, disabled: disabled });

  const [hasDragged, setHasDragged] = React.useState(false);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : (disabled ? 0.6 : 1),
  };

  // Truncate text for thumbnail
  const truncateText = (text, maxLength = 50) => {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  // Track if user is dragging vs clicking
  React.useEffect(() => {
    if (isDragging) {
      setHasDragged(true);
    } else {
      // Reset after drag ends
      setTimeout(() => setHasDragged(false), 100);
    }
  }, [isDragging]);

  const handleClick = (e) => {
    // Don't allow clicks when disabled
    if (disabled) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    
    // Only trigger onClick if it wasn't a drag operation
    if (!hasDragged && !isDragging) {
      e.stopPropagation();
      onClick();
    }
  };

  // Separate drag handle for mobile (optional - can be added later)
  const dragHandleProps = disabled ? {} : {
    ...attributes,
    ...listeners,
  };

  // Safety check: return null if card is undefined (after all hooks)
  if (!card) return null;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`card-thumbnail ${isActive ? 'active' : ''} ${isDragging ? 'dragging' : ''} ${disabled ? 'disabled' : ''}`}
      onClick={handleClick}
      {...dragHandleProps}
    >
      <div className="thumbnail-number">{index + 1}</div>
      <div className="thumbnail-content">
        <div className="thumbnail-question">
          {card.questionImage ? (
            <div className="thumbnail-image">
              <img src={card.questionImage.startsWith('/') ? card.questionImage : `/${card.questionImage}`} alt={`Flashcard question thumbnail: ${truncateText(card.question, 30)}`} />
            </div>
          ) : (
            <div className="thumbnail-text">
              <LatexRenderer content={truncateText(card.question, 40)} />
            </div>
          )}
        </div>
        <div className="thumbnail-answer">
          {card.answerImage ? (
            <div className="thumbnail-image">
              <img src={card.answerImage.startsWith('/') ? card.answerImage : `/${card.answerImage}`} alt={`Flashcard answer thumbnail: ${truncateText(card.answer, 30)}`} />
            </div>
          ) : (
            <div className="thumbnail-text">
              <LatexRenderer content={truncateText(card.answer, 40)} />
            </div>
          )}
        </div>
      </div>
      <div className={`thumbnail-difficulty difficulty-${card.difficulty || 'medium'}`}></div>
    </div>
  );
}

function CardThumbnailSidebar({ cards, currentIndex, onCardSelect, onReorder, deckId, onVisibilityChange, disabled = false }) {
  // Safety check: ensure cards is an array
  const safeCards = Array.isArray(cards) ? cards : [];
  const [items, setItems] = React.useState(safeCards.map((_, index) => index));
  const [isReordering, setIsReordering] = React.useState(false);
  const [isVisible, setIsVisible] = React.useState(true);
  const cardsLengthRef = React.useRef(safeCards.length);

  // Notify parent when visibility changes
  React.useEffect(() => {
    if (onVisibilityChange) {
      onVisibilityChange(isVisible);
    }
  }, [isVisible, onVisibilityChange]);

  // Update items when cards change (but not during drag)
  React.useEffect(() => {
    if (!isReordering && Array.isArray(cards)) {
      setItems(cards.map((_, index) => index));
      cardsLengthRef.current = cards.length;
    }
  }, [cards, isReordering]);

  // When reordering completes, sync items with new card order from parent
  const prevIsReorderingRef = React.useRef(isReordering);
  React.useEffect(() => {
    if (prevIsReorderingRef.current && !isReordering && Array.isArray(cards)) {
      // Reordering just completed, sync items with cards
      setItems(cards.map((_, index) => index));
    }
    prevIsReorderingRef.current = isReordering;
  }, [isReordering, cards]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 10, // Require 10px of movement before drag starts (prevents accidental drags on click)
      },
      disabled: disabled, // Disable pointer sensor when modals are open
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
      disabled: disabled, // Disable keyboard drag when modals are open
    })
  );

  const handleDragEnd = async (event) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = items.indexOf(active.id);
      const newIndex = items.indexOf(over.id);

      const newItems = arrayMove(items, oldIndex, newIndex);
      setItems(newItems);
      setIsReordering(true);

      // Calculate the new order array (indices in original array)
      const newOrder = newItems;

      try {
        const response = await fetch(`/api/flashcards/${deckId}/cards/reorder`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ newOrder }),
        });

        if (!response.ok) {
          throw new Error('Failed to reorder cards');
        }

        const data = await response.json();
        
        // Calculate new current index based on reorder
        let newCurrentIndex = currentIndex;
        if (oldIndex === currentIndex) {
          newCurrentIndex = newIndex;
        } else if (oldIndex < currentIndex && newIndex >= currentIndex) {
          newCurrentIndex = currentIndex - 1;
        } else if (oldIndex > currentIndex && newIndex <= currentIndex) {
          newCurrentIndex = currentIndex + 1;
        }
        
        // Update current index
        onCardSelect(newCurrentIndex);

        // Notify parent of the reorder
        if (onReorder) {
          onReorder(data.flashcardSet);
        }
      } catch (error) {
        console.error('Error reordering cards:', error);
        // Revert on error
        if (Array.isArray(cards)) {
          setItems(cards.map((_, index) => index));
        }
        alert('Failed to reorder cards. Please try again.');
      } finally {
        setIsReordering(false);
      }
    }
  };

  return (
    <>
      <div className={`card-thumbnail-sidebar ${isVisible ? 'visible' : 'hidden'}`}>

        <div className="thumbnail-list">
        {Array.isArray(cards) && cards.length > 0 ? (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={items} strategy={verticalListSortingStrategy}>
              {items.map((originalIndex) => {
                const card = cards[originalIndex];
                // Skip rendering if card is undefined (during deck switching)
                if (!card) return null;
                const displayIndex = items.indexOf(originalIndex);
                  return (
                    <SortableCardThumbnail
                      key={`card-${originalIndex}`}
                      card={card}
                      index={displayIndex}
                      isActive={originalIndex === currentIndex}
                      onClick={() => {
                        if (!disabled) {
                          onCardSelect(originalIndex);
                        }
                      }}
                      disabled={disabled}
                    />
                  );
              })}
            </SortableContext>
          </DndContext>
        ) : (
          <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-tertiary)' }}>
            No cards available
          </div>
        )}
      </div>
      </div>
      
      {/* Toggle Button */}
      <button
        className={`sidebar-toggle-btn ${isVisible ? 'sidebar-visible' : 'sidebar-hidden'}`}
        onClick={() => {
          setIsVisible(!isVisible);
        }}
        title={isVisible ? 'Hide sidebar' : 'Show sidebar'}
        aria-label={isVisible ? 'Hide sidebar' : 'Show sidebar'}
      >
        {isVisible ? <FaChevronRight /> : <FaChevronLeft />}
      </button>
    </>
  );
}

export default CardThumbnailSidebar;

