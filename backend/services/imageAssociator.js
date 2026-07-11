/**
 * Image Associator Service
 * Associates extracted images with flashcards based on references in questions/answers
 */

class ImageAssociator {
  constructor() {
    // Patterns to detect image references in text
    this.imageReferencePatterns = [
      /figure\s+(\d+\.?\d*)/gi,          // "Figure 1.3", "figure 2"
      /fig\.?\s+(\d+\.?\d*)/gi,          // "Fig. 1", "fig 2.1"
      /image\s+(\d+\.?\d*)/gi,           // "Image 1", "image 2"
      /diagram\s+(\d+\.?\d*)/gi,         // "Diagram 1", "diagram 2.3"
      /table\s+(\d+\.?\d*)/gi,           // "Table 1", "table 2"
      /chart\s+(\d+\.?\d*)/gi,           // "Chart 1", "chart 2"
      /graph\s+(\d+\.?\d*)/gi,           // "Graph 1", "graph 2"
      /illustration\s+(\d+\.?\d*)/gi,    // "Illustration 1"
      /exhibit\s+(\d+\.?\d*)/gi,         // "Exhibit 1"
      /plate\s+(\d+\.?\d*)/gi,           // "Plate 1"
      /shown\s+(?:in|on)\s+(?:the\s+)?(?:above|below|following)/gi,  // "shown in the above"
      /(?:see|refer\s+to)\s+(?:the\s+)?(?:image|figure|diagram)/gi,   // "see the image"
      /pictured\s+(?:in|above|below)/gi, // "pictured above"
      /depicted\s+(?:in|above|below)/gi  // "depicted in"
    ];

    // Keywords that suggest an image might be relevant
    this.visualContentKeywords = [
      'shown', 'depicted', 'illustrated', 'displayed', 'pictured',
      'visualize', 'visualization', 'represents', 'representation',
      'appears', 'looks like', 'resembles'
    ];
  }

  /**
   * Detect image references in text
   * @param {string} text - Text to analyze (question or answer)
   * @returns {Array} Array of detected references
   */
  detectImageReferences(text) {
    const references = [];
    
    for (const pattern of this.imageReferencePatterns) {
      let match;
      // Reset the regex lastIndex
      pattern.lastIndex = 0;
      
      while ((match = pattern.exec(text)) !== null) {
        const fullMatch = match[0];
        const identifier = match[1] || null; // The number/identifier if captured
        
        references.push({
          type: this.extractReferenceType(fullMatch),
          identifier: identifier,
          text: fullMatch,
          position: match.index
        });
      }
    }

    return references;
  }

  /**
   * Extract the type of reference (figure, table, etc.)
   * @param {string} text - The matched reference text
   * @returns {string} Reference type
   */
  extractReferenceType(text) {
    const lowerText = text.toLowerCase();
    
    if (lowerText.includes('figure') || lowerText.includes('fig')) return 'figure';
    if (lowerText.includes('table')) return 'table';
    if (lowerText.includes('diagram')) return 'diagram';
    if (lowerText.includes('chart')) return 'chart';
    if (lowerText.includes('graph')) return 'graph';
    if (lowerText.includes('image')) return 'image';
    if (lowerText.includes('illustration')) return 'illustration';
    if (lowerText.includes('exhibit')) return 'exhibit';
    if (lowerText.includes('plate')) return 'plate';
    
    return 'visual';
  }

  /**
   * Check if text suggests visual content
   * @param {string} text - Text to analyze
   * @returns {boolean} True if text suggests visual content
   */
  hasVisualContentIndicators(text) {
    const lowerText = text.toLowerCase();
    return this.visualContentKeywords.some(keyword => lowerText.includes(keyword));
  }

  /**
   * Associate images with flashcards
   * @param {Array} flashcards - Array of flashcard objects
   * @param {Array} extractedImages - Array of extracted image metadata
   * @param {Array} chunks - Array of content chunks with metadata
   * @returns {Array} Flashcards with associated images
   */
  associateImagesWithCards(flashcards, extractedImages, chunks = []) {
    console.log(`🔗 Associating images with ${flashcards.length} flashcards...`);
    
    if (!extractedImages || extractedImages.length === 0) {
      console.log('⚠️  No images to associate');
      return flashcards;
    }

    let associatedCount = 0;
    
    const enrichedCards = flashcards.map(card => {
      // Detect references in question and answer
      const questionRefs = this.detectImageReferences(card.question);
      const answerRefs = this.detectImageReferences(card.answer);
      const allRefs = [...questionRefs, ...answerRefs];

      // Check for visual content indicators
      const hasVisualIndicators = 
        this.hasVisualContentIndicators(card.question) || 
        this.hasVisualContentIndicators(card.answer);

      let associatedImage = null;

      // Strategy 1: Match by explicit reference (Figure 1.3, etc.)
      if (allRefs.length > 0) {
        associatedImage = this.matchByExplicitReference(allRefs, extractedImages, card, chunks);
      }

      // Strategy 2: Match by chunk/section if card has chunkIndex
      if (!associatedImage && card.chunkIndex !== undefined) {
        associatedImage = this.matchByChunk(card.chunkIndex, extractedImages, chunks);
      }

      // Strategy 3: If has visual indicators but no explicit reference, use section image
      if (!associatedImage && hasVisualIndicators && card.section) {
        associatedImage = this.matchBySection(card.section, extractedImages);
      }

      // Add image to card if found
      if (associatedImage) {
        associatedCount++;
        return {
          ...card,
          questionImage: associatedImage.relativePath,
          imageMetadata: {
            pageNumber: associatedImage.pageNumber,
            references: allRefs,
            matchStrategy: associatedImage.matchStrategy
          }
        };
      }

      return card;
    });

    console.log(`✅ Associated ${associatedCount} images with flashcards`);
    return enrichedCards;
  }

  /**
   * Match image by explicit reference (Figure X, Table Y, etc.)
   * @param {Array} references - Detected references
   * @param {Array} extractedImages - Available images
   * @param {Object} card - Flashcard object
   * @param {Array} chunks - Content chunks
   * @returns {Object|null} Matched image or null
   */
  matchByExplicitReference(references, extractedImages, card, chunks) {
    // Try to find the referenced figure number
    const figureRefs = references.filter(ref => 
      ref.type === 'figure' || ref.type === 'table' || ref.type === 'diagram'
    );

    if (figureRefs.length === 0) {
      return null;
    }

    // Get the first reference with an identifier
    const primaryRef = figureRefs.find(ref => ref.identifier) || figureRefs[0];

    if (!primaryRef.identifier) {
      // No specific identifier, try to match by chunk
      return this.matchByChunk(card.chunkIndex, extractedImages, chunks);
    }

    // Try to parse the identifier (e.g., "1.3" -> page/section)
    const identifier = parseFloat(primaryRef.identifier);
    
    // Strategy: Assume figure numbers might correspond to pages or nearby pages
    // This is a heuristic - in reality, we'd need OCR or PDF metadata
    
    // First, try to find image on the same page as the chunk
    if (card.chunkIndex !== undefined && chunks && chunks[card.chunkIndex]) {
      const chunk = chunks[card.chunkIndex];
      
      // If chunk has estimated page info, use it
      if (chunk.estimatedPages) {
        const estimatedPage = Math.floor(identifier) || chunk.estimatedPages;
        const image = extractedImages.find(img => img.pageNumber === estimatedPage);
        
        if (image) {
          return { ...image, matchStrategy: 'explicit-reference-page' };
        }
      }
    }

    // Fallback: Use the figure number as approximate page number
    const approximatePage = Math.floor(identifier);
    if (approximatePage > 0 && approximatePage <= extractedImages.length) {
      const image = extractedImages.find(img => img.pageNumber === approximatePage);
      if (image) {
        return { ...image, matchStrategy: 'explicit-reference-approximation' };
      }
    }

    return null;
  }

  /**
   * Match image by chunk index
   * @param {number} chunkIndex - Index of the chunk
   * @param {Array} extractedImages - Available images
   * @param {Array} chunks - Content chunks
   * @returns {Object|null} Matched image or null
   */
  matchByChunk(chunkIndex, extractedImages, chunks) {
    if (chunkIndex === undefined || !chunks || chunks.length === 0) {
      return null;
    }

    const chunk = chunks[chunkIndex];
    if (!chunk) {
      return null;
    }

    // Try to estimate which page this chunk is from
    // This is approximate based on character position
    if (chunk.estimatedPages) {
      const image = extractedImages.find(img => img.pageNumber === chunk.estimatedPages);
      if (image) {
        return { ...image, matchStrategy: 'chunk-based' };
      }
    }

    // Fallback: use chunk index as approximate page (for small documents)
    if (chunkIndex < extractedImages.length) {
      return { ...extractedImages[chunkIndex], matchStrategy: 'chunk-index-fallback' };
    }

    return null;
  }

  /**
   * Match image by section name
   * @param {string} sectionName - Name of the section
   * @param {Array} extractedImages - Available images
   * @returns {Object|null} Matched image or null
   */
  matchBySection(sectionName, extractedImages) {
    // Very basic heuristic: extract numbers from section name
    const numbers = sectionName.match(/\d+/g);
    
    if (numbers && numbers.length > 0) {
      const firstNumber = parseInt(numbers[0]);
      
      if (firstNumber > 0 && firstNumber <= extractedImages.length) {
        const image = extractedImages.find(img => img.pageNumber === firstNumber);
        if (image) {
          return { ...image, matchStrategy: 'section-based' };
        }
      }
    }

    return null;
  }

  /**
   * Get statistics about image associations
   * @param {Array} flashcards - Array of flashcards (potentially with images)
   * @returns {Object} Statistics object
   */
  getAssociationStats(flashcards) {
    const total = flashcards.length;
    const withImages = flashcards.filter(card => card.questionImage || card.answerImage).length;
    const withReferences = flashcards.filter(card => {
      const refs = this.detectImageReferences(`${card.question} ${card.answer}`);
      return refs.length > 0;
    }).length;

    return {
      totalCards: total,
      cardsWithImages: withImages,
      cardsWithReferences: withReferences,
      associationRate: total > 0 ? (withImages / total * 100).toFixed(1) + '%' : '0%'
    };
  }
}

module.exports = new ImageAssociator();

