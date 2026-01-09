const {
  getPending,
  getApproved,
  getRejected,
  updateApproved,
  updateRejected,
} = require('../../../controllers/verifyController');
const Status = require('../../../models/Status');
const Request = require('../../../models/Request');
const User = require('../../../models/User');
const { sendEmail } = require('../../../utils/sendMail');
const {
  emitRequestApproval,
  emitRequestRejection,
} = require('../../../utils/socketEmitter');

// Mock dependencies
jest.mock('../../../models/Status');
jest.mock('../../../models/Request');
jest.mock('../../../models/User');
jest.mock('../../../utils/sendMail');
jest.mock('../../../utils/socketEmitter');

describe('VerifyController', () => {
  let req, res, mockIo;

  beforeEach(() => {
    // Setup request and response objects
    req = {
      params: {},
      body: {},
      query: {},
      user: {
        serviceNo: 'SV12345',
        branches: ['Colombo'],
        name: 'Test Verifier',
      },
      app: {
        get: jest.fn(),
      },
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    mockIo = {
      emit: jest.fn(),
      to: jest.fn().mockReturnThis(),
    };

    req.app.get.mockReturnValue(mockIo);

    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  describe('getPending', () => {
    it('should return pending verification requests', async () => {
      // Arrange
      const mockStatuses = [
        {
          _id: 'status1',
          referenceNumber: 'REF001',
          verifyOfficerStatus: 1,
          request: {
            _id: 'req1',
            show: true,
            outLocation: 'Colombo',
          },
          updatedAt: new Date('2025-01-15'),
          createdAt: new Date('2025-01-14'),
        },
        {
          _id: 'status2',
          referenceNumber: 'REF002',
          verifyOfficerStatus: 1,
          request: {
            _id: 'req2',
            show: true,
            outLocation: 'Kandy',
          },
          updatedAt: new Date('2025-01-16'),
          createdAt: new Date('2025-01-15'),
        },
      ];

      const mockQuery = {
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockStatuses),
      };

      Status.find = jest.fn().mockReturnValue(mockQuery);

      // Act
      await getPending(req, res);

      // Assert
      expect(Status.find).toHaveBeenCalledWith({ verifyOfficerStatus: 1 });
      expect(res.json).toHaveBeenCalledWith(expect.any(Array));
      expect(res.json.mock.calls[0][0]).toHaveLength(2);
    });

    it('should filter by outLocation when provided', async () => {
      // Arrange
      const mockStatuses = [
        {
          _id: 'status1',
          referenceNumber: 'REF001',
          verifyOfficerStatus: 1,
          request: {
            _id: 'req1',
            show: true,
            outLocation: 'Colombo',
          },
          updatedAt: new Date('2025-01-15'),
        },
        {
          _id: 'status2',
          referenceNumber: 'REF002',
          verifyOfficerStatus: 1,
          request: {
            _id: 'req2',
            show: true,
            outLocation: 'Kandy',
          },
          updatedAt: new Date('2025-01-16'),
        },
      ];

      const mockQuery = {
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockStatuses),
      };

      Status.find = jest.fn().mockReturnValue(mockQuery);
      req.query.outLocation = 'Colombo';

      // Act
      await getPending(req, res);

      // Assert
      expect(res.json).toHaveBeenCalled();
      const returnedData = res.json.mock.calls[0][0];
      expect(returnedData).toHaveLength(1);
      expect(returnedData[0].request.outLocation).toBe('Colombo');
    });

    it('should handle errors gracefully', async () => {
      // Arrange
      const mockError = new Error('Database error');
      Status.find = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockRejectedValue(mockError),
      });

      // Act
      await getPending(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Internal server error',
      });
    });

    it('should remove duplicate reference numbers', async () => {
      // Arrange
      const mockStatuses = [
        {
          _id: 'status1',
          referenceNumber: 'REF001',
          verifyOfficerStatus: 1,
          request: { show: true },
          updatedAt: new Date('2025-01-15'),
        },
        {
          _id: 'status2',
          referenceNumber: 'REF001', // Duplicate
          verifyOfficerStatus: 1,
          request: { show: true },
          updatedAt: new Date('2025-01-14'),
        },
      ];

      const mockQuery = {
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockStatuses),
      };

      Status.find = jest.fn().mockReturnValue(mockQuery);

      // Act
      await getPending(req, res);

      // Assert
      const returnedData = res.json.mock.calls[0][0];
      expect(returnedData).toHaveLength(1);
    });
  });

  describe('getApproved', () => {
    it('should return approved verification requests', async () => {
      // Arrange
      const mockRejectedRefs = [];
      const mockStatuses = [
        {
          _id: 'status1',
          referenceNumber: 'REF001',
          verifyOfficerStatus: 2,
          request: {
            show: true,
            outLocation: 'Colombo',
          },
          updatedAt: new Date('2025-01-15'),
        },
      ];

      Status.find = jest
        .fn()
        .mockReturnValueOnce({
          distinct: jest.fn().mockResolvedValue(mockRejectedRefs),
        })
        .mockReturnValueOnce({
          populate: jest.fn().mockReturnThis(),
          sort: jest.fn().mockReturnThis(),
          lean: jest.fn().mockResolvedValue(mockStatuses),
        });

      // Act
      await getApproved(req, res);

      // Assert
      expect(res.json).toHaveBeenCalled();
      expect(res.json.mock.calls[0][0]).toHaveLength(1);
    });

    it('should exclude rejected reference numbers', async () => {
      // Arrange
      const mockRejectedRefs = ['REF002'];
      const mockStatuses = [
        {
          _id: 'status1',
          referenceNumber: 'REF001',
          verifyOfficerStatus: 2,
          request: { show: true },
          updatedAt: new Date('2025-01-15'),
        },
      ];

      Status.find = jest
        .fn()
        .mockReturnValueOnce({
          distinct: jest.fn().mockResolvedValue(mockRejectedRefs),
        })
        .mockReturnValueOnce({
          populate: jest.fn().mockReturnThis(),
          sort: jest.fn().mockReturnThis(),
          lean: jest.fn().mockResolvedValue(mockStatuses),
        });

      // Act
      await getApproved(req, res);

      // Assert
      expect(Status.find).toHaveBeenCalledWith(
        expect.objectContaining({
          referenceNumber: { $nin: mockRejectedRefs },
        })
      );
    });

    it('should handle errors gracefully', async () => {
      // Arrange
      const mockError = new Error('Database error');
      Status.find = jest.fn().mockReturnValue({
        distinct: jest.fn().mockRejectedValue(mockError),
      });

      // Act
      await getApproved(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Internal server error',
      });
    });
  });

  describe('getRejected', () => {
    it('should return rejected verification requests', async () => {
      // Arrange
      const mockStatuses = [
        {
          _id: 'status1',
          referenceNumber: 'REF001',
          verifyOfficerStatus: 3,
          request: {
            show: true,
            outLocation: 'Colombo',
          },
          updatedAt: new Date('2025-01-15'),
        },
      ];

      const mockQuery = {
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockStatuses),
      };

      Status.find = jest.fn().mockReturnValue(mockQuery);

      // Act
      await getRejected(req, res);

      // Assert
      expect(res.json).toHaveBeenCalled();
      expect(res.json.mock.calls[0][0]).toHaveLength(1);
    });

    it('should include requests rejected by higher levels', async () => {
      // Arrange
      const mockStatuses = [
        {
          _id: 'status1',
          referenceNumber: 'REF001',
          verifyOfficerStatus: 2, // Verifier approved
          afterStatus: 9, // But rejected by Dispatcher
          request: { show: true },
          updatedAt: new Date('2025-01-15'),
        },
      ];

      const mockQuery = {
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockStatuses),
      };

      Status.find = jest.fn().mockReturnValue(mockQuery);

      // Act
      await getRejected(req, res);

      // Assert
      expect(res.json).toHaveBeenCalled();
      expect(res.json.mock.calls[0][0]).toHaveLength(1);
    });

    it('should handle errors gracefully', async () => {
      // Arrange
      const mockError = new Error('Database error');
      Status.find = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockRejectedValue(mockError),
      });

      // Act
      await getRejected(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Internal server error',
      });
    });
  });

  describe('updateApproved', () => {
    it('should approve a request successfully for SLT location', async () => {
      // Arrange
      const mockStatus = {
        _id: 'status1',
        referenceNumber: 'REF001',
        verifyOfficerStatus: 1,
        request: {
          _id: 'req1',
          outLocation: 'Colombo',
          inLocation: 'Kandy',
          isNonSltPlace: false,
          receiverAvailable: true,
          status: 4,
          save: jest.fn().mockResolvedValue(true),
        },
        save: jest.fn().mockResolvedValue(true),
      };

      const mockSavedStatus = {
        ...mockStatus,
        verifyOfficerStatus: 2,
        afterStatus: 2,
        request: mockStatus.request,
      };

      req.params.referenceNumber = 'REF001';
      req.body.comment = 'Approved by verifier';

      const mockQuery = {
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockResolvedValue(mockStatus),
      };

      Status.findOne = jest
        .fn()
        .mockReturnValueOnce(mockQuery)
        .mockReturnValueOnce({
          populate: jest.fn().mockReturnThis(),
          lean: jest.fn().mockResolvedValue(mockSavedStatus),
        });

      Status.findById = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockSavedStatus),
      });

      User.findOne = jest.fn().mockResolvedValue({
        serviceNo: 'SV99999',
        name: 'Petrol Leader',
        email: 'pleader@example.com',
        branches: ['Kandy'],
      });

      // Act
      await updateApproved(req, res);

      // Assert
      expect(mockStatus.save).toHaveBeenCalled();
      expect(mockStatus.request.save).toHaveBeenCalled();
      expect(mockStatus.verifyOfficerStatus).toBe(2);
      expect(res.json).toHaveBeenCalledWith(mockSavedStatus);
    });

    it('should handle Non-SLT destination correctly', async () => {
      // Arrange
      const mockStatus = {
        _id: 'status1',
        referenceNumber: 'REF001',
        verifyOfficerStatus: 1,
        request: {
          _id: 'req1',
          outLocation: 'Colombo',
          inLocation: null,
          isNonSltPlace: true,
          companyName: 'External Company',
          status: 4,
          save: jest.fn().mockResolvedValue(true),
        },
        save: jest.fn().mockResolvedValue(true),
      };

      const mockSavedStatus = {
        ...mockStatus,
        verifyOfficerStatus: 2,
        afterStatus: 2,
        request: mockStatus.request,
      };

      req.params.referenceNumber = 'REF001';
      req.body.comment = 'Approved for Non-SLT';

      const mockQuery = {
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockResolvedValue(mockStatus),
      };

      Status.findOne = jest.fn().mockReturnValue(mockQuery);
      Status.findById = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockSavedStatus),
      });

      User.findOne = jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue({
          serviceNo: 'SV99999',
          name: 'Dispatch Officer',
          email: 'dispatch@example.com',
          branches: ['Colombo'],
        }),
      });

      // Act
      await updateApproved(req, res);

      // Assert
      expect(mockStatus.save).toHaveBeenCalled();
      expect(mockStatus.request.status).toBe(5); // Verify Approved - waiting for Dispatch
      expect(sendEmail).toHaveBeenCalled();
    });

    it('should return 404 if status not found', async () => {
      // Arrange
      req.params.referenceNumber = 'REF999';

      Status.findOne = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockResolvedValue(null),
      });

      // Act
      await updateApproved(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Status/Request not found',
      });
    });

    it('should handle errors gracefully', async () => {
      // Arrange
      const mockError = new Error('Database error');
      req.params.referenceNumber = 'REF001';

      Status.findOne = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockRejectedValue(mockError),
      });

      // Act
      await updateApproved(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Internal server error',
      });
    });

    it('should emit real-time approval event', async () => {
      // Arrange
      const mockStatus = {
        _id: 'status1',
        referenceNumber: 'REF001',
        verifyOfficerStatus: 1,
        request: {
          _id: 'req1',
          outLocation: 'Colombo',
          inLocation: 'Kandy',
          isNonSltPlace: false,
          save: jest.fn().mockResolvedValue(true),
        },
        save: jest.fn().mockResolvedValue(true),
      };

      const mockSavedStatus = {
        ...mockStatus,
        verifyOfficerStatus: 2,
        request: mockStatus.request,
      };

      req.params.referenceNumber = 'REF001';

      Status.findOne = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockResolvedValue(mockStatus),
      });

      Status.findById = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockSavedStatus),
      });

      User.findOne = jest.fn().mockResolvedValue({
        email: 'pleader@example.com',
        name: 'Petrol Leader',
      });

      // Act
      await updateApproved(req, res);

      // Assert
      expect(emitRequestApproval).toHaveBeenCalledWith(
        mockIo,
        mockSavedStatus.request,
        'Verifier'
      );
    });
  });

  describe('updateRejected', () => {
    it('should reject a request with comment', async () => {
      // Arrange
      const mockStatus = {
        _id: 'status1',
        referenceNumber: 'REF001',
        verifyOfficerStatus: 1,
        request: {
          _id: 'req1',
          requesterServiceNo: 'SV11111',
          executiveOfficerServiceNo: 'SV22222',
        },
        save: jest.fn().mockResolvedValue(true),
      };

      const mockSavedStatus = {
        ...mockStatus,
        verifyOfficerStatus: 3,
        afterStatus: 6,
        verifyOfficerComment: 'Missing documentation',
        rejectedBy: 'Verifier',
        rejectedByServiceNo: 'SV12345',
        rejectedByBranch: 'Colombo',
      };

      req.params.referenceNumber = 'REF001';
      req.body.comment = 'Missing documentation';

      Status.findOne = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockResolvedValue(mockStatus),
      });

      Status.findById = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockSavedStatus),
      });

      User.findOne = jest
        .fn()
        .mockReturnValueOnce({
          // Requester
          lean: jest.fn().mockResolvedValue({
            email: 'requester@example.com',
            name: 'Requester Name',
          }),
        })
        .mockReturnValueOnce({
          // Executive
          lean: jest.fn().mockResolvedValue({
            email: 'executive@example.com',
            name: 'Executive Name',
          }),
        });

      // Act
      await updateRejected(req, res);

      // Assert
      expect(mockStatus.save).toHaveBeenCalled();
      expect(mockStatus.verifyOfficerStatus).toBe(3);
      expect(mockStatus.afterStatus).toBe(6);
      expect(mockStatus.verifyOfficerComment).toBe('Missing documentation');
      expect(res.json).toHaveBeenCalledWith(mockSavedStatus);
    });

    it('should return 400 if no comment provided', async () => {
      // Arrange
      req.params.referenceNumber = 'REF001';
      req.body.comment = '';

      // Act
      await updateRejected(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Rejection comment is required.',
      });
    });

    it('should return 404 if status not found', async () => {
      // Arrange
      req.params.referenceNumber = 'REF999';
      req.body.comment = 'Not found';

      Status.findOne = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockResolvedValue(null),
      });

      // Act
      await updateRejected(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Status/Request not found',
      });
    });

    it('should send email notifications to requester and executive', async () => {
      // Arrange
      const mockStatus = {
        _id: 'status1',
        referenceNumber: 'REF001',
        verifyOfficerStatus: 1,
        verifyOfficerComment: '',
        request: {
          _id: 'req1',
          requesterServiceNo: 'SV11111',
          executiveOfficerServiceNo: 'SV22222',
        },
        save: jest.fn().mockResolvedValue(true),
      };

      req.params.referenceNumber = 'REF001';
      req.body.comment = 'Rejected due to incomplete info';

      Status.findOne = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockResolvedValue(mockStatus),
      });

      Status.findById = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockStatus),
      });

      User.findOne = jest
        .fn()
        .mockReturnValueOnce({
          lean: jest.fn().mockResolvedValue({
            email: 'requester@example.com',
            name: 'Requester',
          }),
        })
        .mockReturnValueOnce({
          lean: jest.fn().mockResolvedValue({
            email: 'executive@example.com',
            name: 'Executive',
          }),
        });

      // Act
      await updateRejected(req, res);

      // Assert
      expect(sendEmail).toHaveBeenCalledTimes(2);
      expect(sendEmail).toHaveBeenCalledWith(
        'requester@example.com',
        expect.stringContaining('rejected by Verifier'),
        expect.any(String)
      );
      expect(sendEmail).toHaveBeenCalledWith(
        'executive@example.com',
        expect.stringContaining('rejected at Verifier stage'),
        expect.any(String)
      );
    });

    it('should emit real-time rejection event', async () => {
      // Arrange
      const mockStatus = {
        _id: 'status1',
        referenceNumber: 'REF001',
        verifyOfficerStatus: 1,
        request: {
          _id: 'req1',
        },
        save: jest.fn().mockResolvedValue(true),
      };

      const mockSavedStatus = {
        ...mockStatus,
        verifyOfficerStatus: 3,
        request: mockStatus.request,
      };

      req.params.referenceNumber = 'REF001';
      req.body.comment = 'Rejection reason';

      Status.findOne = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockResolvedValue(mockStatus),
      });

      Status.findById = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockSavedStatus),
      });

      User.findOne = jest.fn().mockResolvedValue(null);

      // Act
      await updateRejected(req, res);

      // Assert
      expect(emitRequestRejection).toHaveBeenCalledWith(
        mockIo,
        mockSavedStatus.request,
        'Verifier'
      );
    });

    it('should handle errors gracefully', async () => {
      // Arrange
      const mockError = new Error('Database error');
      req.params.referenceNumber = 'REF001';
      req.body.comment = 'Test comment';

      Status.findOne = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockRejectedValue(mockError),
      });

      // Act
      await updateRejected(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Internal server error',
      });
    });
  });
});
