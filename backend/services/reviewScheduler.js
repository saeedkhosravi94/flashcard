/**
 * Advanced Review Scheduler Service
 * Implements intelligent scheduling with priority, time management, and adaptive learning
 */

class ReviewScheduler {
  /**
   * Calculate priority score for a card
   * Higher priority = more urgent review needed
   */
  calculatePriority(card, now = new Date()) {
    let priority = 0;

    // Base priority: time since last review (more overdue = higher priority)
    if (card.lastReviewDate) {
      const daysSinceReview = Math.floor((now - new Date(card.lastReviewDate)) / (1000 * 60 * 60 * 24));
      priority += daysSinceReview * 10;
    } else {
      // Never reviewed = highest priority
      priority += 100;
    }

    // Overdue cards get extra priority
    if (card.nextReviewDate) {
      const nextReview = new Date(card.nextReviewDate);
      if (nextReview < now) {
        const daysOverdue = Math.floor((now - nextReview) / (1000 * 60 * 60 * 24));
        priority += daysOverdue * 20;
      }
    }

    // Low confidence = higher priority
    if (card.confidenceScore !== undefined) {
      priority += (1 - card.confidenceScore) * 30;
    }

    // Low success rate = higher priority
    if (card.successRate !== undefined) {
      priority += (1 - card.successRate) * 25;
    }

    // Low review level = higher priority
    if (card.reviewLevel !== undefined) {
      priority += (10 - card.reviewLevel) * 5;
    }

    // Memory decay factor
    if (card.memoryDecay !== undefined) {
      priority += card.memoryDecay * 15;
    }

    return Math.round(priority);
  }

  /**
   * Calculate memory decay based on time since last review
   */
  calculateMemoryDecay(card, now = new Date()) {
    if (!card.lastReviewDate || !card.confidenceScore) {
      return 0.5; // Default decay for unreviewed cards
    }

    const daysSinceReview = (now - new Date(card.lastReviewDate)) / (1000 * 60 * 60 * 24);
    const interval = card.interval || 1;
    
    // Decay increases if review is overdue
    if (card.nextReviewDate && new Date(card.nextReviewDate) < now) {
      const daysOverdue = (now - new Date(card.nextReviewDate)) / (1000 * 60 * 60 * 24);
      return Math.min(1, 0.3 + (daysOverdue / interval) * 0.7);
    }

    // Normal decay based on interval
    const decayRate = 0.1; // 10% decay per interval period
    return Math.min(1, (daysSinceReview / interval) * decayRate);
  }

  /**
   * Schedule cards for review based on priority and constraints
   */
  scheduleCards(cards, constraints = {}) {
    const {
      timeLimit = null, // minutes
      cardLimit = null, // max cards
      priorityThreshold = 0 // minimum priority to include
    } = constraints;

    const now = new Date();
    
    // Calculate priority and memory decay for each card
    const cardsWithPriority = cards.map(card => {
      const priority = this.calculatePriority(card, now);
      const memoryDecay = this.calculateMemoryDecay(card, now);
      
      // Update card's priority and memory decay
      card.priority = priority;
      card.memoryDecay = memoryDecay;

      return {
        card,
        priority,
        memoryDecay,
        urgency: priority + (memoryDecay * 50)
      };
    });

    // Sort by urgency (highest first)
    cardsWithPriority.sort((a, b) => b.urgency - a.urgency);

    // Filter by priority threshold
    let scheduled = cardsWithPriority
      .filter(item => item.priority >= priorityThreshold)
      .map(item => item.card);

    // Apply card limit
    if (cardLimit && scheduled.length > cardLimit) {
      scheduled = scheduled.slice(0, cardLimit);
    }

    // Estimate time needed (average 30 seconds per card)
    const estimatedTime = scheduled.length * 0.5; // minutes
    if (timeLimit && estimatedTime > timeLimit) {
      // Reduce cards to fit time limit
      const maxCards = Math.floor(timeLimit / 0.5);
      scheduled = scheduled.slice(0, maxCards);
    }

    return {
      scheduled,
      totalCards: cards.length,
      scheduledCount: scheduled.length,
      estimatedTime: scheduled.length * 0.5,
      averagePriority: cardsWithPriority.length > 0 
        ? cardsWithPriority.reduce((sum, item) => sum + item.priority, 0) / cardsWithPriority.length 
        : 0
    };
  }

  /**
   * Analyze content type of a deck
   */
  analyzeContentType(cards) {
    const typeIndicators = {
      vocabulary: ['word', 'term', 'definition', 'meaning', 'synonym'],
      formula: ['=', 'formula', 'equation', 'calculate', 'solve'],
      definition: ['define', 'definition', 'what is', 'meaning of'],
      concept: ['explain', 'describe', 'how', 'why', 'concept'],
      fact: ['when', 'where', 'who', 'date', 'year']
    };

    const typeScores = {};
    let totalScore = 0;

    cards.forEach(card => {
      const text = `${card.question} ${card.answer}`.toLowerCase();
      
      Object.keys(typeIndicators).forEach(type => {
        const score = typeIndicators[type].reduce((sum, indicator) => {
          return sum + (text.includes(indicator) ? 1 : 0);
        }, 0);
        
        typeScores[type] = (typeScores[type] || 0) + score;
        totalScore += score;
      });
    });

    // Find dominant type
    let dominantType = 'other';
    let maxScore = 0;
    Object.keys(typeScores).forEach(type => {
      if (typeScores[type] > maxScore) {
        maxScore = typeScores[type];
        dominantType = type;
      }
    });

    return {
      dominantType,
      typeDistribution: typeScores,
      confidence: totalScore > 0 ? maxScore / totalScore : 0
    };
  }

  /**
   * Recommend review objectives based on deck analysis
   */
  recommendObjectives(deck, contentType) {
    const recommendations = {
      goal: 'long-term-retention',
      dailyTimeLimit: 30,
      dailyCardLimit: 50,
      skillLevel: 'intermediate'
    };

    // Adjust based on content type
    if (contentType.dominantType === 'vocabulary') {
      recommendations.goal = 'gradual-learning';
      recommendations.dailyCardLimit = 30;
    } else if (contentType.dominantType === 'formula') {
      recommendations.goal = 'quick-mastery';
      recommendations.dailyTimeLimit = 45;
    } else if (contentType.dominantType === 'definition') {
      recommendations.goal = 'long-term-retention';
    }

    // Adjust based on deck size
    const cardCount = deck.cards?.length || 0;
    if (cardCount > 200) {
      recommendations.dailyCardLimit = Math.min(recommendations.dailyCardLimit, 40);
    } else if (cardCount < 50) {
      recommendations.dailyCardLimit = Math.min(recommendations.dailyCardLimit, 30);
    }

    return recommendations;
  }
}

module.exports = new ReviewScheduler();

