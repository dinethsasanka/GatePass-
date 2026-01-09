/**
 * User Test Fixtures
 * Mock data for user-related tests
 */

const mockUsers = {
  admin: {
    serviceNo: 'SV11111',
    name: 'Admin User',
    designation: 'System Administrator',
    section: 'IT',
    group: 'Group A',
    contactNo: '0771111111',
    role: 'Admin',
    email: 'admin@example.com',
    branches: ['Colombo'],
    isActive: true,
  },

  pleader: {
    serviceNo: 'SV22222',
    name: 'Petrol Leader',
    designation: 'Petrol Leader',
    section: 'Logistics',
    group: 'Group B',
    contactNo: '0772222222',
    role: 'Pleader',
    email: 'pleader@example.com',
    branches: ['Colombo', 'Kandy'],
    isActive: true,
  },

  verifier: {
    serviceNo: 'SV33333',
    name: 'Verifier User',
    designation: 'Verification Officer',
    section: 'Operations',
    group: 'Group C',
    contactNo: '0773333333',
    role: 'Verifier',
    email: 'verifier@example.com',
    branches: ['Colombo'],
    isActive: true,
  },

  receiver: {
    serviceNo: 'SV44444',
    name: 'Receiver User',
    designation: 'Receiving Officer',
    section: 'Warehouse',
    group: 'Group D',
    contactNo: '0774444444',
    role: 'Receiver',
    email: 'receiver@example.com',
    branches: ['Kandy'],
    isActive: true,
  },

  requester: {
    serviceNo: 'SV55555',
    name: 'Requester User',
    designation: 'Staff Member',
    section: 'Finance',
    group: 'Group E',
    contactNo: '0775555555',
    role: 'User',
    email: 'requester@example.com',
    branches: ['Colombo'],
    isActive: true,
  },
};

module.exports = { mockUsers };
