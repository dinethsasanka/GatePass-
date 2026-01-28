/**
 * User Data Enrichment Utility
 * Fetches employee details from ERP API and enriches user records
 */

const erpService = require('../services/erpService');
const NodeCache = require('node-cache');

// Cache for 5 minutes (300 seconds)
const userCache = new NodeCache({ stdTTL: 300, checkperiod: 60 });

/**
 * Enrich a single user object with ERP data
 * @param {Object} user - User object from database
 * @param {Boolean} useCache - Whether to use cached data (default: true)
 * @returns {Promise<Object>} - Enriched user object
 */
async function enrichSingleUser(user, useCache = true) {
  if (!user || !user.serviceNo) {
    return user;
  }

  // Avoid re-enriching already enriched data
  if (user._enriched) {
    return user;
  }

  const cacheKey = `user:erp:${user.serviceNo}`;

  try {
    // Check cache first
    let erpData = null;
    if (useCache) {
      erpData = userCache.get(cacheKey);
    }

    // Fetch from ERP if not in cache
    if (!erpData) {
      const erpResponse = await erpService.getEmployeeDetails(
        "string",
        "string",
        user.serviceNo
      );

      // Handle wrapped response: { success, message, data: [...] }
      if (erpResponse && erpResponse.success && erpResponse.data && Array.isArray(erpResponse.data)) {
        erpData = erpResponse.data[0]; // Get first element from array
      } else if (erpResponse && !erpResponse.success) {
        // ERP returned error
        console.warn(`⚠️ ERP error for ${user.serviceNo}:`, erpResponse.message);
        erpData = null;
      } else {
        erpData = erpResponse; // Fallback to direct response
      }

      if (erpData && useCache) {
        userCache.set(cacheKey, erpData);
        console.log(`💾 Cached ERP data for: ${user.serviceNo}`);
      }
    }

    // Enrich user object with ERP data
    if (erpData) {
      const enrichedUser = {
        ...user,
        // Name fields - using actual ERP field names
        name: erpData.employeeName || 
              `${erpData.employeeTitle || ''} ${erpData.employeeFirstName || ''} ${erpData.employeeSurname || ''}`.trim(),
        
        // Job details - using actual field names
        designation: erpData.designation || erpData.employeeDesignation,
        section: erpData.empSection || erpData.employeeSection,
        group: erpData.empGroup || erpData.employeeGroupName,
        
        // Contact - using actual field names
        contactNo: erpData.mobileNo || erpData.employeeMobilePhone,
        
        // Email (prefer user's stored email, fallback to ERP)
        email: user.email || erpData.email || erpData.employeeOfficialEmail,
        
        // Grade and location - using actual field names
        gradeName: erpData.gradeName || erpData.employeeSalaryGrade,
        Grade: erpData.gradeName || erpData.employeeSalaryGrade, // Alias
        fingerScanLocation: erpData.fingerScanLocation || erpData.FINGER_SCAN_LOCATION,
        
        // Additional details - using actual field names
        organization: erpData.orgName || erpData.organizationName,
        costCenter: erpData.employeeCostCode || erpData.employeeCostCentreCode,
        costCenterName: erpData.employeeCostCentreName || erpData.employeeCostCentreName,
        supervisorNumber: erpData.employeeSupervisorNumber || erpData.supervisorName,
        division: erpData.empDivision || erpData.employeeDivision,
        dateOfBirth: erpData.dateOfBirth || erpData.employeeDob,
        gender: erpData.gender || erpData.GENDER,
        officialAddress: erpData.officialAddress || erpData.employeeOfficialAddress,
        
        // Metadata
        _enriched: true,
        _dataSource: 'ERP',
        _erpFetchedAt: new Date().toISOString()
      };

      console.log(`✨ Enriched user: ${user.serviceNo} (${enrichedUser.name})`);
      return enrichedUser;
    }
  } catch (error) {
    console.warn(`⚠️ Failed to enrich user ${user.serviceNo}:`, error.message);
  }

  // Return original user if enrichment fails
  return {
    ...user,
    _enriched: false,
    _dataSource: 'Database',
    _erpError: true
  };
}

/**
 * Enrich multiple user objects with ERP data
 * @param {Array} users - Array of user objects
 * @param {Boolean} useCache - Whether to use cached data
 * @returns {Promise<Array>} - Array of enriched user objects
 */
async function enrichMultipleUsers(users, useCache = true) {
  if (!Array.isArray(users) || users.length === 0) {
    return users;
  }

  console.log(`📦 Enriching ${users.length} users...`);
  
  // Enrich all users in parallel
  const enrichedUsers = await Promise.all(
    users.map(user => enrichSingleUser(user, useCache))
  );

  const successCount = enrichedUsers.filter(u => u._enriched).length;
  console.log(`✅ Successfully enriched ${successCount}/${users.length} users`);

  return enrichedUsers;
}

/**
 * Clear cache for a specific user or all users
 * @param {String} serviceNo - Optional service number to clear specific user
 */
function clearCache(serviceNo = null) {
  if (serviceNo) {
    const cacheKey = `user:erp:${serviceNo}`;
    userCache.del(cacheKey);
    console.log(`🗑️ Cleared cache for user: ${serviceNo}`);
  } else {
    userCache.flushAll();
    console.log(`🗑️ Cleared all user cache`);
  }
}

/**
 * Get cache statistics
 * @returns {Object} - Cache stats
 */
function getCacheStats() {
  const stats = userCache.getStats();
  return {
    keys: userCache.keys().length,
    hits: stats.hits,
    misses: stats.misses,
    hitRate: stats.hits / (stats.hits + stats.misses) || 0
  };
}

/**
 * Preload cache for frequently accessed users
 * @param {Array} serviceNumbers - Array of service numbers to preload
 */
async function preloadCache(serviceNumbers) {
  console.log(`📥 Preloading cache for ${serviceNumbers.length} users...`);
  
  const promises = serviceNumbers.map(async (serviceNo) => {
    try {
      const erpData = await erpService.getEmployeeDetails("string", "string", serviceNo);
      if (erpData) {
        userCache.set(`user:erp:${serviceNo}`, erpData);
        return true;
      }
    } catch (error) {
      console.warn(`Failed to preload ${serviceNo}:`, error.message);
      return false;
    }
  });

  const results = await Promise.all(promises);
  const successCount = results.filter(r => r).length;
  console.log(`✅ Preloaded ${successCount}/${serviceNumbers.length} users into cache`);
}

module.exports = {
  enrichSingleUser,
  enrichMultipleUsers,
  clearCache,
  getCacheStats,
  preloadCache
};
