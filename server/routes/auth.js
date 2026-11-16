const express = require("express");
const router = express.Router();
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const User = require("../core/user.model");
const TeamMembership = require("../core/teamMembership.model");
const App = require("../core/app.model");
const StoreConnection = require("../core/storeConnection.model");
const Device = require("../core/device.model");
const { logAuditEvent } = require("../utils/auditLogger");
const { protect, JWT_SECRET } = require("../middleware/auth.middleware");

// Helper to generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, JWT_SECRET, { expiresIn: "30d" });
};

async function linkPendingMemberships(user) {
  if (!user?._id || !user?.email) return;
  await TeamMembership.updateMany(
    { email: user.email.toLowerCase(), memberUser: null },
    { $set: { memberUser: user._id } }
  );
}

async function resolveWorkspaceContext(user) {
  const membership = await TeamMembership.findOne({
    memberUser: user._id,
    status: "accepted",
  })
    .sort({ acceptedAt: -1 })
    .populate("owner", "companyLogo companyName name email billingPlan billingEmail");
  if (membership) {
    return {
      companyLogo: membership.owner?.companyLogo || user.companyLogo || null,
      companyName: membership.owner?.companyName || membership.owner?.name || "",
      billingPlan: membership.owner?.billingPlan || "free",
      billingEmail: membership.owner?.billingEmail || membership.owner?.email || "",
      workspaceRole: membership.role || "staff",
      workspaceId: String(membership.owner?._id || user._id),
    };
  }
  return {
    companyLogo: user.companyLogo || null,
    companyName: user.companyName || "",
    billingPlan: user.billingPlan || "free",
    billingEmail: user.billingEmail || user.email || "",
    workspaceRole: "owner",
    workspaceId: String(user._id),
  };
}

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user (Developer, Admin, Support)
 * @access  Public
 */
router.post("/register", async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Please provide name, email, and password" });
    }

    const userExists = await User.findOne({ email: email.toLowerCase() });
    if (userExists) {
      return res.status(400).json({ message: "User already exists with this email" });
    }

    const user = await User.create({
      name,
      email,
      password,
      role: role || "Developer"
    });

    if (user) {
      await linkPendingMemberships(user);
      void logAuditEvent({
        owner: user._id,
        actor: user._id,
        actorEmail: user.email,
        severity: "LOW",
        action: "AUTH REGISTER",
        entity: "Auth",
        description: `Account registered for ${user.email}`,
        metadata: { ip: req.ip },
      });
      res.status(201).json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar || null,
        companyLogo: user.companyLogo || null,
        token: generateToken(user._id)
      });
    } else {
      res.status(400).json({ message: "Invalid user data" });
    }
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ message: "Server error during registration" });
  }
});

/**
 * @route   POST /api/auth/login
 * @desc    Authenticate user & get token
 * @access  Public
 */
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Please provide email and password" });
    }

    const user = await User.findOne({ email: email.toLowerCase() });

    if (user && (await user.matchPassword(password))) {
      await linkPendingMemberships(user);
      await linkPendingMemberships(user);
    const { companyLogo, companyName, workspaceRole, workspaceId } = await resolveWorkspaceContext(user);
      void logAuditEvent({
        owner: workspaceId || user._id,
        actor: user._id,
        actorEmail: user.email,
        severity: "LOW",
        action: "AUTH LOGIN_SUCCESS",
        entity: "Auth",
        description: `User logged in for ${user.email}`,
        metadata: { ip: req.ip, userAgent: req.headers["user-agent"] || "" },
      });
      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        workspaceRole,
        avatar: user.avatar || null,
        companyLogo,
        companyName,
        token: generateToken(user._id)
      });
    } else {
      res.status(401).json({ message: "Invalid email or password" });
    }
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Server error during login" });
  }
});

/**
 * @route   GET /api/auth/me
 * @desc    Get current user profile
 * @access  Private
 */
router.get("/workspaces", protect, async (req, res) => {
  try {
    const memberships = await TeamMembership.find({
      memberUser: req.user._id,
      status: "accepted",
    })
      .populate("owner", "name companyName companyLogo")
      .sort({ acceptedAt: -1 });

    const list = [
      {
        id: String(req.user._id),
        name: req.user.companyName || `${req.user.name || "My"}'s Workspace`,
        companyLogo: req.user.companyLogo || null,
        role: "owner",
      },
    ];

    memberships.forEach((m) => {
      if (m.owner && String(m.owner._id) !== String(req.user._id)) {
        list.push({
          id: String(m.owner._id),
          name: m.owner.companyName || m.owner.name || "Workspace",
          companyLogo: m.owner.companyLogo || null,
          role: m.role || "staff",
        });
      }
    });

    return res.json({
      workspaces: list,
      activeWorkspaceId: String(req.workspaceOwnerId || req.user._id),
    });
  } catch (err) {
    console.error("List workspaces error:", err);
    return res.status(500).json({ message: "Failed to load organizations" });
  }
});

router.get("/me", protect, async (req, res) => {
  const { companyLogo, companyName, billingPlan, billingEmail, workspaceRole, workspaceId } = await resolveWorkspaceContext(req.user);
  res.json({
    _id: req.user._id,
    name: req.user.name,
    email: req.user.email,
    role: req.user.role,
    workspaceRole,
    workspaceId,
    avatar: req.user.avatar || null,
    companyLogo,
    companyName,
    billingPlan,
    billingEmail,
    createdAt: req.user.createdAt
  });
});

router.patch("/me", protect, async (req, res) => {
  try {
    const nextName = typeof req.body?.name === "string" ? req.body.name.trim() : "";
    if (!nextName) {
      return res.status(400).json({ message: "Name cannot be empty" });
    }
    req.user.name = nextName;
    await req.user.save();
    const { companyLogo, companyName, billingPlan, billingEmail, workspaceRole, workspaceId } = await resolveWorkspaceContext(req.user);
    void logAuditEvent({
      owner: workspaceId || req.user._id,
      actor: req.user._id,
      actorEmail: req.user.email,
      severity: "LOW",
      action: "PROFILE UPDATED",
      entity: "Account",
      description: `Profile name updated to "${req.user.name}"`,
      metadata: { name: req.user.name },
    });
    res.json({
      _id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
      workspaceRole,
      workspaceId,
      avatar: req.user.avatar || null,
      companyLogo,
      companyName,
      billingPlan,
      billingEmail,
      createdAt: req.user.createdAt
    });
  } catch (err) {
    console.error("Update profile error:", err);
    res.status(500).json({ message: "Failed to update profile" });
  }
});

router.patch("/account", protect, async (req, res) => {
  try {
    const role = req.workspaceRole || "owner";
    if (role !== "owner" && role !== "admin") {
      return res.status(403).json({ message: "Only admins can update the account profile" });
    }
    const ownerId = req.workspaceOwnerId || req.user._id;
    const ownerUser = await User.findById(ownerId);
    if (!ownerUser) {
      return res.status(404).json({ message: "Workspace owner not found" });
    }
    if (typeof req.body?.companyName === "string") {
      ownerUser.companyName = req.body.companyName.trim();
    }
    if (["free", "pro", "enterprise"].includes(req.body?.billingPlan)) {
      ownerUser.billingPlan = req.body.billingPlan;
    }
    if (typeof req.body?.billingEmail === "string") {
      ownerUser.billingEmail = req.body.billingEmail.trim().toLowerCase();
    }
    await ownerUser.save();
    void logAuditEvent({
      owner: ownerUser._id,
      actor: req.user._id,
      actorEmail: req.user.email,
      severity: "MEDIUM",
      action: "ACCOUNT UPDATED",
      entity: "Account",
      description: `Account settings updated by ${req.user.email}`,
      metadata: {
        companyName: ownerUser.companyName || "",
        billingPlan: ownerUser.billingPlan || "free",
        billingEmail: ownerUser.billingEmail || "",
      },
    });
    res.json({
      companyName: ownerUser.companyName || "",
      companyLogo: ownerUser.companyLogo || null,
      billingPlan: ownerUser.billingPlan || "free",
      billingEmail: ownerUser.billingEmail || ownerUser.email || "",
      workspaceId: String(ownerUser._id),
    });
  } catch (err) {
    console.error("Update account profile error:", err);
    res.status(500).json({ message: "Failed to update account profile" });
  }
});

router.delete("/workspace", protect, async (req, res) => {
  try {
    if (req.workspaceRole !== "owner") {
      return res.status(403).json({ message: "Only the workspace owner can delete the workspace" });
    }
    if (String(req.body?.confirmText || "").trim() !== "DELETE") {
      return res.status(400).json({ message: "Type DELETE to confirm workspace deletion" });
    }
    const ownerId = req.user._id;
    await Promise.all([
      App.deleteMany({ user: ownerId }),
      StoreConnection.deleteMany({ user: ownerId }),
      TeamMembership.deleteMany({ owner: ownerId }),
      Device.deleteMany({ owner: ownerId }),
    ]);
    await User.deleteOne({ _id: ownerId });
    res.json({ message: "Workspace deleted successfully" });
  } catch (err) {
    console.error("Delete workspace error:", err);
    res.status(500).json({ message: "Failed to delete workspace" });
  }
});

/**
 * @route   PATCH /api/auth/company-logo
 * @desc    Save or remove the authenticated user's company logo
 * @access  Private
 */
router.patch("/company-logo", protect, async (req, res) => {
  try {
    const { companyLogo } = req.body || {};
    if (companyLogo !== null && companyLogo !== undefined && typeof companyLogo !== "string") {
      return res.status(400).json({ message: "Invalid company logo format" });
    }
    if (typeof companyLogo === "string" && companyLogo.length > 3 * 1024 * 1024) {
      return res.status(400).json({ message: "Company logo image is too large (max ~2MB)" });
    }

    req.user.companyLogo = companyLogo ? companyLogo.trim() : null;
    await req.user.save();
    void logAuditEvent({
      owner: req.workspaceOwnerId || req.user._id,
      actor: req.user._id,
      actorEmail: req.user.email,
      severity: "LOW",
      action: req.user.companyLogo ? "COMPANY_LOGO UPDATED" : "COMPANY_LOGO REMOVED",
      entity: "Account",
      description: req.user.companyLogo
        ? `Company logo updated by ${req.user.email}`
        : `Company logo removed by ${req.user.email}`,
    });

    res.json({
      message: req.user.companyLogo ? "Company logo saved" : "Company logo removed",
      companyLogo: req.user.companyLogo
    });
  } catch (err) {
    console.error("Save company logo error:", err);
    res.status(500).json({ message: "Failed to save company logo" });
  }
});

/**
 * @route   GET /api/auth/config
 * @desc    Return public auth configuration (Google Client ID if set)
 * @access  Public
 */
router.get("/config", (req, res) => {
  res.json({
    googleClientId: process.env.GOOGLE_CLIENT_ID || ""
  });
});

/**
 * @route   POST /api/auth/check-email
 * @desc    Check if an email already has an account (for unified login/signup modal)
 * @access  Public
 */
router.post("/check-email", async (req, res) => {
  try {
    const email = String(req.body?.email || "").trim().toLowerCase();
    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }
    const existing = await User.findOne({ email }).select("_id");
    res.json({ exists: Boolean(existing) });
  } catch (err) {
    console.error("Check email error:", err);
    res.status(500).json({ message: "Server error checking email" });
  }
});

/**
 * @route   POST /api/auth/google
 * @desc    Authenticate or register user via Google OAuth token
 * @access  Public
 */
router.post("/google", async (req, res) => {
  try {
    const { credential, accessToken } = req.body || {};
    const expectedClientId = process.env.GOOGLE_CLIENT_ID || "";

    if (!credential && !accessToken) {
      return res.status(400).json({ message: "Google token is required" });
    }

    let googleUser = null;

    if (credential) {
      const verifyRes = await fetch(
        `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`
      );
      if (!verifyRes.ok) {
        return res.status(401).json({ message: "Invalid Google ID token" });
      }
      const payload = await verifyRes.json();
      if (expectedClientId && payload.aud !== expectedClientId) {
        return res.status(401).json({ message: "Google token audience mismatch" });
      }
      googleUser = {
        sub: payload.sub,
        email: payload.email,
        name: payload.name || payload.email?.split("@")[0] || "Google User",
        picture: payload.picture || null
      };
    } else if (accessToken) {
      const infoRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      if (!infoRes.ok) {
        return res.status(401).json({ message: "Invalid Google access token" });
      }
      const payload = await infoRes.json();
      googleUser = {
        sub: payload.sub,
        email: payload.email,
        name: payload.name || payload.email?.split("@")[0] || "Google User",
        picture: payload.picture || null
      };
    }

    if (!googleUser?.email) {
      return res.status(400).json({ message: "Google account did not provide an email address" });
    }

    const email = googleUser.email.toLowerCase();
    let user = await User.findOne({ email });

    if (!user) {
      user = await User.create({
        name: googleUser.name,
        email,
        password: crypto.randomBytes(24).toString("hex"),
        role: "Developer",
        authProvider: "google",
        googleId: googleUser.sub,
        avatar: googleUser.picture
      });
    } else {
      let dirty = false;
      if (!user.googleId && googleUser.sub) {
        user.googleId = googleUser.sub;
        dirty = true;
      }
      if (googleUser.picture && user.avatar !== googleUser.picture) {
        user.avatar = googleUser.picture;
        dirty = true;
      }
      if (user.authProvider === "google" && googleUser.name && user.name !== googleUser.name) {
        user.name = googleUser.name;
        dirty = true;
      }
      if (dirty) {
        await user.save();
      }
    }

    await linkPendingMemberships(user);
    const { companyLogo, companyName, workspaceRole, workspaceId } = await resolveWorkspaceContext(user);
    void logAuditEvent({
      owner: workspaceId || user._id,
      actor: user._id,
      actorEmail: user.email,
      severity: "LOW",
      action: "AUTH GOOGLE_LOGIN",
      entity: "Auth",
      description: `User signed in via Google for ${user.email}`,
      metadata: { ip: req.ip, userAgent: req.headers["user-agent"] || "" },
    });
    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      workspaceRole,
      avatar: user.avatar || null,
      companyLogo,
      companyName,
      token: generateToken(user._id)
    });
  } catch (err) {
    console.error("Google auth error:", err);
    res.status(500).json({ message: "Server error during Google authentication" });
  }
});

module.exports = router;
