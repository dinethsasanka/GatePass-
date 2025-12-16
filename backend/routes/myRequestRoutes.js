const express = require("express");
const router = express.Router();
const { markItemsAsReturned } = require("../controllers/myRequestController");
const myRequestController = require("../controllers/myRequestController");
const { protect } = require("../middleware/authMiddleware");
const approvalController = require("../controllers/approvalController");

// Status routes

router.put("/:referenceNumber/mark-returned", markItemsAsReturned);
/*router.put(
  "/:referenceNumber/mark-returned",
  protect,
  approvalController.markItemsAsReturned
);*/

module.exports = router;
