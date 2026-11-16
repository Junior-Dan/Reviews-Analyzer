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
      const now = new Date();
      if (!req.user.lastActiveAt || now.getTime() - new Date(req.user.lastActiveAt).getTime() > 30000) {
        req.user.lastActiveAt = now;
        User.updateOne({ _id: req.user._id }, { $set: { lastActiveAt: now } }).catch(() => {});
      }
      const requestedWorkspaceId = String(req.headers["x-workspace-id"] || "").trim();
      if (requestedWorkspaceId && requestedWorkspaceId === String(req.user._id)) {
        req.workspaceOwnerId = req.user._id;
        req.workspaceRole = "owner";
      } else {
        const membershipQuery = {
          memberUser: req.user._id,
          status: "accepted",
        };
        if (requestedWorkspaceId) {
          membershipQuery.owner = requestedWorkspaceId;
        }
        const membership = await TeamMembership.findOne(membershipQuery)
          .sort({ acceptedAt: -1 })
          .select("owner role");
        if (!membership && requestedWorkspaceId) {
          req.workspaceOwnerId = req.user._id;
          req.workspaceRole = "owner";
        } else {
          req.workspaceOwnerId = membership ? membership.owner : req.user._id;
          req.workspaceRole = membership ? membership.role : "owner";
        }
      }
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
