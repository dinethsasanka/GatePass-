/**
 * dispatchController.test.js
 * FULL unit test coverage for Dispatcher (Petrol Leader) workflow
 */

const dispatchController = require("../../../controllers/dispatchController");
const Status = require("../../../models/Status");
const User = require("../../../models/User");
const { sendEmail } = require("../../../utils/sendMail");
const {
  emitRequestApproval,
  emitRequestRejection,
} = require("../../../utils/socketEmitter");

// ---------- mocks ----------
jest.mock("../../../models/Status");
jest.mock("../../../models/User");
jest.mock("../../../utils/sendMail", () => ({
  sendEmail: jest.fn(),
}));
jest.mock("../../../utils/socketEmitter", () => ({
  emitRequestApproval: jest.fn(),
  emitRequestRejection: jest.fn(),
}));

let logSpy;
let errorSpy;

// silence noisy logs
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
const mockReq = (overrides = {}) => ({
  params: {},
  body: {},
  user: { serviceNo: "PL002", branches: ["Colombo"] },
  app: { get: jest.fn() },
  ...overrides,
});

const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn();
  return res;
};

const baseRequest = {
  _id: "REQ1",
  outLocation: "Colombo",
  inLocation: "Kandy",
  isNonSltPlace: false,
  receiverAvailable: true,
  receiverServiceNo: "R001",
  executiveOfficerServiceNo: "E001",
  status: 7,
  save: jest.fn(),
};

const mockStatusDoc = (overrides = {}) => ({
  _id: "STAT1",
  referenceNumber: "REF001",
  beforeStatus: 7,
  afterStatus: 7,
  verifyOfficerStatus: 2,
  executiveOfficerStatus: 2,
  request: { ...baseRequest },
  save: jest.fn(),
  populate: jest.fn().mockReturnThis(),
  ...overrides,
});

// ---------- tests ----------
describe("DispatchController", () => {
  afterEach(() => jest.clearAllMocks());

  // ================= CREATE =================
  describe("createStatus", () => {
    it("should create a new status", async () => {
      Status.mockImplementation(() => ({
        save: jest.fn(),
      }));

      const req = mockReq({
        body: {
          referenceNumber: "REF1",
          comment: "OK",
          beforeStatus: 7,
          afterStatus: 8,
          request: "REQ1",
        },
      });
      const res = mockRes();

      await dispatchController.createStatus(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalled();
    });

    it("should return 400 on save error", async () => {
      Status.mockImplementation(() => ({
        save: jest.fn().mockRejectedValue(new Error("fail")),
      }));

      const req = mockReq({
        body: {
          referenceNumber: "REF1",
          comment: "OK",
          beforeStatus: 7,
          afterStatus: 8,
          request: "REQ1",
        },
      });
      const res = mockRes();

      await dispatchController.createStatus(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  // ================= GET LISTS =================
  describe("getPending", () => {
    it("should return pending dispatch statuses", async () => {
      Status.find
        .mockReturnValueOnce({
          distinct: jest.fn().mockResolvedValue([]),
        })
        .mockReturnValueOnce({
          populate: () => ({
            sort: () => ({
              exec: () => [
                { referenceNumber: "REF1" },
                { referenceNumber: "REF1" }, // duplicate
              ],
            }),
          }),
        });

      const req = mockReq();
      const res = mockRes();

      await dispatchController.getPending(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json.mock.calls[0][0].length).toBe(1);
    });

    it("should return 500 on error", async () => {
      Status.find.mockImplementation(() => {
        throw new Error("DB error");
      });

      const req = mockReq();
      const res = mockRes();

      await dispatchController.getPending(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe("getApproved", () => {
    it("should return approved dispatch statuses", async () => {
      Status.find
        .mockReturnValueOnce({
          distinct: jest.fn().mockResolvedValue([]),
        })
        .mockReturnValueOnce({
          populate: () => ({
            sort: () => ({
              exec: () => [{ referenceNumber: "REF2" }],
            }),
          }),
        });

      const req = mockReq();
      const res = mockRes();

      await dispatchController.getApproved(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.any(Array));
    });

    it("should return 400 on error", async () => {
      Status.find.mockImplementation(() => {
        throw new Error("DB error");
      });

      const req = mockReq();
      const res = mockRes();

      await dispatchController.getApproved(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe("getRejected", () => {
    it("should return rejected dispatch statuses", async () => {
      Status.find.mockReturnValue({
        populate: () => ({
          sort: () => ({
            exec: () => [{ referenceNumber: "REF3" }],
          }),
        }),
      });

      const req = mockReq();
      const res = mockRes();

      await dispatchController.getRejected(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalled();
    });

    it("should return 400 on error", async () => {
      Status.find.mockImplementation(() => {
        throw new Error("DB error");
      });

      const req = mockReq();
      const res = mockRes();

      await dispatchController.getRejected(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  // ================= ACTIONS =================
  describe("updateApproved", () => {
    it("should approve NON-SLT request and finish workflow", async () => {
      const status = mockStatusDoc({
        request: { ...baseRequest, isNonSltPlace: true },
      });

      Status.findOne.mockReturnValue({
        populate: () => ({
          sort: () => status,
        }),
      });

      Status.mockImplementation(() => ({
        save: jest.fn(),
      }));

      const io = { emit: jest.fn() };
      const req = mockReq({
        params: { referenceNumber: "REF001" },
        app: { get: jest.fn().mockReturnValue(io) },
      });
      const res = mockRes();

      await dispatchController.updateApproved(req, res);

      expect(emitRequestApproval).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("should route to receiver when available", async () => {
      const status = mockStatusDoc();

      Status.findOne.mockReturnValue({
        populate: () => ({
          sort: () => status,
        }),
      });

      User.findOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue({
          email: "receiver@test.com",
          name: "Receiver",
        }),
      });

      Status.mockImplementation(() => ({
        save: jest.fn(),
      }));

      const req = mockReq({
        params: { referenceNumber: "REF001" },
      });
      const res = mockRes();

      await dispatchController.updateApproved(req, res);

      expect(sendEmail).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("should route to dispatcher if receiver unavailable", async () => {
      const status = mockStatusDoc({
        request: { ...baseRequest, receiverAvailable: false },
      });

      Status.findOne.mockReturnValue({
        populate: () => ({
          sort: () => status,
        }),
      });

      User.findOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue({
          email: "dispatcher@test.com",
        }),
      });

      Status.mockImplementation(() => ({
        save: jest.fn(),
      }));

      const req = mockReq({
        params: { referenceNumber: "REF001" },
      });
      const res = mockRes();

      await dispatchController.updateApproved(req, res);

      expect(sendEmail).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("should skip dispatcher email when no receiver found", async () => {
      const status = mockStatusDoc({
        request: { ...baseRequest, receiverAvailable: false },
      });

      Status.findOne.mockReturnValue({
        populate: () => ({
          sort: () => status,
        }),
      });

      User.findOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      });

      Status.mockImplementation(() => ({
        save: jest.fn(),
      }));

      const req = mockReq({
        params: { referenceNumber: "REF001" },
      });
      const res = mockRes();

      await dispatchController.updateApproved(req, res);

      expect(sendEmail).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("should return 404 when status not found", async () => {
      Status.findOne.mockReturnValue({
        populate: () => ({
          sort: () => null,
        }),
      });

      const req = mockReq({
        params: { referenceNumber: "REF404" },
      });
      const res = mockRes();

      await dispatchController.updateApproved(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("should skip receiver email when not found", async () => {
      const status = mockStatusDoc({
        request: { ...baseRequest, receiverAvailable: true },
      });

      Status.findOne.mockReturnValue({
        populate: () => ({
          sort: () => status,
        }),
      });

      User.findOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      });

      Status.mockImplementation(() => ({
        save: jest.fn(),
      }));

      const req = mockReq({
        params: { referenceNumber: "REF001" },
      });
      const res = mockRes();

      await dispatchController.updateApproved(req, res);

      expect(sendEmail).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("should return 500 on error", async () => {
      Status.findOne.mockImplementation(() => {
        throw new Error("DB error");
      });

      const req = mockReq({
        params: { referenceNumber: "REF500" },
      });
      const res = mockRes();

      await dispatchController.updateApproved(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe("updateRejected", () => {
    it("should reject and notify all parties", async () => {
      const status = mockStatusDoc();

      Status.findOne.mockReturnValue({
        populate: () => ({
          sort: () => status,
        }),
      });

      User.findOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue({
          email: "user@test.com",
          branches: ["Colombo"],
        }),
      });

      const io = { emit: jest.fn() };
      const req = mockReq({
        params: { referenceNumber: "REF001" },
        body: { comment: "Rejected" },
        app: { get: jest.fn().mockReturnValue(io) },
      });
      const res = mockRes();

      await dispatchController.updateRejected(req, res);

      expect(status.afterStatus).toBe(9);
      expect(sendEmail).toHaveBeenCalled();
      expect(emitRequestRejection).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("should return 400 if comment missing", async () => {
      const req = mockReq({
        params: { referenceNumber: "REF001" },
        body: {},
      });
      const res = mockRes();

      await dispatchController.updateRejected(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("should return 404 if status not found", async () => {
      Status.findOne.mockReturnValue({
        populate: () => ({
          sort: () => null,
        }),
      });

      const req = mockReq({
        params: { referenceNumber: "REF404" },
        body: { comment: "Rejected" },
      });
      const res = mockRes();

      await dispatchController.updateRejected(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("should use fallback branch lookup when req.user has no branches", async () => {
      const status = mockStatusDoc();

      Status.findOne.mockReturnValue({
        populate: () => ({
          sort: () => status,
        }),
      });

      User.findOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue({
          email: "user@test.com",
          branches: ["Galle"],
        }),
      });

      const req = mockReq({
        params: { referenceNumber: "REF001" },
        body: { comment: "Rejected" },
        user: { serviceNo: "PL002", branches: [] },
      });
      const res = mockRes();

      await dispatchController.updateRejected(req, res);

      expect(status.rejectedByBranch).toBe("Galle");
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("should continue when requester lookup returns null", async () => {
      const status = mockStatusDoc({
        request: { ...baseRequest, employeeServiceNo: "EMP1" },
      });

      Status.findOne.mockReturnValue({
        populate: () => ({
          sort: () => status,
        }),
      });

      User.findOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      });

      const io = { emit: jest.fn() };
      const req = mockReq({
        params: { referenceNumber: "REF001" },
        body: { comment: "Rejected" },
        app: { get: jest.fn().mockReturnValue(io) },
      });
      const res = mockRes();

      await dispatchController.updateRejected(req, res);

      expect(sendEmail).not.toHaveBeenCalled();
      expect(emitRequestRejection).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("should return 500 on error", async () => {
      Status.findOne.mockImplementation(() => {
        throw new Error("DB error");
      });

      const req = mockReq({
        params: { referenceNumber: "REF500" },
        body: { comment: "Rejected" },
      });
      const res = mockRes();

      await dispatchController.updateRejected(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });
});
