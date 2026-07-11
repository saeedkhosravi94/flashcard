/**
 * Performance Analytics Service
 * Tracks and analyzes user performance for adaptive learning
 */

class PerformanceAnalytics {
  /**
   * Calculate performance metrics for a deck
   */
  calculateDeckMetrics(deck) {
    const cards = deck.cards || [];
    const totalCards = cards.length;
    
    if (totalCards === 0) {
      return this.getEmptyMetrics();
    }

    // Calculate averages
    const reviewedCards = cards.filter(c => c.reviewCount > 0);
    const reviewedCount = reviewedCards.length;
    
    const avgSuccessRate = reviewedCards.length > 0
      ? reviewedCards.reduce((sum, c) => sum + (c.successRate || 0), 0) / reviewedCards.length
      : 0;

    const avgConfidence = reviewedCards.length > 0
      ? reviewedCards.reduce((sum, c) => sum + (c.confidenceScore || 0), 0) / reviewedCards.length
      : 0;

    const avgReviewLevel = reviewedCards.length > 0
      ? reviewedCards.reduce((sum, c) => sum + (c.reviewLevel || 0), 0) / reviewedCards.length
      : 0;

    // Calculate response time metrics
    const cardsWithResponseTime = reviewedCards.filter(c => c.lastResponseTime);
    const avgResponseTime = cardsWithResponseTime.length > 0
      ? cardsWithResponseTime.reduce((sum, c) => sum + c.lastResponseTime, 0) / cardsWithResponseTime.length
      : null;

    // Count due cards
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    
    const dueCards = cards.filter(card => {
      if (!card.nextReviewDate) return true;
      const nextReview = new Date(card.nextReviewDate);
      nextReview.setHours(0, 0, 0, 0);
      return nextReview <= now;
    }).length;

    // Calculate mastery distribution
    const masteryDistribution = {
      beginner: cards.filter(c => (c.reviewLevel || 0) < 3).length,
      intermediate: cards.filter(c => (c.reviewLevel || 0) >= 3 && (c.reviewLevel || 0) < 7).length,
      advanced: cards.filter(c => (c.reviewLevel || 0) >= 7).length
    };

    // Identify weak areas (low success rate cards)
    const weakCards = reviewedCards
      .filter(c => (c.successRate || 0) < 0.5)
      .sort((a, b) => (a.successRate || 0) - (b.successRate || 0))
      .slice(0, 10)
      .map(c => ({
        question: c.question.substring(0, 50),
        successRate: c.successRate || 0,
        reviewLevel: c.reviewLevel || 0
      }));

    return {
      totalCards,
      reviewedCount,
      unreviewedCount: totalCards - reviewedCount,
      dueCards,
      avgSuccessRate: Math.round(avgSuccessRate * 100) / 100,
      avgConfidence: Math.round(avgConfidence * 100) / 100,
      avgReviewLevel: Math.round(avgReviewLevel * 10) / 10,
      avgResponseTime: avgResponseTime ? Math.round(avgResponseTime) : null,
      masteryDistribution,
      weakCards,
      completionRate: totalCards > 0 ? (reviewedCount / totalCards) : 0
    };
  }

  /**
   * Calculate user-wide performance metrics
   */
  calculateUserMetrics(decks) {
    const allCards = decks.flatMap(deck => (deck.cards || []).map(card => ({
      ...card,
      deckId: deck._id,
      deckTitle: deck.title
    })));

    const reviewedCards = allCards.filter(c => c.reviewCount > 0);
    
    if (reviewedCards.length === 0) {
      return this.getEmptyMetrics();
    }

    const overallSuccessRate = reviewedCards.reduce((sum, c) => sum + (c.successRate || 0), 0) / reviewedCards.length;
    
    const cardsWithResponseTime = reviewedCards.filter(c => c.lastResponseTime);
    const avgResponseTime = cardsWithResponseTime.length > 0
      ? cardsWithResponseTime.reduce((sum, c) => sum + c.lastResponseTime, 0) / cardsWithResponseTime.length
      : null;

    // Calculate daily review activity (last 30 days)
    const now = new Date();
    const activityByDay = {};
    
    for (let i = 0; i < 30; i++) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateKey = date.toISOString().split('T')[0];
      activityByDay[dateKey] = reviewedCards.filter(c => {
        if (!c.lastReviewDate) return false;
        const reviewDate = new Date(c.lastReviewDate).toISOString().split('T')[0];
        return reviewDate === dateKey;
      }).length;
    }

    // Deck performance comparison
    const deckPerformance = decks.map(deck => {
      const metrics = this.calculateDeckMetrics(deck);
      return {
        deckId: deck._id,
        deckTitle: deck.title,
        ...metrics
      };
    }).sort((a, b) => b.avgSuccessRate - a.avgSuccessRate);

    return {
      totalDecks: decks.length,
      totalCards: allCards.length,
      reviewedCards: reviewedCards.length,
      overallSuccessRate: Math.round(overallSuccessRate * 100) / 100,
      avgResponseTime: avgResponseTime ? Math.round(avgResponseTime) : null,
      activityByDay,
      deckPerformance,
      topPerformingDecks: deckPerformance.slice(0, 5),
      needsAttentionDecks: deckPerformance
        .filter(d => d.avgSuccessRate < 0.6)
        .slice(0, 5)
    };
  }

  /**
   * Get empty metrics structure
   */
  getEmptyMetrics() {
    return {
      totalCards: 0,
      reviewedCount: 0,
      unreviewedCount: 0,
      dueCards: 0,
      avgSuccessRate: 0,
      avgConfidence: 0,
      avgReviewLevel: 0,
      avgResponseTime: null,
      masteryDistribution: { beginner: 0, intermediate: 0, advanced: 0 },
      weakCards: [],
      completionRate: 0
    };
  }

  /**
   * Generate progress report
   */
  generateProgressReport(deck, timeRange = 30) {
    const metrics = this.calculateDeckMetrics(deck);
    const now = new Date();
    
    // Calculate trend (last timeRange days)
    const cards = deck.cards || [];
    const recentReviews = cards.filter(c => {
      if (!c.lastReviewDate) return false;
      const reviewDate = new Date(c.lastReviewDate);
      const daysAgo = (now - reviewDate) / (1000 * 60 * 60 * 24);
      return daysAgo <= timeRange;
    });

    const recentSuccessRate = recentReviews.length > 0
      ? recentReviews.reduce((sum, c) => sum + (c.successRate || 0), 0) / recentReviews.length
      : 0;

    return {
      ...metrics,
      recentActivity: {
        reviewsLast30Days: recentReviews.length,
        recentSuccessRate: Math.round(recentSuccessRate * 100) / 100,
        trend: recentSuccessRate > metrics.avgSuccessRate ? 'improving' : 'declining'
      },
      recommendations: this.generateRecommendations(metrics)
    };
  }

  /**
   * Generate recommendations based on performance
   */
  generateRecommendations(metrics) {
    const recommendations = [];

    if (metrics.avgSuccessRate < 0.5) {
      recommendations.push({
        type: 'warning',
        message: 'Low success rate detected. Consider reviewing easier cards more frequently.',
        action: 'increase-review-frequency'
      });
    }

    if (metrics.unreviewedCount > metrics.totalCards * 0.3) {
      recommendations.push({
        type: 'info',
        message: `${metrics.unreviewedCount} cards haven't been reviewed yet. Start reviewing to build your knowledge base.`,
        action: 'start-reviewing'
      });
    }

    if (metrics.dueCards > 50) {
      recommendations.push({
        type: 'warning',
        message: `${metrics.dueCards} cards are due for review. Consider increasing daily review time.`,
        action: 'increase-daily-time'
      });
    }

    if (metrics.weakCards.length > 0) {
      recommendations.push({
        type: 'suggestion',
        message: `Focus on ${metrics.weakCards.length} weak cards to improve overall performance.`,
        action: 'focus-weak-cards'
      });
    }

    return recommendations;
  }
}

module.exports = new PerformanceAnalytics();

