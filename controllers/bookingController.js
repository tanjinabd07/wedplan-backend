const { getDB } = require("../config/db");
const { ObjectId } = require("mongodb");

// Customer: Create Booking
const createBooking = async (req, res) => {
  try {
    const db = getDB();

    const { serviceId, eventDate, eventLocation, guestCount, message } =
      req.body;

    const customerId = req.user.id;

    if (!serviceId || !eventDate || !eventLocation || !guestCount) {
      return res.status(400).json({
        success: false,
        message: "Please provide all required booking information.",
      });
    }

    if (!ObjectId.isValid(serviceId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid service ID.",
      });
    }

    const guests = Number(guestCount);

    if (!Number.isInteger(guests) || guests < 1) {
      return res.status(400).json({
        success: false,
        message: "Guest count must be at least 1.",
      });
    }

    const selectedDate = new Date(`${eventDate}T00:00:00`);

    if (
      Number.isNaN(selectedDate.getTime()) ||
      selectedDate < new Date(new Date().toDateString())
    ) {
      return res.status(400).json({
        success: false,
        message: "Please select a valid future event date.",
      });
    }

    if (!eventLocation.trim()) {
      return res.status(400).json({
        success: false,
        message: "Event location is required.",
      });
    }

    const service = await db.collection("services").findOne({
      _id: new ObjectId(serviceId),
      status: "approved",
    });

    if (!service) {
      return res.status(404).json({
        success: false,
        message: "Approved service not found.",
      });
    }

    // Prevent vendors from booking their own services
    if (String(service.vendorId) === String(customerId)) {
      return res.status(403).json({
        success: false,
        message: "You cannot book your own service.",
      });
    }

    // Prevent duplicate active bookings for the same service and event date
    const existingBooking = await db.collection("bookings").findOne({
      serviceId: service._id,
      customerId,
      eventDate,
      status: {
        $in: ["pending", "accepted"],
      },
    });

    if (existingBooking) {
      return res.status(409).json({
        success: false,
        message:
          "You already have an active booking for this service on this event date.",
      });
    }

    const booking = {
      serviceId: service._id,
      serviceTitle: service.title,
      serviceImage: service.image || "",
      servicePrice: service.price,
      vendorId: service.vendorId,
      customerId,
      customerName: req.user.name || "",
      customerEmail: req.user.email || "",
      eventDate,
      eventLocation: eventLocation.trim(),
      guestCount: guests,
      message: message?.trim() || "",
      status: "pending",
      createdAt: new Date(),
    };

    const result = await db.collection("bookings").insertOne(booking);

    return res.status(201).json({
      success: true,
      message: "Booking request sent successfully!",
      booking: {
        _id: result.insertedId,
        ...booking,
      },
    });
  } catch (error) {
    console.error("Create Booking Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create booking.",
    });
  }
};

// Customer: Get My Bookings
const getMyBookings = async (req, res) => {
  try {
    const db = getDB();
    const customerId = req.user.id;

    const bookings = await db
      .collection("bookings")
      .find({ customerId })
      .sort({ createdAt: -1 })
      .toArray();

    return res.status(200).json({
      success: true,
      totalBookings: bookings.length,
      bookings,
    });
  } catch (error) {
    console.error("Get My Bookings Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load your bookings.",
    });
  }
};

// Vendor: Get My Booking Requests
const getVendorBookings = async (req, res) => {
  try {
    const db = getDB();
    const vendorId = req.user.id;

    const bookings = await db
      .collection("bookings")
      .find({ vendorId })
      .sort({ createdAt: -1 })
      .toArray();

    return res.status(200).json({
      success: true,
      totalBookings: bookings.length,
      bookings,
    });
  } catch (error) {
    console.error("Get Vendor Bookings Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load booking requests.",
    });
  }
};

// Vendor: Accept or Reject Booking
const updateBookingStatus = async (req, res) => {
  try {
    const db = getDB();
    const { id } = req.params;
    const { status } = req.body;
    const vendorId = req.user.id;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid booking ID.",
      });
    }

    if (!["accepted", "rejected"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status must be accepted or rejected.",
      });
    }

    const result = await db.collection("bookings").updateOne(
      {
        _id: new ObjectId(id),
        vendorId,
        status: "pending",
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
        message: "Booking not found, or it has already been processed.",
      });
    }

    return res.status(200).json({
      success: true,
      message: `Booking ${status} successfully.`,
      status,
    });
  } catch (error) {
    console.error("Update Booking Status Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update booking status.",
    });
  }
};

// Customer: Cancel Pending Booking
const cancelBooking = async (req, res) => {
  try {
    const db = getDB();
    const { id } = req.params;
    const customerId = req.user.id;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid booking ID.",
      });
    }

    const result = await db.collection("bookings").updateOne(
      {
        _id: new ObjectId(id),
        customerId,
        status: "pending",
      },
      {
        $set: {
          status: "cancelled",
          updatedAt: new Date(),
        },
      },
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        message:
          "Booking not found, or it cannot be cancelled because it has already been processed.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Booking cancelled successfully.",
      status: "cancelled",
    });
  } catch (error) {
    console.error("Cancel Booking Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to cancel booking.",
    });
  }
};

module.exports = {
  createBooking,
  getMyBookings,
  getVendorBookings,
  updateBookingStatus,
  cancelBooking,
};
