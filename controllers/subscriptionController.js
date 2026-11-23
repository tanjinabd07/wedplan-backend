const { getDB } = require("../config/db");
const { getStripe } = require("../config/stripe");

// Vendor: Get current subscription details
const getSubscriptionStatus = async (req, res) => {
  try {
    const db = getDB();

    const email = req.user?.email;
    const vendorId = req.user?.id;

    if (!email || !vendorId) {
      return res.status(401).json({
        success: false,
        message: "Vendor authentication required.",
      });
    }

    // Find vendor account
    const vendor = await db.collection("user").findOne({
      email,
      role: "vendor",
    });

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: "Vendor not found.",
      });
    }

    // Count active (approved) services
    const activeServices = await db.collection("services").countDocuments({
      vendorId,
      status: "approved",
    });

    // Check Premium subscription
    const isPremium =
      vendor.subscriptionPlan === "premium" &&
      vendor.subscriptionStatus === "active";

    // Determine current plan
    const currentPlan = isPremium ? "premium" : "free";

    return res.status(200).json({
      success: true,
      subscription: {
        plan: currentPlan,

        // Free plan is available by default.
        // Premium is active only after successful payment.
        status: isPremium ? "active" : "active",

        activeServices,

        serviceLimit: isPremium ? null : 3,

        remainingServices: isPremium ? null : Math.max(0, 3 - activeServices),

        isPremium,

        limitExceeded: !isPremium && activeServices > 3,
      },
    });
  } catch (error) {
    console.error("Get Subscription Status Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch subscription details.",
    });
  }
};

// Vendor: Create Premium Subscription Checkout
const createCheckoutSession = async (req, res) => {
  try {
    const db = getDB();
    const stripe = getStripe();

    const email = req.user?.email;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Vendor email not found.",
      });
    }

    // Stripe needs a full URL for success_url / cancel_url
    if (!process.env.CLIENT_URL) {
      throw new Error("CLIENT_URL is missing in backend .env file!");
    }

    // Find vendor account
    const user = await db.collection("user").findOne({
      email,
      role: "vendor",
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Vendor not found.",
      });
    }

    // Prevent duplicate Premium subscription
    if (
      user.subscriptionPlan === "premium" &&
      user.subscriptionStatus === "active"
    ) {
      return res.status(400).json({
        success: false,
        message: "You already have an active Premium subscription.",
      });
    }

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",

      customer_email: email,

      line_items: [
        {
          price_data: {
            currency: "bdt",
            product_data: {
              name: "WedPlan Premium Subscription",
              description: "Unlimited active service listings",
            },
            unit_amount: 100000,
            recurring: {
              interval: "month",
            },
          },
          quantity: 1,
        },
      ],

      metadata: {
        vendorEmail: email,
        plan: "premium",
      },

      subscription_data: {
        metadata: {
          vendorEmail: email,
          plan: "premium",
        },
      },

      success_url: `${process.env.CLIENT_URL}/dashboard/subscription?success=true`,

      cancel_url: `${process.env.CLIENT_URL}/dashboard/subscription?cancelled=true`,
    });

    return res.status(200).json({
      success: true,
      checkoutUrl: session.url,
    });
  } catch (error) {
    // Full error in the backend terminal
    console.error("Checkout Error:", error);

    // Real reason shown in the browser while debugging
    return res.status(500).json({
      success: false,
      message: error.message || "Unable to create checkout session.",
    });
  }
};

module.exports = {
  getSubscriptionStatus,
  createCheckoutSession,
};
