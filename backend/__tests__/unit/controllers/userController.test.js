const {
  getUserByServiceNo,
  getUserByRole,
  getUserByRoleAndBranch,
} = require('../../../controllers/userController');
const User = require('../../../models/User');

// Mock the User model
jest.mock('../../../models/User');

describe('UserController', () => {
  let req, res;

  beforeEach(() => {
    // Setup request and response objects
    req = {
      params: {},
      body: {},
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  describe('getUserByServiceNo', () => {
    it('should return user data when user is found', async () => {
      // Arrange
      const mockUser = {
        serviceNo: 'SV12345',
        name: 'John Doe',
        designation: 'Manager',
        section: 'IT',
        group: 'Group A',
        contactNo: '0771234567',
        role: 'Admin',
        email: 'john@example.com',
        branches: ['Branch A'],
      };

      req.params.serviceNo = 'SV12345';
      User.findOne = jest.fn().mockResolvedValue(mockUser);

      // Act
      await getUserByServiceNo(req, res);

      // Assert
      expect(User.findOne).toHaveBeenCalledWith({ serviceNo: 'SV12345' });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        serviceNo: mockUser.serviceNo,
        name: mockUser.name,
        designation: mockUser.designation,
        section: mockUser.section,
        group: mockUser.group,
        contactNo: mockUser.contactNo,
        role: mockUser.role,
        email: mockUser.email,
        branches: mockUser.branches,
      });
    });

    it('should return 404 when user is not found', async () => {
      // Arrange
      req.params.serviceNo = 'SV99999';
      User.findOne = jest.fn().mockResolvedValue(null);

      // Act
      await getUserByServiceNo(req, res);

      // Assert
      expect(User.findOne).toHaveBeenCalledWith({ serviceNo: 'SV99999' });
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'User not found' });
    });

    it('should handle server errors gracefully', async () => {
      // Arrange
      const mockError = new Error('Database connection failed');
      req.params.serviceNo = 'SV12345';
      User.findOne = jest.fn().mockRejectedValue(mockError);

      // Act
      await getUserByServiceNo(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Server error',
        error: mockError.message,
      });
    });
  });

  describe('getUserByRole', () => {
    it('should return all users with specified role', async () => {
      // Arrange
      const mockUsers = [
        {
          serviceNo: 'SV11111',
          name: 'Alice',
          designation: 'Admin',
          section: 'IT',
          group: 'Group A',
          contactNo: '0771111111',
          role: 'Admin',
          email: 'alice@example.com',
        },
        {
          serviceNo: 'SV22222',
          name: 'Bob',
          designation: 'Admin',
          section: 'HR',
          group: 'Group B',
          contactNo: '0772222222',
          role: 'Admin',
          email: 'bob@example.com',
        },
      ];

      req.params.role = 'Admin';
      User.findByRole = jest.fn().mockResolvedValue(mockUsers);

      // Act
      await getUserByRole(req, res);

      // Assert
      expect(User.findByRole).toHaveBeenCalledWith('Admin');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith([
        {
          serviceNo: 'SV11111',
          name: 'Alice',
          designation: 'Admin',
          section: 'IT',
          group: 'Group A',
          contactNo: '0771111111',
          role: 'Admin',
          email: 'alice@example.com',
        },
        {
          serviceNo: 'SV22222',
          name: 'Bob',
          designation: 'Admin',
          section: 'HR',
          group: 'Group B',
          contactNo: '0772222222',
          role: 'Admin',
          email: 'bob@example.com',
        },
      ]);
    });

    it('should return empty array when no users found with role', async () => {
      // Arrange
      req.params.role = 'SuperAdmin';
      User.findByRole = jest.fn().mockResolvedValue([]);

      // Act
      await getUserByRole(req, res);

      // Assert
      expect(User.findByRole).toHaveBeenCalledWith('SuperAdmin');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith([]);
    });

    it('should handle server errors gracefully', async () => {
      // Arrange
      const mockError = new Error('Database error');
      req.params.role = 'Admin';
      User.findByRole = jest.fn().mockRejectedValue(mockError);

      // Act
      await getUserByRole(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Server error',
        error: mockError.message,
      });
    });
  });

  describe('getUserByRoleAndBranch', () => {
    it('should return users with Pleader role in specified branch', async () => {
      // Arrange
      const mockUsers = [
        {
          serviceNo: 'SV33333',
          name: 'Charlie',
          designation: 'Pleader',
          section: 'Logistics',
          group: 'Group C',
          contactNo: '0773333333',
          role: 'Pleader',
          email: 'charlie@example.com',
        },
      ];

      req.params.branch = 'Colombo';
      User.find = jest.fn().mockResolvedValue(mockUsers);

      // Act
      await getUserByRoleAndBranch(req, res);

      // Assert
      expect(User.find).toHaveBeenCalledWith({
        role: 'Pleader',
        branches: { $in: ['Colombo'] },
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith([
        {
          serviceNo: 'SV33333',
          name: 'Charlie',
          designation: 'Pleader',
          section: 'Logistics',
          group: 'Group C',
          contactNo: '0773333333',
          role: 'Pleader',
          email: 'charlie@example.com',
        },
      ]);
    });

    it('should return empty array when no Pleaders found in branch', async () => {
      // Arrange
      req.params.branch = 'Kandy';
      User.find = jest.fn().mockResolvedValue([]);

      // Act
      await getUserByRoleAndBranch(req, res);

      // Assert
      expect(User.find).toHaveBeenCalledWith({
        role: 'Pleader',
        branches: { $in: ['Kandy'] },
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith([]);
    });

    it('should handle multiple users in the same branch', async () => {
      // Arrange
      const mockUsers = [
        {
          serviceNo: 'SV44444',
          name: 'David',
          designation: 'Pleader',
          section: 'Logistics',
          group: 'Group D',
          contactNo: '0774444444',
          role: 'Pleader',
          email: 'david@example.com',
        },
        {
          serviceNo: 'SV55555',
          name: 'Eve',
          designation: 'Pleader',
          section: 'Logistics',
          group: 'Group E',
          contactNo: '0775555555',
          role: 'Pleader',
          email: 'eve@example.com',
        },
      ];

      req.params.branch = 'Galle';
      User.find = jest.fn().mockResolvedValue(mockUsers);

      // Act
      await getUserByRoleAndBranch(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.arrayContaining(mockUsers));
      expect(res.json.mock.calls[0][0]).toHaveLength(2);
    });

    it('should handle server errors gracefully', async () => {
      // Arrange
      const mockError = new Error('Database query failed');
      req.params.branch = 'Colombo';
      User.find = jest.fn().mockRejectedValue(mockError);

      // Act
      await getUserByRoleAndBranch(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Server error',
        error: mockError.message,
      });
    });
  });
});
