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
      console.log(`🔐 Azure user authentication: ${decoded.serviceNo}`);
      
      try {
        // Fetch user data from ERP API (with cache)
        const azureUserData = await getAzureUserData(decoded.serviceNo, true);
        
        // Add Azure ID from token
        azureUserData.azureId = decoded.azureId;
        azureUserData.email = decoded.email || azureUserData.email;
        
        req.user = azureUserData;
        console.log(`✅ Azure user loaded: ${azureUserData.name} (${azureUserData.role})`);
        
      } catch (error) {
        console.error(`❌ Failed to fetch Azure user data:`, error.message);
        return res.status(401).json({ 
          message: 'Azure user data unavailable', 
          error: error.message 
        });
      }
    } else {
      // Regular user - MongoDB lookup
      console.log(`🔐 Regular user authentication: ${decoded.id}`);
      
      const user = await User.findById(decoded.id).select('-password').lean();
      
      if (!user) {
        return res.status(401).json({ message: 'User not found' });
      }
      
      // Enrich with ERP data
      req.user = await enrichSingleUser(user, true);
      console.log(`✅ Regular user loaded: ${req.user.name || req.user.serviceNo}`);
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
