const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const bookingRoutes = require("./routes/bookingRoutes");
const adminRoutes = require("./routes/adminRoutes");
const subscriptionRoutes = require("./routes/subscriptionRoutes");
const { handleStripeWebhook } = require("./controllers/webhookController");
require("dotenv").config();

// MongoDB Atlas SRV DNS workaround
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const { connectDB } = require("./config/db");
const serviceRoutes = require("./routes/serviceRoutes");
const uploadRoutes = require("./routes/uploadRoutes");

const app = express();

app.use(helmet());

app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    credentials: true,
  }),
);

// Stripe Webhook Route
app.post(
  "/api/subscriptions/webhook",
  express.raw({ type: "application/json" }),
  handleStripeWebhook
);

app.use(express.json());

// Service Routes
app.use("/api/services", serviceRoutes);


// Image Upload Routes
app.use("/api/upload", uploadRoutes);
// Booking Routes
app.use("/api/bookings", bookingRoutes);
// Admin Routes
app.use("/api/admin", adminRoutes);

app.use("/api/subscriptions", subscriptionRoutes);

// Home Route
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "WedPlan Backend is Running!",
  });
});

// Health Check Route
app.get("/health", (req, res) => {
  res.json({
    success: true,
    status: "Healthy",
  });
});

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  await connectDB();

  app.listen(PORT, () => {
    console.log(`WedPlan Backend running on port ${PORT}`);
  });
};

startServer();
