/**
 * Azure User Cache Utility
 * Manages caching of ERP data for Azure AD users
 * Azure users don't use MongoDB - all data from ERP API with caching
 */

const NodeCache = require('node-cache');
const erpService = require('../services/erpService');
const { getRoleByGrade } = require('./roleAssignment');

// Cache for 5 minutes (300 seconds)
const azureUserCache = new NodeCache({ stdTTL: 300, checkperiod: 60 });

/**
 * Get Azure user data from ERP API (with caching)
 * @param {String} serviceNo - Employee service number
 * @param {Boolean} useCache - Whether to use cache (default: true)
 * @returns {Promise<Object>} - User data from ERP
 */
async function getAzureUserData(serviceNo, useCache = true) {
  if (!serviceNo) {
    throw new Error('Service number is required');
  }

  const cacheKey = `azure:user:${serviceNo}`;

  try {
    // Check cache first
    if (useCache) {
      const cached = azureUserCache.get(cacheKey);
      if (cached) {
        console.log(`✅ Azure user cache HIT: ${serviceNo}`);
        return cached;
      }
    }

    // Fetch from ERP
    console.log(`🔍 Fetching Azure user from ERP: ${serviceNo}`);
    const erpResponse = await erpService.getEmployeeDetails("string", "string", serviceNo);

    // Handle wrapped response: { success, message, data: [...] }
    let erpData = null;
    if (erpResponse && erpResponse.success && Array.isArray(erpResponse.data) && erpResponse.data.length > 0) {
      erpData = erpResponse.data[0];
    } else if (!erpResponse || !erpResponse.success) {
      throw new Error(`ERP API error: ${erpResponse?.message || 'No data returned'}`);
    }

    if (!erpData) {
      throw new Error('No employee data found in ERP');
    }

    // Build user object from ERP data
    const userData = {
      serviceNo: erpData.employeeNumber || serviceNo,
      isAzureUser: true,
      
      // Personal info
      name: erpData.employeeName || 
            `${erpData.employeeTitle || ''} ${erpData.employeeFirstName || ''} ${erpData.employeeSurname || ''}`.trim(),
      email: erpData.email || erpData.employeeOfficialEmail,
      contactNo: erpData.mobileNo || erpData.employeeMobilePhone,
      
      // Job details
      designation: erpData.designation || erpData.employeeDesignation,
      section: erpData.empSection || erpData.employeeSection,
      group: erpData.empGroup || erpData.employeeGroupName,
      division: erpData.empDivision || erpData.employeeDivision,
      organization: erpData.orgName || erpData.organizationName,
      
      // Grade and role (auto-assigned)
      gradeName: erpData.gradeName || erpData.employeeSalaryGrade,
      role: getRoleByGrade(erpData.gradeName || erpData.employeeSalaryGrade),
      
      // Location/Branch
      fingerScanLocation: erpData.fingerScanLocation || erpData.FINGER_SCAN_LOCATION,
      branches: [erpData.fingerScanLocation || erpData.FINGER_SCAN_LOCATION || 'SLT HQ'],
      
      // Additional details
      costCenter: erpData.employeeCostCode || erpData.employeeCostCentreCode,
      costCenterName: erpData.employeeCostCentreName,
      supervisorNumber: erpData.employeeSupervisorNumber,
      sectionHead: erpData.sectionHead,
      divisionHead: erpData.divisionHead,
      groupHead: erpData.groupHead,
      dateOfBirth: erpData.dateOfBirth,
      gender: erpData.gender,
      officialAddress: erpData.officialAddress,
      
      // Metadata
      _dataSource: 'ERP',
      _cachedAt: new Date().toISOString()
    };

    // Cache the result
    if (useCache) {
      azureUserCache.set(cacheKey, userData);
      console.log(`💾 Cached Azure user data: ${serviceNo}`);
    }

    return userData;

  } catch (error) {
    console.error(`❌ Error fetching Azure user ${serviceNo}:`, error.message);
    throw error;
  }
}

/**
 * Clear cache for specific Azure user or all
 * @param {String} serviceNo - Optional service number to clear specific user
 */
function clearAzureUserCache(serviceNo = null) {
  if (serviceNo) {
    const cacheKey = `azure:user:${serviceNo}`;
    azureUserCache.del(cacheKey);
    console.log(`🗑️ Cleared Azure user cache: ${serviceNo}`);
  } else {
    azureUserCache.flushAll();
    console.log(`🗑️ Cleared all Azure user cache`);
  }
}

/**
 * Get Azure cache statistics
 * @returns {Object} - Cache stats
 */
function getAzureCacheStats() {
  const stats = azureUserCache.getStats();
  return {
    keys: azureUserCache.keys().length,
    hits: stats.hits,
    misses: stats.misses,
    hitRate: stats.hits / (stats.hits + stats.misses) || 0,
    ttl: 300 // seconds
  };
}

/**
 * Preload Azure user cache (e.g., on login)
 * @param {String} serviceNo - Service number to preload
 */
async function preloadAzureUser(serviceNo) {
  try {
    await getAzureUserData(serviceNo, true);
    console.log(`✅ Preloaded Azure user: ${serviceNo}`);
    return true;
  } catch (error) {
    console.error(`⚠️ Failed to preload Azure user ${serviceNo}:`, error.message);
    return false;
  }
}

module.exports = {
  getAzureUserData,
  clearAzureUserCache,
  getAzureCacheStats,
  preloadAzureUser
};
