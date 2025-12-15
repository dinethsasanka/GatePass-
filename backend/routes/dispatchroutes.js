const express = require("express");
const router = express.Router();
// const {createStatus, getPending, getApproved, getRejected, updateApproved, updateRejected,markItemsAsReturned} = require('../controllers/dispatchController');
const {
  createStatus,
  getPending,
  getApproved,
  getRejected,
  updateApproved,
  updateRejected,
  markItemsAsReturned,
} = require("../controllers/dispatchController");
const { protect } = require("../middleware/authMiddleware");

// Status routes
// router.post('/create', createStatus);

router.post("/create", protect, createStatus);
router.get("/pending", protect, getPending);
router.get("/approved", protect, getApproved);
router.get("/rejected", protect, getRejected);
router.put("/:referenceNumber/approve", protect, updateApproved);
router.put("/:referenceNumber/reject", protect, updateRejected);
router.put("/:referenceNumber/mark-returned", protect, markItemsAsReturned);

module.exports = router;
