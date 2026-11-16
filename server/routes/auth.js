const express = require("express");
const router = express.Router();
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const User = require("../core/user.model");
const TeamMembership = require("../core/teamMembership.model");
const { protect, JWT_SECRET } = require("../middleware/auth.middleware");

// Helper to generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, JWT_SECRET, { expiresIn: "30d" });
};

async function resolveWorkspaceContext(user) {
  const membership = await TeamMembership.findOne({
    memberUser: user._id,
    status: "accepted",
  })
    .sort({ acceptedAt: -1 })
    .populate("owner", "companyLogo");
  if (membership) {
    return {
      companyLogo: membership.owner?.companyLogo || user.companyLogo || null,
      workspaceRole: membership.role || "staff",
    };
  }
  return {
    companyLogo: user.companyLogo || null,
    workspaceRole: "owner",
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
      const { companyLogo, workspaceRole } = await resolveWorkspaceContext(user);
      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        workspaceRole,
        avatar: user.avatar || null,
        companyLogo,
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
router.get("/me", protect, async (req, res) => {
  const { companyLogo, workspaceRole } = await resolveWorkspaceContext(req.user);
  res.json({
    _id: req.user._id,
    name: req.user.name,
    email: req.user.email,
    role: req.user.role,
    workspaceRole,
    avatar: req.user.avatar || null,
    companyLogo,
    createdAt: req.user.createdAt
  });
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

    const { companyLogo, workspaceRole } = await resolveWorkspaceContext(user);
    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      workspaceRole,
      avatar: user.avatar || null,
      companyLogo,
      token: generateToken(user._id)
    });
  } catch (err) {
    console.error("Google auth error:", err);
    res.status(500).json({ message: "Server error during Google authentication" });
  }
});

module.exports = router;
