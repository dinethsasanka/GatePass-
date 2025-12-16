// routes/verifyRoutes.js
const express = require("express");
const router = express.Router();

const verifyController = require("../controllers/verifyController");
const { protect } = require("../middleware/authMiddleware");

// If you have auth middleware, uncomment these lines and wrap routes with `protect`.
// const { protect } = require("../middleware/auth");

// Lists (Verifier)
// router.get("/pending", /*protect,*/ verifyController.getPending);
// router.get("/approved", /*protect,*/ verifyController.getApproved);
// router.get("/rejected", /*protect,*/ verifyController.getRejected);

router.get("/pending", protect, verifyController.getPending);
router.get("/:id/pending", protect, verifyController.getPending);

router.get("/approved", protect, verifyController.getApproved);
router.get("/:id/approved", protect, verifyController.getApproved);

router.get("/rejected", protect, verifyController.getRejected);
router.get("/:id/rejected", protect, verifyController.getRejected);

// Actions (Verifier)
router.put(
  "/:referenceNumber/approve",
  protect,
  verifyController.updateApproved
);
router.put(
  "/:referenceNumber/reject",
  protect,
  verifyController.updateRejected
);
router.put(
  "/:referenceNumber/mark-returned",
  protect,
  verifyController.markItemsAsReturned
);

router.put(
  "/:referenceNumber/items",
  protect,
  verifyController.addReturnableItemToRequest
);

module.exports = router;
