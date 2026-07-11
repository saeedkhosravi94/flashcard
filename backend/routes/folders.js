const express = require('express');
const router = express.Router();
const Folder = require('../models/Folder');
const FlashcardSet = require('../models/FlashcardSet');
const { optionalAuth } = require('../middleware/auth');
const { logActivity } = require('../utils/activityLogger');

// Apply optional auth to all routes
router.use(optionalAuth);

// Get all folders for the current user
router.get('/', async (req, res) => {
  try {
    if (!req.userId) {
      return res.json([]);
    }
    
    console.log('📁 GET /api/folders - UserID:', req.userId);
    const folders = await Folder.find({ user: req.userId })
      .populate('user', '_id email name')
      .sort({ order: 1, name: 1 });
    console.log('📁 Found', folders.length, 'folders for user:', req.userId);
    res.json(folders);
  } catch (error) {
    console.error('❌ Error fetching folders:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create a new folder (authentication required)
router.post('/', async (req, res) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Authentication required to create folders' });
    }

    const { name, color, icon } = req.body;
    console.log('📁 POST /api/folders - Creating folder:', name, 'UserID:', req.userId);
    
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Folder name is required' });
    }

    // Check if folder with same name already exists for this user
    const existingFolder = await Folder.findOne({
      name: name.trim(),
      user: req.userId
    });

    if (existingFolder) {
      console.log('❌ Folder already exists:', name);
      return res.status(400).json({ error: 'A folder with this name already exists' });
    }

    const folder = new Folder({
      name: name.trim(),
      color: color || '#007acc',
      icon: icon || '📁',
      user: req.userId
    });

    await folder.save();
    console.log('✅ Folder created:', folder._id, folder.name, 'for user:', req.userId);

    // Log activity
    await logActivity(req.userId, 'create_folder', { 
      folderId: folder._id,
      folderName: folder.name
    }, req);

    res.status(201).json(folder);
  } catch (error) {
    console.error('❌ Error creating folder:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update a folder
router.patch('/:id', async (req, res) => {
  try {
    const { name, color, icon, order } = req.body;
    
    const folder = await Folder.findById(req.params.id);
    
    if (!folder) {
      return res.status(404).json({ error: 'Folder not found' });
    }
    
    // Verify ownership
    if (!req.userId || !folder.user || folder.user.toString() !== req.userId.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const oldName = folder.name;

    if (name !== undefined) folder.name = name.trim();
    if (color !== undefined) folder.color = color;
    if (icon !== undefined) folder.icon = icon;
    if (order !== undefined) folder.order = order;

    await folder.save();

    // Log activity if user is authenticated
    if (req.userId) {
      await logActivity(req.userId, 'update_folder', { 
        folderId: folder._id,
        oldName: oldName,
        newName: folder.name
      }, req);
    }

    res.json(folder);
  } catch (error) {
    console.error('Error updating folder:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete a folder (and all its flashcard sets)
router.delete('/:id', async (req, res) => {
  try {
    const folder = await Folder.findById(req.params.id);
    
    if (!folder) {
      return res.status(404).json({ error: 'Folder not found' });
    }
    
    // Verify ownership
    if (!req.userId || !folder.user || folder.user.toString() !== req.userId.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Find all flashcard sets in this folder
    const flashcardSets = await FlashcardSet.find({ folder: folder._id });
    const flashcardSetsCount = flashcardSets.length;
    
    console.log(`🗑️ Deleting folder "${folder.name}" with ${flashcardSetsCount} deck(s)`);

    // Delete all flashcard sets in the folder
    if (flashcardSetsCount > 0) {
      await FlashcardSet.deleteMany({ folder: folder._id });
      
      // Log deletion of each deck if user is authenticated
      if (req.userId) {
        for (const flashcardSet of flashcardSets) {
          await logActivity(req.userId, 'delete_deck', { 
            deckId: flashcardSet._id,
            deckTitle: flashcardSet.title,
            cardCount: flashcardSet.cards.length,
            deletedWithFolder: folder.name
          }, req);
        }
      }
      
      console.log(`✅ Deleted ${flashcardSetsCount} deck(s) from folder`);
    }

    // Delete the folder
    await Folder.findByIdAndDelete(req.params.id);

    // Log activity if user is authenticated
    if (req.userId) {
      await logActivity(req.userId, 'delete_folder', { 
        folderId: folder._id,
        folderName: folder.name,
        decksDeleted: flashcardSetsCount
      }, req);
    }

    console.log(`✅ Folder "${folder.name}" deleted successfully`);

    res.json({ 
      message: 'Folder deleted successfully',
      decksDeleted: flashcardSetsCount 
    });
  } catch (error) {
    console.error('Error deleting folder:', error);
    res.status(500).json({ error: error.message });
  }
});

// Move flashcard set to folder
router.post('/:folderId/add-deck/:deckId', async (req, res) => {
  try {
    const { folderId, deckId } = req.params;
    
    const folder = await Folder.findById(folderId);
    const flashcardSet = await FlashcardSet.findById(deckId);
    
    if (!folder) {
      return res.status(404).json({ error: 'Folder not found' });
    }
    
    if (!flashcardSet) {
      return res.status(404).json({ error: 'Flashcard set not found' });
    }
    
    // Verify ownership
    if (!req.userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    if (folder.user && folder.user.toString() !== req.userId.toString()) {
      return res.status(403).json({ error: 'Access denied to folder' });
    }
    if (flashcardSet.user && flashcardSet.user.toString() !== req.userId.toString()) {
      return res.status(403).json({ error: 'Access denied to flashcard set' });
    }

    flashcardSet.folder = folder._id;
    flashcardSet.folderName = folder.name;
    await flashcardSet.save();

    // Log activity if user is authenticated
    if (req.userId) {
      await logActivity(req.userId, 'move_deck_to_folder', { 
        deckId: flashcardSet._id,
        deckTitle: flashcardSet.title,
        folderId: folder._id,
        folderName: folder.name
      }, req);
    }

    res.json({ message: 'Flashcard set moved to folder successfully', flashcardSet });
  } catch (error) {
    console.error('Error moving flashcard set:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

