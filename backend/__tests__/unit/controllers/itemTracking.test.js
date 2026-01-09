/**
 * itemTracking.test.js
 * Unit tests for Item Tracking Controller
 */

const itemTrackingController = require("../../../controllers/Itemtracking");
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

describe("ItemTracking Controller", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  // ===================== GetItemForTracking =====================
  describe("GetItemForTracking", () => {
    it("should return requests with returnable items", async () => {
      const mockRequests = [
        {
          _id: "REQ1",
          items: [
            { itemName: "Laptop", itemReturnable: true },
            { itemName: "Mouse", itemReturnable: false },
          ],
        },
      ];

      Request.find.mockResolvedValue(mockRequests);

      const req = mockReq();
      const res = mockRes();

      await itemTrackingController.GetItemForTracking(req, res);

      expect(Request.find).toHaveBeenCalledWith({
        items: { $elemMatch: { itemReturnable: true } },
      });
      expect(res.json).toHaveBeenCalledWith(mockRequests);
    });

    it("should return 500 if database error occurs", async () => {
      Request.find.mockRejectedValue(new Error("DB error"));

      const req = mockReq();
      const res = mockRes();

      await itemTrackingController.GetItemForTracking(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: "DB error",
      });
    });
  });
});
