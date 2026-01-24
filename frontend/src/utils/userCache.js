// User cache to prevent duplicate API calls and reduce network requests
// This helps avoid ERR_INSUFFICIENT_RESOURCES errors

const userCache = new Map();
const pendingRequests = new Map();

/**
 * Cached user lookup with request deduplication
 * @param {string} serviceNo - The service number to look up
 * @param {Function} fetchFunction - The function to call if not cached (e.g., searchUserByServiceNo)
 * @returns {Promise<Object>} The user data
 */
export const getCachedUser = async (serviceNo, fetchFunction) => {
  if (!serviceNo) {
    return null;
  }

  // Return from cache if available
  if (userCache.has(serviceNo)) {
    return userCache.get(serviceNo);
  }

  // If a request is already pending for this service number, wait for it
  if (pendingRequests.has(serviceNo)) {
    return pendingRequests.get(serviceNo);
  }

  // Create a new request
  const requestPromise = fetchFunction(serviceNo)
    .then((userData) => {
      // Store in cache
      userCache.set(serviceNo, userData);
      // Remove from pending
      pendingRequests.delete(serviceNo);
      return userData;
    })
    .catch((error) => {
      // Remove from pending even on error
      pendingRequests.delete(serviceNo);
      // Cache null result to prevent repeated failed requests
      userCache.set(serviceNo, null);
      throw error;
    });

  // Store the pending promise
  pendingRequests.set(serviceNo, requestPromise);

  return requestPromise;
};

/**
 * Cached user lookup that can retry when a previous lookup cached null.
 */
export const getCachedUserAllowRefresh = async (serviceNo, fetchFunction) => {
  if (!serviceNo) {
    return null;
  }

  if (userCache.has(serviceNo) && userCache.get(serviceNo) === null) {
    userCache.delete(serviceNo);
  }

  return getCachedUser(serviceNo, fetchFunction);
};

/**
 * Clear the cache (useful when user data might have changed)
 */
export const clearUserCache = () => {
  userCache.clear();
  pendingRequests.clear();
};

/**
 * Clear a specific user from cache
 */
export const clearCachedUser = (serviceNo) => {
  userCache.delete(serviceNo);
  pendingRequests.delete(serviceNo);
};

/**
 * Pre-populate cache with logged-in user data
 */
export const setCachedUser = (serviceNo, userData) => {
  userCache.set(serviceNo, userData);
};
