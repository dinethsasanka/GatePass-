/**
 * User Helper Functions
 * High-level helpers for fetching users with ERP data
 */

const User = require('../models/User');
const { enrichSingleUser, enrichMultipleUsers } = require('./userEnrichment');

/**
 * Get a user by service number with ERP data
 * @param {String} serviceNo - Employee service number
 * @param {Boolean} useCache - Whether to use cached ERP data (default: true)
 * @returns {Promise<Object|null>} - Enriched user object or null
 */
async function getUserWithERPData(serviceNo, useCache = true) {
  if (!serviceNo) {
    return null;
  }

  try {
    // Get user from database
    const user = await User.findOne({ serviceNo: String(serviceNo) }).lean();
    
    if (!user) {
      console.log(`❌ User not found: ${serviceNo}`);
      return null;
    }

    // Enrich with ERP data
    const enrichedUser = await enrichSingleUser(user, useCache);
    return enrichedUser;
  } catch (error) {
    console.error(`Error fetching user ${serviceNo}:`, error);
    return null;
  }
}

/**
 * Get user by MongoDB ID with ERP data
 * @param {String} id - MongoDB ObjectId
 * @param {Boolean} useCache - Whether to use cached ERP data
 * @returns {Promise<Object|null>} - Enriched user object or null
 */
async function getUserByIdWithERPData(id, useCache = true) {
  try {
    const user = await User.findById(id).lean();
    
    if (!user) {
      return null;
    }

    return await enrichSingleUser(user, useCache);
  } catch (error) {
    console.error(`Error fetching user by ID ${id}:`, error);
    return null;
  }
}

/**
 * Get users by role with ERP data
 * @param {String} role - User role (e.g., "Approver", "User")
 * @param {Boolean} useCache - Whether to use cached ERP data
 * @returns {Promise<Array>} - Array of enriched user objects
 */
async function getUsersByRoleWithERPData(role, useCache = true) {
  try {
    const users = await User.find({ role }).lean();
    
    if (users.length === 0) {
      return [];
    }

    return await enrichMultipleUsers(users, useCache);
  } catch (error) {
    console.error(`Error fetching users by role ${role}:`, error);
    return [];
  }
}

/**
 * Get users by branch with ERP data
 * @param {String} branch - Branch/location code
 * @param {Boolean} useCache - Whether to use cached ERP data
 * @returns {Promise<Array>} - Array of enriched user objects
 */
async function getUsersByBranchWithERPData(branch, useCache = true) {
  try {
    const users = await User.find({ branches: { $in: [branch] } }).lean();
    
    if (users.length === 0) {
      return [];
    }

    return await enrichMultipleUsers(users, useCache);
  } catch (error) {
    console.error(`Error fetching users by branch ${branch}:`, error);
    return [];
  }
}

/**
 * Get all users with ERP data (use with caution on large datasets)
 * @param {Object} filter - MongoDB filter object
 * @param {Boolean} useCache - Whether to use cached ERP data
 * @returns {Promise<Array>} - Array of enriched user objects
 */
async function getAllUsersWithERPData(filter = {}, useCache = true) {
  try {
    const users = await User.find(filter).lean();
    
    if (users.length === 0) {
      return [];
    }

    console.log(`📋 Fetching ${users.length} users from database...`);
    return await enrichMultipleUsers(users, useCache);
  } catch (error) {
    console.error('Error fetching all users:', error);
    return [];
  }
}

/**
 * Find requester from request document with ERP data
 * (Replaces findRequesterFromRequest in controllers)
 * @param {Object} reqDoc - Request document
 * @param {Boolean} useCache - Whether to use cached ERP data
 * @returns {Promise<Object|null>} - Enriched requester object or fallback
 */
async function findRequesterWithERPData(reqDoc, useCache = true) {
  if (!reqDoc) {
    return null;
  }

  // Try to find service number from various possible fields
  const candidateServiceNos = [
    reqDoc.requesterServiceNo,
    reqDoc.senderServiceNo,
    reqDoc.createdByServiceNo,
    reqDoc.userServiceNo,
    reqDoc.requester?.serviceNo,
    reqDoc.sender?.serviceNo,
  ].filter(Boolean);

  // Try each service number
  for (const serviceNo of candidateServiceNos) {
    const user = await getUserWithERPData(String(serviceNo), useCache);
    if (user) {
      return user;
    }
  }

  // Fallback to email if no user found
  const candidateEmails = [
    reqDoc.requesterEmail,
    reqDoc.senderEmail,
    reqDoc.sender?.email,
  ].filter(Boolean);

  if (candidateEmails.length > 0) {
    return {
      email: candidateEmails[0],
      name: reqDoc.requesterName || reqDoc.senderName || "Requester",
      _dataSource: 'Request Document',
      _enriched: false
    };
  }

  return null;
}

/**
 * Batch fetch users by service numbers
 * @param {Array<String>} serviceNumbers - Array of service numbers
 * @param {Boolean} useCache - Whether to use cached ERP data
 * @returns {Promise<Object>} - Map of serviceNo => enriched user
 */
async function batchGetUsersByServiceNo(serviceNumbers, useCache = true) {
  try {
    const users = await User.find({
      serviceNo: { $in: serviceNumbers }
    }).lean();

    const enrichedUsers = await enrichMultipleUsers(users, useCache);
    
    // Convert to map for easy lookup
    const userMap = {};
    enrichedUsers.forEach(user => {
      userMap[user.serviceNo] = user;
    });

    return userMap;
  } catch (error) {
    console.error('Error batch fetching users:', error);
    return {};
  }
}

module.exports = {
  getUserWithERPData,
  getUserByIdWithERPData,
  getUsersByRoleWithERPData,
  getUsersByBranchWithERPData,
  getAllUsersWithERPData,
  findRequesterWithERPData,
  batchGetUsersByServiceNo
};
