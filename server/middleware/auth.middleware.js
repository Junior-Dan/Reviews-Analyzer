const jwt = require("jsonwebtoken");
const User = require("../core/user.model");
const TeamMembership = require("../core/teamMembership.model");

const JWT_SECRET = process.env.JWT_SECRET || "reviews_analyzer_secret_key_2026";

const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      token = req.headers.authorization.split(" ")[1];
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = await User.findById(decoded.id).select("-password");
      if (!req.user) {
        return res.status(401).json({ message: "User not found with this token" });
      }
      const membership = await TeamMembership.findOne({
        memberUser: req.user._id,
        status: "accepted",
      })
        .sort({ acceptedAt: -1 })
        .select("owner role");
      req.workspaceOwnerId = membership ? membership.owner : req.user._id;
      req.workspaceRole = membership ? membership.role : "owner";
      return next();
    } catch (err) {
      console.error("Auth middleware error:", err.message);
      return res.status(401).json({ message: "Not authorized, token failed" });
    }
  }

  if (!token) {
    return res.status(401).json({ message: "Not authorized, no token provided" });
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        message: `User role '${req.user ? req.user.role : "none"}' is not authorized to access this route`
      });
    }
    next();
  };
};

module.exports = { protect, authorize, JWT_SECRET };
