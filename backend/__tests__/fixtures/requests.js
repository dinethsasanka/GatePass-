/**
 * Request Test Fixtures
 * Mock data for gate pass request-related tests
 */

const mockRequests = {
  pending: {
    _id: 'req001',
    referenceNumber: 'REF001',
    requesterServiceNo: 'SV55555',
    executiveOfficerServiceNo: 'SV66666',
    verifyOfficerServiceNumber: 'SV33333',
    outLocation: 'Colombo',
    inLocation: 'Kandy',
    isNonSltPlace: false,
    receiverAvailable: true,
    status: 4, // Pending at Verifier
    show: true,
    createdAt: new Date('2025-01-15'),
    updatedAt: new Date('2025-01-15'),
  },

  nonSlt: {
    _id: 'req002',
    referenceNumber: 'REF002',
    requesterServiceNo: 'SV55555',
    executiveOfficerServiceNo: 'SV66666',
    verifyOfficerServiceNumber: 'SV33333',
    outLocation: 'Colombo',
    inLocation: null,
    companyName: 'External Company Ltd',
    isNonSltPlace: true,
    receiverAvailable: false,
    status: 4,
    show: true,
    createdAt: new Date('2025-01-16'),
    updatedAt: new Date('2025-01-16'),
  },

  approved: {
    _id: 'req003',
    referenceNumber: 'REF003',
    requesterServiceNo: 'SV55555',
    executiveOfficerServiceNo: 'SV66666',
    verifyOfficerServiceNumber: 'SV33333',
    receiverServiceNo: 'SV44444',
    outLocation: 'Colombo',
    inLocation: 'Kandy',
    isNonSltPlace: false,
    receiverAvailable: true,
    status: 5, // Approved by Verifier
    show: true,
    createdAt: new Date('2025-01-14'),
    updatedAt: new Date('2025-01-17'),
  },
};

const mockStatuses = {
  pending: {
    _id: 'status001',
    referenceNumber: 'REF001',
    verifyOfficerStatus: 1, // Pending
    beforeStatus: 0,
    afterStatus: 1,
    request: mockRequests.pending,
    createdAt: new Date('2025-01-15'),
    updatedAt: new Date('2025-01-15'),
  },

  approved: {
    _id: 'status002',
    referenceNumber: 'REF003',
    verifyOfficerStatus: 2, // Approved
    beforeStatus: 1,
    afterStatus: 2,
    verifyOfficerComment: 'Approved by verifier',
    request: mockRequests.approved,
    createdAt: new Date('2025-01-14'),
    updatedAt: new Date('2025-01-17'),
  },

  rejected: {
    _id: 'status003',
    referenceNumber: 'REF004',
    verifyOfficerStatus: 3, // Rejected
    beforeStatus: 1,
    afterStatus: 6,
    verifyOfficerComment: 'Missing documentation',
    rejectedBy: 'Verifier',
    rejectedByServiceNo: 'SV33333',
    rejectedByBranch: 'Colombo',
    rejectedAt: new Date('2025-01-16'),
    request: {
      _id: 'req004',
      referenceNumber: 'REF004',
      status: 6,
      show: true,
    },
    createdAt: new Date('2025-01-15'),
    updatedAt: new Date('2025-01-16'),
  },
};

module.exports = { mockRequests, mockStatuses };
