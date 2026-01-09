/**
 * authController.test.js
 */

const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const axios = require("axios");

const User = require("../../../models/User");
const authController = require("../../../controllers/authController");

// ===== MOCKS =====
jest.mock("../../../models/User");
jest.mock("bcryptjs");
jest.mock("axios");
jest.mock("jsonwebtoken");

jest.mock("@azure/msal-node", () => ({
  ConfidentialClientApplication: jest.fn().mockImplementation(() => ({
    getAuthCodeUrl: jest.fn(),
  })),
}));

// ===== HELPERS =====
const mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const mockRequest = (overrides = {}) => ({
  body: {},
  params: {},
  query: {},
  app: { get: jest.fn() },
  ...overrides,
});

beforeEach(() => {
  jest.clearAllMocks();
  process.env.JWT_SECRET = "testsecret";
});

describe("AuthController", () => {
  // ===============================
  // REGISTER USER
  // ===============================
  describe("registerUser", () => {
    it("should register a new user successfully", async () => {
      User.findOne.mockResolvedValue(null);
      bcrypt.genSalt.mockResolvedValue("salt");
      bcrypt.hash.mockResolvedValue("hashed");
      User.create.mockResolvedValue({
        id: "1",
        userType: "SLT",
        userId: "U1",
        serviceNo: "S1",
        name: "Test",
        designation: "Dev",
        section: "IT",
        group: "ENG",
        contactNo: "123",
        role: "User",
        email: "test@test.com",
      });

      jwt.sign.mockReturnValue("token");

      const req = mockRequest({
        body: {
          userType: "SLT",
          userId: "U1",
          password: "pass",
        },
      });
      const res = mockResponse();

      await authController.registerUser(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalled();
    });

    it("should return 400 if user already exists", async () => {
      User.findOne.mockResolvedValue({ userId: "U1" });

      const req = mockRequest({
        body: { userId: "U1" },
      });
      const res = mockResponse();

      await authController.registerUser(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("should return 500 on error", async () => {
      User.findOne.mockRejectedValue(new Error("DB error"));

      const req = mockRequest({ body: { userId: "U1" } });
      const res = mockResponse();

      await authController.registerUser(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ===============================
  // LOGIN USER
  // ===============================
  describe("loginUser", () => {
    it("should login local user successfully", async () => {
      User.findOne.mockResolvedValue({
        id: "1",
        userType: "SLT",
        userId: "U1",
        password: "hashed",
        save: jest.fn(),
      });

      bcrypt.compare.mockResolvedValue(true);
      jwt.sign.mockReturnValue("token");

      const req = mockRequest({
        body: { userId: "U1", password: "pass", userType: "SLT" },
      });
      const res = mockResponse();

      await authController.loginUser(req, res);

      expect(res.json).toHaveBeenCalled();
    });

    it("should sync API data for existing local user with serviceNo", async () => {
      const userDoc = {
        id: "1",
        userType: "SLT",
        userId: "U1",
        serviceNo: "S123",
        password: "hashed",
        save: jest.fn(),
      };
      User.findOne.mockResolvedValue(userDoc);

      axios.post.mockResolvedValue({
        data: {
          isSuccess: true,
          dataBundle: {
            token: "apiToken",
            expiresIn: 100,
            user: { role: "user", username: "apiUser" },
          },
        },
      });

      axios.get.mockResolvedValue({
        data: {
          isSuccess: true,
          dataBundle: [
            {
              EMPLOYEE_NUMBER: "S123",
              EMPLOYEE_TITLE: "Mr",
              EMPLOYEE_FIRST_NAME: "John",
              EMPLOYEE_SURNAME: "Doe",
              EMPLOYEE_DESIGNATION: "Engineer",
              EMPLOYEE_SECTION: "IT",
              EMPLOYEE_GROUP_NAME: "ENG",
              EMPLOYEE_MOBILE_PHONE: "555",
              EMPLOYEE_OFFICIAL_EMAIL: "john@slt.com",
            },
          ],
        },
      });

      bcrypt.compare.mockResolvedValue(true);
      jwt.sign.mockReturnValue("token");

      const req = mockRequest({
        body: { userId: "U1", password: "pass", userType: "SLT" },
      });
      const res = mockResponse();

      await authController.loginUser(req, res);

      expect(userDoc.name).toBe("Mr John Doe");
      expect(userDoc.designation).toBe("Engineer");
      expect(userDoc.save).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalled();
    });

    it("should reject invalid password", async () => {
      User.findOne.mockResolvedValue({ password: "hashed" });
      bcrypt.compare.mockResolvedValue(false);

      const req = mockRequest({
        body: { userId: "U1", password: "wrong", userType: "SLT" },
      });
      const res = mockResponse();

      await authController.loginUser(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
    });

    it("should create user with employee data when API returns details", async () => {
      User.findOne.mockResolvedValue(null);

      axios.post.mockResolvedValue({
        data: {
          isSuccess: true,
          dataBundle: {
            token: "apiToken",
            expiresIn: 100,
            user: { role: "user", username: "apiUser" },
          },
        },
      });

      axios.get.mockResolvedValue({
        data: {
          isSuccess: true,
          dataBundle: [
            {
              EMPLOYEE_NUMBER: "12345",
              EMPLOYEE_TITLE: "Ms",
              EMPLOYEE_FIRST_NAME: "Ada",
              EMPLOYEE_SURNAME: "Lovelace",
              EMPLOYEE_DESIGNATION: "Analyst",
              EMPLOYEE_SECTION: "RND",
              EMPLOYEE_GROUP_NAME: "DATA",
              EMPLOYEE_MOBILE_PHONE: "777",
              EMPLOYEE_OFFICIAL_EMAIL: "ada@slt.com",
            },
          ],
        },
      });

      bcrypt.genSalt.mockResolvedValue("salt");
      bcrypt.hash.mockResolvedValue("hashed");
      jwt.sign.mockReturnValue("token");

      User.create.mockResolvedValue({
        id: "2",
        userId: "apiUser",
        serviceNo: "12345",
      });

      const req = mockRequest({
        body: { userId: "apiUser", password: "pass" },
      });
      const res = mockResponse();

      await authController.loginUser(req, res);

      expect(User.create).toHaveBeenCalledWith(
        expect.objectContaining({
          serviceNo: "12345",
          name: "Ms Ada Lovelace",
          designation: "Analyst",
          section: "RND",
          group: "DATA",
          email: "ada@slt.com",
        })
      );
      expect(res.json).toHaveBeenCalled();
    });

    it("should login via Employee API fallback", async () => {
      User.findOne.mockResolvedValue(null);

      axios.post.mockResolvedValue({
        data: {
          isSuccess: true,
          dataBundle: {
            token: "apiToken",
            expiresIn: 100,
            user: { role: "user", username: "apiUser" },
          },
        },
      });

      axios.get.mockResolvedValue({
        data: {
          isSuccess: false,
          dataBundle: [],
        },
      });

      bcrypt.genSalt.mockResolvedValue("salt");
      bcrypt.hash.mockResolvedValue("hashed");

      User.create.mockResolvedValue({
        id: "2",
        userId: "apiUser",
      });

      jwt.sign.mockReturnValue("token");

      const req = mockRequest({
        body: { userId: "apiUser", password: "pass" },
      });
      const res = mockResponse();

      await authController.loginUser(req, res);

      expect(res.json).toHaveBeenCalled();
    });

    it("should return 401 if API auth fails", async () => {
      User.findOne.mockResolvedValue(null);

      axios.post.mockResolvedValue({
        data: { isSuccess: false },
      });

      const req = mockRequest({
        body: { userId: "bad", password: "bad" },
      });
      const res = mockResponse();

      await authController.loginUser(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
    });

    it("should return 500 on login error", async () => {
      User.findOne.mockRejectedValue(new Error("error"));

      const req = mockRequest({ body: {} });
      const res = mockResponse();

      await authController.loginUser(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ===============================
  // AZURE LOGIN
  // ===============================
  describe("azureLogin", () => {
    it("should return 400 if accessToken missing", async () => {
      const req = mockRequest({ body: {} });
      const res = mockResponse();

      await authController.azureLogin(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("should create new Azure user if not exists", async () => {
      axios.get.mockResolvedValue({
        data: {
          id: "azure1",
          displayName: "Azure User",
          userPrincipalName: "azure@test.com",
        },
      });

      User.find.mockResolvedValue([]);
      User.findOne.mockResolvedValue(null);
      bcrypt.genSalt.mockResolvedValue("salt");
      bcrypt.hash.mockResolvedValue("hashed");

      User.create.mockResolvedValue({
        id: "3",
        userId: "azure@test.com",
      });

      jwt.sign.mockReturnValue("token");

      const req = mockRequest({
        body: { accessToken: "token" },
      });
      const res = mockResponse();

      await authController.azureLogin(req, res);

      expect(res.json).toHaveBeenCalled();
    });

    it("should update existing Azure user and remove duplicate azureId", async () => {
      axios.get.mockResolvedValue({
        data: {
          id: "azure-new",
          displayName: "Azure User",
          userPrincipalName: "john_doe_outlook.com#EXT#@tenant.onmicrosoft.com",
          jobTitle: "Dev",
        },
      });

      const existingUser = {
        _id: "1",
        id: "1",
        userId: "john_doe@outlook.com",
        email: "john_doe@outlook.com",
        azureId: "azure-old",
        save: jest.fn(),
      };

      const duplicateUser = { _id: "2", userId: "dup@outlook.com" };

      User.find.mockResolvedValue([existingUser, duplicateUser]);
      User.findOne.mockImplementation((query) => {
        if (query && query.email) return Promise.resolve(existingUser);
        if (query && query.azureId) return Promise.resolve(duplicateUser);
        return Promise.resolve(null);
      });
      User.deleteOne.mockResolvedValue({ deletedCount: 1 });

      const req = mockRequest({
        body: { accessToken: "token" },
      });
      const res = mockResponse();

      await authController.azureLogin(req, res);

      expect(existingUser.email).toBe("john_doe@outlook.com");
      expect(existingUser.azureId).toBe("azure-new");
      expect(existingUser.save).toHaveBeenCalled();
      expect(User.deleteOne).toHaveBeenCalledWith({ _id: "2" });
      expect(res.json).toHaveBeenCalled();
    });

    it("should return 500 on Azure error", async () => {
      axios.get.mockRejectedValue(new Error("Azure error"));

      User.find.mockResolvedValue([]);
      const req = mockRequest({
        body: { accessToken: "token" },
      });
      const res = mockResponse();

      await authController.azureLogin(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ===============================
  // AZURE LOGIN URL
  // ===============================
  describe("getAzureLoginUrl", () => {
  it("should return Azure login URL", async () => {
    jest.resetModules();
    const { ConfidentialClientApplication } = require("@azure/msal-node");
    ConfidentialClientApplication.mockImplementationOnce(() => ({
      getAuthCodeUrl: jest.fn().mockResolvedValue("http://login"),
    }));

    const freshAuthController = require("../../../controllers/authController");
    const req = mockRequest();
    const res = mockResponse();

    await freshAuthController.getAzureLoginUrl(req, res);

    expect(res.json).toHaveBeenCalledWith({ authUrl: "http://login" });
  });

  it("should return 500 on error", async () => {
    jest.resetModules();
    const { ConfidentialClientApplication } = require("@azure/msal-node");
    ConfidentialClientApplication.mockImplementationOnce(() => ({
      getAuthCodeUrl: jest.fn().mockRejectedValue(new Error("err")),
    }));

    const freshAuthController = require("../../../controllers/authController");
    const req = mockRequest();
    const res = mockResponse();

    await freshAuthController.getAzureLoginUrl(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});

});
