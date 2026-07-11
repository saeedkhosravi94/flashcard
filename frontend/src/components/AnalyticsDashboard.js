import React, { useState, useEffect } from 'react';
import { FaChartLine, FaChartBar, FaClock, FaCheckCircle, FaTimesCircle, FaFire } from 'react-icons/fa';
import axios from 'axios';
import './AnalyticsDashboard.css';

function AnalyticsDashboard({ deckId, onClose }) {
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (deckId) {
      fetchAnalytics();
    }
  }, [deckId]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get(`/api/flashcards/${deckId}/analytics`);
      setAnalytics(response.data);
    } catch (err) {
      console.error('Error fetching analytics:', err);
      setError(err.response?.data?.error || 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  if (!deckId) return null;

  if (loading) {
    return (
      <div className="analytics-overlay">
        <div className="analytics-modal" onClick={(e) => e.stopPropagation()}>
          <div className="analytics-loading">
            <div className="book-loader"></div>
            <p>Loading analytics...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="analytics-overlay">
        <div className="analytics-modal" onClick={(e) => e.stopPropagation()}>
          <div className="analytics-error">
            <FaTimesCircle /> {error}
          </div>
        </div>
      </div>
    );
  }

  if (!analytics) return null;

  const { metrics, progressReport } = analytics;

  return (
    <div className="analytics-overlay">
      <div className="analytics-modal" onClick={(e) => e.stopPropagation()}>
        <div className="analytics-header">
          <h2>
            <FaChartLine className="analytics-icon" />
            Performance Analytics
          </h2>
          <button className="analytics-close" onClick={onClose}>✕</button>
        </div>

        <div className="analytics-content">
          {/* Key Metrics */}
          <div className="metrics-grid">
            <div className="metric-card">
              <div className="metric-icon success">
                <FaCheckCircle />
              </div>
              <div className="metric-value">{Math.round(metrics.avgSuccessRate * 100)}%</div>
              <div className="metric-label">Success Rate</div>
            </div>

            <div className="metric-card">
              <div className="metric-icon info">
                <FaChartBar />
              </div>
              <div className="metric-value">{metrics.reviewedCount}/{metrics.totalCards}</div>
              <div className="metric-label">Cards Reviewed</div>
            </div>

            <div className="metric-card">
              <div className="metric-icon warning">
                <FaFire />
              </div>
              <div className="metric-value">{metrics.dueCards}</div>
              <div className="metric-label">Cards Due</div>
            </div>

            {metrics.avgResponseTime && (
              <div className="metric-card">
                <div className="metric-icon time">
                  <FaClock />
                </div>
                <div className="metric-value">{Math.round(metrics.avgResponseTime / 1000)}s</div>
                <div className="metric-label">Avg Response Time</div>
              </div>
            )}
          </div>

          {/* Mastery Distribution */}
          <div className="analytics-section">
            <h3>Mastery Distribution</h3>
            <div className="mastery-bars">
              <div className="mastery-bar">
                <div className="mastery-label">Beginner</div>
                <div className="mastery-progress">
                  <div 
                    className="mastery-fill beginner"
                    style={{ width: `${(metrics.masteryDistribution.beginner / metrics.totalCards) * 100}%` }}
                  ></div>
                </div>
                <div className="mastery-count">{metrics.masteryDistribution.beginner}</div>
              </div>
              <div className="mastery-bar">
                <div className="mastery-label">Intermediate</div>
                <div className="mastery-progress">
                  <div 
                    className="mastery-fill intermediate"
                    style={{ width: `${(metrics.masteryDistribution.intermediate / metrics.totalCards) * 100}%` }}
                  ></div>
                </div>
                <div className="mastery-count">{metrics.masteryDistribution.intermediate}</div>
              </div>
              <div className="mastery-bar">
                <div className="mastery-label">Advanced</div>
                <div className="mastery-progress">
                  <div 
                    className="mastery-fill advanced"
                    style={{ width: `${(metrics.masteryDistribution.advanced / metrics.totalCards) * 100}%` }}
                  ></div>
                </div>
                <div className="mastery-count">{metrics.masteryDistribution.advanced}</div>
              </div>
            </div>
          </div>

          {/* Recommendations */}
          {progressReport.recommendations && progressReport.recommendations.length > 0 && (
            <div className="analytics-section">
              <h3>Recommendations</h3>
              <div className="recommendations-list">
                {progressReport.recommendations.map((rec, index) => (
                  <div key={index} className={`recommendation ${rec.type}`}>
                    <div className="recommendation-icon">
                      {rec.type === 'warning' && <FaTimesCircle />}
                      {rec.type === 'info' && <FaChartLine />}
                      {rec.type === 'suggestion' && <FaCheckCircle />}
                    </div>
                    <div className="recommendation-text">{rec.message}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Weak Cards */}
          {metrics.weakCards && metrics.weakCards.length > 0 && (
            <div className="analytics-section">
              <h3>Cards Needing Attention</h3>
              <div className="weak-cards-list">
                {metrics.weakCards.slice(0, 5).map((card, index) => (
                  <div key={index} className="weak-card-item">
                    <div className="weak-card-question">{card.question}</div>
                    <div className="weak-card-stats">
                      <span className="weak-card-rate">Success: {Math.round(card.successRate * 100)}%</span>
                      <span className="weak-card-level">Level: {card.reviewLevel}/10</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default AnalyticsDashboard;

