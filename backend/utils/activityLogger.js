const ActivityLog = require('../models/ActivityLog');

/**
 * Log user activity
 * @param {ObjectId} userId - The user's ID
 * @param {String} action - The action performed
 * @param {Object} details - Additional details about the action
 * @param {Object} req - Express request object (for IP and user agent)
 */
const logActivity = async (userId, action, details = {}, req = null) => {
  try {
    const activityData = {
      user: userId,
      action,
      details
    };

    if (req) {
      // Get IP address (handle proxy/load balancer)
      activityData.ipAddress = 
        req.headers['x-forwarded-for']?.split(',')[0] || 
        req.headers['x-real-ip'] || 
        req.connection?.remoteAddress || 
        req.socket?.remoteAddress ||
        req.ip;

      activityData.userAgent = req.headers['user-agent'];
    }

    await ActivityLog.create(activityData);
  } catch (error) {
    console.error('Activity logging error:', error);
    // Don't throw error - logging should not break the main flow
  }
};

module.exports = { logActivity };

