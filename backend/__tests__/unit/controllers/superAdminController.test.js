const {
  getAllUsers,
  createUser,
  updateUser,
  deleteUser,
  getUserById,
  getUsersByType,
} = require('../../../controllers/superAdminController');
const User = require('../../../models/User');
const bcrypt = require('bcryptjs');

// Mock dependencies
jest.mock('../../../models/User');
jest.mock('bcryptjs');

describe('SuperAdminController', () => {
  let req, res;

  beforeEach(() => {
    req = {
      params: {},
      body: {},
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    jest.clearAllMocks();
  });

  describe('getAllUsers', () => {
    it('should return all users without passwords', async () => {
      // Arrange
      const mockUsers = [
        {
          _id: '1',
          userId: 'user1',
          name: 'John Doe',
          role: 'Admin',
        },
        {
          _id: '2',
          userId: 'user2',
          name: 'Jane Smith',
          role: 'User',
        },
      ];

      User.find = jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue(mockUsers),
      });

      // Act
      await getAllUsers(req, res);

      // Assert
      expect(User.find).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockUsers);
    });

    it('should handle errors when fetching users', async () => {
      // Arrange
      const mockError = new Error('Database error');
      User.find = jest.fn().mockReturnValue({
        select: jest.fn().mockRejectedValue(mockError),
      });

      // Act
      await getAllUsers(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Server error',
        error: mockError.message,
      });
    });
  });

  describe('createUser', () => {
    it('should create a new user successfully', async () => {
      // Arrange
      const mockUser = {
        _id: 'user123',
        userId: 'newuser',
        name: 'New User',
        email: 'new@example.com',
        role: 'Requester',
      };

      req.body = {
        userType: 'SLT',
        userId: 'newuser',
        password: 'password123',
        serviceNo: 'SV12345',
        name: 'New User',
        designation: 'Engineer',
        section: 'IT',
        group: 'Group A',
        contactNo: '0771234567',
        role: 'Requester',
        email: 'new@example.com',
        branches: ['Colombo'],
      };

      User.findOne = jest.fn().mockResolvedValue(null);
      bcrypt.genSalt = jest.fn().mockResolvedValue('salt');
      bcrypt.hash = jest.fn().mockResolvedValue('hashedPassword');
      User.create = jest.fn().mockResolvedValue({ _id: 'user123' });
      User.findById = jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue(mockUser),
      });

      // Act
      await createUser(req, res);

      // Assert
      expect(User.findOne).toHaveBeenCalledWith({ userId: 'newuser' });
      expect(bcrypt.genSalt).toHaveBeenCalledWith(10);
      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 'salt');
      expect(User.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'newuser',
          password: 'hashedPassword',
          name: 'New User',
        })
      );
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(mockUser);
    });

    it('should return 400 if user already exists', async () => {
      // Arrange
      req.body = {
        userId: 'existinguser',
        password: 'password123',
      };

      User.findOne = jest.fn().mockResolvedValue({ userId: 'existinguser' });

      // Act
      await createUser(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: 'User already exists',
      });
    });

    it('should handle errors during user creation', async () => {
      // Arrange
      const mockError = new Error('Database error');
      req.body = {
        userId: 'newuser',
        password: 'password123',
      };

      User.findOne = jest.fn().mockResolvedValue(null);
      bcrypt.genSalt = jest.fn().mockResolvedValue('salt');
      bcrypt.hash = jest.fn().mockResolvedValue('hashedPassword');
      User.create = jest.fn().mockRejectedValue(mockError);

      // Act
      await createUser(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Server error',
        error: mockError.message,
      });
    });
  });

  describe('updateUser', () => {
    it('should update user successfully', async () => {
      // Arrange
      const mockUser = {
        _id: 'user123',
        userId: 'user1',
        name: 'John Doe',
        email: 'john@example.com',
        save: jest.fn().mockResolvedValue(true),
      };

      const mockUpdatedUser = {
        _id: 'user123',
        userId: 'user1',
        name: 'John Updated',
        email: 'johnupdated@example.com',
      };

      req.params.id = 'user123';
      req.body = {
        name: 'John Updated',
        email: 'johnupdated@example.com',
        designation: 'Senior Engineer',
      };

      User.findById = jest
        .fn()
        .mockResolvedValueOnce(mockUser)
        .mockReturnValueOnce({
          select: jest.fn().mockResolvedValue(mockUpdatedUser),
        });

      // Act
      await updateUser(req, res);

      // Assert
      expect(User.findById).toHaveBeenCalledWith('user123');
      expect(mockUser.save).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockUpdatedUser);
    });

    it('should update user password if provided', async () => {
      // Arrange
      const mockUser = {
        _id: 'user123',
        userId: 'user1',
        password: 'oldHashedPassword',
        save: jest.fn().mockResolvedValue(true),
      };

      req.params.id = 'user123';
      req.body = {
        password: 'newPassword123',
      };

      bcrypt.genSalt = jest.fn().mockResolvedValue('newsalt');
      bcrypt.hash = jest.fn().mockResolvedValue('newHashedPassword');

      User.findById = jest
        .fn()
        .mockResolvedValueOnce(mockUser)
        .mockReturnValueOnce({
          select: jest.fn().mockResolvedValue(mockUser),
        });

      // Act
      await updateUser(req, res);

      // Assert
      expect(bcrypt.genSalt).toHaveBeenCalledWith(10);
      expect(bcrypt.hash).toHaveBeenCalledWith('newPassword123', 'newsalt');
      expect(mockUser.password).toBe('newHashedPassword');
      expect(mockUser.save).toHaveBeenCalled();
    });

    it('should return 404 if user not found', async () => {
      // Arrange
      req.params.id = 'nonexistent';
      req.body = {
        name: 'Updated Name',
      };

      User.findById = jest.fn().mockResolvedValue(null);

      // Act
      await updateUser(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'User not found' });
    });

    it('should handle errors during update', async () => {
      // Arrange
      const mockError = new Error('Update failed');
      req.params.id = 'user123';
      req.body = {
        name: 'Updated Name',
      };

      User.findById = jest.fn().mockRejectedValue(mockError);

      // Act
      await updateUser(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Server error',
        error: mockError.message,
      });
    });
  });

  describe('deleteUser', () => {
    it('should delete user successfully', async () => {
      // Arrange
      const mockUser = {
        _id: 'user123',
        userId: 'user1',
      };

      req.params.id = 'user123';

      User.findById = jest.fn().mockResolvedValue(mockUser);
      User.findByIdAndDelete = jest.fn().mockResolvedValue(mockUser);

      // Act
      await deleteUser(req, res);

      // Assert
      expect(User.findById).toHaveBeenCalledWith('user123');
      expect(User.findByIdAndDelete).toHaveBeenCalledWith('user123');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'User deleted successfully',
      });
    });

    it('should return 404 if user not found', async () => {
      // Arrange
      req.params.id = 'nonexistent';

      User.findById = jest.fn().mockResolvedValue(null);

      // Act
      await deleteUser(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'User not found' });
    });

    it('should handle errors during deletion', async () => {
      // Arrange
      const mockError = new Error('Delete failed');
      req.params.id = 'user123';

      User.findById = jest.fn().mockRejectedValue(mockError);

      // Act
      await deleteUser(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Server error',
        error: mockError.message,
      });
    });
  });

  describe('getUserById', () => {
    it('should return user by ID without password', async () => {
      // Arrange
      const mockUser = {
        _id: 'user123',
        userId: 'user1',
        name: 'John Doe',
        email: 'john@example.com',
      };

      req.params.id = 'user123';

      User.findById = jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue(mockUser),
      });

      // Act
      await getUserById(req, res);

      // Assert
      expect(User.findById).toHaveBeenCalledWith('user123');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockUser);
    });

    it('should return 404 if user not found', async () => {
      // Arrange
      req.params.id = 'nonexistent';

      User.findById = jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue(null),
      });

      // Act
      await getUserById(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'User not found' });
    });

    it('should handle errors when fetching user', async () => {
      // Arrange
      const mockError = new Error('Database error');
      req.params.id = 'user123';

      User.findById = jest.fn().mockReturnValue({
        select: jest.fn().mockRejectedValue(mockError),
      });

      // Act
      await getUserById(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Server error',
        error: mockError.message,
      });
    });
  });

  describe('getUsersByType', () => {
    it('should return users by SLT type', async () => {
      // Arrange
      const mockUsers = [
        {
          _id: '1',
          userType: 'SLT',
          name: 'John Doe',
        },
        {
          _id: '2',
          userType: 'SLT',
          name: 'Jane Smith',
        },
      ];

      req.params.userType = 'SLT';

      User.find = jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue(mockUsers),
      });

      // Act
      await getUsersByType(req, res);

      // Assert
      expect(User.find).toHaveBeenCalledWith({ userType: 'SLT' });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockUsers);
    });

    it('should return users by Non-SLT type', async () => {
      // Arrange
      const mockUsers = [
        {
          _id: '3',
          userType: 'Non-SLT',
          name: 'Bob Johnson',
        },
      ];

      req.params.userType = 'Non-SLT';

      User.find = jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue(mockUsers),
      });

      // Act
      await getUsersByType(req, res);

      // Assert
      expect(User.find).toHaveBeenCalledWith({ userType: 'Non-SLT' });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockUsers);
    });

    it('should return empty array when no users found', async () => {
      // Arrange
      req.params.userType = 'SLT';

      User.find = jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue([]),
      });

      // Act
      await getUsersByType(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith([]);
    });

    it('should handle errors when fetching users by type', async () => {
      // Arrange
      const mockError = new Error('Database error');
      req.params.userType = 'SLT';

      User.find = jest.fn().mockReturnValue({
        select: jest.fn().mockRejectedValue(mockError),
      });

      // Act
      await getUsersByType(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Server error',
        error: mockError.message,
      });
    });
  });
});
