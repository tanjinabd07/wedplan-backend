const { getDB } = require("../config/db");

// Get all users with search and role filter
const getAllUsers = async (req, res) => {
  try {
    const db = getDB();

    const search = req.query.search || "";
    const role = req.query.role || "all";

    const filter = {};

    if (role !== "all") {
      if (!["customer", "vendor"].includes(role)) {
        return res.status(400).json({
          success: false,
          message: "Invalid role filter.",
        });
      }

      filter.role = role;
    }

    if (search.trim()) {
      const safeSearch = search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

      filter.$or = [
        { name: { $regex: safeSearch, $options: "i" } },
        { email: { $regex: safeSearch, $options: "i" } },
      ];
    }

    const users = await db
      .collection("user")
      .find(filter, {
        projection: {
          name: 1,
          email: 1,
          role: 1,
          image: 1,
          isBlocked: 1,
          createdAt: 1,
        },
      })
      .sort({ createdAt: -1 })
      .toArray();

    const formattedUsers = users.map((user) => ({
      id: String(user._id),
      name: user.name,
      email: user.email,
      role: user.role || "customer",
      image: user.image || "",
      isBlocked: user.isBlocked === true,
      createdAt: user.createdAt,
    }));

    return res.status(200).json({
      success: true,
      totalUsers: formattedUsers.length,
      users: formattedUsers,
    });
  } catch (error) {
    console.error("Get All Users Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load users.",
    });
  }
};

// Block or Unblock a user
const updateUserBlockStatus = async (req, res) => {
  try {
    const db = getDB();

    const { email } = req.params;
    const { isBlocked } = req.body;

    if (typeof isBlocked !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "isBlocked must be true or false.",
      });
    }

    const user = await db.collection("user").findOne({ email });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    if (user.role === "admin") {
      return res.status(403).json({
        success: false,
        message: "Admin accounts cannot be blocked.",
      });
    }

    if (user.email === req.user.email) {
      return res.status(403).json({
        success: false,
        message: "You cannot block your own account.",
      });
    }

    if (!["customer", "vendor"].includes(user.role)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user role.",
      });
    }

    await db.collection("user").updateOne(
      { email },
      {
        $set: {
          isBlocked,
          updatedAt: new Date(),
        },
      },
    );

    return res.status(200).json({
      success: true,
      message: isBlocked
        ? "User blocked successfully."
        : "User unblocked successfully.",
      isBlocked,
    });
  } catch (error) {
    console.error("Update User Block Status Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update user status.",
    });
  }
};

// Admin: Get all transactions
const getAllTransactions = async (req, res) => {
  try {
    const db = getDB();

    const search = (req.query.search || "").trim();
    const status = req.query.status || "all";

    if (!["all", "paid", "pending", "failed"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid transaction status.",
      });
    }

    const filter = {};

    if (status !== "all") {
      filter.paymentStatus = status;
    }

    const transactions = await db
      .collection("transactions")
      .find(filter)
      .sort({ createdAt: -1 })
      .toArray();

    // Get vendor information
    const vendorEmails = [
      ...new Set(transactions.map((item) => item.vendorEmail)),
    ];

    const vendors = await db
      .collection("user")
      .find(
        { email: { $in: vendorEmails } },
        {
          projection: {
            name: 1,
            email: 1,
          },
        },
      )
      .toArray();

    const vendorMap = new Map(
      vendors.map((vendor) => [vendor.email, vendor.name || "Unknown Vendor"]),
    );

    let formattedTransactions = transactions.map((transaction) => ({
      id: String(transaction._id),
      vendorName: vendorMap.get(transaction.vendorEmail) || "Unknown Vendor",
      vendorEmail: transaction.vendorEmail,
      plan: transaction.plan || "premium",
      amount: (transaction.amount || 0) / 100,
      currency: (transaction.currency || "bdt").toUpperCase(),
      paymentStatus: transaction.paymentStatus || "unknown",
      transactionDate: transaction.createdAt || null,
      stripeSessionId: transaction.stripeSessionId || "",
    }));

    // Search by vendor name or email
    if (search) {
      const keyword = search.toLowerCase();

      formattedTransactions = formattedTransactions.filter(
        (transaction) =>
          transaction.vendorName.toLowerCase().includes(keyword) ||
          transaction.vendorEmail.toLowerCase().includes(keyword),
      );
    }

    return res.status(200).json({
      success: true,
      totalTransactions: formattedTransactions.length,
      transactions: formattedTransactions,
    });
  } catch (error) {
    console.error("Get All Transactions Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load transactions.",
    });
  }
};

module.exports = {
  getAllUsers,
  updateUserBlockStatus,
  getAllTransactions,
};
