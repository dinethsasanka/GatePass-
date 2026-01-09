const approvalController = require("../../../controllers/approvalController");
const Status = require("../../../models/Status");
const User = require("../../../models/User");
const {
  emitRequestApproval,
  emitRequestRejection,
} = require("../../../utils/socketEmitter");
const { sendEmail } = require("../../../utils/sendMail");

// Mocks
jest.mock("../../../models/Status");
jest.mock("../../../models/User");
jest.mock("../../../utils/socketEmitter");
jest.mock("../../../utils/sendMail");

describe("ApprovalController", () => {
  let req, res, mockIo;

  beforeEach(() => {
    req = {
      params: {},
      query: {},
      body: {},
      user: {
        serviceNo: "E001",
        branches: ["Colombo"],
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

    jest.clearAllMocks();
  });

  /* ===================== getPending ===================== */

  describe("getPending", () => {
    it("should return executive pending requests", async () => {
      Status.find.mockReturnValue({
        populate: () => ({
          sort: () => ({
            lean: () =>
              Promise.resolve([
                {
                  referenceNumber: "REF1",
                  updatedAt: new Date(),
                  request: {
                    show: true,
                    executiveOfficerServiceNo: "E001",
                  },
                },
              ]),
          }),
        }),
      });

      req.query.serviceNo = "E001";

      await approvalController.getPending(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.any(Array));
    });

    it("should filter out requests with show=false", async () => {
      Status.find.mockReturnValue({
        populate: () => ({
          sort: () => ({
            lean: () =>
              Promise.resolve([
                {
                  referenceNumber: "REF1",
                  request: { show: false, executiveOfficerServiceNo: "E001" },
                },
                {
                  referenceNumber: "REF2",
                  request: { show: true, executiveOfficerServiceNo: "E001" },
                },
              ]),
          }),
        }),
      });

      req.query.serviceNo = "E001";

      await approvalController.getPending(req, res);

      const result = res.json.mock.calls[0][0];
      expect(result).toHaveLength(1);
      expect(result[0].referenceNumber).toBe("REF2");
    });

    it("should remove duplicate referenceNumbers", async () => {
      Status.find.mockReturnValue({
        populate: () => ({
          sort: () => ({
            lean: () =>
              Promise.resolve([
                {
                  referenceNumber: "DUP",
                  updatedAt: new Date("2026-01-05"),
                  request: { show: true, executiveOfficerServiceNo: "E001" },
                },
                {
                  referenceNumber: "DUP",
                  updatedAt: new Date("2026-01-01"),
                  request: { show: true, executiveOfficerServiceNo: "E001" },
                },
              ]),
          }),
        }),
      });

      req.query.serviceNo = "E001";

      await approvalController.getPending(req, res);

      const result = res.json.mock.calls[0][0];
      expect(result).toHaveLength(1);
    });

    it("should use req.params.id over query serviceNo", async () => {
      Status.find.mockReturnValue({
        populate: () => ({
          sort: () => ({
            lean: () =>
              Promise.resolve([
                {
                  referenceNumber: "REF-1",
                  request: { show: true, executiveOfficerServiceNo: "E001" },
                },
                {
                  referenceNumber: "REF-2",
                  request: { show: true, executiveOfficerServiceNo: "E002" },
                },
              ]),
          }),
        }),
      });

      req.params.id = "E002";
      req.query.serviceNo = "E001";

      await approvalController.getPending(req, res);

      const result = res.json.mock.calls[0][0];
      expect(result).toHaveLength(1);
      expect(result[0].referenceNumber).toBe("REF-2");
    });

    it("should return 500 on error", async () => {
      Status.find.mockImplementation(() => {
        throw new Error("DB error");
      });

      await approvalController.getPending(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  /* ===================== getApproved ===================== */

  describe("getApproved", () => {
    it("should return executive approved requests", async () => {
      Status.find.mockImplementation((query) => {
        // First call: rejected refs
        if (query && query.rejectedBy) {
          return {
            distinct: jest.fn().mockResolvedValue([]),
          };
        }

        // Second call: approved list
        return {
          populate: () => ({
            sort: () => ({
              lean: () =>
                Promise.resolve([
                  {
                    referenceNumber: "REF-A",
                    request: {
                      show: true,
                      executiveOfficerServiceNo: "E001",
                    },
                  },
                ]),
            }),
          }),
        };
      });

      req.query.serviceNo = "E001";

      await approvalController.getApproved(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.any(Array));
    });

    it("should sort newest by updatedAt or createdAt", async () => {
      Status.find.mockImplementation((query) => {
        if (query && query.rejectedBy) {
          return {
            distinct: jest.fn().mockResolvedValue([]),
          };
        }

        return {
          populate: () => ({
            sort: () => ({
              lean: () =>
                Promise.resolve([
                  {
                    referenceNumber: "OLD",
                    updatedAt: new Date("2020-01-01"),
                    request: {
                      show: true,
                      executiveOfficerServiceNo: "E001",
                    },
                  },
                  {
                    referenceNumber: "NEW",
                    createdAt: new Date("2026-01-01"),
                    request: {
                      show: true,
                      executiveOfficerServiceNo: "E001",
                    },
                  },
                ]),
            }),
          }),
        };
      });

      req.query.serviceNo = "E001";

      await approvalController.getApproved(req, res);

      const result = res.json.mock.calls[0][0];
      expect(result[0].referenceNumber).toBe("NEW");
    });

    it("should return 500 on error", async () => {
      Status.find.mockImplementation(() => {
        throw new Error("DB error");
      });

      await approvalController.getApproved(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  /* ===================== getRejected ===================== */

  describe("getRejected", () => {
    it("should return executive rejected requests", async () => {
      Status.find.mockReturnValue({
        populate: () => ({
          sort: () => ({
            lean: () =>
              Promise.resolve([
                {
                  referenceNumber: "REF-R",
                  request: {
                    show: true,
                    executiveOfficerServiceNo: "E001",
                  },
                },
              ]),
          }),
        }),
      });

      req.query.serviceNo = "E001";

      await approvalController.getRejected(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.any(Array));
    });

    it("should return 500 on error", async () => {
      Status.find.mockImplementation(() => {
        throw new Error("DB error");
      });

      await approvalController.getRejected(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  /* ===================== updateApproved ===================== */

  describe("updateApproved", () => {
    it("should approve request and notify verifier", async () => {
      const statusDoc = {
        _id: "S1",
        executiveOfficerStatus: 1,
        request: {
          outLocation: "Colombo",
          show: true,
          save: jest.fn(),
        },
        save: jest.fn(),
      };

      Status.findOne.mockReturnValue({
        populate: () => ({ sort: () => Promise.resolve(statusDoc) }),
      });

      User.findOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue({
          email: "verifier@test.com",
          name: "Verifier",
        }),
      });

      Status.findById.mockReturnValue({
        populate: () => ({ lean: () => Promise.resolve(statusDoc) }),
      });

      req.params.referenceNumber = "REF-APP";
      req.body.comment = "Approved";

      await approvalController.updateApproved(req, res);

      expect(statusDoc.executiveOfficerStatus).toBe(2);
      expect(statusDoc.verifyOfficerStatus).toBe(1);
      expect(sendEmail).toHaveBeenCalled();
      expect(emitRequestApproval).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalled();
    });

    it("should set request.show when undefined and skip email without verifier", async () => {
      const statusDoc = {
        _id: "S1",
        executiveOfficerStatus: 1,
        request: {
          outLocation: "Colombo",
          save: jest.fn(),
        },
        save: jest.fn(),
      };

      Status.findOne.mockReturnValue({
        populate: () => ({ sort: () => Promise.resolve(statusDoc) }),
      });

      User.findOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      });

      Status.findById.mockReturnValue({
        populate: () => ({ lean: () => Promise.resolve(statusDoc) }),
      });

      req.params.referenceNumber = "REF-APP";

      await approvalController.updateApproved(req, res);

      expect(statusDoc.request.show).toBe(true);
      expect(statusDoc.request.save).toHaveBeenCalled();
      expect(sendEmail).not.toHaveBeenCalled();
      expect(res.json).toHaveBeenCalled();
    });

    it("should return 404 if status not found", async () => {
      Status.findOne.mockReturnValue({
        populate: () => ({ sort: () => Promise.resolve(null) }),
      });

      req.params.referenceNumber = "INVALID";

      await approvalController.updateApproved(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  /* ===================== updateRejected ===================== */

  describe("updateRejected", () => {
    it("should reject request and notify requester", async () => {
      const statusDoc = {
        _id: "S2",
        executiveOfficerStatus: 1,
        request: {
          executiveOfficerServiceNo: "E001",
          requesterEmail: "requester@test.com",
        },
        save: jest.fn(),
      };

      Status.findOne.mockReturnValue({
        populate: () => ({ sort: () => Promise.resolve(statusDoc) }),
      });

      Status.findById.mockReturnValue({
        populate: () => ({ lean: () => Promise.resolve(statusDoc) }),
      });

      req.params.referenceNumber = "REF-REJ";
      req.body.comment = "Rejected";

      await approvalController.updateRejected(req, res);

      expect(statusDoc.executiveOfficerStatus).toBe(3);
      expect(statusDoc.rejectedBy).toBe("Executive");
      expect(statusDoc.rejectedByServiceNo).toBe("E001");
      expect(statusDoc.rejectedByBranch).toBe("Colombo");
      expect(sendEmail).toHaveBeenCalled();
      expect(emitRequestRejection).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalled();
    });

    it("should use fallback branch when req.user has no branches", async () => {
      const statusDoc = {
        _id: "S3",
        executiveOfficerStatus: 1,
        request: {
          executiveOfficerServiceNo: "E009",
          requesterEmail: "requester@test.com",
        },
        save: jest.fn(),
      };

      Status.findOne.mockReturnValue({
        populate: () => ({ sort: () => Promise.resolve(statusDoc) }),
      });

      Status.findById.mockReturnValue({
        populate: () => ({ lean: () => Promise.resolve(statusDoc) }),
      });

      User.findOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue({
          branches: ["Galle"],
        }),
      });

      req.user.branches = [];
      req.params.referenceNumber = "REF-FB";
      req.body.comment = "Rejected";

      await approvalController.updateRejected(req, res);

      expect(statusDoc.rejectedByBranch).toBe("Galle");
      expect(res.json).toHaveBeenCalled();
    });

    it("should return 404 if status not found", async () => {
      Status.findOne.mockReturnValue({
        populate: () => ({ sort: () => Promise.resolve(null) }),
      });

      req.params.referenceNumber = "INVALID";
      req.body.comment = "Rejected";

      await approvalController.updateRejected(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("should return 400 if rejection comment is missing", async () => {
      req.params.referenceNumber = "REF-EMPTY";
      req.body.comment = "   ";

      await approvalController.updateRejected(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });
});
