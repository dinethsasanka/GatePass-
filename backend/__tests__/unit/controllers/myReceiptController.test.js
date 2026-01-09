/**
 * myReceiptController.test.js
 * Unit tests for My Receipt Controller
 */

const myReceiptController = require("../../../controllers/myReceiptController");
const Request = require("../../../models/Request");

// ---------- MOCKS ----------
jest.mock("../../../models/Request");

let errorSpy;

// Silence console errors during tests
beforeAll(() => {
  errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
});

afterAll(() => {
  if (errorSpy && errorSpy.mockRestore) {
    errorSpy.mockRestore();
  }
});

// ---------- HELPERS ----------
const mockReq = () => ({});

const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn();
  return res;
};

describe("MyReceipt Controller", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("getReicept", () => {
    it("should return all receipt requests", async () => {
      const mockRequests = [
        {
          _id: "REQ1",
          referenceNumber: "REF001",
        },
        {
          _id: "REQ2",
          referenceNumber: "REF002",
        },
      ];

      Request.find.mockResolvedValue(mockRequests);

      const req = mockReq();
      const res = mockRes();

      await myReceiptController.getReicept(req, res);

      expect(Request.find).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(mockRequests);
    });

    it("should return 500 if database error occurs", async () => {
      Request.find.mockRejectedValue(new Error("DB error"));

      const req = mockReq();
      const res = mockRes();

      await myReceiptController.getReicept(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: "DB error",
      });
    });
  });
});
