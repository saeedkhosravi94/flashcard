/**
 * Adaptive Spaced Repetition Algorithm
 * Dynamically adjusts parameters based on user performance
 */

class AdaptiveAlgorithm {
  /**
   * Enhanced G5 algorithm with adaptive parameters
   */
  calculateReview(card, difficulty, userStats = {}) {
    const now = new Date();
    
    // Map difficulty to quality (1-5 scale)
    const qualityMap = {
      'hard': 1,
      'medium': 3,
      'easy': 5
    };
    const quality = qualityMap[difficulty] || 3;

    // Get current card state
    let easeFactor = card.easeFactor || 2.5;
    let interval = card.interval || 0;
    let repetitions = card.repetitions || 0;
    let confidenceScore = card.confidenceScore || 0.5;
    let successRate = card.successRate || 0;

    // Adaptive parameters based on user performance
    const adaptiveParams = this.getAdaptiveParameters(userStats, card);

    // Calculate new interval and ease factor
    if (quality >= 3) {
      // Correct response
      if (repetitions === 0) {
        interval = 1;
      } else if (repetitions === 1) {
        interval = 6;
      } else {
        // Apply adaptive multiplier
        interval = Math.round(interval * easeFactor * adaptiveParams.intervalMultiplier);
      }
      repetitions += 1;

      // Update ease factor with adaptive adjustments
      if (quality === 5) {
        easeFactor = Math.max(1.3, easeFactor + (0.15 * adaptiveParams.easeFactorGain));
      } else if (quality === 3) {
        easeFactor = Math.max(1.3, easeFactor - (0.05 * adaptiveParams.easeFactorLoss));
      }

      // Update confidence and success rate
      confidenceScore = Math.min(1, confidenceScore + (0.1 * adaptiveParams.confidenceGain));
      successRate = this.updateSuccessRate(successRate, true, userStats);
    } else {
      // Incorrect response
      repetitions = 0;
      interval = 1;
      easeFactor = Math.max(1.3, easeFactor - (0.2 * adaptiveParams.easeFactorLoss));
      confidenceScore = Math.max(0, confidenceScore - 0.2);
      successRate = this.updateSuccessRate(successRate, false, userStats);
    }

    // Calculate next review date
    const nextReviewDate = new Date(now);
    nextReviewDate.setDate(nextReviewDate.getDate() + interval);

    // Calculate review level (0-10 scale)
    const reviewLevel = this.calculateReviewLevel(repetitions, confidenceScore, successRate);

    return {
      interval,
      easeFactor,
      repetitions,
      nextReviewDate,
      confidenceScore,
      successRate,
      reviewLevel,
      lastReviewDate: now
    };
  }

  /**
   * Get adaptive parameters based on user performance
   */
  getAdaptiveParameters(userStats, card) {
    const params = {
      intervalMultiplier: 1.0,
      easeFactorGain: 1.0,
      easeFactorLoss: 1.0,
      confidenceGain: 1.0
    };

    // Adjust based on overall success rate
    if (userStats.overallSuccessRate !== undefined) {
      if (userStats.overallSuccessRate > 0.8) {
        // High success rate: can increase intervals
        params.intervalMultiplier = 1.1;
        params.easeFactorGain = 1.2;
      } else if (userStats.overallSuccessRate < 0.6) {
        // Low success rate: decrease intervals
        params.intervalMultiplier = 0.9;
        params.easeFactorLoss = 1.2;
      }
    }

    // Adjust based on content type
    if (card.contentType === 'formula') {
      // Formulas need more frequent review
      params.intervalMultiplier *= 0.9;
    } else if (card.contentType === 'vocabulary') {
      // Vocabulary can have longer intervals
      params.intervalMultiplier *= 1.1;
    }

    // Adjust based on response time
    if (card.lastResponseTime) {
      const avgResponseTime = userStats.averageResponseTime || 5000; // 5 seconds default
      if (card.lastResponseTime > avgResponseTime * 1.5) {
        // Slow response: decrease intervals
        params.intervalMultiplier *= 0.95;
      }
    }

    return params;
  }

  /**
   * Update success rate using exponential moving average
   */
  updateSuccessRate(currentRate, isCorrect, userStats) {
    const alpha = 0.1; // Smoothing factor
    const newValue = isCorrect ? 1 : 0;
    return currentRate * (1 - alpha) + newValue * alpha;
  }

  /**
   * Calculate review level (0-10 scale)
   */
  calculateReviewLevel(repetitions, confidenceScore, successRate) {
    // Base level from repetitions
    let level = Math.min(5, repetitions * 1.5);
    
    // Adjust based on confidence
    level += confidenceScore * 3;
    
    // Adjust based on success rate
    level += successRate * 2;
    
    return Math.min(10, Math.max(0, Math.round(level)));
  }

  /**
   * Calculate memory decay over time
   */
  calculateMemoryDecay(card, now = new Date()) {
    if (!card.lastReviewDate) {
      return 0.5;
    }

    const daysSinceReview = (now - new Date(card.lastReviewDate)) / (1000 * 60 * 60 * 24);
    const interval = card.interval || 1;
    const decayRate = 0.15; // 15% decay per interval period
    
    return Math.min(1, (daysSinceReview / interval) * decayRate);
  }
}

module.exports = new AdaptiveAlgorithm();

