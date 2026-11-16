const express = require("express");
const crypto = require("crypto");
const os = require("os");
const router = express.Router();
const Device = require("../core/device.model");
const { logAuditEvent } = require("../utils/auditLogger");
const { protect } = require("../middleware/auth.middleware");

function getLanIp() {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      if (net.family === "IPv4" && !net.internal) {
        return net.address;
      }
    }
  }
  return null;
}

function parseUserAgent(ua = "") {
  const s = String(ua);
  let deviceType = "desktop";
  let os = "Unknown OS";
  let browser = "Browser";
  let defaultName = "Workstation";

  if (/iPhone/i.test(s)) {
    deviceType = "phone";
    os = "iOS";
    defaultName = "iPhone";
  } else if (/iPad/i.test(s)) {
    deviceType = "tablet";
    os = "iPadOS";
    defaultName = "iPad";
  } else if (/Android/i.test(s)) {
    deviceType = /Mobile/i.test(s) ? "phone" : "tablet";
    os = "Android";
    defaultName = deviceType === "phone" ? "Android Phone" : "Android Tablet";
  } else if (/Mac OS X|Macintosh/i.test(s)) {
    deviceType = "desktop";
    os = "macOS";
    defaultName = "Mac";
  } else if (/Windows/i.test(s)) {
    deviceType = "desktop";
    os = "Windows";
    defaultName = "Windows PC";
  } else if (/Linux/i.test(s)) {
    deviceType = "desktop";
    os = "Linux";
    defaultName = "Linux Workstation";
  }

  if (/Edg\//i.test(s)) browser = "Edge";
  else if (/Chrome\//i.test(s) && !/Chromium/i.test(s)) browser = "Chrome";
  else if (/Safari\//i.test(s) && !/Chrome/i.test(s)) browser = "Safari";
  else if (/Firefox\//i.test(s)) browser = "Firefox";

  return {
    deviceType,
    os,
    browser,
    defaultName: `${defaultName} (${browser})`,
  };
}

function formatDevice(doc) {
  const ts = doc.lastActiveAt ? new Date(doc.lastActiveAt).getTime() : 0;
  const isOnline = doc.status === "active" && ts > 0 && Date.now() - ts < 5 * 60 * 1000;
  let lastActiveLabel = "Never";
  if (doc.status === "pending") {
    lastActiveLabel = "Waiting for scan";
  } else if (doc.status === "revoked") {
    lastActiveLabel = "Revoked";
  } else if (ts > 0) {
    const diffMs = Math.max(0, Date.now() - ts);
    if (diffMs < 5 * 60 * 1000) lastActiveLabel = "Active";
    else if (diffMs < 60 * 60 * 1000) lastActiveLabel = `${Math.floor(diffMs / 60000)}m ago`;
    else if (diffMs < 24 * 60 * 60 * 1000) lastActiveLabel = `${Math.floor(diffMs / 3600000)}h ago`;
    else {
      lastActiveLabel = new Date(ts).toLocaleDateString("en-US", {
        month: "short",
        day: "2-digit",
        year: "numeric",
      });
    }
  }

  return {
    id: String(doc._id),
    name: doc.name,
    deviceType: doc.deviceType,
    os: doc.os,
    browser: doc.browser,
    status: doc.status,
    isOnline,
    lastActive: lastActiveLabel,
    pairedAt: doc.pairedAt || doc.createdAt,
    createdAt: doc.createdAt,
  };
}

/**
 * GET /api/devices/pair-info/:code (Public - used by mobile QR landing page)
 */
router.get("/pair-info/:code", async (req, res) => {
  try {
    const code = String(req.params.code || "").trim();
    const device = await Device.findOne({ pairingCode: code }).populate("owner", "name email");
    if (!device) {
      return res.status(404).json({ message: "Pairing session not found." });
    }
    if (device.status === "active") {
      return res.json({ status: "active", device: formatDevice(device) });
    }
    if (device.expiresAt && new Date(device.expiresAt).getTime() < Date.now()) {
      return res.status(410).json({ message: "This QR code has expired. Generate a new one on your dashboard." });
    }
    const parsed = parseUserAgent(req.headers["user-agent"] || "");
    return res.json({
      status: "pending",
      workspaceName: device.owner?.name || device.owner?.email || "Reviews Analyzer",
      suggestedName: parsed.defaultName,
      suggestedType: parsed.deviceType,
      suggestedOs: parsed.os,
    });
  } catch (err) {
    console.error("Pair info error:", err);
    return res.status(500).json({ message: "Failed to load pairing session." });
  }
});

/**
 * POST /api/devices/complete-pair (Public with valid unexpired pairing code)
 */
router.post("/complete-pair", async (req, res) => {
  try {
    const { code, name, deviceType, os } = req.body || {};
    const trimmedCode = String(code || "").trim();
    if (!trimmedCode) {
      return res.status(400).json({ message: "Pairing code is required." });
    }

    const device = await Device.findOne({ pairingCode: trimmedCode });
    if (!device) {
      return res.status(404).json({ message: "Invalid pairing code." });
    }
    if (device.status === "active") {
      return res.json({ message: "Device already paired.", device: formatDevice(device) });
    }
    if (device.expiresAt && new Date(device.expiresAt).getTime() < Date.now()) {
      return res.status(410).json({ message: "QR code expired. Please generate a new QR code." });
    }

    const ua = req.headers["user-agent"] || "";
    const parsed = parseUserAgent(ua);
    const now = new Date();

    device.name = String(name || "").trim() || parsed.defaultName;
    device.deviceType = ["phone", "tablet", "desktop", "other"].includes(deviceType)
      ? deviceType
      : parsed.deviceType;
    device.os = String(os || "").trim() || parsed.os;
    device.browser = parsed.browser;
    device.userAgent = ua;
    device.ipAddress = req.ip || "";
    device.status = "active";
    device.pairedAt = now;
    device.lastActiveAt = now;
    await device.save();

    void logAuditEvent({
      owner: device.owner,
      actor: device.addedBy,
      actorEmail: "qr-pairing",
      severity: "LOW",
      action: "DEVICE PAIRED",
      entity: "Device",
      description: `Paired device ${device.name} (${device.os} • ${device.browser}) via QR code`,
      metadata: { deviceType: device.deviceType, os: device.os, ip: req.ip },
    });

    return res.json({
      message: "Device paired successfully.",
      device: formatDevice(device),
    });
  } catch (err) {
    console.error("Complete pair error:", err);
    return res.status(500).json({ message: "Failed to complete device pairing." });
  }
});

// Protected routes below
router.use(protect);

/**
 * GET /api/devices
 */
router.get("/", async (req, res) => {
  try {
    const ownerId = req.workspaceOwnerId || req.user._id;
    const devices = await Device.find({
      owner: ownerId,
      status: { $in: ["active", "revoked"] },
    }).sort({ lastActiveAt: -1, createdAt: -1 });

    return res.json({
      devices: devices.map(formatDevice),
    });
  } catch (err) {
    console.error("List devices error:", err);
    return res.status(500).json({ message: "Failed to load devices." });
  }
});

/**
 * POST /api/devices/pair-session
 * Creates a pending QR pairing session
 */
router.post("/pair-session", async (req, res) => {
  try {
    const ownerId = req.workspaceOwnerId || req.user._id;
    const pairingCode = crypto.randomBytes(6).toString("hex").toUpperCase();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    // Clean up expired pending sessions for this owner
    await Device.deleteMany({
      owner: ownerId,
      status: "pending",
      expiresAt: { $lt: new Date() },
    });

    const session = await Device.create({
      owner: ownerId,
      addedBy: req.user._id,
      name: "Pending QR Device",
      deviceType: "phone",
      pairingCode,
      status: "pending",
      expiresAt,
    });

    return res.status(201).json({
      sessionId: String(session._id),
      code: pairingCode,
      expiresAt: expiresAt.toISOString(),
      lanIp: getLanIp(),
    });
  } catch (err) {
    console.error("Create pair session error:", err);
    return res.status(500).json({ message: "Failed to create pairing session." });
  }
});

/**
 * GET /api/devices/pair-status/:code
 */
router.get("/pair-status/:code", async (req, res) => {
  try {
    const ownerId = req.workspaceOwnerId || req.user._id;
    const code = String(req.params.code || "").trim();
    const device = await Device.findOne({ owner: ownerId, pairingCode: code });
    if (!device) {
      return res.status(404).json({ message: "Pairing session not found." });
    }
    return res.json({
      status: device.status,
      expired: Boolean(device.expiresAt && new Date(device.expiresAt).getTime() < Date.now() && device.status === "pending"),
      device: device.status === "active" ? formatDevice(device) : null,
    });
  } catch (err) {
    console.error("Pair status error:", err);
    return res.status(500).json({ message: "Failed to check pairing status." });
  }
});

/**
 * POST /api/devices/register-current
 * Quickly registers the current browser/workstation
 */
router.post("/register-current", async (req, res) => {
  try {
    const ownerId = req.workspaceOwnerId || req.user._id;
    const ua = req.headers["user-agent"] || "";
    const parsed = parseUserAgent(ua);
    const customName = String(req.body?.name || "").trim();
    const now = new Date();

    const device = await Device.create({
      owner: ownerId,
      addedBy: req.user._id,
      name: customName || parsed.defaultName,
      deviceType: parsed.deviceType,
      os: parsed.os,
      browser: parsed.browser,
      userAgent: ua,
      ipAddress: req.ip || "",
      status: "active",
      pairedAt: now,
      lastActiveAt: now,
    });

    void logAuditEvent({
      owner: ownerId,
      actor: req.user._id,
      actorEmail: req.user.email,
      severity: "LOW",
      action: "DEVICE REGISTERED",
      entity: "Device",
      description: `Registered browser ${device.name}`,
      metadata: { deviceType: device.deviceType, os: device.os },
    });

    return res.status(201).json({ device: formatDevice(device) });
  } catch (err) {
    console.error("Register current device error:", err);
    return res.status(500).json({ message: "Failed to register current device." });
  }
});

/**
 * PATCH /api/devices/:id
 */
router.patch("/:id", async (req, res) => {
  try {
    const ownerId = req.workspaceOwnerId || req.user._id;
    const updates = {};
    if (typeof req.body?.name === "string" && req.body.name.trim()) {
      updates.name = req.body.name.trim();
    }
    if (["active", "revoked"].includes(req.body?.status)) {
      updates.status = req.body.status;
    }

    const device = await Device.findOneAndUpdate(
      { _id: req.params.id, owner: ownerId },
      { $set: updates },
      { new: true }
    );
    if (!device) {
      return res.status(404).json({ message: "Device not found." });
    }
    void logAuditEvent({
      owner: ownerId,
      actor: req.user._id,
      actorEmail: req.user.email,
      severity: updates.status === "revoked" ? "HIGH" : "MEDIUM",
      action: updates.status === "revoked" ? "DEVICE REVOKED" : "DEVICE UPDATED",
      entity: "Device",
      description: `Updated device ${device.name}${updates.status ? ` (status: ${updates.status})` : ""}`,
      metadata: updates,
    });
    return res.json({ device: formatDevice(device) });
  } catch (err) {
    console.error("Update device error:", err);
    return res.status(500).json({ message: "Failed to update device." });
  }
});

/**
 * DELETE /api/devices/:id
 */
router.delete("/:id", async (req, res) => {
  try {
    const ownerId = req.workspaceOwnerId || req.user._id;
    const deleted = await Device.findOneAndDelete({ _id: req.params.id, owner: ownerId });
    if (!deleted) {
      return res.status(404).json({ message: "Device not found." });
    }
    void logAuditEvent({
      owner: ownerId,
      actor: req.user._id,
      actorEmail: req.user.email,
      severity: "MEDIUM",
      action: "DEVICE REMOVED",
      entity: "Device",
      description: `Removed device ${deleted.name}`,
    });
    return res.json({ message: "Device removed." });
  } catch (err) {
    console.error("Delete device error:", err);
    return res.status(500).json({ message: "Failed to remove device." });
  }
});

module.exports = router;
