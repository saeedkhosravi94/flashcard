const mongoose = require('mongoose');

const flashcardSchema = new mongoose.Schema({
  question: {
    type: String,
    required: true
  },
  answer: {
    type: String,
    required: true
  },
  questionImage: {
    type: String,
    default: null
  },
  answerImage: {
    type: String,
    default: null
  },
  questionAudio: {
    type: String,
    default: null
  },
  answerAudio: {
    type: String,
    default: null
  },
  section: {
    type: String,
    default: 'General'
  },
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    default: 'medium'
  },
  // Active Recall / Spaced Repetition fields (G5 Algorithm)
  lastReviewDate: {
    type: Date,
    default: null
  },
  nextReviewDate: {
    type: Date,
    default: null
  },
  reviewCount: {
    type: Number,
    default: 0
  },
  interval: {
    type: Number,
    default: 0 // Days until next review
  },
  easeFactor: {
    type: Number,
    default: 2.5 // Starting ease factor for G5 algorithm
  },
  repetitions: {
    type: Number,
    default: 0 // Number of successful consecutive reviews
  },
  // Advanced Spaced Repetition fields
  tags: {
    type: [String],
    default: []
  },
  contentType: {
    type: String,
    enum: ['vocabulary', 'formula', 'definition', 'visual', 'concept', 'fact', 'other'],
    default: 'other'
  },
  reviewLevel: {
    type: Number,
    default: 0 // 0-10 scale, higher = more mastered
  },
  confidenceScore: {
    type: Number,
    default: 0.5 // 0-1 scale, confidence in recall
  },
  responseTime: {
    type: Number,
    default: null // Average response time in milliseconds
  },
  responseTimes: {
    type: [Number],
    default: [] // History of response times
  },
  successRate: {
    type: Number,
    default: 0 // 0-1 scale, percentage of correct answers
  },
  lastResponseTime: {
    type: Number,
    default: null // Last response time in milliseconds
  },
  priority: {
    type: Number,
    default: 0 // Higher priority = more urgent review
  },
  memoryDecay: {
    type: Number,
    default: 0 // Memory decay factor over time
  }
});

const flashcardSetSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  fileName: {
    type: String,
    required: true
  },
  cards: [flashcardSchema],
  csvData: {
    type: String
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false // Make it optional for backward compatibility
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null // Original creator (for shared decks)
  },
  folder: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Folder',
    default: null
  },
  folderName: {
    type: String,
    default: null // For backward compatibility with auto-grouping
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  // Background processing fields
  processingStatus: {
    type: String,
    enum: ['completed', 'processing', 'failed'],
    default: 'completed' // For backward compatibility
  },
  processingProgress: {
    current: {
      type: Number,
      default: 0
    },
    total: {
      type: Number,
      default: 0
    },
    message: {
      type: String,
      default: ''
    }
  },
  processingError: {
    type: String,
    default: null
  },
  // Review objectives and settings
  reviewObjectives: {
    goal: {
      type: String,
      enum: ['long-term-retention', 'exam-prep', 'gradual-learning', 'quick-mastery'],
      default: 'long-term-retention'
    },
    dailyTimeLimit: {
      type: Number,
      default: null // Minutes per day
    },
    dailyCardLimit: {
      type: Number,
      default: null // Max cards per day
    },
    skillLevel: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced'],
      default: 'intermediate'
    }
  },
  // Performance analytics
  performanceStats: {
    totalReviews: {
      type: Number,
      default: 0
    },
    averageResponseTime: {
      type: Number,
      default: null
    },
    overallSuccessRate: {
      type: Number,
      default: 0
    },
    lastAnalyzed: {
      type: Date,
      default: null
    }
  }
});

module.exports = mongoose.model('FlashcardSet', flashcardSetSchema);

