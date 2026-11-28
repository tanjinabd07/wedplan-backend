const express = require("express");

const { updateProfile } = require("../controllers/userController");
const { verifyAuth } = require("../middlewares/authMiddleware");

const router = express.Router();

router.patch("/profile", verifyAuth, updateProfile);

module.exports = router;
