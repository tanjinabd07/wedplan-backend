const uploadImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Please select an image.",
      });
    }

    const apiKey = process.env.IMGBB_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        success: false,
        message: "ImgBB API key is missing.",
      });
    }

    const formData = new FormData();

    const imageBlob = new Blob([req.file.buffer], {
      type: req.file.mimetype,
    });

    formData.append("image", imageBlob, req.file.originalname);

    const response = await fetch(
      `https://api.imgbb.com/1/upload?key=${apiKey}`,
      {
        method: "POST",
        body: formData,
      },
    );

    const data = await response.json();

    if (!response.ok || !data.success) {
      return res.status(500).json({
        success: false,
        message: "Image upload failed.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Image uploaded successfully.",
      imageUrl: data.data.url,
    });
  } catch (error) {
    console.error("Image Upload Error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong while uploading image.",
    });
  }
};

module.exports = { uploadImage };
