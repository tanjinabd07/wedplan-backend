const express = require("express");

const {
  createBooking,
  getMyBookings,
  getVendorBookings,
  updateBookingStatus,
  cancelBooking,
} = require("../controllers/bookingController");

const {
  verifyCustomer,
  verifyVendor,
} = require("../middlewares/authMiddleware");

const router = express.Router();

// Customer: Create Booking
router.post("/create", verifyCustomer, createBooking);

// Customer: My Bookings
router.get("/my-bookings", verifyCustomer, getMyBookings);

// Vendor: Booking Requests
router.get("/vendor-bookings", verifyVendor, getVendorBookings);

// Vendor: Accept or Reject Booking
router.patch("/:id/status", verifyVendor, updateBookingStatus);

// Customer: Cancel Pending Booking
router.patch("/:id/cancel", verifyCustomer, cancelBooking);

module.exports = router;
