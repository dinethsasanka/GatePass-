const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { getAzureUserData } = require('../utils/azureUserCache');
const { enrichSingleUser } = require('../utils/userEnrichment');

/**
 * Authentication middleware
 * Handles both regular users (MongoDB) and Azure users (API-only)
 */
const protect = async (req, res, next) => {
  let token = req.headers.authorization;
  
  if (!token || !token.startsWith('Bearer')) {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }

  try {
    token = token.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check if this is an Azure user (API-only)
    if (decoded.isAzureUser) {
      try {
        // Fetch user data from ERP API (with cache)
        const azureUserData = await getAzureUserData(decoded.serviceNo, true);
        
        // Build complete user object
        req.user = {
          _id: decoded.id,              // Azure ID from token
          serviceNo: decoded.serviceNo,
          email: decoded.email,
          role: decoded.role,
          ...azureUserData,             // ERP data from cache
          isAzureUser: true
        };
        
      } catch (error) {
        console.error(`Failed to fetch Azure user data:`, error.message);
        return res.status(401).json({ 
          message: 'Azure user data unavailable', 
          error: error.message 
        });
      }
    } else {
      // Regular user - MongoDB lookup
      const user = await User.findById(decoded.id).select('-password').lean();
      
      if (!user) {
        return res.status(401).json({ message: 'User not found' });
      }
      
      // Enrich with ERP data
      req.user = await enrichSingleUser(user, true);
    }
    
    next();
    
  } catch (error) {
    console.error('Authentication error:', error.message);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired' });
    }
    
    res.status(401).json({ message: 'Not authorized, token failed' });
  }
};

const superAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'SuperAdmin') {
    next();
  } else {
    res.status(403).json({ message: 'Not authorized, admin access required' });
  }
};

/**
 * Generate JWT token for regular users
 */
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

/**
 * Generate JWT token for Azure users (API-only)
 */
const generateAzureToken = ({ serviceNo, azureId, email }) => {
  return jwt.sign(
    { 
      serviceNo,
      azureId,
      email,
      isAzureUser: true 
    }, 
    process.env.JWT_SECRET, 
    { expiresIn: '30d' }
  );
};

module.exports = { 
  protect, 
  superAdmin, 
  generateToken,
  generateAzureToken 
};
