const express = require("express");

const { uploadImage } = require("../controllers/uploadController");
const { upload } = require("../middlewares/uploadMiddleware");

const router = express.Router();

// Upload image to ImgBB
router.post("/", upload.single("image"), uploadImage);

module.exports = router;
