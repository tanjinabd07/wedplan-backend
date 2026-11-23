const { getDB } = require("../config/db");

// Stripe Webhook: Verify and process events
const handleStripeWebhook = async (req, res) => {
  try {
    const stripe = require("../config/stripe").getStripe();
    const signature = req.headers["stripe-signature"];

    const event = stripe.webhooks.constructEvent(
      req.body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET,
    );

    const db = getDB();

    // Checkout successfully completed
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;

      // Only process Premium subscription checkout
      if (
        session.mode !== "subscription" ||
        (session.payment_status !== "paid" &&
          session.payment_status !== "no_payment_required")
      ) {
        return res.status(200).json({ received: true });
      }

      const email = session.metadata?.vendorEmail;
      const subscriptionId = session.subscription;

      if (!email || !subscriptionId) {
        return res.status(400).json({
          success: false,
          message: "Vendor email or subscription ID missing",
        });
      }

      // Prevent duplicate transaction records
      const existingTransaction = await db
        .collection("transactions")
        .findOne({ stripeEventId: event.id });

      if (existingTransaction) {
        return res.status(200).json({ received: true });
      }

      // Activate Premium for the Vendor
      const result = await db.collection("user").updateOne(
        { email, role: "vendor" },
        {
          $set: {
            subscriptionPlan: "premium",
            subscriptionStatus: "active",
            stripeSubscriptionId: subscriptionId,
            subscriptionStartedAt: new Date(),
            updatedAt: new Date(),
          },
        },
      );

      if (result.matchedCount === 0) {
        return res.status(404).json({
          success: false,
          message: "Vendor not found",
        });
      }

      // Save transaction history
      await db.collection("transactions").insertOne({
        stripeEventId: event.id,
        vendorEmail: email,
        plan: "premium",
        amount: session.amount_total || 0,
        currency: session.currency || "bdt",
        paymentStatus: "paid",
        stripeSessionId: session.id,
        stripeSubscriptionId: subscriptionId,
        createdAt: new Date(),
      });

      console.log(`Premium activated for ${email}`);
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error("Stripe Webhook Error:", error.message);

    res.status(400).json({
      success: false,
      message: "Webhook verification failed",
    });
  }
};

module.exports = { handleStripeWebhook };
