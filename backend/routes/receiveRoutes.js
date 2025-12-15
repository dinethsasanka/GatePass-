const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const {
  createStatus,
  getPending,
  getApproved,
  getRejected,
  updateApproved,
  updateRejected,
  markItemsAsReturned,
  updateReturnableItem,
  addReturnableItemToRequest,
} = require("../controllers/receiveController");

// Status routes
// router.post("/create", createStatus);
router.post("/create", protect, createStatus);
router.get("/pending", protect, getPending);
router.get("/approved", protect, getApproved);
router.get("/rejected", protect, getRejected);
router.put("/:referenceNumber/approve", protect, updateApproved);
router.put("/:referenceNumber/reject", protect, updateRejected);
router.put("/:referenceNumber/returnable-item", protect, updateReturnableItem);
router.put("/:referenceNumber/mark-returned", protect, markItemsAsReturned);
router.post('/:referenceNumber/items', addReturnableItemToRequest);

module.exports = router;
