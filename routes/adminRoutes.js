const express = require("express");

const {
  getAllUsers,
  updateUserBlockStatus,
  getAllTransactions,
} = require("../controllers/adminController");

const { verifyAdmin } = require("../middlewares/authMiddleware");

const router = express.Router();

// Admin: User Management
router.get("/users", verifyAdmin, getAllUsers);

router.patch("/users/:email/block", verifyAdmin, updateUserBlockStatus);

// Admin: Transaction Management
router.get("/transactions", verifyAdmin, getAllTransactions);

module.exports = router;
