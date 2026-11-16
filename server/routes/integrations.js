const express = require("express");
const StoreConnection = require("../core/storeConnection.model");
const { protect } = require("../middleware/auth.middleware");

const router = express.Router();
router.use(protect);

const SUPPORTED_PLATFORMS = new Set(["google", "apple", "samsung", "amazon", "roku"]);

/**
 * GET /api/integrations
 * Returns all configured store connections (redacting sensitive secrets).
 */
router.get("/", async (req, res) => {
  try {
    const ownerId = req.workspaceOwnerId || req.user._id;
    const connections = await StoreConnection.find({ user: ownerId }).sort({ updatedAt: -1 });
    const sanitized = connections.map((c) => {
      const creds = c.credentials || {};
      const hasCredentials = Boolean(
        creds.serviceAccountJson ||
          (creds.keyId && creds.issuerId && creds.privateKey) ||
          creds.apiKey
      );
      return {
        platform: c.platform,
        connectionName: c.connectionName,
        status: c.status,
        hasCredentials,
        endpoint: creds.endpoint || "",
        keyId: creds.keyId || "",
        issuerId: creds.issuerId || "",
        updatedAt: c.updatedAt,
      };
    });
    res.json({ integrations: sanitized });
  } catch (err) {
    console.error("Get integrations error:", err);
    res.status(500).json({ message: "Failed to load integrations" });
  }
});

/**
 * POST /api/integrations/:platform
 * Save or update store integration credentials and mark it Active.
 */
router.post("/:platform", async (req, res) => {
  try {
    if (req.workspaceRole === "staff") {
      return res.status(403).json({ message: "Staff members cannot modify store integrations." });
    }
    const platform = String(req.params.platform || "").toLowerCase();
    if (!SUPPORTED_PLATFORMS.has(platform)) {
      return res.status(400).json({ message: "Unsupported store platform" });
    }

    const {
      connectionName,
      endpoint,
      apiKey,
      serviceAccountJson,
      keyId,
      issuerId,
      privateKey,
    } = req.body || {};

    if (platform === "google" && serviceAccountJson) {
      try {
        const parsed =
          typeof serviceAccountJson === "string"
            ? JSON.parse(serviceAccountJson)
            : serviceAccountJson;
        if (!parsed?.client_email || !parsed?.private_key) {
          return res.status(400).json({
            message: "Google Service Account JSON must include client_email and private_key",
          });
        }
      } catch {
        return res.status(400).json({ message: "Invalid JSON format for Google Service Account" });
      }
    }

    const ownerId = req.workspaceOwnerId || req.user._id;
    const existing = await StoreConnection.findOne({ user: ownerId, platform });
    const nextCreds = {
      ...(existing?.credentials || {}),
      ...(endpoint !== undefined ? { endpoint } : {}),
      ...(apiKey ? { apiKey } : {}),
      ...(serviceAccountJson ? { serviceAccountJson } : {}),
      ...(keyId ? { keyId } : {}),
      ...(issuerId ? { issuerId } : {}),
      ...(privateKey ? { privateKey } : {}),
    };

    const doc = await StoreConnection.findOneAndUpdate(
      { user: ownerId, platform },
      {
        $set: {
          user: ownerId,
          platform,
          connectionName: connectionName || existing?.connectionName || `${platform} Store`,
          credentials: nextCreds,
          status: "Active",
        },
      },
      { upsert: true, new: true }
    );

    res.json({
      message: `${doc.connectionName} connected`,
      integration: {
        platform: doc.platform,
        connectionName: doc.connectionName,
        status: doc.status,
        hasCredentials: true,
        updatedAt: doc.updatedAt,
      },
    });
  } catch (err) {
    console.error("Save integration error:", err);
    res.status(500).json({ message: "Failed to save integration settings" });
  }
});

/**
 * DELETE /api/integrations/:platform
 * Disconnect a store integration.
 */
router.delete("/:platform", async (req, res) => {
  try {
    if (req.workspaceRole === "staff") {
      return res.status(403).json({ message: "Staff members cannot disconnect store integrations." });
    }
    const platform = String(req.params.platform || "").toLowerCase();
    const ownerId = req.workspaceOwnerId || req.user._id;
    await StoreConnection.findOneAndUpdate(
      { user: ownerId, platform },
      { $set: { status: "Invalid" } },
      { new: true }
    );
    res.json({ message: `${platform} disconnected` });
  } catch (err) {
    console.error("Disconnect integration error:", err);
    res.status(500).json({ message: "Failed to disconnect integration" });
  }
});

module.exports = router;
