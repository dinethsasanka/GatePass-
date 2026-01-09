/**
 * erpController.test.js
 * FULL unit test coverage for ERP Controller
 */

const erpController = require("../../../controllers/erpController");
const erpService = require("../../../services/erpService");

// ---------- mocks ----------
jest.mock("../../../services/erpService");

let logSpy;
let errorSpy;

// silence logs
beforeAll(() => {
  logSpy = jest.spyOn(console, "log").mockImplementation(() => {});
  errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
});

afterAll(() => {
  if (logSpy && logSpy.mockRestore) {
    logSpy.mockRestore();
  }
  if (errorSpy && errorSpy.mockRestore) {
    errorSpy.mockRestore();
  }
});

// ---------- helpers ----------
const mockReq = (body = {}) => ({
  body,
});

const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn();
  return res;
};

describe("ERP Controller", () => {
  afterEach(() => jest.clearAllMocks());

  // ================= ORGANIZATIONS =================
  describe("getOrganizations", () => {
    it("should return organizations successfully", async () => {
      erpService.getOrganizationList.mockResolvedValue([
        { id: "ORG1", name: "SLT" },
      ]);

      const req = mockReq();
      const res = mockRes();

      await erpController.getOrganizations(req, res);

      expect(erpService.getOrganizationList).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: expect.any(Array),
      });
    });

    it("should return 500 on service error", async () => {
      erpService.getOrganizationList.mockRejectedValue(new Error("ERP error"));

      const req = mockReq();
      const res = mockRes();

      await erpController.getOrganizations(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Failed to fetch organizations",
        error: "ERP error",
      });
    });
  });

  // ================= COST CENTERS =================
  describe("getCostCenters", () => {
    it("should return 400 if organizationID missing", async () => {
      const req = mockReq({});
      const res = mockRes();

      await erpController.getCostCenters(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Organization ID is required",
      });
    });

    it("should return cost centers successfully", async () => {
      erpService.getCostCentersForOrganization.mockResolvedValue([
        { code: "CC1", name: "IT" },
      ]);

      const req = mockReq({
        organizationID: "ORG1",
        costCenterCode: "CC",
      });
      const res = mockRes();

      await erpController.getCostCenters(req, res);

      expect(erpService.getCostCentersForOrganization).toHaveBeenCalledWith(
        "ORG1",
        "CC"
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: expect.any(Array),
      });
    });

    it("should return 500 on service error", async () => {
      erpService.getCostCentersForOrganization.mockRejectedValue(
        new Error("ERP failure")
      );

      const req = mockReq({ organizationID: "ORG1" });
      const res = mockRes();

      await erpController.getCostCenters(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Failed to fetch cost centers",
        error: "ERP failure",
      });
    });
  });

  // ================= EMPLOYEES =================
  describe("getEmployees", () => {
    it("should return 400 if required fields missing", async () => {
      const req = mockReq({ organizationID: "ORG1" });
      const res = mockRes();

      await erpController.getEmployees(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Organization ID and Cost Center Code are required",
      });
    });

    it("should return employees successfully", async () => {
      erpService.getEmployeeList.mockResolvedValue([
        { employeeNo: "E001", name: "John" },
      ]);

      const req = mockReq({
        organizationID: "ORG1",
        costCenterCode: "CC1",
      });
      const res = mockRes();

      await erpController.getEmployees(req, res);

      expect(erpService.getEmployeeList).toHaveBeenCalledWith("ORG1", "CC1");
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: expect.any(Array),
      });
    });

    it("should return 500 on service error", async () => {
      erpService.getEmployeeList.mockRejectedValue(new Error("ERP error"));

      const req = mockReq({
        organizationID: "ORG1",
        costCenterCode: "CC1",
      });
      const res = mockRes();

      await erpController.getEmployees(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Failed to fetch employees",
        error: "ERP error",
      });
    });
  });

  // ================= EMPLOYEE HIERARCHY =================
  describe("getEmployeeHierarchy", () => {
    it("should return 400 if employeeNo missing", async () => {
      const req = mockReq({});
      const res = mockRes();

      await erpController.getEmployeeHierarchy(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Employee number is required",
      });
    });

    it("should return hierarchy successfully", async () => {
      erpService.getEmployeeDetailsHierarchy.mockResolvedValue({
        manager: "M001",
      });

      const req = mockReq({
        organizationID: "ORG1",
        costCenterCode: "CC1",
        employeeNo: "E001",
      });
      const res = mockRes();

      await erpController.getEmployeeHierarchy(req, res);

      expect(erpService.getEmployeeDetailsHierarchy).toHaveBeenCalledWith(
        "ORG1",
        "CC1",
        "E001"
      );

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: expect.anything(),
      });
    });

    it("should return 500 on service error", async () => {
      erpService.getEmployeeDetailsHierarchy.mockRejectedValue(
        new Error("Hierarchy error")
      );

      const req = mockReq({ employeeNo: "E001" });
      const res = mockRes();

      await erpController.getEmployeeHierarchy(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Failed to fetch employee hierarchy",
        error: "Hierarchy error",
      });
    });
  });
});
