const express = require('express');
const router = express.Router();
const FlashcardSet = require('../models/FlashcardSet');
const upload = require('../config/multer');
const fileParser = require('../services/fileParser');
const geminiService = require('../services/geminiService');
const contentChunker = require('../services/contentChunker');
const { optionalAuth } = require('../middleware/auth');
const fs = require('fs').promises;

// Apply optional auth to all routes
router.use(optionalAuth);

// Get all flashcard sets (filtered by user if authenticated)
router.get('/', async (req, res) => {
  try {
    // If user is authenticated, show only their flashcard sets
    // If not authenticated, show only decks without user (legacy/guest decks)
    const query = req.userId ? { user: req.userId } : { user: null };
    const flashcardSets = await FlashcardSet.find(query).sort({ createdAt: -1 });
    res.json(flashcardSets);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create a new flashcard set (empty or AI-generated)
router.post('/create-deck', async (req, res) => {
  try {
    const { title, description, numCards } = req.body;
    
    if (!title || title.trim().length === 0) {
      return res.status(400).json({ error: 'Deck title is required' });
    }

    let flashcards = [];
    let csvData = 'Question,Answer\n'; // Default empty CSV with headers

    // If description is provided, use AI to generate flashcards
    if (description && description.trim().length > 0) {
      console.log(`Generating flashcards with AI for: ${title}`);
      console.log(`Description: ${description.trim()}`);

      // Validate description length
      if (description.trim().length < 20) {
        return res.status(400).json({ 
          error: 'Description is too short. Please provide at least 20 characters to generate meaningful flashcards.' 
        });
      }

      try {
        // Generate flashcards using Gemini AI
        // Allow user to specify number of cards, or calculate based on description length
        let cardCount;
        
        if (numCards && numCards > 0) {
          // User specified - validate range (min 5, max 100)
          cardCount = Math.max(5, Math.min(100, parseInt(numCards)));
          console.log(`User requested ${numCards} cards, generating ${cardCount} cards`);
        } else {
          // Auto-calculate: ~1 card per 40-50 characters, min 20, max 50
          const descLength = description.trim().length;
          cardCount = Math.max(20, Math.min(50, Math.ceil(descLength / 45)));
          console.log(`Auto-calculating ${cardCount} cards based on description length (${descLength} chars)`);
        }
        
        console.log(`Generating ${cardCount} flashcards from description...`);
        flashcards = await geminiService.generateFlashcards(description.trim(), cardCount);
        
        if (!flashcards || flashcards.length === 0) {
          return res.status(400).json({ 
            error: 'Could not generate flashcards from the description. Please try rephrasing or providing more details.' 
          });
        }

        // Add "AI Generated" as the section for all cards
        flashcards = flashcards.map(card => ({
          ...card,
          section: 'AI Generated',
          difficulty: 'medium'
        }));

        console.log(`Successfully generated ${flashcards.length} flashcards with AI`);
        
        // Convert to CSV
        csvData = geminiService.convertToCSV(flashcards);
      } catch (aiError) {
        console.error('AI generation error:', aiError);
        return res.status(500).json({ 
          error: `Failed to generate flashcards with AI: ${aiError.message}. Please try again with a different description.` 
        });
      }
    }

    // Create flashcard set (empty or with AI-generated cards)
    const flashcardSet = new FlashcardSet({
      title: title.trim(),
      fileName: `${title.trim()}.deck`,
      cards: flashcards,
      csvData: csvData,
      user: req.userId || null // Associate with user if authenticated
    });

    await flashcardSet.save();

    const deckType = flashcards.length > 0 ? `AI-generated deck with ${flashcards.length} cards` : 'empty deck';
    console.log(`Created new ${deckType}: ${title}`);
    
    res.status(201).json(flashcardSet);
  } catch (error) {
    console.error('Error creating deck:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get a single flashcard set
router.get('/:id', async (req, res) => {
  try {
    const flashcardSet = await FlashcardSet.findById(req.params.id);
    if (!flashcardSet) {
      return res.status(404).json({ error: 'Flashcard set not found' });
    }
    
    // Verify ownership if user is authenticated
    if (req.userId && flashcardSet.user && flashcardSet.user.toString() !== req.userId.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Filter by difficulty if requested
    const { difficulty } = req.query;
    if (difficulty && ['easy', 'medium', 'hard'].includes(difficulty)) {
      const filteredSet = {
        ...flashcardSet.toObject(),
        cards: flashcardSet.cards.filter(card => card.difficulty === difficulty)
      };
      return res.json(filteredSet);
    }
    
    res.json(flashcardSet);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Sanitize title for database storage
const sanitizeTitle = (filename) => {
  const nameWithoutExt = filename.replace(/\.[^/.]+$/, '');
  return nameWithoutExt
    .replace(/[^\w\s.-]/g, '') // Remove special chars
    .replace(/\s+/g, ' ') // Normalize spaces
    .trim() || 'Untitled Flashcard Set';
};

// Upload file and generate flashcards
router.post('/upload', (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      console.error('Multer error:', err);
      
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'File size exceeds 10MB limit. Please upload a smaller file.' });
      }
      
      if (err.message) {
        return res.status(400).json({ error: err.message });
      }
      
      return res.status(400).json({ error: 'File upload failed. Please try again.' });
    }
    next();
  });
}, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded. Please select a file.' });
    }

    console.log(`Processing file: ${req.file.originalname} (${req.file.mimetype})`);

    // Parse the uploaded file (now returns metadata)
    let parsedData;
    try {
      parsedData = await fileParser.parseFile(req.file.path, req.file.mimetype);
    } catch (parseError) {
      console.error('File parsing error:', parseError);
      await fs.unlink(req.file.path);
      return res.status(400).json({ 
        error: `Could not read the file. The PDF might be corrupted, password-protected, or in an unsupported format. Error: ${parseError.message}` 
      });
    }
    
    const content = parsedData.text;
    const numPages = parsedData.numPages;
    
    if (!content || content.trim().length === 0) {
      await fs.unlink(req.file.path);
      return res.status(400).json({ 
        error: 'The file appears to be empty or contains no readable text. Please try a different file.' 
      });
    }

    // Check if content is too short
    if (content.trim().length < 50) {
      await fs.unlink(req.file.path);
      return res.status(400).json({ 
        error: 'The file content is too short to generate meaningful flashcards. Please upload a file with more content.' 
      });
    }

    console.log(`Extracted ${content.length} characters from ${numPages || 'unknown'} pages`);

    // Chunk the content intelligently
    const chunks = contentChunker.chunkContent(content, numPages);
    console.log(`Document split into ${chunks.length} intelligent chunks`);

    // Generate flashcards using chunked processing
    let flashcards;
    try {
      // Progress tracking (logged to console)
      const progressCallback = (progress) => {
        console.log(`Progress: ${progress.currentChunk}/${progress.totalChunks} - ${progress.currentSection} - Total cards: ${progress.flashcardsGenerated}`);
        if (progress.error) {
          console.error(`Chunk error: ${progress.error}`);
        }
      };

      flashcards = await geminiService.processChunks(chunks, progressCallback);
    } catch (aiError) {
      console.error('AI generation error:', aiError);
      await fs.unlink(req.file.path);
      return res.status(500).json({ 
        error: `Failed to generate flashcards: ${aiError.message}. Please try again or upload a different file.` 
      });
    }
    
    if (!flashcards || flashcards.length === 0) {
      await fs.unlink(req.file.path);
      return res.status(400).json({ 
        error: 'Could not generate flashcards from this content. The file might not contain educational material suitable for flashcards.' 
      });
    }

    console.log(`Successfully generated ${flashcards.length} flashcards from ${chunks.length} sections`);

    // Convert to CSV with section metadata
    const csvData = geminiService.convertToCSV(flashcards);

    // Create flashcard set in database with sanitized title
    const sanitizedTitle = sanitizeTitle(req.file.originalname);
    const flashcardSet = new FlashcardSet({
      title: sanitizedTitle,
      fileName: req.file.originalname,
      cards: flashcards,
      csvData: csvData,
      user: req.userId || null // Associate with user if authenticated
    });

    await flashcardSet.save();

    // Clean up uploaded file
    await fs.unlink(req.file.path);

    console.log(`Successfully created flashcard set: ${sanitizedTitle} with ${flashcards.length} cards`);
    res.status(201).json(flashcardSet);
  } catch (error) {
    console.error('Upload error:', error);
    // Clean up file if it exists
    if (req.file) {
      try {
        await fs.unlink(req.file.path);
      } catch (unlinkError) {
        console.error('Error deleting file:', unlinkError);
      }
    }
    res.status(500).json({ 
      error: `An unexpected error occurred: ${error.message}. Please try again.` 
    });
  }
});

// Download CSV for a flashcard set
router.get('/:id/download-csv', async (req, res) => {
  try {
    const flashcardSet = await FlashcardSet.findById(req.params.id);
    if (!flashcardSet) {
      return res.status(404).json({ error: 'Flashcard set not found' });
    }

    // Verify ownership if user is authenticated
    if (req.userId && flashcardSet.user && flashcardSet.user.toString() !== req.userId.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${flashcardSet.title}.csv"`);
    res.send(flashcardSet.csvData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Generate more cards with AI for an existing deck
router.post('/:id/generate-more', async (req, res) => {
  try {
    const { numCards, focus } = req.body;
    
    if (!numCards || numCards < 1 || numCards > 50) {
      return res.status(400).json({ error: 'Number of cards must be between 1 and 50' });
    }

    const flashcardSet = await FlashcardSet.findById(req.params.id);
    if (!flashcardSet) {
      return res.status(404).json({ error: 'Flashcard set not found' });
    }

    // Verify ownership if user is authenticated
    if (req.userId && flashcardSet.user && flashcardSet.user.toString() !== req.userId.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    console.log(`Generating ${numCards} more cards for deck: ${flashcardSet.title}`);

    // Build context from existing cards to maintain consistency
    let context = `Generate ${numCards} NEW flashcards for a deck titled "${flashcardSet.title}".`;
    
    if (flashcardSet.cards.length > 0) {
      // Sample up to 5 existing cards to give AI context
      const sampleCards = flashcardSet.cards.slice(0, Math.min(5, flashcardSet.cards.length));
      context += `\n\nExisting cards in this deck (for context - DO NOT duplicate these):\n`;
      sampleCards.forEach((card, idx) => {
        context += `${idx + 1}. Q: ${card.question}\n   A: ${card.answer}\n`;
      });
      context += `\nGenerate ${numCards} completely NEW cards on similar topics, but ensure they cover DIFFERENT concepts/questions.`;
    }

    if (focus && focus.trim().length > 0) {
      context += `\n\nSpecific focus for new cards: ${focus.trim()}`;
    } else {
      context += `\n\nContinue with the same subject matter and difficulty level.`;
    }

    try {
      // Generate new flashcards
      const newFlashcards = await geminiService.generateFlashcards(context, numCards);
      
      if (!newFlashcards || newFlashcards.length === 0) {
        return res.status(400).json({ 
          error: 'Could not generate new flashcards. Please try again.' 
        });
      }

      // Add "AI Generated" section to new cards
      const taggedCards = newFlashcards.map(card => ({
        ...card,
        section: 'AI Generated',
        difficulty: 'medium'
      }));

      // Add to existing cards
      flashcardSet.cards.push(...taggedCards);

      // Regenerate CSV with all cards
      flashcardSet.csvData = geminiService.convertToCSV(flashcardSet.cards);

      await flashcardSet.save();

      console.log(`Successfully added ${taggedCards.length} AI-generated cards to deck: ${flashcardSet.title}`);

      res.status(201).json({
        message: `Successfully generated ${taggedCards.length} new cards`,
        cardsGenerated: taggedCards.length,
        totalCards: flashcardSet.cards.length,
        newCards: taggedCards
      });
    } catch (aiError) {
      console.error('AI generation error:', aiError);
      return res.status(500).json({ 
        error: `Failed to generate cards with AI: ${aiError.message}` 
      });
    }
  } catch (error) {
    console.error('Error generating more cards:', error);
    res.status(500).json({ error: error.message });
  }
});

// Generate a single AI card based on a topic/prompt
router.post('/:id/cards/generate-ai', async (req, res) => {
  try {
    const { topic, section } = req.body;
    
    if (!topic || topic.trim().length === 0) {
      return res.status(400).json({ error: 'Topic/prompt is required for AI generation' });
    }

    if (topic.trim().length < 5) {
      return res.status(400).json({ error: 'Topic/prompt is too short. Please provide at least 5 characters.' });
    }

    const flashcardSet = await FlashcardSet.findById(req.params.id);
    if (!flashcardSet) {
      return res.status(404).json({ error: 'Flashcard set not found' });
    }

    // Verify ownership if user is authenticated
    if (req.userId && flashcardSet.user && flashcardSet.user.toString() !== req.userId.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    console.log(`Generating AI card for topic: ${topic.trim()}`);

    // Build context for AI generation
    let prompt = `Generate a single high-quality flashcard about: ${topic.trim()}`;
    
    if (flashcardSet.cards.length > 0) {
      // Add context from existing cards
      const sampleCards = flashcardSet.cards.slice(0, Math.min(3, flashcardSet.cards.length));
      prompt += `\n\nContext - Existing cards in deck "${flashcardSet.title}" (match this style and difficulty level):\n`;
      sampleCards.forEach((card, idx) => {
        prompt += `${idx + 1}. Q: ${card.question.substring(0, 100)}...\n`;
      });
    }

    prompt += `\n\nGenerate ONE detailed flashcard about the topic. Make it educational and comprehensive.`;

    try {
      // Generate a single flashcard
      const aiCards = await geminiService.generateFlashcards(prompt, 1);
      
      if (!aiCards || aiCards.length === 0) {
        return res.status(400).json({ 
          error: 'Could not generate flashcard. Please try rephrasing your topic.' 
        });
      }

      // Use the first (and only) generated card
      const aiCard = aiCards[0];
      
      // Create new card with AI-generated content
      const newCard = {
        question: aiCard.question.trim(),
        answer: aiCard.answer.trim(),
        section: section ? section.trim() : 'AI Generated',
        difficulty: 'medium'
      };

      // Add to cards array
      flashcardSet.cards.push(newCard);

      // Regenerate CSV with the new card
      flashcardSet.csvData = geminiService.convertToCSV(flashcardSet.cards);

      await flashcardSet.save();

      console.log(`Successfully generated AI card for: ${topic.trim()}`);

      res.status(201).json({
        message: 'AI card generated successfully',
        card: newCard,
        totalCards: flashcardSet.cards.length
      });
    } catch (aiError) {
      console.error('AI generation error:', aiError);
      return res.status(500).json({ 
        error: `Failed to generate card with AI: ${aiError.message}` 
      });
    }
  } catch (error) {
    console.error('Error generating AI card:', error);
    res.status(500).json({ error: error.message });
  }
});

// Add a card to an existing flashcard set
router.post('/:id/cards', async (req, res) => {
  try {
    const { question, answer, section, difficulty } = req.body;
    
    if (!question || !answer) {
      return res.status(400).json({ error: 'Question and answer are required' });
    }

    const flashcardSet = await FlashcardSet.findById(req.params.id);
    if (!flashcardSet) {
      return res.status(404).json({ error: 'Flashcard set not found' });
    }

    // Verify ownership if user is authenticated
    if (req.userId && flashcardSet.user && flashcardSet.user.toString() !== req.userId.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Create new card
    const newCard = {
      question: question.trim(),
      answer: answer.trim(),
      section: section ? section.trim() : 'Custom Cards',
      difficulty: difficulty || 'medium'
    };

    // Add to cards array
    flashcardSet.cards.push(newCard);

    // Regenerate CSV with the new card
    flashcardSet.csvData = geminiService.convertToCSV(flashcardSet.cards);

    await flashcardSet.save();

    res.status(201).json({
      message: 'Card added successfully',
      card: newCard,
      totalCards: flashcardSet.cards.length
    });
  } catch (error) {
    console.error('Error adding card:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update a specific card in a flashcard set
router.put('/:id/cards/:cardIndex', async (req, res) => {
  try {
    const { question, answer, section, difficulty } = req.body;
    const cardIndex = parseInt(req.params.cardIndex);

    if (!question || !answer) {
      return res.status(400).json({ error: 'Question and answer are required' });
    }

    const flashcardSet = await FlashcardSet.findById(req.params.id);
    if (!flashcardSet) {
      return res.status(404).json({ error: 'Flashcard set not found' });
    }

    // Verify ownership if user is authenticated
    if (req.userId && flashcardSet.user && flashcardSet.user.toString() !== req.userId.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (cardIndex < 0 || cardIndex >= flashcardSet.cards.length) {
      return res.status(400).json({ error: 'Invalid card index' });
    }

    // Update the card
    flashcardSet.cards[cardIndex] = {
      question: question.trim(),
      answer: answer.trim(),
      section: section ? section.trim() : flashcardSet.cards[cardIndex].section,
      difficulty: difficulty || flashcardSet.cards[cardIndex].difficulty || 'medium'
    };

    // Regenerate CSV
    flashcardSet.csvData = geminiService.convertToCSV(flashcardSet.cards);

    await flashcardSet.save();

    res.json({
      message: 'Card updated successfully',
      card: flashcardSet.cards[cardIndex]
    });
  } catch (error) {
    console.error('Error updating card:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete a specific card from a flashcard set
router.delete('/:id/cards/:cardIndex', async (req, res) => {
  try {
    const cardIndex = parseInt(req.params.cardIndex);

    const flashcardSet = await FlashcardSet.findById(req.params.id);
    if (!flashcardSet) {
      return res.status(404).json({ error: 'Flashcard set not found' });
    }

    // Verify ownership if user is authenticated
    if (req.userId && flashcardSet.user && flashcardSet.user.toString() !== req.userId.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (cardIndex < 0 || cardIndex >= flashcardSet.cards.length) {
      return res.status(400).json({ error: 'Invalid card index' });
    }

    // Remove the card
    flashcardSet.cards.splice(cardIndex, 1);

    // Regenerate CSV
    flashcardSet.csvData = geminiService.convertToCSV(flashcardSet.cards);

    await flashcardSet.save();

    res.json({
      message: 'Card deleted successfully',
      totalCards: flashcardSet.cards.length
    });
  } catch (error) {
    console.error('Error deleting card:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete a flashcard set
router.delete('/:id', async (req, res) => {
  try {
    const flashcardSet = await FlashcardSet.findById(req.params.id);
    if (!flashcardSet) {
      return res.status(404).json({ error: 'Flashcard set not found' });
    }
    
    // Verify ownership if user is authenticated
    if (req.userId && flashcardSet.user && flashcardSet.user.toString() !== req.userId.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    await FlashcardSet.findByIdAndDelete(req.params.id);
    res.json({ message: 'Flashcard set deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

