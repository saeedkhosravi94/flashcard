// Inactivity tracker utility
// Logs out user after 1 day (24 hours) of inactivity

const INACTIVITY_KEY = 'lastActivityTime';
const INACTIVITY_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

/**
 * Update the last activity timestamp
 */
export const updateLastActivity = () => {
  localStorage.setItem(INACTIVITY_KEY, Date.now().toString());
};

/**
 * Check if user has been inactive for more than 1 day
 * @returns {boolean} True if inactive for more than 1 day
 */
export const isInactive = () => {
  const lastActivity = localStorage.getItem(INACTIVITY_KEY);
  if (!lastActivity) {
    // If no last activity recorded, set it now
    updateLastActivity();
    return false;
  }

  const lastActivityTime = parseInt(lastActivity, 10);
  const now = Date.now();
  const timeSinceLastActivity = now - lastActivityTime;

  return timeSinceLastActivity > INACTIVITY_DURATION;
};

/**
 * Initialize inactivity tracking
 * Sets up event listeners for user activity
 * @param {Function} onInactivity - Callback function when inactivity detected
 */
export const initInactivityTracker = (onInactivity) => {
  // Update last activity on various user interactions
  const activityEvents = [
    'mousedown',
    'mousemove',
    'keypress',
    'scroll',
    'touchstart',
    'click',
    'keydown'
  ];

  const handleActivity = () => {
    updateLastActivity();
  };

  // Add event listeners
  activityEvents.forEach(event => {
    document.addEventListener(event, handleActivity, { passive: true });
  });

  // Check for inactivity periodically (every 5 minutes)
  const checkInterval = setInterval(() => {
    if (isInactive()) {
      clearInterval(checkInterval);
      // Remove event listeners
      activityEvents.forEach(event => {
        document.removeEventListener(event, handleActivity);
      });
      // Call the callback to handle logout
      if (onInactivity) {
        onInactivity();
      }
    }
  }, 5 * 60 * 1000); // Check every 5 minutes

  // Initial check
  if (isInactive()) {
    clearInterval(checkInterval);
    activityEvents.forEach(event => {
      document.removeEventListener(event, handleActivity);
    });
    if (onInactivity) {
      onInactivity();
    }
  }

  // Return cleanup function
  return () => {
    clearInterval(checkInterval);
    activityEvents.forEach(event => {
      document.removeEventListener(event, handleActivity);
    });
  };
};

/**
 * Clear inactivity tracking (on logout)
 */
export const clearInactivityTracking = () => {
  localStorage.removeItem(INACTIVITY_KEY);
};

