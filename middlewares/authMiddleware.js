const { getDB } = require("../config/db");
const jwt = require("jsonwebtoken");
const { createPublicKey } = require("crypto");

const jwksCache = new Map();

const getPublicKey = async (kid) => {
  if (jwksCache.has(kid)) {
    return jwksCache.get(kid);
  }

  const authUrl = process.env.BETTER_AUTH_URL;

  if (!authUrl) {
    throw new Error("BETTER_AUTH_URL is missing.");
  }

  const response = await fetch(`${authUrl.replace(/\/$/, "")}/api/auth/jwks`);

  if (!response.ok) {
    throw new Error("Unable to retrieve Better Auth JWKS.");
  }

  const jwks = await response.json();

  const jwk = jwks.keys?.find((key) => key.kid === kid && key.alg === "ES256");

  if (!jwk) {
    throw new Error("JWT signing key not found.");
  }

  const publicKey = createPublicKey({
    key: jwk,
    format: "jwk",
  });

  jwksCache.set(kid, publicKey);

  return publicKey;
};

const verifyJwtToken = async (token) => {
  const decoded = jwt.decode(token, { complete: true });

  if (!decoded || decoded.header.alg !== "ES256" || !decoded.header.kid) {
    throw new Error("Invalid JWT header.");
  }

  const publicKey = await getPublicKey(decoded.header.kid);

  const payload = jwt.verify(token, publicKey, {
    algorithms: ["ES256"],
    issuer: process.env.BETTER_AUTH_URL,
    audience: process.env.BETTER_AUTH_URL,
  });

  if (!payload || typeof payload === "string" || !payload.email) {
    throw new Error("Invalid JWT payload.");
  }

  return payload;
};

const verifyRole = (requiredRole = null) => {
  return async (req, res, next) => {
    try {
      let authUser;

      const authorization = req.headers.authorization;

      if (authorization?.startsWith("Bearer ")) {
        const token = authorization.slice(7);

        try {
          authUser = await verifyJwtToken(token);
        } catch (error) {
          return res.status(401).json({
            success: false,
            message: "Invalid or expired JWT token.",
          });
        }
      } else {
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

        authUser = authData.user;
      }

      const db = getDB();

      const dbUser = await db.collection("user").findOne(
        { email: authUser.email },
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
          message: "Your account has been blocked.",
        });
      }

      // Check role only when a specific role is required.
      if (requiredRole && dbUser.role !== requiredRole) {
        return res.status(403).json({
          success: false,
          message: `${requiredRole} access only.`,
        });
      }

      req.user = {
        ...authUser,
        id: authUser.id || authUser.sub,
        role: dbUser.role,
        isBlocked: dbUser.isBlocked || false,
      };

      return next();
    } catch (error) {
      console.error("Authentication Error:", error);

      return res.status(500).json({
        success: false,
        message: "Authentication failed.",
      });
    }
  };
};

// Any authenticated user
const verifyAuth = verifyRole();

// Role-specific authentication
const verifyAdmin = verifyRole("admin");
const verifyVendor = verifyRole("vendor");
const verifyCustomer = verifyRole("customer");

module.exports = {
  verifyAuth,
  verifyAdmin,
  verifyVendor,
  verifyCustomer,
};
