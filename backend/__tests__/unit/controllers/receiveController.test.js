/**
 * receiveController.test.js
 * Unit tests for Receive Controller
 */

const receiveController = require("../../../controllers/receiveController");
const Status = require("../../../models/Status");
const Request = require("../../../models/Request");
const User = require("../../../models/User");
const { sendEmail } = require("../../../utils/sendMail");
const socketEmitter = require("../../../utils/socketEmitter");

// ---------- MOCKS ----------
jest.mock("../../../models/Status");
jest.mock("../../../models/Request");
jest.mock("../../../models/User");
jest.mock("../../../utils/sendMail", () => ({
  sendEmail: jest.fn(),
}));
jest.mock("../../../utils/socketEmitter", () => ({
  emitRequestCompletion: jest.fn(),
  emitRequestRejection: jest.fn(),
}));

let logSpy;
let errorSpy;

// Silence noisy logs
beforeAll(() => {
  errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  logSpy = jest.spyOn(console, "log").mockImplementation(() => {});
});

afterAll(() => {
  if (errorSpy && errorSpy.mockRestore) {
    errorSpy.mockRestore();
  }
  if (logSpy && logSpy.mockRestore) {
    logSpy.mockRestore();
  }
});

// ---------- HELPERS ----------
const mockReq = (overrides = {}) => ({
  params: {},
  body: {},
  query: {},
  user: {},
  app: { get: jest.fn() },
  ...overrides,
});

const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn();
  return res;
};

describe("ReceiveController", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  // ===================== createStatus =====================
  describe("createStatus", () => {
    it("should create a new status successfully", async () => {
      Status.mockImplementation(() => ({
        save: jest.fn().mockResolvedValue(true),
      }));

      const req = mockReq({
        body: {
          referenceNumber: "REF1",
          beforeStatus: 1,
          afterStatus: 2,
        },
      });
      const res = mockRes();

      await receiveController.createStatus(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: "Status created successfully" })
      );
    });

    it("should return 400 on error", async () => {
      Status.mockImplementation(() => ({
        save: jest.fn().mockRejectedValue(new Error("error")),
      }));

      const req = mockReq({ body: {} });
      const res = mockRes();

      await receiveController.createStatus(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  // ===================== getPending =====================
  describe("getPending", () => {
    it("should return pending receiver requests", async () => {
      Status.find.mockReturnValue({
        populate: () => ({
          sort: () => ({
            lean: () =>
              Promise.resolve([
                {
                  recieveOfficerStatus: 1,
                  request: { show: true },
                },
              ]),
          }),
        }),
      });

      const req = mockReq({ user: { serviceNo: "R1" } });
      const res = mockRes();

      await receiveController.getPending(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalled();
    });

    it("should return all when no serviceNo filter", async () => {
      Status.find.mockReturnValue({
        populate: () => ({
          sort: () => ({
            lean: () =>
              Promise.resolve([
                { request: { show: true } },
                { request: { show: false } },
                { request: { show: true } },
              ]),
          }),
        }),
      });

      const req = mockReq({ user: {}, query: {} });
      const res = mockRes();

      await receiveController.getPending(req, res);

      const result = res.json.mock.calls[0][0];
      expect(result).toHaveLength(2);
    });

    it("should filter by serviceNo and allow unassigned requests", async () => {
      Status.find.mockReturnValue({
        populate: () => ({
          sort: () => ({
            lean: () =>
              Promise.resolve([
                {
                  recieveOfficerStatus: 1,
                  recieveOfficerServiceNumber: "R1",
                  request: { show: true },
                },
                {
                  recieveOfficerStatus: 1,
                  request: { show: true },
                },
                {
                  recieveOfficerStatus: 1,
                  recieveOfficerServiceNumber: "R2",
                  request: { show: true },
                },
              ]),
          }),
        }),
      });

      const req = mockReq({ user: { serviceNo: "R1" } });
      const res = mockRes();

      await receiveController.getPending(req, res);

      const result = res.json.mock.calls[0][0];
      expect(result).toHaveLength(2);
    });

    it("should return 500 on error", async () => {
      Status.find.mockImplementation(() => {
        throw new Error("error");
      });

      const req = mockReq();
      const res = mockRes();

      await receiveController.getPending(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ===================== getApproved =====================
  describe("getApproved", () => {
    it("should return approved receiver requests", async () => {
      Status.find
        .mockReturnValueOnce({
          distinct: jest.fn().mockResolvedValue([]),
        })
        .mockReturnValueOnce({
          populate: () => ({
            sort: () => ({
              lean: () =>
                Promise.resolve([
                  {
                    updatedAt: new Date("2024-01-02"),
                    request: { show: true },
                  },
                ]),
            }),
          }),
        });

      const req = mockReq({ user: { serviceNo: "R1" } });
      const res = mockRes();

      await receiveController.getApproved(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.any(Array));
    });

    it("should sort by createdAt when updatedAt missing", async () => {
      Status.find
        .mockReturnValueOnce({
          distinct: jest.fn().mockResolvedValue([]),
        })
        .mockReturnValueOnce({
          populate: () => ({
            sort: () => ({
              lean: () =>
                Promise.resolve([
                  {
                    createdAt: new Date("2020-01-01"),
                    request: { show: true },
                  },
                  {
                    createdAt: new Date("2024-01-01"),
                    request: { show: true },
                  },
                ]),
            }),
          }),
        });

      const req = mockReq({ user: { serviceNo: "R1" } });
      const res = mockRes();

      await receiveController.getApproved(req, res);

      const result = res.json.mock.calls[0][0];
      expect(result[0].createdAt.getFullYear()).toBe(2024);
    });

    it("should return all when no serviceNo filter", async () => {
      Status.find
        .mockReturnValueOnce({
          distinct: jest.fn().mockResolvedValue([]),
        })
        .mockReturnValueOnce({
          populate: () => ({
            sort: () => ({
              lean: () =>
                Promise.resolve([
                  { request: { show: true } },
                  { request: { show: false } },
                ]),
            }),
          }),
        });

      const req = mockReq({ user: {}, query: {} });
      const res = mockRes();

      await receiveController.getApproved(req, res);

      const result = res.json.mock.calls[0][0];
      expect(result).toHaveLength(1);
    });

    it("should return 500 on error", async () => {
      Status.find.mockImplementation(() => {
        throw new Error("error");
      });

      const req = mockReq();
      const res = mockRes();

      await receiveController.getApproved(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ===================== getRejected =====================
  describe("getRejected", () => {
    it("should return rejected receiver requests", async () => {
      Status.find.mockReturnValue({
        populate: () => ({
          sort: () => ({
            lean: () =>
              Promise.resolve([
                {
                  updatedAt: new Date("2024-01-02"),
                  request: { show: true },
                },
              ]),
          }),
        }),
      });

      const req = mockReq({ user: { serviceNo: "R1" } });
      const res = mockRes();

      await receiveController.getRejected(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.any(Array));
    });

    it("should filter out hidden requests", async () => {
      Status.find.mockReturnValue({
        populate: () => ({
          sort: () => ({
            lean: () =>
              Promise.resolve([
                { request: { show: false } },
                { request: { show: true } },
              ]),
          }),
        }),
      });

      const req = mockReq({ user: { serviceNo: "R1" } });
      const res = mockRes();

      await receiveController.getRejected(req, res);

      const result = res.json.mock.calls[0][0];
      expect(result).toHaveLength(1);
    });

    it("should return all when no serviceNo filter", async () => {
      Status.find.mockReturnValue({
        populate: () => ({
          sort: () => ({
            lean: () =>
              Promise.resolve([
                { request: { show: true } },
                { request: { show: true } },
              ]),
          }),
        }),
      });

      const req = mockReq({ user: {}, query: {} });
      const res = mockRes();

      await receiveController.getRejected(req, res);

      const result = res.json.mock.calls[0][0];
      expect(result).toHaveLength(2);
    });

    it("should return 500 on error", async () => {
      Status.find.mockImplementation(() => {
        throw new Error("error");
      });

      const req = mockReq();
      const res = mockRes();

      await receiveController.getRejected(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ===================== updateApproved =====================
  describe("updateApproved", () => {
    it("should approve and complete request", async () => {
      const mockRequest = {
        save: jest.fn(),
        status: 10,
      };

      Status.findOneAndUpdate.mockReturnValue({
        populate: () =>
          Promise.resolve({
            request: mockRequest,
          }),
      });

      const req = mockReq({
        params: { referenceNumber: "REF1" },
        body: { comment: "ok" },
        app: { get: jest.fn().mockReturnValue({}) },
      });

      const res = mockRes();

      await receiveController.updateApproved(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(sendEmail).toHaveBeenCalledTimes(0); // requester may not exist
    });

    it("should email requester when found", async () => {
      const mockRequest = {
        save: jest.fn(),
        status: 10,
        requesterEmail: "user@test.com",
      };

      Status.findOneAndUpdate.mockReturnValue({
        populate: () =>
          Promise.resolve({
            request: mockRequest,
          }),
      });

      const req = mockReq({
        params: { referenceNumber: "REF1" },
        body: { comment: "ok" },
        app: { get: jest.fn().mockReturnValue({}) },
      });

      const res = mockRes();

      await receiveController.updateApproved(req, res);

      expect(sendEmail).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("should set unloading details and returnable items", async () => {
      const mockRequest = {
        save: jest.fn(),
        status: 10,
      };

      Status.findOneAndUpdate.mockReturnValue({
        populate: () =>
          Promise.resolve({
            request: mockRequest,
          }),
      });

      const req = mockReq({
        params: { referenceNumber: "REF1" },
        body: {
          unloadingDetails: {
            unloadingLocation: "Kandy",
            staffType: "SLT",
            staffServiceNo: "S1",
          },
          returnableItems: [{ serialNo: "S1" }],
        },
        app: { get: jest.fn().mockReturnValue({}) },
      });

      const res = mockRes();

      await receiveController.updateApproved(req, res);

      expect(mockRequest.unLoading).toEqual(
        expect.objectContaining({
          loadingLocation: "Kandy",
          staffType: "SLT",
          staffServiceNo: "S1",
        })
      );
      expect(mockRequest.returnableItems).toHaveLength(1);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("should handle email failure gracefully", async () => {
      const mockRequest = {
        save: jest.fn(),
        status: 10,
        sender: { email: "sender@test.com" },
      };

      Status.findOneAndUpdate.mockReturnValue({
        populate: () =>
          Promise.resolve({
            request: mockRequest,
          }),
      });

      sendEmail.mockRejectedValue(new Error("mail failed"));

      const req = mockReq({
        params: { referenceNumber: "REF1" },
        body: { comment: "ok" },
        app: { get: jest.fn().mockReturnValue({}) },
      });
      const res = mockRes();

      await receiveController.updateApproved(req, res);

      expect(sendEmail).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("should return 400 on error", async () => {
      Status.findOneAndUpdate.mockImplementation(() => {
        throw new Error("error");
      });

      const req = mockReq({ params: { referenceNumber: "REF1" } });
      const res = mockRes();

      await receiveController.updateApproved(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("should return 404 if status not found", async () => {
      Status.findOneAndUpdate.mockReturnValue({
        populate: () => Promise.resolve(null),
      });

      const req = mockReq({ params: { referenceNumber: "REF404" } });
      const res = mockRes();

      await receiveController.updateApproved(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  // ===================== updateRejected =====================
  describe("updateRejected", () => {
    it("should reject request successfully", async () => {
      const mockStatus = {
        request: { save: jest.fn() },
        save: jest.fn(),
      };

      Status.findOneAndUpdate.mockReturnValue({
        populate: () => Promise.resolve(mockStatus),
      });

      User.findOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      });

      const req = mockReq({
        params: { referenceNumber: "REF2" },
        body: { comment: "bad" },
        user: { serviceNo: "R1", branches: ["Colombo"] },
        app: { get: jest.fn().mockReturnValue({}) },
      });

      const res = mockRes();

      await receiveController.updateRejected(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(socketEmitter.emitRequestRejection).toHaveBeenCalled();
    });

    it("should send emails to all parties", async () => {
      const mockStatus = {
        request: {
          save: jest.fn(),
          requesterServiceNo: "U1",
          outLocation: "Colombo",
          inLocation: "Kandy",
          executiveOfficerServiceNo: "E1",
        },
        save: jest.fn(),
      };

      Status.findOneAndUpdate.mockReturnValue({
        populate: () => Promise.resolve(mockStatus),
      });

      User.findOne.mockImplementation((query) => {
        if (query && query.serviceNo === "U1") {
          return {
            lean: jest.fn().mockResolvedValue({
              email: "req@test.com",
              name: "Requester",
            }),
          };
        }
        if (query && query.serviceNo === "E1") {
          return {
            lean: jest.fn().mockResolvedValue({
              email: "exec@test.com",
              name: "Exec",
            }),
          };
        }
        if (query && query.role === "Verifier") {
          return {
            lean: jest.fn().mockResolvedValue({
              email: "ver@test.com",
              name: "Verifier",
            }),
          };
        }
        if (query && query.role === "Dispatcher") {
          return {
            lean: jest.fn().mockResolvedValue({
              email: "disp@test.com",
              name: "Dispatcher",
            }),
          };
        }
        return { lean: jest.fn().mockResolvedValue(null) };
      });

      const io = { emit: jest.fn() };
      const req = mockReq({
        params: { referenceNumber: "REF2" },
        body: { comment: "bad" },
        user: { serviceNo: "R1", branches: ["Colombo"] },
        app: { get: jest.fn().mockReturnValue(io) },
      });
      const res = mockRes();

      await receiveController.updateRejected(req, res);

      expect(sendEmail).toHaveBeenCalled();
      expect(socketEmitter.emitRequestRejection).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("should set rejectedByBranch from fallback user", async () => {
      const mockStatus = {
        request: { save: jest.fn() },
        save: jest.fn(),
      };

      Status.findOneAndUpdate.mockReturnValue({
        populate: () => Promise.resolve(mockStatus),
      });

      User.findOne.mockImplementation((query) => {
        if (query && query.serviceNo === "R1") {
          return {
            lean: jest.fn().mockResolvedValue({
              branches: ["Galle"],
            }),
          };
        }
        return { lean: jest.fn().mockResolvedValue(null) };
      });

      const req = mockReq({
        params: { referenceNumber: "REF2" },
        body: { comment: "bad" },
        user: { serviceNo: "R1", branches: [] },
        app: { get: jest.fn().mockReturnValue({}) },
      });
      const res = mockRes();

      await receiveController.updateRejected(req, res);

      expect(mockStatus.rejectedByBranch).toBe("Galle");
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("should continue when fallback lookup throws", async () => {
      const mockStatus = {
        request: { save: jest.fn() },
        save: jest.fn(),
      };

      Status.findOneAndUpdate.mockReturnValue({
        populate: () => Promise.resolve(mockStatus),
      });

      User.findOne.mockImplementation(() => {
        throw new Error("boom");
      });

      const req = mockReq({
        params: { referenceNumber: "REF2" },
        body: { comment: "bad" },
        user: { serviceNo: "R1", branches: [] },
        app: { get: jest.fn().mockReturnValue({}) },
      });
      const res = mockRes();

      await receiveController.updateRejected(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("should handle email failures for all parties", async () => {
      const mockStatus = {
        request: {
          save: jest.fn(),
          sender: { email: "sender@test.com" },
          outLocation: "Colombo",
          inLocation: "Kandy",
          executiveOfficerServiceNo: "E1",
        },
        save: jest.fn(),
      };

      Status.findOneAndUpdate.mockReturnValue({
        populate: () => Promise.resolve(mockStatus),
      });

      User.findOne.mockImplementation((query) => {
        if (query && query.serviceNo === "E1") {
          return {
            lean: jest.fn().mockResolvedValue({
              email: "exec@test.com",
              name: "Exec",
            }),
          };
        }
        if (query && query.role === "Verifier") {
          return {
            lean: jest.fn().mockResolvedValue({
              email: "ver@test.com",
              name: "Verifier",
            }),
          };
        }
        if (query && query.role === "Dispatcher") {
          return {
            lean: jest.fn().mockResolvedValue({
              email: "disp@test.com",
              name: "Dispatcher",
            }),
          };
        }
        return { lean: jest.fn().mockResolvedValue(null) };
      });

      sendEmail.mockRejectedValue(new Error("mail failed"));

      const req = mockReq({
        params: { referenceNumber: "REF2" },
        body: { comment: "bad" },
        user: { serviceNo: "R1", branches: ["Colombo"] },
        app: { get: jest.fn().mockReturnValue({}) },
      });
      const res = mockRes();

      await receiveController.updateRejected(req, res);

      expect(sendEmail).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("should return 400 if comment missing", async () => {
      const req = mockReq({
        params: { referenceNumber: "REF2" },
        body: {},
      });
      const res = mockRes();

      await receiveController.updateRejected(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("should return 404 if status not found", async () => {
      Status.findOneAndUpdate.mockReturnValue({
        populate: () => Promise.resolve(null),
      });

      const req = mockReq({
        params: { referenceNumber: "REF404" },
        body: { comment: "bad" },
      });
      const res = mockRes();

      await receiveController.updateRejected(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("should return 400 on error", async () => {
      Status.findOneAndUpdate.mockImplementation(() => {
        throw new Error("error");
      });

      const req = mockReq({
        params: { referenceNumber: "REF2" },
        body: { comment: "bad" },
      });
      const res = mockRes();

      await receiveController.updateRejected(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("should handle missing req.user serviceNo without fallback", async () => {
      const mockStatus = {
        request: { save: jest.fn() },
        save: jest.fn(),
      };

      Status.findOneAndUpdate.mockReturnValue({
        populate: () => Promise.resolve(mockStatus),
      });

      User.findOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      });

      const req = mockReq({
        params: { referenceNumber: "REF2" },
        body: { comment: "bad" },
        user: {},
        app: { get: jest.fn().mockReturnValue({}) },
      });
      const res = mockRes();

      await receiveController.updateRejected(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  // ===================== updateReturnableItem =====================
  describe("updateReturnableItem", () => {
    it("should update returnable item successfully", async () => {
      const statusDoc = {
        request: {
          _id: "REQ1",
          returnableItems: [{ serialNo: "S1", itemModel: "A" }],
        },
      };

      Status.findOne.mockReturnValue({
        populate: () => Promise.resolve(statusDoc),
      });
      Request.findByIdAndUpdate.mockResolvedValue({
        returnableItems: [{ serialNo: "S2", itemModel: "B" }],
      });

      const req = mockReq({
        params: { referenceNumber: "REF3" },
        body: { originalSerialNo: "S1", serialNo: "S2" },
      });
      const res = mockRes();

      await receiveController.updateReturnableItem(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("should return 400 if both itemModel and serialNo missing", async () => {
      const req = mockReq({
        params: { referenceNumber: "REF3" },
        body: { originalSerialNo: "S1" },
      });
      const res = mockRes();

      await receiveController.updateReturnableItem(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("should return 404 if status not found", async () => {
      Status.findOne.mockReturnValue({
        populate: () => Promise.resolve(null),
      });

      const req = mockReq({
        params: { referenceNumber: "REF3" },
        body: { originalSerialNo: "S1", serialNo: "S2" },
      });
      const res = mockRes();

      await receiveController.updateReturnableItem(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("should return 404 if request details missing", async () => {
      Status.findOne.mockReturnValue({
        populate: () => Promise.resolve({ request: null }),
      });

      const req = mockReq({
        params: { referenceNumber: "REF3" },
        body: { originalSerialNo: "S1", serialNo: "S2" },
      });
      const res = mockRes();

      await receiveController.updateReturnableItem(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("should return 400 if no returnable items saved", async () => {
      const statusDoc = {
        request: {
          _id: "REQ1",
          returnableItems: [],
        },
      };

      Status.findOne.mockReturnValue({
        populate: () => Promise.resolve(statusDoc),
      });

      const req = mockReq({
        params: { referenceNumber: "REF3" },
        body: { originalSerialNo: "S1", serialNo: "S2" },
      });
      const res = mockRes();

      await receiveController.updateReturnableItem(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("should return 404 if item serial not found", async () => {
      const statusDoc = {
        request: {
          _id: "REQ1",
          returnableItems: [{ serialNo: "S1", itemModel: "A" }],
        },
      };

      Status.findOne.mockReturnValue({
        populate: () => Promise.resolve(statusDoc),
      });

      const req = mockReq({
        params: { referenceNumber: "REF3" },
        body: { originalSerialNo: "S9", serialNo: "S2" },
      });
      const res = mockRes();

      await receiveController.updateReturnableItem(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("should return 404 if request update fails", async () => {
      const statusDoc = {
        request: {
          _id: "REQ1",
          returnableItems: [{ serialNo: "S1", itemModel: "A" }],
        },
      };

      Status.findOne.mockReturnValue({
        populate: () => Promise.resolve(statusDoc),
      });
      Request.findByIdAndUpdate.mockResolvedValue(null);

      const req = mockReq({
        params: { referenceNumber: "REF3" },
        body: { originalSerialNo: "S1", serialNo: "S2" },
      });
      const res = mockRes();

      await receiveController.updateReturnableItem(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("should return 500 on error", async () => {
      Status.findOne.mockImplementation(() => {
        throw new Error("boom");
      });

      const req = mockReq({
        params: { referenceNumber: "REF3" },
        body: { originalSerialNo: "S1", serialNo: "S2" },
      });
      const res = mockRes();

      await receiveController.updateReturnableItem(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });

    it("should return 500 if update throws", async () => {
      const statusDoc = {
        request: {
          _id: "REQ1",
          returnableItems: [{ serialNo: "S1", itemModel: "A" }],
        },
      };

      Status.findOne.mockReturnValue({
        populate: () => Promise.resolve(statusDoc),
      });

      Request.findByIdAndUpdate.mockRejectedValue(new Error("fail"));

      const req = mockReq({
        params: { referenceNumber: "REF3" },
        body: { originalSerialNo: "S1", serialNo: "S2" },
      });
      const res = mockRes();

      await receiveController.updateReturnableItem(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });

    it("should return 400 if originalSerialNo missing", async () => {
      const req = mockReq({
        params: { referenceNumber: "REF3" },
        body: {},
      });
      const res = mockRes();

      await receiveController.updateReturnableItem(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });
});
