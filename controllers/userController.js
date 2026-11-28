const { getDB } = require("../config/db");

const updateProfile = async (req, res) => {
  try {
    const db = getDB();
    const { name, image } = req.body;

    const updateFields = {};

    // Update name
    if (name !== undefined) {
      if (typeof name !== "string" || !name.trim()) {
        return res.status(400).json({
          success: false,
          message: "Please provide a valid name.",
        });
      }

      if (name.trim().length > 80) {
        return res.status(400).json({
          success: false,
          message: "Name cannot exceed 80 characters.",
        });
      }

      updateFields.name = name.trim();
    }

    // Update profile image
    if (image !== undefined) {
      if (image !== null && typeof image !== "string") {
        return res.status(400).json({
          success: false,
          message: "Invalid profile image.",
        });
      }

      if (typeof image === "string" && image.trim()) {
        try {
          const imageUrl = new URL(image.trim());

          if (!["http:", "https:"].includes(imageUrl.protocol)) {
            throw new Error("Invalid image URL");
          }

          updateFields.image = image.trim();
        } catch {
          return res.status(400).json({
            success: false,
            message: "Please provide a valid image URL.",
          });
        }
      } else {
        updateFields.image = null;
      }
    }

    if (Object.keys(updateFields).length === 0) {
      return res.status(400).json({
        success: false,
        message: "No profile information provided.",
      });
    }

    const result = await db
      .collection("user")
      .updateOne({ email: req.user.email }, { $set: updateFields });

    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    const updatedUser = await db.collection("user").findOne(
      { email: req.user.email },
      {
        projection: {
          name: 1,
          email: 1,
          image: 1,
          role: 1,
        },
      },
    );

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully.",
      user: updatedUser,
    });
  } catch (error) {
    console.error("Update Profile Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update profile.",
    });
  }
};

module.exports = { updateProfile };
