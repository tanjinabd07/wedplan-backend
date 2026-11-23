const { getDB } = require("../config/db");
const { ObjectId } = require("mongodb");

// Add a new service with Free/Premium plan limit
const addService = async (req, res) => {
  try {
    const db = getDB();
    const { title, category, description, price, location, image } = req.body;

    const vendorId = req.user?.id;
    const vendorEmail = req.user?.email;

    if (!vendorId || !vendorEmail) {
      return res.status(401).json({
        success: false,
        message: "Vendor authentication required.",
      });
    }

    if (
      typeof title !== "string" ||
      !title.trim() ||
      typeof category !== "string" ||
      !category.trim() ||
      typeof description !== "string" ||
      !description.trim() ||
      typeof location !== "string" ||
      !location.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide all required fields.",
      });
    }

    const numericPrice = Number(price);

    if (!Number.isFinite(numericPrice) || numericPrice < 0) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid price.",
      });
    }

    // Find vendor account
    const vendor = await db.collection("user").findOne({
      email: vendorEmail,
      role: "vendor",
    });

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: "Vendor account not found.",
      });
    }

    // Check subscription plan
    const isPremium =
      vendor.subscriptionPlan === "premium" &&
      vendor.subscriptionStatus === "active";

    // Free Plan: Maximum 3 Active (Approved) services
    if (!isPremium) {
      const serviceCount = await db.collection("services").countDocuments({
        vendorId,
        status: "approved",
      });

      if (serviceCount >= 3) {
        return res.status(403).json({
          success: false,
          code: "FREE_PLAN_LIMIT_REACHED",
          message:
            "Free Plan allows a maximum of 3 active services. Upgrade to Premium to add unlimited services.",
          currentPlan: "free",
          serviceLimit: 3,
          currentServices: serviceCount,
        });
      }
    }

    const newService = {
      title: title.trim(),
      category: category.trim(),
      description: description.trim(),
      price: numericPrice,
      location: location.trim(),
      image: typeof image === "string" ? image : "",
      vendorId,
      vendorEmail,
      status: "pending",
      createdAt: new Date(),
    };

    const result = await db.collection("services").insertOne(newService);

    return res.status(201).json({
      success: true,
      message: "Service submitted for approval successfully.",
      service: {
        ...newService,
        _id: result.insertedId,
      },
    });
  } catch (error) {
    console.error("Add Service Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to add service.",
    });
  }
};

// Get all approved services
const getAllServices = async (req, res) => {
  try {
    const db = getDB();

    const services = await db
      .collection("services")
      .find({ status: "approved" })
      .sort({ createdAt: -1 })
      .toArray();

    return res.status(200).json({
      success: true,
      totalServices: services.length,
      services,
    });
  } catch (error) {
    console.error("Get Services Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch services.",
    });
  }
};

// Get a single approved service by ID
const getServiceById = async (req, res) => {
  try {
    const db = getDB();
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid service ID.",
      });
    }

    const service = await db.collection("services").findOne({
      _id: new ObjectId(id),
      status: "approved",
    });

    if (!service) {
      return res.status(404).json({
        success: false,
        message: "Service not found.",
      });
    }

    return res.status(200).json({
      success: true,
      service,
    });
  } catch (error) {
    console.error("Get Service Details Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch service details.",
    });
  }
};

// Get services belonging to the logged-in vendor
const getMyServices = async (req, res) => {
  try {
    const db = getDB();
    const vendorId = req.user?.id;

    if (!vendorId) {
      return res.status(401).json({
        success: false,
        message: "Vendor authentication required.",
      });
    }

    const services = await db
      .collection("services")
      .find({ vendorId })
      .sort({ createdAt: -1 })
      .toArray();

    return res.status(200).json({
      success: true,
      totalServices: services.length,
      services,
    });
  } catch (error) {
    console.error("Get My Services Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch your services.",
    });
  }
};

// Edit a service belonging to the logged-in vendor
const updateMyService = async (req, res) => {
  try {
    const db = getDB();
    const { id } = req.params;
    const vendorId = req.user?.id;

    const { title, category, description, price, location, image } = req.body;

    if (!vendorId) {
      return res.status(401).json({
        success: false,
        message: "Vendor authentication required.",
      });
    }

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid service ID.",
      });
    }

    if (
      typeof title !== "string" ||
      !title.trim() ||
      typeof category !== "string" ||
      !category.trim() ||
      typeof description !== "string" ||
      !description.trim() ||
      typeof location !== "string" ||
      !location.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide all required fields.",
      });
    }

    const numericPrice = Number(price);

    if (!Number.isFinite(numericPrice) || numericPrice < 0) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid price.",
      });
    }

    const result = await db.collection("services").updateOne(
      {
        _id: new ObjectId(id),
        vendorId,
      },
      {
        $set: {
          title: title.trim(),
          category: category.trim(),
          description: description.trim(),
          price: numericPrice,
          location: location.trim(),
          image: typeof image === "string" ? image : "",
          status: "pending",
          updatedAt: new Date(),
        },
      },
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Service not found or you are not the owner.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Service updated and submitted for approval.",
    });
  } catch (error) {
    console.error("Update My Service Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update service.",
    });
  }
};

// Delete a service belonging to the logged-in vendor
const deleteMyService = async (req, res) => {
  try {
    const db = getDB();
    const { id } = req.params;
    const vendorId = req.user?.id;

    if (!vendorId) {
      return res.status(401).json({
        success: false,
        message: "Vendor authentication required.",
      });
    }

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid service ID.",
      });
    }

    const result = await db.collection("services").deleteOne({
      _id: new ObjectId(id),
      vendorId,
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Service not found or you are not the owner.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Service deleted successfully.",
    });
  } catch (error) {
    console.error("Delete My Service Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete service.",
    });
  }
};

// Get all pending services
const getPendingServices = async (req, res) => {
  try {
    const db = getDB();

    const services = await db
      .collection("services")
      .find({ status: "pending" })
      .sort({ createdAt: -1 })
      .toArray();

    return res.status(200).json({
      success: true,
      totalServices: services.length,
      services,
    });
  } catch (error) {
    console.error("Get Pending Services Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch pending services.",
    });
  }
};

// Approve or Reject a service
const updateServiceStatus = async (req, res) => {
  try {
    const db = getDB();
    const { id } = req.params;
    const { status } = req.body;

    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid service status.",
      });
    }

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid service ID.",
      });
    }

    const service = await db.collection("services").findOne({
      _id: new ObjectId(id),
    });

    if (!service) {
      return res.status(404).json({
        success: false,
        message: "Service not found.",
      });
    }

    // Apply Free Plan limit only when approving a service
    if (status === "approved" && service.status !== "approved") {
      let vendor = null;

      // Find vendor using saved email (new services)
      if (service.vendorEmail) {
        vendor = await db.collection("user").findOne({
          email: service.vendorEmail,
          role: "vendor",
        });
      }

      // Fallback for older services without vendorEmail
      if (!vendor && service.vendorId) {
        const vendorIdQuery = [{ _id: service.vendorId }];

        if (ObjectId.isValid(service.vendorId)) {
          vendorIdQuery.push({
            _id: new ObjectId(service.vendorId),
          });
        }

        vendor = await db.collection("user").findOne({
          $or: vendorIdQuery,
          role: "vendor",
        });
      }

      if (!vendor) {
        return res.status(404).json({
          success: false,
          message: "Service vendor account not found.",
        });
      }

      const isPremium =
        vendor.subscriptionPlan === "premium" &&
        vendor.subscriptionStatus === "active";

      if (!isPremium) {
        const activeServiceCount = await db
          .collection("services")
          .countDocuments({
            vendorId: service.vendorId,
            status: "approved",
          });

        if (activeServiceCount >= 3) {
          return res.status(403).json({
            success: false,
            code: "FREE_PLAN_LIMIT_REACHED",
            message:
              "This vendor has already reached the Free Plan limit of 3 active services. The vendor must upgrade to Premium or remove an active service before this service can be approved.",
            currentPlan: "free",
            serviceLimit: 3,
            currentServices: activeServiceCount,
          });
        }
      }
    }

    const result = await db.collection("services").updateOne(
      {
        _id: new ObjectId(id),
      },
      {
        $set: {
          status,
          updatedAt: new Date(),
        },
      },
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Service not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: `Service ${status} successfully.`,
    });
  } catch (error) {
    console.error("Update Service Status Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update service status.",
    });
  }
};

module.exports = {
  addService,
  getAllServices,
  getServiceById,
  getMyServices,
  updateMyService,
  deleteMyService,
  getPendingServices,
  updateServiceStatus,
};
