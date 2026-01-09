const {
  createRequest,
  getRequests,
  getRequestByEmployeeServiceNo,
  updateRequest,
  deleteRequest,
  updateRequestStatus,
  getRequestsByStatus,
  getRequestsByItemReturnable,
  getRequestsByReceiverAvailable,
  getRequestImage,
  updateExecutiveOfficer,
  cancelRequest,
} = require('../../../controllers/requestController');
const Request = require('../../../models/Request');
const Status = require('../../../models/Status');
const { uploadImage, getImage } = require('../../../utils/imageUpload');
const { emitNewRequest } = require('../../../utils/socketEmitter');

// Mock dependencies
jest.mock('../../../models/Request');
jest.mock('../../../models/Status');
jest.mock('../../../utils/imageUpload');
jest.mock('../../../utils/socketEmitter');

describe('RequestController', () => {
  let req, res, mockIo;

  beforeEach(() => {
    req = {
      params: {},
      body: {},
      query: {},
      user: {
        serviceNo: 'SV12345',
      },
      files: [],
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
    jest.clearAllMocks();
  });

  describe('createRequest', () => {
    it('should create a new request successfully', async () => {
      // Arrange
      const mockRequest = {
        _id: 'req123',
        referenceNumber: 'REQ-123456',
        employeeServiceNo: 'SV12345',
        items: [],
        outLocation: 'Colombo',
        inLocation: 'Kandy',
      };

      const mockStatus = {
        _id: 'status123',
        referenceNumber: 'REQ-123456',
        save: jest.fn().mockResolvedValue(true),
      };

      req.body = {
        items: JSON.stringify([
          {
            itemName: 'Laptop',
            serialNo: 'LP123',
            itemCategory: 'Electronics',
            itemReturnable: true,
            itemQuantity: 1,
            originalFileNames: [],
          },
        ]),
        outLocation: 'Colombo',
        inLocation: 'Kandy',
        executiveOfficerServiceNo: 'SV99999',
        receiverAvailable: true,
        receiverServiceNo: 'SV88888',
      };

      Request.create = jest.fn().mockResolvedValue(mockRequest);
      Status.mockImplementation(() => mockStatus);

      // Act
      await createRequest(req, res);

      // Assert
      expect(Request.create).toHaveBeenCalled();
      expect(mockStatus.save).toHaveBeenCalled();
      expect(emitNewRequest).toHaveBeenCalledWith(mockIo, mockRequest);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          referenceNumber: expect.any(String),
          request: mockRequest,
          status: mockStatus,
        })
      );
    });

    it('should create request with Non-SLT destination', async () => {
      // Arrange
      const mockRequest = {
        _id: 'req123',
        referenceNumber: 'REQ-123456',
        isNonSltPlace: true,
        companyName: 'External Corp',
      };

      const mockStatus = {
        save: jest.fn().mockResolvedValue(true),
      };

      req.body = {
        items: JSON.stringify([
          {
            itemName: 'Printer',
            serialNo: 'PR123',
            itemCategory: 'Electronics',
            itemReturnable: false,
            itemQuantity: 1,
            originalFileNames: [],
          },
        ]),
        outLocation: 'Colombo',
        executiveOfficerServiceNo: 'SV99999',
        isNonSltPlace: 'true',
        companyName: 'External Corp',
        companyAddress: '123 Street',
        receiverNIC: '123456789V',
        receiverName: 'John Doe',
        receiverContact: '0771234567',
      };

      Request.create = jest.fn().mockResolvedValue(mockRequest);
      Status.mockImplementation(() => mockStatus);

      // Act
      await createRequest(req, res);

      // Assert
      expect(Request.create).toHaveBeenCalledWith(
        expect.objectContaining({
          isNonSltPlace: true,
          companyName: 'External Corp',
          companyAddress: '123 Street',
        })
      );
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('should handle errors during request creation', async () => {
      // Arrange
      const mockError = new Error('Database error');
      req.body = {
        items: JSON.stringify([]),
        outLocation: 'Colombo',
        inLocation: 'Kandy',
        executiveOfficerServiceNo: 'SV99999',
      };

      Request.create = jest.fn().mockRejectedValue(mockError);

      // Act
      await createRequest(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: mockError.message,
      });
    });
  });

  describe('getRequests', () => {
    it('should return all requests', async () => {
      // Arrange
      const mockRequests = [
        { _id: '1', referenceNumber: 'REQ-001' },
        { _id: '2', referenceNumber: 'REQ-002' },
      ];

      Request.find = jest.fn().mockResolvedValue(mockRequests);

      // Act
      await getRequests(req, res);

      // Assert
      expect(Request.find).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(mockRequests);
    });

    it('should handle errors when fetching requests', async () => {
      // Arrange
      const mockError = new Error('Database error');
      Request.find = jest.fn().mockRejectedValue(mockError);

      // Act
      await getRequests(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: mockError.message });
    });
  });

  describe('getRequestByEmployeeServiceNo', () => {
    it('should return requests for a specific employee', async () => {
      // Arrange
      const mockRequests = [
        {
          _id: '1',
          referenceNumber: 'REQ-001',
          employeeServiceNo: 'SV12345',
          toObject: jest.fn().mockReturnValue({
            _id: '1',
            referenceNumber: 'REQ-001',
            employeeServiceNo: 'SV12345',
          }),
        },
      ];

      const mockStatus = {
        afterStatus: 2,
        executiveOfficerStatus: 2,
      };

      req.params.serviceNo = 'SV12345';
      Request.find = jest.fn().mockResolvedValue(mockRequests);
      Status.findOne = jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockStatus),
      });

      // Act
      await getRequestByEmployeeServiceNo(req, res);

      // Assert
      expect(Request.find).toHaveBeenCalledWith({
        employeeServiceNo: 'SV12345',
      });
      expect(res.json).toHaveBeenCalledWith(expect.any(Array));
    });

    it('should return 404 when no requests found', async () => {
      // Arrange
      req.params.serviceNo = 'SV99999';
      Request.find = jest.fn().mockResolvedValue([]);

      // Act
      await getRequestByEmployeeServiceNo(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'No requests found' });
    });

    it('should handle errors when fetching employee requests', async () => {
      // Arrange
      const mockError = new Error('Database error');
      req.params.serviceNo = 'SV12345';
      Request.find = jest.fn().mockRejectedValue(mockError);

      // Act
      await getRequestByEmployeeServiceNo(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: mockError.message });
    });
  });

  describe('updateRequest', () => {
    it('should update a request successfully', async () => {
      // Arrange
      const mockUpdatedRequest = {
        _id: 'req123',
        outLocation: 'Galle',
        inLocation: 'Jaffna',
      };

      req.params.id = 'req123';
      req.body = {
        items: JSON.stringify([
          {
            itemName: 'Monitor',
            serialNo: 'MN123',
            itemCategory: 'Electronics',
            itemReturnable: true,
            itemQuantity: 1,
          },
        ]),
        outLocation: 'Galle',
        inLocation: 'Jaffna',
        receiverAvailable: true,
      };

      Request.findByIdAndUpdate = jest
        .fn()
        .mockResolvedValue(mockUpdatedRequest);

      // Act
      await updateRequest(req, res);

      // Assert
      expect(Request.findByIdAndUpdate).toHaveBeenCalledWith(
        'req123',
        expect.any(Object),
        { new: true }
      );
      expect(res.json).toHaveBeenCalledWith(mockUpdatedRequest);
    });

    it('should return 404 when request not found', async () => {
      // Arrange
      req.params.id = 'nonexistent';
      req.body = {
        items: JSON.stringify([]),
        outLocation: 'Colombo',
      };

      Request.findByIdAndUpdate = jest.fn().mockResolvedValue(null);

      // Act
      await updateRequest(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'Request not found' });
    });

    it('should handle errors during update', async () => {
      // Arrange
      const mockError = new Error('Update failed');
      req.params.id = 'req123';
      req.body = {
        items: JSON.stringify([]),
      };

      Request.findByIdAndUpdate = jest.fn().mockRejectedValue(mockError);

      // Act
      await updateRequest(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: mockError.message });
    });
  });

  describe('deleteRequest', () => {
    it('should delete a request successfully', async () => {
      // Arrange
      const mockRequest = {
        _id: 'req123',
        referenceNumber: 'REQ-123',
      };

      req.params.id = 'req123';
      Request.findByIdAndDelete = jest.fn().mockResolvedValue(mockRequest);

      // Act
      await deleteRequest(req, res);

      // Assert
      expect(Request.findByIdAndDelete).toHaveBeenCalledWith('req123');
      expect(res.json).toHaveBeenCalledWith({
        message: 'Request deleted successfully',
      });
    });

    it('should return 404 when request not found', async () => {
      // Arrange
      req.params.id = 'nonexistent';
      Request.findByIdAndDelete = jest.fn().mockResolvedValue(null);

      // Act
      await deleteRequest(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'Request not found' });
    });

    it('should handle errors during deletion', async () => {
      // Arrange
      const mockError = new Error('Delete failed');
      req.params.id = 'req123';
      Request.findByIdAndDelete = jest.fn().mockRejectedValue(mockError);

      // Act
      await deleteRequest(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: mockError.message });
    });
  });

  describe('updateRequestStatus', () => {
    it('should update request status successfully', async () => {
      // Arrange
      const mockRequest = {
        _id: 'req123',
        status: 2,
      };

      req.params.id = 'req123';
      req.body.status = 2;

      Request.findByIdAndUpdate = jest.fn().mockResolvedValue(mockRequest);

      // Act
      await updateRequestStatus(req, res);

      // Assert
      expect(Request.findByIdAndUpdate).toHaveBeenCalledWith(
        'req123',
        { status: 2 },
        { new: true }
      );
      expect(res.json).toHaveBeenCalledWith(mockRequest);
    });

    it('should return 404 when request not found', async () => {
      // Arrange
      req.params.id = 'nonexistent';
      req.body.status = 2;

      Request.findByIdAndUpdate = jest.fn().mockResolvedValue(null);

      // Act
      await updateRequestStatus(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'Request not found' });
    });
  });

  describe('getRequestsByStatus', () => {
    it('should return requests by status', async () => {
      // Arrange
      const mockRequests = [
        { _id: '1', status: 2 },
        { _id: '2', status: 2 },
      ];

      req.params.status = '2';
      Request.find = jest.fn().mockResolvedValue(mockRequests);

      // Act
      await getRequestsByStatus(req, res);

      // Assert
      expect(Request.find).toHaveBeenCalledWith({ status: 2 });
      expect(res.json).toHaveBeenCalledWith(mockRequests);
    });

    it('should handle errors when fetching by status', async () => {
      // Arrange
      const mockError = new Error('Database error');
      req.params.status = '2';
      Request.find = jest.fn().mockRejectedValue(mockError);

      // Act
      await getRequestsByStatus(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: mockError.message });
    });
  });

  describe('getRequestsByItemReturnable', () => {
    it('should return requests with returnable items', async () => {
      // Arrange
      const mockRequests = [{ _id: '1', items: [{ itemReturnable: true }] }];

      req.params.returnable = 'true';
      Request.find = jest.fn().mockResolvedValue(mockRequests);

      // Act
      await getRequestsByItemReturnable(req, res);

      // Assert
      expect(Request.find).toHaveBeenCalledWith({
        'items.itemReturnable': true,
      });
      expect(res.json).toHaveBeenCalledWith(mockRequests);
    });

    it('should return requests with non-returnable items', async () => {
      // Arrange
      const mockRequests = [{ _id: '1', items: [{ itemReturnable: false }] }];

      req.params.returnable = 'false';
      Request.find = jest.fn().mockResolvedValue(mockRequests);

      // Act
      await getRequestsByItemReturnable(req, res);

      // Assert
      expect(Request.find).toHaveBeenCalledWith({
        'items.itemReturnable': false,
      });
      expect(res.json).toHaveBeenCalledWith(mockRequests);
    });
  });

  describe('getRequestsByReceiverAvailable', () => {
    it('should return requests where receiver is available', async () => {
      // Arrange
      const mockRequests = [{ _id: '1', receiverAvailable: true }];

      req.params.available = 'true';
      Request.find = jest.fn().mockResolvedValue(mockRequests);

      // Act
      await getRequestsByReceiverAvailable(req, res);

      // Assert
      expect(Request.find).toHaveBeenCalledWith({ receiverAvailable: true });
      expect(res.json).toHaveBeenCalledWith(mockRequests);
    });

    it('should return requests where receiver is not available', async () => {
      // Arrange
      const mockRequests = [{ _id: '1', receiverAvailable: false }];

      req.params.available = 'false';
      Request.find = jest.fn().mockResolvedValue(mockRequests);

      // Act
      await getRequestsByReceiverAvailable(req, res);

      // Assert
      expect(Request.find).toHaveBeenCalledWith({ receiverAvailable: false });
      expect(res.json).toHaveBeenCalledWith(mockRequests);
    });
  });

  describe('getRequestImage', () => {
    it('should return image URL successfully', async () => {
      // Arrange
      const mockImageUrl = 'https://example.com/image.jpg';
      req.params.path = 'items%2Fimage.jpg';

      getImage.mockResolvedValue(mockImageUrl);

      // Act
      await getRequestImage(req, res);

      // Assert
      expect(getImage).toHaveBeenCalledWith('items/image.jpg');
      expect(res.json).toHaveBeenCalledWith({ url: mockImageUrl });
    });

    it('should handle errors when fetching image', async () => {
      // Arrange
      const mockError = new Error('Image not found');
      req.params.path = 'invalid-path';

      getImage.mockRejectedValue(mockError);

      // Act
      await getRequestImage(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Failed to get image URL',
      });
    });
  });

  describe('updateExecutiveOfficer', () => {
    it('should update executive officer successfully', async () => {
      // Arrange
      const mockRequest = {
        _id: 'req123',
        executiveOfficerServiceNo: 'SV77777',
      };

      const mockStatus = {
        _id: 'status123',
        executiveOfficerServiceNo: 'SV77777',
      };

      req.params.id = 'req123';
      req.body.executiveOfficerServiceNo = 'SV77777';

      Request.findByIdAndUpdate = jest.fn().mockResolvedValue(mockRequest);
      Status.findOneAndUpdate = jest.fn().mockResolvedValue(mockStatus);

      // Act
      await updateExecutiveOfficer(req, res);

      // Assert
      expect(Request.findByIdAndUpdate).toHaveBeenCalledWith(
        'req123',
        { executiveOfficerServiceNo: 'SV77777' },
        { new: true }
      );
      expect(Status.findOneAndUpdate).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        updatedRequest: mockRequest,
        updateExServiceNo: mockStatus,
      });
    });

    it('should return 404 when request not found', async () => {
      // Arrange
      req.params.id = 'nonexistent';
      req.body.executiveOfficerServiceNo = 'SV77777';

      Request.findByIdAndUpdate = jest.fn().mockResolvedValue(null);

      // Act
      await updateExecutiveOfficer(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'Request not found' });
    });
  });

  describe('cancelRequest', () => {
    it('should cancel a pending request successfully', async () => {
      // Arrange
      const mockRequest = {
        _id: 'req123',
        referenceNumber: 'REQ-123',
        status: 13,
        show: false,
      };

      req.params.referenceNumber = 'REQ-123';
      Request.findOneAndUpdate = jest.fn().mockResolvedValue(mockRequest);

      // Act
      await cancelRequest(req, res);

      // Assert
      expect(Request.findOneAndUpdate).toHaveBeenCalledWith(
        { referenceNumber: 'REQ-123', status: 1 },
        { status: 13, show: false },
        { new: true }
      );
      expect(res.json).toHaveBeenCalledWith({
        message: 'Request canceled successfully',
        request: mockRequest,
      });
    });

    it('should return 404 when request cannot be canceled', async () => {
      // Arrange
      req.params.referenceNumber = 'REQ-999';
      Request.findOneAndUpdate = jest.fn().mockResolvedValue(null);

      // Act
      await cancelRequest(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Request not found or cannot be canceled',
      });
    });

    it('should handle errors during cancellation', async () => {
      // Arrange
      const mockError = new Error('Cancellation failed');
      req.params.referenceNumber = 'REQ-123';
      Request.findOneAndUpdate = jest.fn().mockRejectedValue(mockError);

      // Act
      await cancelRequest(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: mockError.message });
    });
  });
});
