const jwt = require("jsonwebtoken");
const userModel = require("../models/user.model");

// ── AUTHENTICATE ─────────────────────────────
async function authUser(req, res, next) {
  try {
    const token =
      req.cookies?.token ||
      (req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer ")
        ? req.headers.authorization.split(" ")[1]
        : null);

    if (!token) {
      return res.status(401).json({
        message: "Unauthorized — token not provided",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await userModel.findById(decoded.id).select("-password");

    if (!user) {
      return res.status(401).json({
        message: "User no longer exists",
      });
    }

    if (!user.companyCode) {
      return res.status(401).json({
        message: "Invalid user data",
      });
    }

    // 🔥 Attach clean user
    req.user = {
  _id: user._id,
  id: user._id,

  name: user.name, // 🔥 ADD THIS

  email: user.email,

  role: user.role,

  companyCode: user.companyCode,

  companyName: user.companyName,
};

    return next();

  } catch (error) {
    console.error("Auth error:", error.message);

    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        message: "Session expired — please log in again",
      });
    }

    return res.status(401).json({
      message: "Unauthorized — invalid token",
    });
  }
}

// ── AUTHORISE ─────────────────────────────
function authorise(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        message: `Access denied — only ${roles.join(" or ")} allowed`,
      });
    }
    return next();
  };
}

module.exports = { authUser, authorise };