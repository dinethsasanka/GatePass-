const { EventEmitter } = require("events");
const { Readable } = require("stream");
const csvParser = require("csv-parser");

const Location = require("../../../models/Location");
const Category = require("../../../models/Category");

const {
  addLocation,
  addCategory,
  bulkUploadLocations,
  bulkUploadCategories,
  getLocations,
  getCategories,
  updateLocation,
  deleteLocation,
  updateCategory,
  deleteCategory,
  deleteInvalidLocations,
  deleteAllLocations,
  deleteAllCategories,
} = require("../../../controllers/adminController");

// ================= MOCKS =================
jest.mock("../../../models/Location");
jest.mock("../../../models/Category");
jest.mock("csv-parser", () => jest.fn());

// ================= HELPERS =================
const mockRequest = (overrides = {}) => ({
  body: {},
  params: {},
  file: null,
  ...overrides,
});

const mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnThis();
  res.json = jest.fn().mockReturnThis();
  return res;
};

// ================= TESTS =================
describe("AdminController", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ---------- addLocation ----------
  describe("addLocation", () => {
    it("should add location successfully", async () => {
      Location.create.mockResolvedValue({ name: "Colombo" });

      const req = mockRequest({ body: { location: "Colombo" } });
      const res = mockResponse();

      await addLocation(req, res);

      expect(Location.create).toHaveBeenCalledWith({ name: "Colombo" });
      expect(res.json).toHaveBeenCalled();
    });

    it("should return 400 if location missing", async () => {
      const req = mockRequest({ body: {} });
      const res = mockResponse();

      await addLocation(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("should return 500 on DB error", async () => {
      Location.create.mockRejectedValue(new Error("DB error"));

      const req = mockRequest({ body: { location: "Test" } });
      const res = mockResponse();

      await addLocation(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ---------- addCategory ----------
  describe("addCategory", () => {
    it("should add category successfully", async () => {
      Category.create.mockResolvedValue({ name: "Laptop" });

      const req = mockRequest({ body: { category: "Laptop" } });
      const res = mockResponse();

      await addCategory(req, res);

      expect(Category.create).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalled();
    });

    it("should return 400 if category missing", async () => {
      const req = mockRequest({ body: {} });
      const res = mockResponse();

      await addCategory(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("should return 500 on DB error", async () => {
      Category.create.mockRejectedValue(new Error("DB error"));

      const req = mockRequest({ body: { category: "Test" } });
      const res = mockResponse();

      await addCategory(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ---------- getLocations ----------
  describe("getLocations", () => {
    it("should return locations", async () => {
      Location.find.mockResolvedValue([{ name: "Colombo" }]);

      const req = mockRequest();
      const res = mockResponse();

      await getLocations(req, res);

      expect(res.json).toHaveBeenCalledWith([{ name: "Colombo" }]);
    });

    it("should return 500 on error", async () => {
      Location.find.mockRejectedValue(new Error("err"));

      const req = mockRequest();
      const res = mockResponse();

      await getLocations(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ---------- getCategories ----------
  describe("getCategories", () => {
    it("should return categories", async () => {
      Category.find.mockResolvedValue([{ name: "Laptop" }]);

      const req = mockRequest();
      const res = mockResponse();

      await getCategories(req, res);

      expect(res.json).toHaveBeenCalled();
    });

    it("should return 500 on error", async () => {
      Category.find.mockRejectedValue(new Error("err"));

      const req = mockRequest();
      const res = mockResponse();

      await getCategories(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ---------- updateLocation ----------
  describe("updateLocation", () => {
    it("should update location", async () => {
      Location.findByIdAndUpdate.mockResolvedValue({ name: "Galle" });

      const req = mockRequest({
        params: { id: "1" },
        body: { name: "Galle" },
      });
      const res = mockResponse();

      await updateLocation(req, res);

      expect(res.json).toHaveBeenCalled();
    });

    it("should return 400 if name missing", async () => {
      const req = mockRequest({
        params: { id: "1" },
        body: {},
      });
      const res = mockResponse();

      await updateLocation(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("should return 404 if not found", async () => {
      Location.findByIdAndUpdate.mockResolvedValue(null);

      const req = mockRequest({
        params: { id: "1" },
        body: { name: "Test" },
      });
      const res = mockResponse();

      await updateLocation(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  // ---------- deleteLocation ----------
  describe("deleteLocation", () => {
    it("should delete location", async () => {
      Location.findByIdAndDelete.mockResolvedValue({});

      const req = mockRequest({ params: { id: "1" } });
      const res = mockResponse();

      await deleteLocation(req, res);

      expect(res.json).toHaveBeenCalled();
    });

    it("should return 404 if not found", async () => {
      Location.findByIdAndDelete.mockResolvedValue(null);

      const req = mockRequest({ params: { id: "1" } });
      const res = mockResponse();

      await deleteLocation(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("should return 500 on error", async () => {
      Location.findByIdAndDelete.mockRejectedValue(new Error("err"));

      const req = mockRequest({ params: { id: "1" } });
      const res = mockResponse();

      await deleteLocation(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ---------- updateCategory ----------
  describe("updateCategory", () => {
    it("should update category", async () => {
      Category.findByIdAndUpdate.mockResolvedValue({ name: "Electronics" });

      const req = mockRequest({
        params: { id: "1" },
        body: { name: "Electronics" },
      });
      const res = mockResponse();

      await updateCategory(req, res);

      expect(res.json).toHaveBeenCalled();
    });

    it("should return 400 if name missing", async () => {
      const req = mockRequest({
        params: { id: "1" },
        body: {},
      });
      const res = mockResponse();

      await updateCategory(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("should return 404 if not found", async () => {
      Category.findByIdAndUpdate.mockResolvedValue(null);

      const req = mockRequest({
        params: { id: "1" },
        body: { name: "Test" },
      });
      const res = mockResponse();

      await updateCategory(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("should return 500 on error", async () => {
      Category.findByIdAndUpdate.mockRejectedValue(new Error("err"));

      const req = mockRequest({
        params: { id: "1" },
        body: { name: "Test" },
      });
      const res = mockResponse();

      await updateCategory(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ---------- deleteCategory ----------
  describe("deleteCategory", () => {
    it("should delete category", async () => {
      Category.findByIdAndDelete.mockResolvedValue({});

      const req = mockRequest({ params: { id: "1" } });
      const res = mockResponse();

      await deleteCategory(req, res);

      expect(res.json).toHaveBeenCalled();
    });

    it("should return 404 if not found", async () => {
      Category.findByIdAndDelete.mockResolvedValue(null);

      const req = mockRequest({ params: { id: "1" } });
      const res = mockResponse();

      await deleteCategory(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("should return 500 on error", async () => {
      Category.findByIdAndDelete.mockRejectedValue(new Error("err"));

      const req = mockRequest({ params: { id: "1" } });
      const res = mockResponse();

      await deleteCategory(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ---------- deleteInvalidLocations ----------
  describe("deleteInvalidLocations", () => {
    it("should delete invalid locations", async () => {
      Location.deleteMany.mockResolvedValue({ deletedCount: 3 });

      const req = mockRequest();
      const res = mockResponse();

      await deleteInvalidLocations(req, res);

      expect(res.json).toHaveBeenCalled();
    });

    it("should return 500 on error", async () => {
      Location.deleteMany.mockRejectedValue(new Error("err"));

      const req = mockRequest();
      const res = mockResponse();

      await deleteInvalidLocations(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ---------- deleteAllLocations ----------
  describe("deleteAllLocations", () => {
    it("should delete all locations", async () => {
      Location.deleteMany.mockResolvedValue({ deletedCount: 5 });

      const req = mockRequest();
      const res = mockResponse();

      await deleteAllLocations(req, res);

      expect(res.json).toHaveBeenCalled();
    });

    it("should return 500 on error", async () => {
      Location.deleteMany.mockRejectedValue(new Error("err"));

      const req = mockRequest();
      const res = mockResponse();

      await deleteAllLocations(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ---------- deleteAllCategories ----------
  describe("deleteAllCategories", () => {
    it("should delete all categories", async () => {
      Category.deleteMany.mockResolvedValue({ deletedCount: 2 });

      const req = mockRequest();
      const res = mockResponse();

      await deleteAllCategories(req, res);

      expect(res.json).toHaveBeenCalled();
    });

    it("should return 500 on error", async () => {
      Category.deleteMany.mockRejectedValue(new Error("err"));

      const req = mockRequest();
      const res = mockResponse();

      await deleteAllCategories(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ---------- bulkUploadLocations ----------
  describe("bulkUploadLocations", () => {
    it("should upload locations from CSV", async () => {
      const parser = new EventEmitter();
      parser.write = jest.fn();
      parser.end = jest.fn();
      csvParser.mockReturnValue(parser);
      jest.spyOn(Readable, "from").mockReturnValue({
        pipe: () => parser,
      });
      Location.insertMany.mockResolvedValue([{ name: "Colombo" }]);

      const req = mockRequest({
        file: { buffer: Buffer.from("location\nColombo") },
      });
      const res = mockResponse();

      const done = new Promise((resolve) => {
        res.json.mockImplementation(() => {
          resolve();
          return res;
        });
      });

      process.nextTick(() => {
        parser.emit("data", { location: "Colombo" });
        parser.emit("end");
      });

      await bulkUploadLocations(req, res);
      await done;

      expect(res.json).toHaveBeenCalled();
    });

    it("should return 400 if file missing", async () => {
      const req = mockRequest({ file: null });
      const res = mockResponse();

      await bulkUploadLocations(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("should return 400 if no valid locations", async () => {
      const parser = new EventEmitter();
      parser.write = jest.fn();
      parser.end = jest.fn();
      csvParser.mockReturnValue(parser);
      jest.spyOn(Readable, "from").mockReturnValue({
        pipe: () => parser,
      });

      const req = mockRequest({
        file: { buffer: Buffer.from("location\n") },
      });
      const res = mockResponse();

      const done = new Promise((resolve) => {
        res.status.mockImplementation(() => {
          resolve();
          return res;
        });
      });

      process.nextTick(() => {
        parser.emit("end");
      });

      await bulkUploadLocations(req, res);
      await done;

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("should return 500 on parser error", async () => {
      const parser = new EventEmitter();
      parser.write = jest.fn();
      parser.end = jest.fn();
      csvParser.mockReturnValue(parser);
      jest.spyOn(Readable, "from").mockReturnValue({
        pipe: () => parser,
      });

      const req = mockRequest({
        file: { buffer: Buffer.from("location\nColombo") },
      });
      const res = mockResponse();

      const done = new Promise((resolve) => {
        res.status.mockImplementation(() => {
          resolve();
          return res;
        });
      });

      process.nextTick(() => {
        parser.emit("error", new Error("bad csv"));
      });

      await bulkUploadLocations(req, res);
      await done;

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ---------- bulkUploadCategories ----------
  describe("bulkUploadCategories", () => {
    it("should upload categories from CSV", async () => {
      const parser = new EventEmitter();
      parser.write = jest.fn();
      parser.end = jest.fn();
      csvParser.mockReturnValue(parser);
      jest.spyOn(Readable, "from").mockReturnValue({
        pipe: () => parser,
      });
      Category.insertMany.mockResolvedValue([{ name: "Laptop" }]);

      const req = mockRequest({
        file: { buffer: Buffer.from("category\nLaptop") },
      });
      const res = mockResponse();

      const done = new Promise((resolve) => {
        res.json.mockImplementation(() => {
          resolve();
          return res;
        });
      });

      process.nextTick(() => {
        parser.emit("data", { category: "Laptop" });
        parser.emit("end");
      });

      await bulkUploadCategories(req, res);
      await done;

      expect(res.json).toHaveBeenCalled();
    });

    it("should return 400 if file missing", async () => {
      const req = mockRequest({ file: null });
      const res = mockResponse();

      await bulkUploadCategories(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("should return 400 if no valid categories", async () => {
      const parser = new EventEmitter();
      parser.write = jest.fn();
      parser.end = jest.fn();
      csvParser.mockReturnValue(parser);
      jest.spyOn(Readable, "from").mockReturnValue({
        pipe: () => parser,
      });

      const req = mockRequest({
        file: { buffer: Buffer.from("category\n") },
      });
      const res = mockResponse();

      const done = new Promise((resolve) => {
        res.status.mockImplementation(() => {
          resolve();
          return res;
        });
      });

      process.nextTick(() => {
        parser.emit("end");
      });

      await bulkUploadCategories(req, res);
      await done;

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("should return 500 on parser error", async () => {
      const parser = new EventEmitter();
      parser.write = jest.fn();
      parser.end = jest.fn();
      csvParser.mockReturnValue(parser);
      jest.spyOn(Readable, "from").mockReturnValue({
        pipe: () => parser,
      });

      const req = mockRequest({
        file: { buffer: Buffer.from("category\nLaptop") },
      });
      const res = mockResponse();

      const done = new Promise((resolve) => {
        res.status.mockImplementation(() => {
          resolve();
          return res;
        });
      });

      process.nextTick(() => {
        parser.emit("error", new Error("bad csv"));
      });

      await bulkUploadCategories(req, res);
      await done;

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });
});
