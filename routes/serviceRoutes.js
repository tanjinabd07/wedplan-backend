const express = require("express");

const {
  addService,
  getAllServices,
  getServiceById,
  getMyServices,
  updateMyService,
  deleteMyService,
  getPendingServices,
  updateServiceStatus,
} = require("../controllers/serviceController");

const { verifyAdmin, verifyVendor } = require("../middlewares/authMiddleware");

const router = express.Router();

// Vendor: Add a new service
router.post("/add", verifyVendor, addService);

// Vendor: Get own services
router.get("/my-services", verifyVendor, getMyServices);

// Vendor: Edit own service
router.patch("/my-services/:id", verifyVendor, updateMyService);

// Vendor: Delete own service
router.delete("/my-services/:id", verifyVendor, deleteMyService);

// Get all approved services
router.get("/", getAllServices);

// Admin: Get pending services
router.get("/pending", verifyAdmin, getPendingServices);

// Admin: Approve or reject a service
router.patch("/:id/status", verifyAdmin, updateServiceStatus);

// Get a single approved service by ID
router.get("/:id", getServiceById);

module.exports = router;
