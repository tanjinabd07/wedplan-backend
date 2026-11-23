const { getDB } = require("../config/db");

const verifyRole = (requiredRole) => {
  return async (req, res, next) => {
    try {
      const cookie = req.headers.cookie;

      if (!cookie) {
        return res.status(401).json({
          success: false,
          message: "Please sign in first.",
        });
      }

      const authResponse = await fetch(
        `${process.env.BETTER_AUTH_URL}/api/auth/get-session`,
        {
          method: "GET",
          headers: { Cookie: cookie },
        },
      );

      if (!authResponse.ok) {
        return res.status(401).json({
          success: false,
          message: "Invalid or expired session.",
        });
      }

      const authData = await authResponse.json();

      if (!authData?.user?.email) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized access.",
        });
      }

      const db = getDB();

      const dbUser = await db.collection("user").findOne(
        { email: authData.user.email },
        {
          projection: {
            role: 1,
            isBlocked: 1,
          },
        },
      );

      if (!dbUser) {
        return res.status(401).json({
          success: false,
          message: "User account not found.",
        });
      }

      if (dbUser.isBlocked === true) {
        return res.status(403).json({
          success: false,
          message: "Your account has been blocked. Please contact support.",
        });
      }

      if (dbUser.role !== requiredRole) {
        return res.status(403).json({
          success: false,
          message: `${requiredRole} access only.`,
        });
      }

      req.user = {
        ...authData.user,
        role: dbUser.role,
        isBlocked: dbUser.isBlocked || false,
      };

      next();
    } catch (error) {
      console.error("Authentication Error:", error);

      return res.status(500).json({
        success: false,
        message: "Authentication failed.",
      });
    }
  };
};

const verifyAdmin = verifyRole("admin");
const verifyVendor = verifyRole("vendor");
const verifyCustomer = verifyRole("customer");

module.exports = {
  verifyAdmin,
  verifyVendor,
  verifyCustomer,
};
