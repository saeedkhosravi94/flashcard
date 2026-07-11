const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const User = require('../models/User');
const FlashcardSet = require('../models/FlashcardSet');
const ActivityLog = require('../models/ActivityLog');
const adminAuth = require('../middleware/adminAuth');

// Admin Login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const admin = await Admin.findOne({ username });
    
    if (!admin || !admin.isActive) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isMatch = await admin.comparePassword(password);
    
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Update last login
    admin.lastLogin = new Date();
    await admin.save();

    // Create token
    const token = jwt.sign(
      { 
        adminId: admin._id,
        isAdmin: true,
        role: admin.role
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    res.json({
      token,
      admin: {
        id: admin._id,
        username: admin.username,
        email: admin.email,
        role: admin.role
      }
    });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Get Dashboard Statistics
router.get('/dashboard/stats', adminAuth, async (req, res) => {
  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Total counts
    const totalUsers = await User.countDocuments();
    const totalDecks = await FlashcardSet.countDocuments();
    const totalCards = await FlashcardSet.aggregate([
      { $unwind: '$cards' },
      { $count: 'total' }
    ]);

    // Active users (logged in within last 7 days)
    const activeUsers = await ActivityLog.distinct('user', {
      action: 'login',
      timestamp: { $gte: sevenDaysAgo }
    });

    // New users this month
    const newUsersThisMonth = await User.countDocuments({
      createdAt: { $gte: thirtyDaysAgo }
    });

    // Daily active users
    const dailyActiveUsers = await ActivityLog.distinct('user', {
      timestamp: { $gte: oneDayAgo }
    });

    // Activity stats
    const activityStats = await ActivityLog.aggregate([
      {
        $match: {
          timestamp: { $gte: thirtyDaysAgo }
        }
      },
      {
        $group: {
          _id: '$action',
          count: { $sum: 1 }
        }
      }
    ]);

    res.json({
      overview: {
        totalUsers,
        totalDecks,
        totalCards: totalCards[0]?.total || 0,
        activeUsersCount: activeUsers.length,
        newUsersThisMonth,
        dailyActiveUsersCount: dailyActiveUsers.length
      },
      activityStats: activityStats.reduce((acc, stat) => {
        acc[stat._id] = stat.count;
        return acc;
      }, {})
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard statistics' });
  }
});

// Get User Activity Chart Data
router.get('/dashboard/user-activity', adminAuth, async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const daysAgo = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const activityData = await ActivityLog.aggregate([
      {
        $match: {
          timestamp: { $gte: daysAgo }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$timestamp' }
          },
          logins: {
            $sum: { $cond: [{ $eq: ['$action', 'login'] }, 1, 0] }
          },
          decksCreated: {
            $sum: { $cond: [{ $eq: ['$action', 'create_deck'] }, 1, 0] }
          },
          cardsAdded: {
            $sum: { $cond: [{ $eq: ['$action', 'add_card'] }, 1, 0] }
          },
          totalActivities: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    res.json(activityData);
  } catch (error) {
    console.error('User activity chart error:', error);
    res.status(500).json({ error: 'Failed to fetch user activity data' });
  }
});

// Get All Users with Stats
router.get('/users', adminAuth, async (req, res) => {
  try {
    const { page = 1, limit = 20, search = '' } = req.query;
    const skip = (page - 1) * limit;

    const searchQuery = search ? {
      $or: [
        { email: { $regex: search, $options: 'i' } },
        { username: { $regex: search, $options: 'i' } }
      ]
    } : {};

    const users = await User.find(searchQuery)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await User.countDocuments(searchQuery);

    // Get deck and card counts for each user
    const usersWithStats = await Promise.all(
      users.map(async (user) => {
        const deckCount = await FlashcardSet.countDocuments({ user: user._id });
        
        const cardCount = await FlashcardSet.aggregate([
          { $match: { user: user._id } },
          { $unwind: '$cards' },
          { $count: 'total' }
        ]);

        const lastActivity = await ActivityLog.findOne({ user: user._id })
          .sort({ timestamp: -1 })
          .select('timestamp action');

        return {
          ...user.toObject(),
          stats: {
            deckCount,
            cardCount: cardCount[0]?.total || 0,
            lastActivity: lastActivity || null
          }
        };
      })
    );

    res.json({
      users: usersWithStats,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Get User Details
router.get('/users/:userId', adminAuth, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).select('-password');
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get user's decks
    const decks = await FlashcardSet.find({ user: user._id })
      .select('title cards createdAt')
      .sort({ createdAt: -1 });

    // Get user's recent activities
    const activities = await ActivityLog.find({ user: user._id })
      .sort({ timestamp: -1 })
      .limit(50);

    // Get user stats
    const totalCards = decks.reduce((sum, deck) => sum + deck.cards.length, 0);

    res.json({
      user: user.toObject(),
      stats: {
        deckCount: decks.length,
        cardCount: totalCards,
        activities: activities.length
      },
      decks,
      recentActivities: activities
    });
  } catch (error) {
    console.error('Get user details error:', error);
    res.status(500).json({ error: 'Failed to fetch user details' });
  }
});

// Get IP Address Statistics
router.get('/dashboard/ip-stats', adminAuth, async (req, res) => {
  try {
    const { days = 7 } = req.query;
    const daysAgo = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const ipStats = await ActivityLog.aggregate([
      {
        $match: {
          timestamp: { $gte: daysAgo },
          ipAddress: { $exists: true, $ne: null }
        }
      },
      {
        $group: {
          _id: '$ipAddress',
          count: { $sum: 1 },
          uniqueUsers: { $addToSet: '$user' },
          lastActivity: { $max: '$timestamp' }
        }
      },
      {
        $project: {
          ipAddress: '$_id',
          activityCount: '$count',
          uniqueUserCount: { $size: '$uniqueUsers' },
          lastActivity: 1,
          _id: 0
        }
      },
      {
        $sort: { activityCount: -1 }
      },
      {
        $limit: 50
      }
    ]);

    res.json(ipStats);
  } catch (error) {
    console.error('IP stats error:', error);
    res.status(500).json({ error: 'Failed to fetch IP statistics' });
  }
});

// Get Recent Activities
router.get('/activities', adminAuth, async (req, res) => {
  try {
    const { page = 1, limit = 50, action = '', userId = '' } = req.query;
    const skip = (page - 1) * limit;

    const query = {};
    if (action) query.action = action;
    if (userId) query.user = userId;

    const activities = await ActivityLog.find(query)
      .populate('user', 'email username')
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await ActivityLog.countDocuments(query);

    res.json({
      activities,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get activities error:', error);
    res.status(500).json({ error: 'Failed to fetch activities' });
  }
});

// Get Top Users by Activity
router.get('/dashboard/top-users', adminAuth, async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const topUsers = await ActivityLog.aggregate([
      {
        $group: {
          _id: '$user',
          activityCount: { $sum: 1 },
          lastActivity: { $max: '$timestamp' }
        }
      },
      {
        $sort: { activityCount: -1 }
      },
      {
        $limit: parseInt(limit)
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      {
        $unwind: '$user'
      },
      {
        $project: {
          userId: '$_id',
          email: '$user.email',
          username: '$user.username',
          activityCount: 1,
          lastActivity: 1,
          _id: 0
        }
      }
    ]);

    res.json(topUsers);
  } catch (error) {
    console.error('Top users error:', error);
    res.status(500).json({ error: 'Failed to fetch top users' });
  }
});

// Get All Decks with User Information
router.get('/decks', adminAuth, async (req, res) => {
  try {
    const { page = 1, limit = 20, search = '' } = req.query;
    const skip = (page - 1) * limit;

    const searchQuery = search ? {
      $or: [
        { title: { $regex: search, $options: 'i' } },
        { fileName: { $regex: search, $options: 'i' } }
      ]
    } : {};

    const decks = await FlashcardSet.find(searchQuery)
      .populate('user', 'email username name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await FlashcardSet.countDocuments(searchQuery);

    const decksWithStats = decks.map(deck => ({
      _id: deck._id,
      title: deck.title,
      fileName: deck.fileName,
      cardCount: deck.cards.length,
      user: deck.user ? {
        _id: deck.user._id,
        email: deck.user.email,
        username: deck.user.username || null,
        name: deck.user.name || null
      } : null,
      createdAt: deck.createdAt,
      folder: deck.folder || null,
      folderName: deck.folderName || null
    }));

    res.json({
      decks: decksWithStats,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get decks error:', error);
    res.status(500).json({ error: 'Failed to fetch decks' });
  }
});

// Update Deck (Admin)
router.patch('/decks/:deckId', adminAuth, async (req, res) => {
  try {
    const { title } = req.body;
    
    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Title is required' });
    }

    const deck = await FlashcardSet.findById(req.params.deckId);
    
    if (!deck) {
      return res.status(404).json({ error: 'Deck not found' });
    }

    deck.title = title.trim();
    await deck.save();

    res.json({
      message: 'Deck updated successfully',
      deck: {
        _id: deck._id,
        title: deck.title,
        cardCount: deck.cards.length
      }
    });
  } catch (error) {
    console.error('Update deck error:', error);
    res.status(500).json({ error: 'Failed to update deck' });
  }
});

// Delete Deck (Admin)
router.delete('/decks/:deckId', adminAuth, async (req, res) => {
  try {
    const deck = await FlashcardSet.findById(req.params.deckId);
    
    if (!deck) {
      return res.status(404).json({ error: 'Deck not found' });
    }

    await FlashcardSet.findByIdAndDelete(req.params.deckId);

    res.json({
      message: 'Deck deleted successfully',
      deckId: req.params.deckId
    });
  } catch (error) {
    console.error('Delete deck error:', error);
    res.status(500).json({ error: 'Failed to delete deck' });
  }
});

module.exports = router;

