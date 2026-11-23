const express = require("express");

const {
  getSubscriptionStatus,
  createCheckoutSession,
} = require("../controllers/subscriptionController");

const { verifyVendor } = require("../middlewares/authMiddleware");

const router = express.Router();

// Get vendor subscription details
router.get("/status", verifyVendor, getSubscriptionStatus);

// Create Premium Checkout Session
router.post("/checkout", verifyVendor, createCheckoutSession);

module.exports = router;
