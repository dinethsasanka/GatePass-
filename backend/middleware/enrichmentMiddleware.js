/**
 * Response Enrichment Middleware
 * Automatically enriches user data in API responses with ERP details
 */

const { enrichSingleUser, enrichMultipleUsers } = require('../utils/userEnrichment');

/**
 * Middleware to automatically enrich user data in API responses
 * Apply this middleware to routes that return user data
 */
const enrichUserDataMiddleware = async (req, res, next) => {
  // Store original json method
  const originalJson = res.json.bind(res);

  // Override res.json to enrich data before sending
  res.json = async function (data) {
    try {
      // Only enrich if data exists and enrichment is not disabled
      if (data && req.query.noEnrich !== 'true') {
        const enrichedData = await enrichResponseData(data);
        return originalJson(enrichedData);
      }
    } catch (error) {
      console.error('Error in enrichment middleware:', error);
      // Fall back to original data if enrichment fails
    }

    return originalJson(data);
  };

  next();
};

/**
 * Recursively enrich user objects in response data
 * @param {*} data - Response data (object, array, or primitive)
 * @returns {Promise<*>} - Enriched data
 */
async function enrichResponseData(data) {
  // Handle null/undefined
  if (data == null) {
    return data;
  }

  // Handle arrays
  if (Array.isArray(data)) {
    // Check if it's an array of users
    if (data.length > 0 && isUserObject(data[0])) {
      return await enrichMultipleUsers(data);
    }

    // Recursively enrich nested arrays
    return await Promise.all(data.map(item => enrichResponseData(item)));
  }

  // Handle objects
  if (typeof data === 'object') {
    // Check if it's a single user object
    if (isUserObject(data)) {
      return await enrichSingleUser(data);
    }

    // Check for common response wrappers
    if (data.user && isUserObject(data.user)) {
      data.user = await enrichSingleUser(data.user);
    }

    if (data.users && Array.isArray(data.users)) {
      data.users = await enrichMultipleUsers(data.users);
    }

    if (data.data && typeof data.data === 'object') {
      data.data = await enrichResponseData(data.data);
    }

    // Check for populated request fields
    if (data.request && data.request.requester) {
      data.request.requester = await enrichResponseData(data.request.requester);
    }

    return data;
  }

  // Return primitives as-is
  return data;
}

/**
 * Check if an object looks like a user object
 * @param {Object} obj - Object to check
 * @returns {Boolean} - True if it looks like a user
 */
function isUserObject(obj) {
  if (!obj || typeof obj !== 'object') {
    return false;
  }

  // Check for user-specific fields
  const hasServiceNo = 'serviceNo' in obj;
  const hasUserId = 'userId' in obj;
  const hasRole = 'role' in obj;
  const hasEmail = 'email' in obj;
  
  // Already enriched
  if (obj._enriched) {
    return false;
  }

  // Must have at least serviceNo or userId, and one other user field
  return (hasServiceNo || hasUserId) && (hasRole || hasEmail);
}

/**
 * Middleware specifically for endpoints that return user lists
 * More aggressive enrichment for user-focused endpoints
 */
const enrichUserListMiddleware = async (req, res, next) => {
  const originalJson = res.json.bind(res);

  res.json = async function (data) {
    try {
      if (!data) {
        return originalJson(data);
      }

      // Handle direct array of users
      if (Array.isArray(data)) {
  const enriched = await enrichMultipleUsers(data);
        return originalJson(enriched);
      }

      // Handle wrapped response
      if (data.users || data.data) {
        const users = data.users || data.data;
        if (Array.isArray(users)) {
          const enriched = await enrichMultipleUsers(users);
          data.users = data.users ? enriched : data.users;
          data.data = data.data ? enriched : data.data;
        }
      }

      return originalJson(data);
    } catch (error) {
      console.error('Error in user list enrichment:', error);
      return originalJson(data);
    }
  };

  next();
};

/**
 * Middleware to enrich request object user data
 * Enriches req.user from JWT token
 */
const enrichReqUserMiddleware = async (req, res, next) => {
  try {
    if (req.user && req.user.serviceNo) {
      // Enrich the authenticated user's data
      req.user = await enrichSingleUser(req.user, true);
      console.log(`👤 Enriched req.user: ${req.user.name || req.user.serviceNo}`);
    }
  } catch (error) {
    console.error('Error enriching req.user:', error);
    // Continue even if enrichment fails
  }

  next();
};

/**
 * Create a custom enrichment middleware with options
 * @param {Object} options - Middleware options
 * @param {Boolean} options.aggressive - Whether to aggressively enrich all user-like objects
 * @param {Boolean} options.useCache - Whether to use cache (default: true)
 * @param {Array<String>} options.fields - Specific fields to enrich
 * @returns {Function} - Middleware function
 */
function createEnrichmentMiddleware(options = {}) {
  const {
    aggressive = false,
    useCache = true,
    fields = null
  } = options;

  return async (req, res, next) => {
    const originalJson = res.json.bind(res);

    res.json = async function (data) {
      try {
        if (data && req.query.noEnrich !== 'true') {
          // Apply field-specific enrichment
          if (fields && Array.isArray(fields)) {
            for (const field of fields) {
              if (data[field]) {
                if (Array.isArray(data[field])) {
                  data[field] = await enrichMultipleUsers(data[field], useCache);
                } else if (typeof data[field] === 'object') {
                  data[field] = await enrichSingleUser(data[field], useCache);
                }
              }
            }
          } else {
            // Standard enrichment
            data = await enrichResponseData(data);
          }
        }
      } catch (error) {
        console.error('Custom enrichment error:', error);
      }

      return originalJson(data);
    };

    next();
  };
}

module.exports = {
  enrichUserDataMiddleware,
  enrichUserListMiddleware,
  enrichReqUserMiddleware,
  createEnrichmentMiddleware
};
