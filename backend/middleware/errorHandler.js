/**
 * Error Handling Middleware
 * Sanitizes error messages to prevent information disclosure
 */

/**
 * Sanitize error message for client response
 * Prevents leaking sensitive information like stack traces, file paths, etc.
 * 
 * @param {Error} error - The error object
 * @param {boolean} isDevelopment - Whether running in development mode
 * @returns {string} Sanitized error message
 */
const sanitizeError = (error, isDevelopment = false) => {
  // In development, show more details (but still not full stack trace)
  if (isDevelopment && process.env.NODE_ENV === 'development') {
    // Remove file paths and sensitive info but keep useful debugging info
    const message = error.message || 'An error occurred';
    return message.replace(/\/[^\s]*\/backend\//g, '');
  }
  
  // In production, return generic messages
  return 'An error occurred while processing your request';
};

/**
 * Global error handler middleware
 * Should be added after all routes
 */
const errorHandler = (err, req, res, next) => {
  // Log full error server-side for debugging
  console.error('[ERROR]', {
    timestamp: new Date().toISOString(),
    path: req.path,
    method: req.method,
    user: req.user?.serviceNo || 'anonymous',
    error: err.message,
  });

  // Determine status code
  const statusCode = err.statusCode || res.statusCode || 500;
  
  // Send sanitized response to client
  res.status(statusCode).json({
    message: sanitizeError(err, process.env.NODE_ENV === 'development'),
    ...(process.env.NODE_ENV === 'development' && { 
      type: err.name 
    })
  });
};

/**
 * Safe error response helper
 * Use this in catch blocks instead of exposing error.message directly
 */
const safeErrorResponse = (res, error, statusCode = 500) => {
  console.error('[SAFE_ERROR]', error);
  
  res.status(statusCode).json({
    message: sanitizeError(error, process.env.NODE_ENV === 'development')
  });
};

module.exports = {
  errorHandler,
  sanitizeError,
  safeErrorResponse
};
