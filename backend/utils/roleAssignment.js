/**
 * Role Assignment Utility
 * Assigns roles based on SLT salary grade
 * 
 * Role Mapping:
 * - Super Admin: S.1.1
 * - Patrol leader (Pleader): S.3
 * - Security Officer: S.2
 * - Executive (Approver): A.1 to A.6, S.1
 * - User (default): A.7 and higher, other grades
 */

/**
 * Get application role based on employee salary grade
 * @param {string} grade - Employee salary grade from ERP (e.g., "A.3", "S.2", "S.1.1")
 * @returns {string} - Application role: "SuperAdmin", "Pleader", "Security Officer", "Approver", or "User"
 */
function getRoleByGrade(grade) {
  if (!grade) {
    console.warn('⚠️ No grade provided, defaulting to User role');
    return 'User';
  }

  // Normalize grade (remove spaces, uppercase)
  const normalizedGrade = String(grade).trim().toUpperCase();
  
  console.log(`🔍 Determining role for grade: ${normalizedGrade}`);

  // S.1.1 → Super Admin
  if (normalizedGrade === 'S.1.1') {
    console.log('✅ Role assigned: SuperAdmin (Grade S.1.1)');
    return 'Approver';
  }

  // S.3 → Pleader (Patrol Leader)
  if (normalizedGrade === 'S.3') {
    console.log('✅ Role assigned: Pleader (Grade S.3)');
    return 'Pleader';
  }

  // S.2 → Security Officer
  if (normalizedGrade === 'S.2') {
    console.log('✅ Role assigned: Security Officer (Grade S.2)');
    return 'Security Officer';
  }

  // S.1 → Approver (Executive)
  if (normalizedGrade === 'S.1') {
    console.log('✅ Role assigned: Approver (Grade S.1)');
    return 'Approver';
  }

  // Extract numeric part for A grades
  const gradeMatch = normalizedGrade.match(/^A\.(\d+)/);
  if (gradeMatch) {
    const gradeNumber = parseInt(gradeMatch[1], 10);
    
    if (gradeNumber >= 1 && gradeNumber <= 6) {
      console.log(`✅ Role assigned: Approver (Grade A.${gradeNumber})`);
      return 'Approver';
    }
    
    if (gradeNumber >= 7) {
      console.log(`✅ Role assigned: User (Grade A.${gradeNumber})`);
      return 'User';
    }
  }

  // Default to User for any other grade
  console.log(`⚠️ Unknown grade format: ${normalizedGrade}, defaulting to User`);
  return 'User';
};

/**
 * Get role display name
 * @param {string} role - Internal role name
 * @returns {string} - Display name
 */
const getRoleDisplayName = (role) => {
  const roleNames = {
    'Pleader': 'Patrol Leader',
    'Security Officer': 'Security Officer',
    'Approver': 'Executive Officer',
    'User': 'User',
    'Admin': 'Administrator',
    'SuperAdmin': 'Super Administrator'
  };
  
  return roleNames[role] || role;
};

/**
 * Validate if user has permission for a specific role
 * @param {string} userRole - User's current role
 * @param {string} requiredRole - Required role
 * @returns {boolean} - Has permission
 */
const hasRolePermission = (userRole, requiredRole) => {
  const roleHierarchy = {
    'SuperAdmin': 5,
    'Admin': 4,
    'Approver': 3,
    'Security Officer': 2,
    'Pleader': 2,
    'User': 1
  };

  const userLevel = roleHierarchy[userRole] || 0;
  const requiredLevel = roleHierarchy[requiredRole] || 0;

  return userLevel >= requiredLevel;
};

module.exports = {
  getRoleByGrade,
  getRoleDisplayName,
  hasRolePermission
};
