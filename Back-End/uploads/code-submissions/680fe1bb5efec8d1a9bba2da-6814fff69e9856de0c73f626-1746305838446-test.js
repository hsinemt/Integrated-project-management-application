/**
 * UserController.test.js
 * Unit tests for UserController
 *
 * @author Your Name
 * @version 1.0.0
 */

const mongoose = require('mongoose');
const httpMocks = require('node-mocks-http');
const UserController = require('../controllers/UserController');
const User = require('../models/User');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// Mock dependencies
jest.mock('../models/User');
jest.mock('bcrypt');
jest.mock('jsonwebtoken');

// Sample user data for tests
const userData = {
  id: '60d21b4667d0d8992e610c85',
  name: 'John Doe',
  email: 'john@example.com',
  password: 'Password123!',
  role: 'user'
};

// Reset mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
});

describe('UserController', () => {
  describe('registerUser', () => {
    let req, res;

    beforeEach(() => {
      req = httpMocks.createRequest({
        method: 'POST',
        url: '/user/register',
        body: {
          name: userData.name,
          email: userData.email,
          password: userData.password
        }
      });
      res = httpMocks.createResponse();
    });

    it('should create a new user successfully', async () => {
      // Mock password hashing
      bcrypt.hash.mockResolvedValue('hashedPassword123');

      // Mock user creation
      User.findOne.mockResolvedValue(null);
      User.create.mockResolvedValue({
        _id: userData.id,
        name: userData.name,
        email: userData.email,
        role: userData.role
      });

      // Call the controller method
      await UserController.registerUser(req, res);

      // Get response data
      const responseData = JSON.parse(res._getData());

      // Assertions
      expect(res.statusCode).toBe(201);
      expect(responseData.success).toBe(true);
      expect(responseData.message).toBe('User registered successfully');
      expect(responseData.user).toBeDefined();
      expect(responseData.user.name).toBe(userData.name);
      expect(User.create).toHaveBeenCalledWith({
        name: userData.name,
        email: userData.email,
        password: 'hashedPassword123',
        role: 'user'
      });
    });

    it('should return error if user already exists', async () => {
      // Mock existing user
      User.findOne.mockResolvedValue({ email: userData.email });

      // Call the controller method
      await UserController.registerUser(req, res);

      // Get response data
      const responseData = JSON.parse(res._getData());

      // Assertions
      expect(res.statusCode).toBe(400);
      expect(responseData.success).toBe(false);
      expect(responseData.message).toBe('User already exists');
      expect(User.create).not.toHaveBeenCalled();
    });

    it('should handle server errors properly', async () => {
      // Mock database error
      const errorMessage = 'Database connection failed';
      User.findOne.mockRejectedValue(new Error(errorMessage));

      // Call the controller method
      await UserController.registerUser(req, res);

      // Get response data
      const responseData = JSON.parse(res._getData());

      // Assertions
      expect(res.statusCode).toBe(500);
      expect(responseData.success).toBe(false);
      expect(responseData.message).toBe('Error registering user');
      expect(responseData.error).toBe(errorMessage);
    });
  });

  describe('loginUser', () => {
    let req, res;

    beforeEach(() => {
      req = httpMocks.createRequest({
        method: 'POST',
        url: '/user/login',
        body: {
          email: userData.email,
          password: userData.password
        }
      });
      res = httpMocks.createResponse();
    });

    it('should login user successfully with valid credentials', async () => {
      // Mock user retrieval
      User.findOne.mockResolvedValue({
        _id: userData.id,
        name: userData.name,
        email: userData.email,
        password: 'hashedPassword123',
        role: userData.role
      });

      // Mock password comparison
      bcrypt.compare.mockResolvedValue(true);

      // Mock JWT token generation
      const mockToken = 'valid-jwt-token';
      jwt.sign.mockReturnValue(mockToken);

      // Call the controller method
      await UserController.loginUser(req, res);

      // Get response data
      const responseData = JSON.parse(res._getData());

      // Assertions
      expect(res.statusCode).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.message).toBe('Login successful');
      expect(responseData.token).toBe(mockToken);
      expect(responseData.user).toBeDefined();
      expect(responseData.user.email).toBe(userData.email);
    });

    it('should return error for invalid credentials', async () => {
      // Mock user retrieval
      User.findOne.mockResolvedValue({
        _id: userData.id,
        email: userData.email,
        password: 'hashedPassword123'
      });

      // Mock failed password comparison
      bcrypt.compare.mockResolvedValue(false);

      // Call the controller method
      await UserController.loginUser(req, res);

      // Get response data
      const responseData = JSON.parse(res._getData());

      // Assertions
      expect(res.statusCode).toBe(401);
      expect(responseData.success).toBe(false);
      expect(responseData.message).toBe('Invalid credentials');
      expect(jwt.sign).not.toHaveBeenCalled();
    });

    it('should return error if user does not exist', async () => {
      // Mock no user found
      User.findOne.mockResolvedValue(null);

      // Call the controller method
      await UserController.loginUser(req, res);

      // Get response data
      const responseData = JSON.parse(res._getData());

      // Assertions
      expect(res.statusCode).toBe(404);
      expect(responseData.success).toBe(false);
      expect(responseData.message).toBe('User not found');
    });
  });

  describe('getUserProfile', () => {
    let req, res;

    beforeEach(() => {
      req = httpMocks.createRequest({
        method: 'GET',
        url: '/user/profile',
        user: { id: userData.id }  // Simulating authenticated request
      });
      res = httpMocks.createResponse();
    });

    it('should return user profile successfully', async () => {
      // Mock user retrieval
      User.findById.mockResolvedValue({
        _id: userData.id,
        name: userData.name,
        email: userData.email,
        role: userData.role
      });

      // Call the controller method
      await UserController.getUserProfile(req, res);

      // Get response data
      const responseData = JSON.parse(res._getData());

      // Assertions
      expect(res.statusCode).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.user).toBeDefined();
      expect(responseData.user.name).toBe(userData.name);
      expect(responseData.user.email).toBe(userData.email);
      expect(responseData.user.password).toBeUndefined();  // Password should not be returned
    });

    it('should return error if user is not found', async () => {
      // Mock no user found
      User.findById.mockResolvedValue(null);

      // Call the controller method
      await UserController.getUserProfile(req, res);

      // Get response data
      const responseData = JSON.parse(res._getData());

      // Assertions
      expect(res.statusCode).toBe(404);
      expect(responseData.success).toBe(false);
      expect(responseData.message).toBe('User not found');
    });
  });
});