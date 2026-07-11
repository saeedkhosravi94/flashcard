const express = require('express');
const router = express.Router();
const FlashcardSet = require('../models/FlashcardSet');
const upload = require('../config/multer');
const { imageUpload, audioUpload } = require('../config/multer');
const fileParser = require('../services/fileParser');
const aiService = require('../services/aiService');
const contentChunker = require('../services/contentChunker');
const backgroundProcessor = require('../services/backgroundProcessor');
const { optionalAuth, auth } = require('../middleware/auth');
const { logActivity } = require('../utils/activityLogger');
const User = require('../models/User');
const reviewScheduler = require('../services/reviewScheduler');
const adaptiveAlgorithm = require('../services/adaptiveAlgorithm');
const performanceAnalytics = require('../services/performanceAnalytics');
const fs = require('fs').promises;

// Apply optional auth to all routes
router.use(optionalAuth);

// Get review statistics for all user decks
router.get('/review/stats', async (req, res) => {
  try {
    if (!req.userId) {
      return res.json({ decksWithDueCards: [] });
    }

    // Get user's decks
    const flashcardSets = await FlashcardSet.find({ user: req.userId });
    
    // Get current date (start of today)
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    // Calculate due cards for each deck
    const decksWithDueCards = flashcardSets.map(set => {
      const dueCount = set.cards.filter(card => {
        // If card has never been reviewed, it's due
        if (!card.nextReviewDate) {
          return true;
        }
        
        // Check if next review date has passed
        const nextReview = new Date(card.nextReviewDate);
        nextReview.setHours(0, 0, 0, 0);
        return nextReview <= now;
      }).length;

      return {
        _id: set._id,
        title: set.title,
        totalCards: set.cards.length,
        dueCount: dueCount,
        folder: set.folder
      };
    }).filter(deck => deck.dueCount > 0) // Only include decks with due cards
      .sort((a, b) => b.dueCount - a.dueCount); // Sort by most due cards first

    console.log(`📊 Found ${decksWithDueCards.length} decks with cards due for review`);
    
    res.json({
      decksWithDueCards: decksWithDueCards,
      totalDueCards: decksWithDueCards.reduce((sum, deck) => sum + deck.dueCount, 0)
    });
  } catch (error) {
    console.error('Error getting review stats:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get all flashcard sets for the current user
router.get('/', async (req, res) => {
  try {
    if (!req.userId) {
      return res.json([]);
    }

    console.log('📚 GET /api/flashcards - UserID:', req.userId);
    const flashcardSets = await FlashcardSet.find({ user: req.userId }).sort({ createdAt: -1 });
    console.log('📚 Found', flashcardSets.length, 'flashcard sets for user:', req.userId);
    res.json(flashcardSets);
  } catch (error) {
    console.error('❌ Error in GET /api/flashcards:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create a new flashcard set (empty or AI-generated) - authentication required
router.post('/create-deck', async (req, res) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Authentication required to create decks' });
    }

    const { title, description, numCards, model, customPrompt, apiKey } = req.body;
    
    if (!title || title.trim().length === 0) {
      return res.status(400).json({ error: 'Deck title is required' });
    }

    let flashcards = [];
    let csvData = 'Question,Answer\n'; // Default empty CSV with headers

    // If description OR customPrompt is provided, use AI to generate flashcards
    const hasDescription = description && description.trim().length > 0;
    const hasCustomPrompt = customPrompt && customPrompt.trim().length > 0;
    
    if (hasDescription || hasCustomPrompt) {
      console.log(`Generating flashcards with AI for: ${title}`);
      if (hasDescription) {
        console.log(`Description: ${description.trim()}`);
      }
      if (hasCustomPrompt) {
        console.log(`Custom Instructions: ${customPrompt.trim()}`);
      }

      // If only customPrompt is provided (no description), that's fine - AI will generate from instructions
      // If description is provided, validate it
      if (hasDescription && description.trim().length < 20) {
        return res.status(400).json({ 
          error: 'Description is too short. Please provide at least 20 characters, or use custom instructions only.' 
        });
      }

      // Extract AI configuration
      const aiConfig = {
        model: model || 'gemini-2.5-flash',
        customPrompt: customPrompt || null,
        apiKey: apiKey || null,
        numCards: numCards ? parseInt(numCards) : null,
        hasContent: hasDescription // Pass whether content is provided
      };

      console.log(`AI Config - Model: ${aiConfig.model}, Custom prompt: ${!!aiConfig.customPrompt}, Has content: ${aiConfig.hasContent}, Cards: ${aiConfig.numCards || 'auto'}`);

      try {
        // Generate flashcards using AI
        // Allow user to specify number of cards, or use default
        let cardCount;
        
        if (aiConfig.numCards && aiConfig.numCards > 0) {
          // User specified - validate range (min 5, max 100)
          cardCount = Math.max(5, Math.min(100, aiConfig.numCards));
          console.log(`User requested ${aiConfig.numCards} cards, generating ${cardCount} cards`);
        } else {
          // Default to 25 cards if not specified
          cardCount = 25;
          console.log(`Using default card count: ${cardCount}`);
        }
        
        // If description is provided, use it as content. Otherwise, use a placeholder since we're generating from instructions
        const content = hasDescription 
          ? description.trim() 
          : 'Generate flashcards based on the user instructions provided in the prompt.';
        
        console.log(`Generating ${cardCount} flashcards ${hasDescription ? 'from description' : 'from user instructions'}...`);
        flashcards = await aiService.generateFlashcards(content, cardCount, aiConfig);
        
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
        csvData = aiService.convertToCSV(flashcards);
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
      user: req.userId || null, // Associate with user if authenticated
      createdBy: req.userId || null // Creator is the user who creates the deck
    });

    await flashcardSet.save();

    // Log activity if user is authenticated
    if (req.userId) {
      await logActivity(req.userId, 'create_deck', { 
        deckId: flashcardSet._id,
        title: flashcardSet.title,
        cardCount: flashcards.length 
      }, req);
    }

    const deckType = flashcards.length > 0 ? `AI-generated deck with ${flashcards.length} cards` : 'empty deck';
    console.log(`Created new ${deckType}: ${title}`);
    
    res.status(201).json(flashcardSet);
  } catch (error) {
    console.error('Error creating deck:', error);
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

// Get PDF info (page count) without full processing
router.post('/pdf-info', (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      console.error('Multer error:', err);
      return res.status(400).json({ error: 'File upload failed' });
    }
    next();
  });
}, async (req, res) => {
  try {
    if (!req.userId) {
      if (req.file) await fs.unlink(req.file.path);
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    if (req.file.mimetype !== 'application/pdf') {
      await fs.unlink(req.file.path);
      return res.status(400).json({ error: 'Only PDF files are supported for page selection' });
    }

    console.log(`Getting PDF info for: ${req.file.originalname}`);

    // Parse PDF to get page count only
    const parsedData = await fileParser.parseFile(req.file.path, req.file.mimetype);
    
    // Keep the file for later processing - don't delete it yet
    // Return file info
    res.json({
      fileName: req.file.originalname,
      numPages: parsedData.numPages,
      tempFilePath: req.file.path, // Frontend will send this back for full processing
      fileSize: req.file.size
    });
  } catch (error) {
    console.error('Error getting PDF info:', error);
    if (req.file) {
      try {
        await fs.unlink(req.file.path);
      } catch (unlinkError) {
        console.error('Error deleting file:', unlinkError);
      }
    }
    res.status(500).json({ error: error.message });
  }
});

// Upload file and generate flashcards
router.post('/upload', (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      console.error('Multer error:', err);
      
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'File size exceeds 100MB limit. Please upload a smaller file.' });
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
    if (!req.userId) {
      if (req.file) await fs.unlink(req.file.path);
      return res.status(401).json({ error: 'Authentication required to upload files' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded. Please select a file.' });
    }

    console.log(`Processing file: ${req.file.originalname} (${req.file.mimetype}) for user: ${req.userId}`);

    // Extract AI configuration from request body
    const aiConfig = {
      customPrompt: req.body.customPrompt || null,
      model: req.body.model || 'gemini-2.5-flash',
      apiKey: req.body.apiKey || null,
      numCards: req.body.numCards ? parseInt(req.body.numCards) : null
    };
    
    console.log(`AI Config - Model: ${aiConfig.model}, Custom prompt: ${!!aiConfig.customPrompt}, Cards: ${aiConfig.numCards || 'auto'}`);

    // Extract page range if provided (for PDFs)
    let pageRange = null;
    if (req.body.pageFrom && req.body.pageTo) {
      pageRange = {
        from: parseInt(req.body.pageFrom),
        to: parseInt(req.body.pageTo)
      };
      console.log(`📄 Page range specified: ${pageRange.from}-${pageRange.to}`);
    }

    // Parse the uploaded file (now returns metadata)
    let parsedData;
    try {
      parsedData = await fileParser.parseFile(req.file.path, req.file.mimetype, pageRange);
      
      // 🔍 DEBUG LOG 1: Immediately after parsing
      console.log('🔍 DEBUG LOG 1 - parsedData right after fileParser.parseFile:');
      console.log('  - Type of parsedData:', typeof parsedData);
      console.log('  - parsedData keys:', Object.keys(parsedData));
      console.log('  - parsedData.text exists?:', !!parsedData.text);
      console.log('  - parsedData.text type:', typeof parsedData.text);
      console.log('  - parsedData.text is string?:', typeof parsedData.text === 'string');
      if (parsedData.text) {
        console.log('  - parsedData.text length:', parsedData.text.length);
        console.log('  - parsedData.text preview (first 200 chars):', 
          typeof parsedData.text === 'string' ? parsedData.text.substring(0, 200) : '[NOT A STRING]');
      }
      console.log('  - parsedData.isCSV:', parsedData.isCSV);
      console.log('  - parsedData.numPages:', parsedData.numPages);
      
    } catch (parseError) {
      console.error('File parsing error:', parseError);
      await fs.unlink(req.file.path);
      return res.status(400).json({ 
        error: `Could not read the file. ${parseError.message}` 
      });
    }

    // Handle CSV files directly without AI processing
    if (parsedData.isCSV) {
      console.log(`CSV file detected - importing ${parsedData.flashcards.length} flashcards directly`);

      const flashcards = parsedData.flashcards;
      const csvData = aiService.convertToCSV(flashcards);

      const sanitizedTitle = sanitizeTitle(req.file.originalname);
      const flashcardSet = new FlashcardSet({
        title: sanitizedTitle,
        fileName: req.file.originalname,
        cards: flashcards,
        csvData: csvData,
        user: req.userId || null,
        createdBy: req.userId || null
      });

      await flashcardSet.save();
      await fs.unlink(req.file.path);

      // Log activity if user is authenticated
      if (req.userId) {
        await logActivity(req.userId, 'upload_file', { 
          deckId: flashcardSet._id,
          title: flashcardSet.title,
          fileName: req.file.originalname,
          cardCount: flashcards.length 
        }, req);
      }

      console.log(`Successfully imported CSV: ${sanitizedTitle} with ${flashcards.length} cards`);
      return res.status(201).json(flashcardSet);
    }

    // Handle Anki .apkg files directly without AI processing
    if (parsedData.isAnki) {
      console.log(`Anki file detected - importing ${parsedData.flashcards.length} flashcards directly`);

      const flashcards = parsedData.flashcards;
      const csvData = aiService.convertToCSV(flashcards);

      const sanitizedTitle = sanitizeTitle(req.file.originalname);
      const flashcardSet = new FlashcardSet({
        title: sanitizedTitle,
        fileName: req.file.originalname,
        cards: flashcards,
        csvData: csvData,
        user: req.userId || null,
        createdBy: req.userId || null
      });

      await flashcardSet.save();
      
      console.log(`✅ Saved Anki deck to database: ${sanitizedTitle} with ${flashcards.length} cards`);
      
      // Clean up uploaded .apkg file
      try {
        await fs.unlink(req.file.path);
        console.log(`🧹 Deleted uploaded .apkg file: ${req.file.path}`);
      } catch (unlinkError) {
        console.warn(`⚠️  Could not delete .apkg file: ${req.file.path}`, unlinkError);
      }
      
      // Clean up the parsed output directory (contains cards.json and media folder)
      // Note: Media files have already been copied to uploads/anki-media/, so we can delete the parsed output
      if (parsedData.outputDir) {
        try {
          await fs.rm(parsedData.outputDir, { recursive: true, force: true });
          console.log(`🧹 Cleaned up parsed output directory: ${parsedData.outputDir}`);
        } catch (cleanupError) {
          console.warn(`⚠️  Could not clean up output directory: ${parsedData.outputDir}`, cleanupError);
        }
      }

      // Log activity if user is authenticated
      if (req.userId) {
        await logActivity(req.userId, 'upload_file', { 
          deckId: flashcardSet._id,
          title: flashcardSet.title,
          fileName: req.file.originalname,
          cardCount: flashcards.length 
        }, req);
      }

      console.log(`Successfully imported Anki deck: ${sanitizedTitle} with ${flashcards.length} cards`);
      return res.status(201).json(flashcardSet);
    }
    
    const content = parsedData.text;
    const numPages = parsedData.numPages;
    const extractedImages = parsedData.images || [];
    
    // Debug: Validate content type
    console.log(`📝 Content validation:`, {
      hasText: !!parsedData.text,
      textType: typeof parsedData.text,
      isString: typeof parsedData.text === 'string',
      contentType: typeof content,
      contentLength: content?.length || 0,
      contentPreview: typeof content === 'string' ? content.substring(0, 150) : `[NOT A STRING: ${typeof content}]`,
      parsedDataKeys: Object.keys(parsedData),
      extractedImages: extractedImages.length
    });
    
    if (!content || typeof content !== 'string' || content.trim().length === 0) {
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

    // 🔍 DEBUG LOG 2: Before passing to contentChunker
    console.log('🔍 DEBUG LOG 2 - Before contentChunker.chunkContent:');
    console.log('  - content type:', typeof content);
    console.log('  - content is string?:', typeof content === 'string');
    console.log('  - content length:', content?.length || 0);
    console.log('  - content preview:', typeof content === 'string' ? content.substring(0, 150) : '[NOT A STRING]');

    // Chunk the content intelligently
    const chunks = contentChunker.chunkContent(content, numPages);
    console.log(`Document split into ${chunks.length} intelligent chunks`);
    
    // 🔍 DEBUG LOG 3: After contentChunker
    console.log('🔍 DEBUG LOG 3 - After contentChunker.chunkContent:');
    console.log('  - Number of chunks:', chunks.length);
    if (chunks.length > 0) {
      console.log('  - First chunk keys:', Object.keys(chunks[0]));
      console.log('  - First chunk.text type:', typeof chunks[0].text);
      console.log('  - First chunk.text is string?:', typeof chunks[0].text === 'string');
      console.log('  - First chunk.text length:', chunks[0].text?.length || 0);
      console.log('  - First chunk.text preview:', 
        typeof chunks[0].text === 'string' ? chunks[0].text.substring(0, 150) : '[NOT A STRING]');
    }
    
    // Verify chunks are valid
    if (chunks.length > 0) {
      console.log(`First chunk sample:`, {
        hasText: !!chunks[0].text,
        textType: typeof chunks[0].text,
        textLength: chunks[0].text?.length || 0,
        textPreview: typeof chunks[0].text === 'string' ? chunks[0].text.substring(0, 100) : '[NOT A STRING]'
      });
    }
    
    // Clear original content from memory - we only need chunks now
    parsedData.text = null;
    parsedData = null;

    // Determine if we should use background processing
    // Use background processing if there are many chunks (>5)
    const useBackgroundProcessing = chunks.length > 5;

    if (useBackgroundProcessing) {
      console.log(`📦 Using background processing for ${chunks.length} chunks`);
      
      // Create flashcard set immediately with processing status
      const sanitizedTitle = sanitizeTitle(req.file.originalname);
      const flashcardSet = new FlashcardSet({
        title: sanitizedTitle,
        fileName: req.file.originalname,
        cards: [], // Empty initially
        csvData: 'Section,Question,Answer\n', // Empty CSV
        user: req.userId || null,
        createdBy: req.userId || null,
        processingStatus: 'processing',
        processingProgress: {
          current: 0,
          total: chunks.length,
          message: 'Starting processing...'
        }
      });

      await flashcardSet.save();
      console.log(`✅ Created processing deck: ${sanitizedTitle} (ID: ${flashcardSet._id})`);

      // Start background processing (don't await - let it run async)
      backgroundProcessor.processFlashcardGeneration(
        flashcardSet._id,
        chunks,
        aiConfig,
        req.userId,
        req.file.originalname,
        req.file.path,
        extractedImages
      ).catch(err => {
        console.error(`Background processing failed for ${flashcardSet._id}:`, err);
      });

      // Return immediately with processing status
      return res.status(202).json({
        ...flashcardSet.toObject(),
        message: 'Processing started. Check progress using the deck ID.'
      });
    } else {
      // For small files, process synchronously (old behavior)
      console.log(`⚡ Processing ${chunks.length} chunks synchronously`);
      
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

        flashcards = await aiService.processChunks(chunks, progressCallback, aiConfig);
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

      // Associate images with flashcards if images were extracted
      if (extractedImages && extractedImages.length > 0) {
        console.log(`🖼️  Associating ${extractedImages.length} extracted images with flashcards...`);
        flashcards = imageAssociator.associateImagesWithCards(flashcards, extractedImages, chunks);
        const stats = imageAssociator.getAssociationStats(flashcards);
        console.log(`📊 Image Association Stats:`, stats);
      }

      // Clear chunks array from memory
      chunks.length = 0;

      // Convert to CSV with section metadata
      const csvData = aiService.convertToCSV(flashcards);

      // Create flashcard set in database with sanitized title
      const sanitizedTitle = sanitizeTitle(req.file.originalname);
      const flashcardSet = new FlashcardSet({
        title: sanitizedTitle,
        fileName: req.file.originalname,
        cards: flashcards,
        csvData: csvData,
        user: req.userId || null,
        createdBy: req.userId || null,
        processingStatus: 'completed' // Completed immediately
      });

      await flashcardSet.save();

      // Clean up uploaded file
      await fs.unlink(req.file.path);

      // Log activity if user is authenticated
      if (req.userId) {
        await logActivity(req.userId, 'upload_file', { 
          deckId: flashcardSet._id,
          title: flashcardSet.title,
          fileName: req.file.originalname,
          cardCount: flashcards.length 
        }, req);
      }

      console.log(`Successfully created flashcard set: ${sanitizedTitle} with ${flashcards.length} cards`);
      return res.status(201).json(flashcardSet);
    }
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

// Check processing status of a flashcard set
router.get('/:id/status', async (req, res) => {
  try {
    const flashcardSet = await FlashcardSet.findById(req.params.id);
    
    if (!flashcardSet) {
      return res.status(404).json({ error: 'Flashcard set not found' });
    }
    
    // Check ownership if user is authenticated
    if (req.userId && flashcardSet.user && flashcardSet.user.toString() !== req.userId.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Return status and progress
    res.json({
      _id: flashcardSet._id,
      title: flashcardSet.title,
      processingStatus: flashcardSet.processingStatus,
      processingProgress: flashcardSet.processingProgress,
      processingError: flashcardSet.processingError,
      cardCount: flashcardSet.cards.length
    });
  } catch (error) {
    console.error('Error checking status:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get a single flashcard set
router.get('/:id', async (req, res) => {
  try {
    const flashcardSet = await FlashcardSet.findById(req.params.id).populate('folder');
    if (!flashcardSet) {
      return res.status(404).json({ error: 'Flashcard set not found' });
    }
    
    // Verify ownership
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

// Rename a flashcard set
router.patch('/:id/rename', async (req, res) => {
  try {
    const { title } = req.body;
    
    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Title is required' });
    }

    const flashcardSet = await FlashcardSet.findById(req.params.id);
    
    if (!flashcardSet) {
      return res.status(404).json({ error: 'Flashcard set not found' });
    }
    
    // Verify ownership if user is authenticated
    if (req.userId && flashcardSet.user && flashcardSet.user.toString() !== req.userId.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // For shared decks (where createdBy exists and is different from user), only the creator can edit
    if (req.userId && flashcardSet.createdBy && 
        flashcardSet.createdBy.toString() !== flashcardSet.user.toString() &&
        flashcardSet.createdBy.toString() !== req.userId.toString()) {
      return res.status(403).json({ error: 'Only the creator can edit this shared deck' });
    }

    const oldTitle = flashcardSet.title;
    flashcardSet.title = title.trim();
    await flashcardSet.save();

    // Log activity if user is authenticated
    if (req.userId) {
      await logActivity(req.userId, 'rename_deck', { 
        deckId: flashcardSet._id,
        oldTitle: oldTitle,
        newTitle: flashcardSet.title
      }, req);
    }

    res.json({ message: 'Flashcard set renamed successfully', flashcardSet });
  } catch (error) {
    console.error('Rename error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Download CSV for a flashcard set
router.get('/:id/download-csv', async (req, res) => {
  try {
    const flashcardSet = await FlashcardSet.findById(req.params.id).populate('folder');
    if (!flashcardSet) {
      return res.status(404).json({ error: 'Flashcard set not found' });
    }

    // Verify ownership
    if (req.userId && flashcardSet.user && flashcardSet.user.toString() !== req.userId.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Log activity if user is authenticated
    if (req.userId) {
      await logActivity(req.userId, 'download_csv', { 
        deckId: flashcardSet._id,
        deckTitle: flashcardSet.title
      }, req);
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
    
    // For shared decks (where createdBy exists and is different from user), only the creator can edit
    if (req.userId && flashcardSet.createdBy && 
        flashcardSet.createdBy.toString() !== flashcardSet.user.toString() &&
        flashcardSet.createdBy.toString() !== req.userId.toString()) {
      return res.status(403).json({ error: 'Only the creator can edit this shared deck' });
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
      const newFlashcards = await aiService.generateFlashcards(context, numCards);
      
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
      flashcardSet.csvData = aiService.convertToCSV(flashcardSet.cards);

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

// Generate a single AI card based on existing cards in the deck
router.post('/:id/cards/generate-ai', async (req, res) => {
  try {
    const { section, customPrompt } = req.body;

    const flashcardSet = await FlashcardSet.findById(req.params.id);
    if (!flashcardSet) {
      return res.status(404).json({ error: 'Flashcard set not found' });
    }

    // Verify ownership if user is authenticated
    if (req.userId && flashcardSet.user && flashcardSet.user.toString() !== req.userId.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // For shared decks (where createdBy exists and is different from user), only the creator can edit
    if (req.userId && flashcardSet.createdBy && 
        flashcardSet.createdBy.toString() !== flashcardSet.user.toString() &&
        flashcardSet.createdBy.toString() !== req.userId.toString()) {
      return res.status(403).json({ error: 'Only the creator can edit this shared deck' });
    }

    // Build context for AI generation from existing cards
    let content = '';
    let hasExistingCards = flashcardSet.cards.length > 0;
    
    if (hasExistingCards) {
      // Use ALL existing cards to understand the topic and style
      const allCards = flashcardSet.cards;
      const firstCard = allCards[0];
      
      content = `You are generating a NEW flashcard for a deck. Below is the information you need:\n\n`;
      content += `Deck Title: "${flashcardSet.title}"\n`;
      content += `Total Existing Cards: ${allCards.length}\n\n`;
      
      // Show first card's front and back as a format example
      content += `=== EXAMPLE CARD (to understand the format and style) ===\n`;
      content += `Front (Question): ${firstCard.question}\n`;
      content += `Back (Answer): ${firstCard.answer}\n`;
      content += `=== END OF EXAMPLE CARD ===\n\n`;
      
      // Include ALL card fronts
      content += `=== ALL EXISTING CARD FRONTS (DO NOT duplicate ANY of these questions) ===\n\n`;
      
      // Include ALL cards, not just a sample
      allCards.forEach((card, idx) => {
        content += `${idx + 1}. ${card.question}\n`;
      });
      
      content += `\n=== END OF ALL EXISTING CARD FRONTS ===\n\n`;
      content += `⚠️ CRITICAL: The new card you generate MUST NOT be one of the ${allCards.length} existing questions listed above. The question must be completely different from ALL of them. You have seen all ${allCards.length} existing cards, so make sure your new card is unique.\n\n`;
      content += `TASK: Generate ONE completely NEW flashcard that:\n`;
      content += `1. Continues the SAME topic/subject matter as the existing cards above\n`;
      content += `2. Matches the SAME style, difficulty level, and format as the example card shown above\n`;
      content += `3. The answer format and style should match the example card's answer format\n`;
      content += `4. Is educational and comprehensive\n`;
      content += `5. Does NOT duplicate ANY of the ${allCards.length} existing cards above (must be a completely different question and answer)\n`;
      content += `6. Covers a different aspect, concept, or detail that hasn't been covered in any of the existing cards\n`;
      content += `7. Fits naturally with the existing cards in this deck\n\n`;
      content += `IMPORTANT: You have been shown ALL ${allCards.length} existing card fronts and the first card's answer as an example. Study the example card to understand the answer format and style. Then generate a new card on the same topic but with COMPLETELY DIFFERENT content that doesn't match any of the existing questions.`;
    } else {
      // If no cards exist, use deck title and user instructions
      content = `Generate a single high-quality flashcard for the deck titled "${flashcardSet.title}".\n`;
      content += `Create an educational and comprehensive flashcard that would fit this deck.`;
    }

    // Helper function to normalize text for comparison
    const normalize = (text) => {
      return text.toLowerCase()
        .replace(/[^\w\s]/g, '') // Remove punctuation
        .replace(/\s+/g, ' ') // Normalize whitespace
        .trim();
    };
    
    // Helper function to calculate string similarity (simple Jaccard similarity)
    const calculateSimilarity = (str1, str2) => {
      if (str1 === str2) return 1.0;
      if (str1.length === 0 || str2.length === 0) return 0.0;
      
      const words1 = new Set(str1.split(' ').filter(w => w.length > 0));
      const words2 = new Set(str2.split(' ').filter(w => w.length > 0));
      
      if (words1.size === 0 || words2.size === 0) return 0.0;
      
      const intersection = new Set([...words1].filter(x => words2.has(x)));
      const union = new Set([...words1, ...words2]);
      
      return intersection.size / union.size;
    };
    
    // Helper function to check if a card is a duplicate
    const isDuplicate = (newQuestion, newAnswer) => {
      const normalizedNewQuestion = normalize(newQuestion);
      const normalizedNewAnswer = normalize(newAnswer);
      
      return flashcardSet.cards.some((existingCard, index) => {
        const normalizedExistingQuestion = normalize(existingCard.question);
        const normalizedExistingAnswer = normalize(existingCard.answer);
        
        // Check if question and answer are very similar (exact match after normalization)
        const questionMatch = normalizedNewQuestion === normalizedExistingQuestion;
        const answerMatch = normalizedNewAnswer === normalizedExistingAnswer;
        
        // Also check if question is very similar (for cases where wording is slightly different)
        const questionSimilarity = calculateSimilarity(normalizedNewQuestion, normalizedExistingQuestion);
        const answerSimilarity = calculateSimilarity(normalizedNewAnswer, normalizedExistingAnswer);
        
        // Consider it a duplicate if exact match or very high similarity (>85% for question, >80% for answer)
        const isDup = (questionMatch && answerMatch) || (questionSimilarity > 0.85 && answerSimilarity > 0.80);
        
        if (isDup) {
          console.log(`  ⚠️ Duplicate detected with card ${index + 1}:`);
          console.log(`    Question similarity: ${(questionSimilarity * 100).toFixed(1)}%`);
          console.log(`    Answer similarity: ${(answerSimilarity * 100).toFixed(1)}%`);
          console.log(`    Existing Q: "${existingCard.question}"`);
          console.log(`    New Q: "${newQuestion}"`);
        }
        
        return isDup;
      });
    };

    try {
      // Build AI config with user instructions
      const aiConfig = {
        customPrompt: customPrompt || null,
        model: 'gemini-2.5-flash' // Default to free model for single card generation
      };
      
      // Log the prompt being sent to AI
      console.log('\n=== PROMPT FOR NEW CARD GENERATION ===');
      console.log('Deck:', flashcardSet.title);
      console.log('Existing cards count:', flashcardSet.cards.length);
      console.log('User instructions:', customPrompt || 'None');
      console.log('\n--- Full Prompt Content ---');
      console.log(content);
      console.log('\n=== END OF PROMPT ===\n');
      
      // Try to generate a unique card (max 3 attempts)
      let aiCard = null;
      let attempts = 0;
      const maxAttempts = 3;
      
      while (attempts < maxAttempts) {
        // Generate a single flashcard
        const aiCards = await aiService.generateFlashcards(content, 1, aiConfig);
        
        if (!aiCards || aiCards.length === 0) {
          return res.status(400).json({ 
            error: 'Could not generate flashcard. Please try again or provide more specific instructions.' 
          });
        }

        const candidateCard = aiCards[0];
        const candidateQuestion = candidateCard.question.trim();
        const candidateAnswer = candidateCard.answer.trim();
        
        console.log(`\n--- Attempt ${attempts + 1} Generated Card ---`);
        console.log('Question:', candidateQuestion);
        console.log('Answer:', candidateAnswer.substring(0, 100) + '...');
        
        // Check if this card is a duplicate
        const isDup = isDuplicate(candidateQuestion, candidateAnswer);
        console.log('Is duplicate?', isDup);
        
        if (!isDup) {
          aiCard = candidateCard;
          console.log('✓ Unique card found!');
          break; // Found a unique card
        }
        
        attempts++;
        console.log(`✗ Attempt ${attempts}: Generated card is a duplicate, trying again...`);
        
        // Find which existing card it matches
        const matchingCard = flashcardSet.cards.find(existingCard => {
          const normalizedNewQuestion = normalize(candidateQuestion);
          const normalizedExistingQuestion = normalize(existingCard.question);
          const normalizedNewAnswer = normalize(candidateAnswer);
          const normalizedExistingAnswer = normalize(existingCard.answer);
          
          const questionMatch = normalizedNewQuestion === normalizedExistingQuestion;
          const answerMatch = normalizedNewAnswer === normalizedExistingAnswer;
          const questionSimilarity = calculateSimilarity(normalizedNewQuestion, normalizedExistingQuestion);
          const answerSimilarity = calculateSimilarity(normalizedNewAnswer, normalizedExistingAnswer);
          
          return (questionMatch && answerMatch) || (questionSimilarity > 0.9 && answerSimilarity > 0.9);
        });
        
        if (matchingCard) {
          console.log('Matches existing card:');
          console.log('  Existing Q:', matchingCard.question);
          console.log('  Existing A:', matchingCard.answer.substring(0, 100) + '...');
        }
        
        // Add instruction to avoid duplicates in next attempt
        if (attempts < maxAttempts) {
          content += `\n\n⚠️ CRITICAL REMINDER: The previous card you generated was a duplicate of an existing card. You MUST generate a COMPLETELY DIFFERENT question that is NOT in the list of existing questions above. Do not rephrase or slightly modify existing questions - create a NEW question on a different aspect of the topic.`;
        }
      }
      
      if (!aiCard) {
        return res.status(400).json({ 
          error: 'Could not generate a unique flashcard after multiple attempts. The deck may already contain similar cards, or please provide more specific instructions.' 
        });
      }
      
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
      flashcardSet.csvData = aiService.convertToCSV(flashcardSet.cards);

      await flashcardSet.save();

      console.log(`Successfully generated AI card for deck: ${flashcardSet.title}`);

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
// Upload images for cards
router.post('/:id/cards/upload-image', imageUpload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    const flashcardSet = await FlashcardSet.findById(req.params.id);
    if (!flashcardSet) {
      return res.status(404).json({ error: 'Flashcard set not found' });
    }

    // Verify ownership if user is authenticated
    if (req.userId && flashcardSet.user && flashcardSet.user.toString() !== req.userId.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // For shared decks (where createdBy exists and is different from user), only the creator can edit
    if (req.userId && flashcardSet.createdBy && 
        flashcardSet.createdBy.toString() !== flashcardSet.user.toString() &&
        flashcardSet.createdBy.toString() !== req.userId.toString()) {
      return res.status(403).json({ error: 'Only the creator can edit this shared deck' });
    }

    // Return the file path with leading slash for absolute URL
    const imagePath = `/uploads/${req.file.filename}`;
    
    res.status(200).json({
      message: 'Image uploaded successfully',
      imagePath: imagePath
    });
  } catch (error) {
    console.error('Error uploading image:', error);
    res.status(500).json({ error: error.message });
  }
});

// Upload audio for flashcard
router.post('/:id/cards/upload-audio', audioUpload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file provided' });
    }

    const flashcardSet = await FlashcardSet.findById(req.params.id);
    if (!flashcardSet) {
      return res.status(404).json({ error: 'Flashcard set not found' });
    }

    // Verify ownership if user is authenticated
    if (req.userId && flashcardSet.user && flashcardSet.user.toString() !== req.userId.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // For shared decks (where createdBy exists and is different from user), only the creator can edit
    if (req.userId && flashcardSet.createdBy && 
        flashcardSet.createdBy.toString() !== flashcardSet.user.toString() &&
        flashcardSet.createdBy.toString() !== req.userId.toString()) {
      return res.status(403).json({ error: 'Only the creator can edit this shared deck' });
    }

    // Return the file path with leading slash for absolute URL
    const audioPath = `/uploads/${req.file.filename}`;
    
    res.status(200).json({
      message: 'Audio uploaded successfully',
      audioPath: audioPath
    });
  } catch (error) {
    console.error('Error uploading audio:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/:id/cards', async (req, res) => {
  try {
    const { question, answer, section, difficulty, questionImage, answerImage, questionAudio, answerAudio } = req.body;
    
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
    
    // For shared decks (where createdBy exists and is different from user), only the creator can edit
    if (req.userId && flashcardSet.createdBy && 
        flashcardSet.createdBy.toString() !== flashcardSet.user.toString() &&
        flashcardSet.createdBy.toString() !== req.userId.toString()) {
      return res.status(403).json({ error: 'Only the creator can edit this shared deck' });
    }

    // Create new card
    const newCard = {
      question: question.trim(),
      answer: answer.trim(),
      section: section ? section.trim() : 'Custom Cards',
      difficulty: difficulty || 'medium',
      questionImage: questionImage || null,
      answerImage: answerImage || null,
      questionAudio: questionAudio || null,
      answerAudio: answerAudio || null
    };

    // Add to cards array
    flashcardSet.cards.push(newCard);

    // Regenerate CSV with the new card
    flashcardSet.csvData = aiService.convertToCSV(flashcardSet.cards);

    await flashcardSet.save();

    // Log activity if user is authenticated
    if (req.userId) {
      await logActivity(req.userId, 'add_card', { 
        deckId: flashcardSet._id,
        deckTitle: flashcardSet.title,
        cardQuestion: question.substring(0, 50) // First 50 chars
      }, req);
    }

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
    const { question, answer, section, difficulty, questionImage, answerImage, questionAudio, answerAudio } = req.body;
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
    
    // For shared decks (where createdBy exists and is different from user), only the creator can edit
    if (req.userId && flashcardSet.createdBy && 
        flashcardSet.createdBy.toString() !== flashcardSet.user.toString() &&
        flashcardSet.createdBy.toString() !== req.userId.toString()) {
      return res.status(403).json({ error: 'Only the creator can edit this shared deck' });
    }

    if (cardIndex < 0 || cardIndex >= flashcardSet.cards.length) {
      return res.status(400).json({ error: 'Invalid card index' });
    }

    // Update the card
    flashcardSet.cards[cardIndex] = {
      question: question.trim(),
      answer: answer.trim(),
      section: section ? section.trim() : flashcardSet.cards[cardIndex].section,
      difficulty: difficulty || flashcardSet.cards[cardIndex].difficulty || 'medium',
      questionImage: questionImage !== undefined ? questionImage : flashcardSet.cards[cardIndex].questionImage,
      answerImage: answerImage !== undefined ? answerImage : flashcardSet.cards[cardIndex].answerImage,
      questionAudio: questionAudio !== undefined ? questionAudio : flashcardSet.cards[cardIndex].questionAudio,
      answerAudio: answerAudio !== undefined ? answerAudio : flashcardSet.cards[cardIndex].answerAudio
    };

    // Regenerate CSV
    flashcardSet.csvData = aiService.convertToCSV(flashcardSet.cards);

    await flashcardSet.save();

    // Log activity if user is authenticated
    if (req.userId) {
      await logActivity(req.userId, 'edit_card', { 
        deckId: flashcardSet._id,
        deckTitle: flashcardSet.title,
        cardIndex
      }, req);
    }

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
    
    // For shared decks (where createdBy exists and is different from user), only the creator can edit
    if (req.userId && flashcardSet.createdBy && 
        flashcardSet.createdBy.toString() !== flashcardSet.user.toString() &&
        flashcardSet.createdBy.toString() !== req.userId.toString()) {
      return res.status(403).json({ error: 'Only the creator can edit this shared deck' });
    }

    if (cardIndex < 0 || cardIndex >= flashcardSet.cards.length) {
      return res.status(400).json({ error: 'Invalid card index' });
    }

    // Remove the card
    flashcardSet.cards.splice(cardIndex, 1);

    // Regenerate CSV
    flashcardSet.csvData = aiService.convertToCSV(flashcardSet.cards);

    await flashcardSet.save();

    // Log activity if user is authenticated
    if (req.userId) {
      await logActivity(req.userId, 'delete_card', { 
        deckId: flashcardSet._id,
        deckTitle: flashcardSet.title,
        cardIndex
      }, req);
    }

    res.json({
      message: 'Card deleted successfully',
      totalCards: flashcardSet.cards.length
    });
  } catch (error) {
    console.error('Error deleting card:', error);
    res.status(500).json({ error: error.message });
  }
});

// Reorder cards in a flashcard set
router.post('/:id/cards/reorder', async (req, res) => {
  try {
    const { newOrder } = req.body; // Array of indices representing the new order [0, 2, 1, 3, ...]
    
    if (!Array.isArray(newOrder)) {
      return res.status(400).json({ error: 'newOrder must be an array' });
    }

    const flashcardSet = await FlashcardSet.findById(req.params.id);
    if (!flashcardSet) {
      return res.status(404).json({ error: 'Flashcard set not found' });
    }

    // Verify ownership if user is authenticated
    if (req.userId && flashcardSet.user && flashcardSet.user.toString() !== req.userId.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // For shared decks (where createdBy exists and is different from user), only the creator can edit
    if (req.userId && flashcardSet.createdBy && 
        flashcardSet.createdBy.toString() !== flashcardSet.user.toString() &&
        flashcardSet.createdBy.toString() !== req.userId.toString()) {
      return res.status(403).json({ error: 'Only the creator can edit this shared deck' });
    }

    // Validate that all indices exist and match the current cards
    if (newOrder.length !== flashcardSet.cards.length) {
      return res.status(400).json({ error: 'Card count mismatch' });
    }

    // Validate all indices are valid
    const validIndices = newOrder.every(idx => 
      typeof idx === 'number' && idx >= 0 && idx < flashcardSet.cards.length
    );
    if (!validIndices) {
      return res.status(400).json({ error: 'Invalid indices in newOrder' });
    }

    // Check for duplicate indices
    const uniqueIndices = new Set(newOrder);
    if (uniqueIndices.size !== newOrder.length) {
      return res.status(400).json({ error: 'Duplicate indices in newOrder' });
    }

    // Reorder cards based on the provided indices
    const reorderedCards = newOrder.map(oldIndex => flashcardSet.cards[oldIndex]);

    // Update the cards array
    flashcardSet.cards = reorderedCards;

    // Regenerate CSV with new order
    flashcardSet.csvData = aiService.convertToCSV(flashcardSet.cards);

    await flashcardSet.save();

    // Log activity if user is authenticated
    if (req.userId) {
      await logActivity(req.userId, 'reorder_cards', { 
        deckId: flashcardSet._id,
        deckTitle: flashcardSet.title,
        cardCount: flashcardSet.cards.length
      }, req);
    }

    res.json({
      message: 'Cards reordered successfully',
      flashcardSet
    });
  } catch (error) {
    console.error('Error reordering cards:', error);
    res.status(500).json({ error: error.message });
  }
});

// Duplicate a flashcard set
router.post('/:id/duplicate', async (req, res) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Authentication required to duplicate decks' });
    }

    const originalSet = await FlashcardSet.findById(req.params.id).populate('folder');
    if (!originalSet) {
      return res.status(404).json({ error: 'Flashcard set not found' });
    }

    // Verify ownership
    if (originalSet.user && originalSet.user.toString() !== req.userId.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Create a duplicate with a new title
    const duplicateSet = new FlashcardSet({
      title: `${originalSet.title} (Copy)`,
      fileName: `${originalSet.fileName.replace(/\.[^/.]+$/, '')}_copy${originalSet.fileName.match(/\.[^/.]+$/) || ''}`,
      cards: originalSet.cards.map(card => ({
        question: card.question,
        answer: card.answer,
        section: card.section,
        difficulty: card.difficulty,
        questionImage: card.questionImage,
        answerImage: card.answerImage,
        questionAudio: card.questionAudio || null,
        answerAudio: card.answerAudio || null
      })),
      csvData: originalSet.csvData,
      user: req.userId,
      createdBy: req.userId, // New creator for the copy
      folder: req.body.folderId || null // Allow setting folder during duplicate
    });

    await duplicateSet.save();

    // Log activity
    await logActivity(req.userId, 'duplicate_deck', {
      originalDeckId: originalSet._id,
      originalDeckTitle: originalSet.title,
      newDeckId: duplicateSet._id,
      newDeckTitle: duplicateSet.title,
      cardCount: duplicateSet.cards.length
    }, req);

    console.log(`✅ Duplicated deck "${originalSet.title}" -> "${duplicateSet.title}" for user ${req.userId}`);
    res.json(duplicateSet);
  } catch (error) {
    console.error('❌ Error duplicating flashcard set:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get cards due for review for a specific deck
router.get('/:id/review/due', async (req, res) => {
  try {
    const flashcardSet = await FlashcardSet.findById(req.params.id).populate('folder');
    if (!flashcardSet) {
      return res.status(404).json({ error: 'Flashcard set not found' });
    }

    // Verify ownership
    if (req.userId && flashcardSet.user && flashcardSet.user.toString() !== req.userId.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get current date (start of today for consistent comparison)
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    // Filter cards that are due for review
    const dueCards = flashcardSet.cards.filter((card, index) => {
      // If card has never been reviewed, it's due
      if (!card.nextReviewDate) {
        return true;
      }
      
      // Check if next review date has passed
      const nextReview = new Date(card.nextReviewDate);
      nextReview.setHours(0, 0, 0, 0);
      return nextReview <= now;
    }).map((card, index) => {
      // Find the actual index in the full cards array
      const actualIndex = flashcardSet.cards.findIndex(c => 
        c.question === card.question && c.answer === card.answer
      );
      return {
        ...card.toObject(),
        cardIndex: actualIndex
      };
    });

    console.log(`📚 Found ${dueCards.length}/${flashcardSet.cards.length} cards due for review in deck: ${flashcardSet.title}`);

    res.json({
      deckId: flashcardSet._id,
      deckTitle: flashcardSet.title,
      totalCards: flashcardSet.cards.length,
      dueCards: dueCards,
      dueCount: dueCards.length
    });
  } catch (error) {
    console.error('Error getting due cards:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update card review status after reviewing (with adaptive algorithm)
router.post('/:id/review/update', async (req, res) => {
  try {
    const { cardIndex, difficulty, responseTime } = req.body;

    if (cardIndex === undefined || cardIndex === null) {
      return res.status(400).json({ error: 'Card index is required' });
    }

    if (!difficulty || !['easy', 'medium', 'hard'].includes(difficulty)) {
      return res.status(400).json({ error: 'Valid difficulty (easy, medium, hard) is required' });
    }

    const flashcardSet = await FlashcardSet.findById(req.params.id);
    if (!flashcardSet) {
      return res.status(404).json({ error: 'Flashcard set not found' });
    }

    // Verify ownership if user is authenticated
    if (req.userId && flashcardSet.user && flashcardSet.user.toString() !== req.userId.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // For shared decks (where createdBy exists and is different from user), only the creator can edit
    if (req.userId && flashcardSet.createdBy && 
        flashcardSet.createdBy.toString() !== flashcardSet.user.toString() &&
        flashcardSet.createdBy.toString() !== req.userId.toString()) {
      return res.status(403).json({ error: 'Only the creator can edit this shared deck' });
    }

    if (cardIndex < 0 || cardIndex >= flashcardSet.cards.length) {
      return res.status(400).json({ error: 'Invalid card index' });
    }

    const card = flashcardSet.cards[cardIndex];
    const now = new Date();

    // Track response time if provided
    if (responseTime !== undefined && responseTime !== null) {
      card.lastResponseTime = responseTime;
      if (!card.responseTimes) card.responseTimes = [];
      card.responseTimes.push(responseTime);
      // Keep only last 10 response times
      if (card.responseTimes.length > 10) {
        card.responseTimes = card.responseTimes.slice(-10);
      }
      // Calculate average response time
      card.responseTime = card.responseTimes.reduce((sum, t) => sum + t, 0) / card.responseTimes.length;
    }

    // Get user performance stats for adaptive algorithm
    const userStats = {
      overallSuccessRate: flashcardSet.performanceStats?.overallSuccessRate || 0,
      averageResponseTime: flashcardSet.performanceStats?.averageResponseTime || null
    };

    // Use adaptive algorithm to calculate review updates
    const reviewUpdate = adaptiveAlgorithm.calculateReview(card, difficulty, userStats);

    // Update card with adaptive algorithm results
    card.lastReviewDate = reviewUpdate.lastReviewDate;
    card.nextReviewDate = reviewUpdate.nextReviewDate;
    card.reviewCount = (card.reviewCount || 0) + 1;
    card.difficulty = difficulty;
    card.interval = reviewUpdate.interval;
    card.easeFactor = reviewUpdate.easeFactor;
    card.repetitions = reviewUpdate.repetitions;
    card.confidenceScore = reviewUpdate.confidenceScore;
    card.successRate = reviewUpdate.successRate;
    card.reviewLevel = reviewUpdate.reviewLevel;
    card.priority = reviewScheduler.calculatePriority(card, now);
    card.memoryDecay = adaptiveAlgorithm.calculateMemoryDecay(card, now);

    // Update deck performance stats
    if (!flashcardSet.performanceStats) {
      flashcardSet.performanceStats = {
        totalReviews: 0,
        averageResponseTime: null,
        overallSuccessRate: 0,
        lastAnalyzed: null
      };
    }
    flashcardSet.performanceStats.totalReviews += 1;
    
    // Recalculate overall success rate
    const reviewedCards = flashcardSet.cards.filter(c => c.reviewCount > 0);
    if (reviewedCards.length > 0) {
      flashcardSet.performanceStats.overallSuccessRate = 
        reviewedCards.reduce((sum, c) => sum + (c.successRate || 0), 0) / reviewedCards.length;
    }

    // Update average response time
    const cardsWithResponseTime = flashcardSet.cards.filter(c => c.responseTime);
    if (cardsWithResponseTime.length > 0) {
      flashcardSet.performanceStats.averageResponseTime = 
        cardsWithResponseTime.reduce((sum, c) => sum + c.responseTime, 0) / cardsWithResponseTime.length;
    }

    flashcardSet.performanceStats.lastAnalyzed = now;

    await flashcardSet.save();

    // Log activity if user is authenticated
    if (req.userId) {
      await logActivity(req.userId, 'review_card', {
        deckId: flashcardSet._id,
        deckTitle: flashcardSet.title,
        cardIndex,
        difficulty,
        reviewCount: flashcardSet.cards[cardIndex].reviewCount
      }, req);
    }

    console.log(`✅ Updated review for card ${cardIndex} in deck ${flashcardSet.title}: ${difficulty} (next review: ${reviewUpdate.nextReviewDate.toLocaleDateString()}, level: ${reviewUpdate.reviewLevel})`);

    res.json({
      message: 'Card review updated successfully',
      card: flashcardSet.cards[cardIndex],
      nextReviewDate: reviewUpdate.nextReviewDate,
      reviewLevel: reviewUpdate.reviewLevel,
      confidenceScore: reviewUpdate.confidenceScore,
      successRate: reviewUpdate.successRate
    });
  } catch (error) {
    console.error('Error updating card review:', error);
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
    
    // For shared decks (where createdBy exists and is different from user), only the creator can edit
    if (req.userId && flashcardSet.createdBy && 
        flashcardSet.createdBy.toString() !== flashcardSet.user.toString() &&
        flashcardSet.createdBy.toString() !== req.userId.toString()) {
      return res.status(403).json({ error: 'Only the creator can edit this shared deck' });
    }

    // Log activity before deletion
    if (req.userId) {
      await logActivity(req.userId, 'delete_deck', { 
        deckId: flashcardSet._id,
        deckTitle: flashcardSet.title,
        cardCount: flashcardSet.cards.length
      }, req);
    }
    
    await FlashcardSet.findByIdAndDelete(req.params.id);
    res.json({ message: 'Flashcard set deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get current user's ID for sharing (authentication required)
router.get('/share/my-id', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('_id name');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({ userId: user._id.toString(), name: user.name });
  } catch (error) {
    console.error('Error fetching user ID:', error);
    res.status(500).json({ error: error.message });
  }
});

// Share a deck with a user (authentication required)
router.post('/:id/share', auth, async (req, res) => {
  try {
    const { userId: recipientUserId } = req.body;
    
    if (!recipientUserId || !recipientUserId.trim()) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    
    // Get the original deck
    const originalSet = await FlashcardSet.findById(req.params.id);
    if (!originalSet) {
      return res.status(404).json({ error: 'Flashcard set not found' });
    }
    
    // Verify ownership
    if (!originalSet.user || originalSet.user.toString() !== req.userId.toString()) {
      return res.status(403).json({ error: 'You can only share your own decks' });
    }
    
    // Find recipient by ID (try both string and ObjectId)
    let recipient;
    try {
      // Try to find by MongoDB ObjectId
      recipient = await User.findById(recipientUserId.trim());
    } catch (err) {
      // If ObjectId is invalid, try finding by string match
      recipient = null;
    }
    
    if (!recipient) {
      return res.status(404).json({ error: 'User not found. Please check the User ID.' });
    }
    
    // Don't allow sharing with yourself
    if (recipient._id.toString() === req.userId.toString()) {
      return res.status(400).json({ error: 'Cannot share deck with yourself' });
    }
    
    // Find or create "shared" folder for the recipient
    const Folder = require('../models/Folder');
    let sharedFolder = await Folder.findOne({
      name: 'shared',
      user: recipient._id
    });
    
    if (!sharedFolder) {
      // Create the "shared" folder if it doesn't exist
      sharedFolder = new Folder({
        name: 'shared',
        color: '#9c27b0', // Purple color for shared folder
        icon: '🔗',
        user: recipient._id
      });
      await sharedFolder.save();
      console.log(`✅ Created "shared" folder for user ${recipient.name} (${recipient._id})`);
    }
    
    // Create a copy of the deck for the recipient
    const sharedSet = new FlashcardSet({
      title: originalSet.title,
      fileName: originalSet.fileName,
      cards: originalSet.cards.map(card => ({
        question: card.question,
        answer: card.answer,
        section: card.section,
        difficulty: card.difficulty || 'medium',
        questionImage: card.questionImage,
        answerImage: card.answerImage,
        questionAudio: card.questionAudio,
        answerAudio: card.answerAudio,
        // Reset review data for the new owner
        lastReviewDate: null,
        nextReviewDate: null,
        reviewCount: 0
      })),
      user: recipient._id,
      createdBy: req.userId, // Original creator
      folder: sharedFolder._id, // Place in "shared" folder
      processingStatus: 'completed',
      processingProgress: {
        current: originalSet.cards.length,
        total: originalSet.cards.length
      }
    });
    
    await sharedSet.save();
    
    // Log activity
    await logActivity(req.userId, 'share_deck', {
      deckId: originalSet._id,
      deckTitle: originalSet.title,
      recipientId: recipient._id.toString(),
      recipientName: recipient.name
    }, req);
    
    console.log(`✅ Deck "${originalSet.title}" shared with user ${recipient.name} (${recipient._id})`);
    
    res.json({
      message: `Deck shared successfully with ${recipient.name}`,
      sharedSet: sharedSet
    });
  } catch (error) {
    console.error('Error sharing deck:', error);
    res.status(500).json({ error: error.message });
  }
});

// Analyze deck content type and recommend objectives
router.get('/:id/analyze', auth, async (req, res) => {
  try {
    const flashcardSet = await FlashcardSet.findById(req.params.id);
    if (!flashcardSet) {
      return res.status(404).json({ error: 'Flashcard set not found' });
    }

    if (flashcardSet.user && flashcardSet.user.toString() !== req.userId.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const contentType = reviewScheduler.analyzeContentType(flashcardSet.cards);
    const recommendations = reviewScheduler.recommendObjectives(flashcardSet, contentType);

    res.json({
      contentType,
      recommendations,
      deckSize: flashcardSet.cards.length
    });
  } catch (error) {
    console.error('Error analyzing deck:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get scheduled cards for review with priority
router.get('/:id/review/scheduled', auth, async (req, res) => {
  try {
    const { timeLimit, cardLimit, mode } = req.query;
    const flashcardSet = await FlashcardSet.findById(req.params.id);
    
    if (!flashcardSet) {
      return res.status(404).json({ error: 'Flashcard set not found' });
    }

    if (flashcardSet.user && flashcardSet.user.toString() !== req.userId.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const constraints = {
      timeLimit: timeLimit ? parseInt(timeLimit) : null,
      cardLimit: cardLimit ? parseInt(cardLimit) : null,
      priorityThreshold: 0
    };

    // Apply mode-specific constraints
    if (mode === 'quick') {
      constraints.timeLimit = 10;
      constraints.cardLimit = 20;
    } else if (mode === 'focus') {
      constraints.timeLimit = 30;
      constraints.cardLimit = 50;
    } else if (mode === 'nightly') {
      constraints.timeLimit = 15;
      constraints.cardLimit = 30;
    }

    const schedule = reviewScheduler.scheduleCards(flashcardSet.cards, constraints);

    res.json(schedule);
  } catch (error) {
    console.error('Error scheduling cards:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get performance analytics for a deck
router.get('/:id/analytics', auth, async (req, res) => {
  try {
    const flashcardSet = await FlashcardSet.findById(req.params.id);
    if (!flashcardSet) {
      return res.status(404).json({ error: 'Flashcard set not found' });
    }

    if (flashcardSet.user && flashcardSet.user.toString() !== req.userId.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const metrics = performanceAnalytics.calculateDeckMetrics(flashcardSet);
    const progressReport = performanceAnalytics.generateProgressReport(flashcardSet);

    res.json({
      metrics,
      progressReport
    });
  } catch (error) {
    console.error('Error getting analytics:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get user-wide performance analytics
router.get('/analytics/user', auth, async (req, res) => {
  try {
    const flashcardSets = await FlashcardSet.find({ user: req.userId });
    const userMetrics = performanceAnalytics.calculateUserMetrics(flashcardSets);

    res.json(userMetrics);
  } catch (error) {
    console.error('Error getting user analytics:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update deck review objectives
router.put('/:id/objectives', auth, async (req, res) => {
  try {
    const { goal, dailyTimeLimit, dailyCardLimit, skillLevel } = req.body;
    const flashcardSet = await FlashcardSet.findById(req.params.id);
    
    if (!flashcardSet) {
      return res.status(404).json({ error: 'Flashcard set not found' });
    }

    if (flashcardSet.user && flashcardSet.user.toString() !== req.userId.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (!flashcardSet.reviewObjectives) {
      flashcardSet.reviewObjectives = {};
    }

    if (goal) flashcardSet.reviewObjectives.goal = goal;
    if (dailyTimeLimit !== undefined) flashcardSet.reviewObjectives.dailyTimeLimit = dailyTimeLimit;
    if (dailyCardLimit !== undefined) flashcardSet.reviewObjectives.dailyCardLimit = dailyCardLimit;
    if (skillLevel) flashcardSet.reviewObjectives.skillLevel = skillLevel;

    await flashcardSet.save();

    res.json({
      message: 'Review objectives updated successfully',
      reviewObjectives: flashcardSet.reviewObjectives
    });
  } catch (error) {
    console.error('Error updating objectives:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

