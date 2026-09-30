const express = require("express");
const router = express.Router();
const App = require("../core/app.model");
const { protect } = require("../middleware/auth.middleware");

/**
 * GET /apps
 * Query: ?platform=google (optional filter)
 * Returns all unique apps stored in MongoDB
 */
router.get("/", async (req, res) => {
  try {
    const { platform, full } = req.query;
    const query = {};
    if (platform) {
      query.platform = platform;
    }

    const apps = await App.find(query).sort({ name: 1 });

    if (full === "true") {
      return res.json({ apps });
    }

    res.json({
      apps: apps.map((a) => a.appId)
    });
  } catch (err) {
    console.error("Apps route error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * POST /apps
 * Add a new application to monitor
 */
router.post("/", async (req, res) => {
  try {
    const { name, platform, appId } = req.body;

    if (!name || !platform || !appId) {
      return res.status(400).json({ message: "Provide 'name', 'platform', and 'appId'" });
    }

    const existingApp = await App.findOne({ platform, appId });
    if (existingApp) {
      return res.status(400).json({ message: "App already registered for this platform" });
    }

    const app = await App.create({
      name,
      platform: platform.toLowerCase(),
      appId,
      user: req.user ? req.user._id : null
    });

    res.status(201).json({ message: "App added successfully", app });
  } catch (err) {
    console.error("Add app error:", err);
    res.status(500).json({ message: "Server error while adding app" });
  }
});

/**
 * DELETE /apps/:id
 * Remove a tracked application
 */
router.delete("/:id", async (req, res) => {
  try {
    const app = await App.findById(req.params.id);
    if (!app) {
      return res.status(404).json({ message: "App not found" });
    }

    await App.deleteOne({ _id: req.params.id });
    res.json({ message: "App removed successfully" });
  } catch (err) {
    console.error("Delete app error:", err);
    res.status(500).json({ message: "Server error while deleting app" });
  }
});

module.exports = router;
