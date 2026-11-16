const express = require("express");
const router = express.Router();
const gplay = require("google-play-scraper").default || require("google-play-scraper");
const appleStore = require("app-store-scraper");
const App = require("../core/app.model");
const Review = require("../core/review.model");
const { protect } = require("../middleware/auth.middleware");

router.use(protect);

/**
 * GET /apps
 * Query: ?platform=google (optional filter)
 * Returns all unique apps stored in MongoDB for the authenticated user
 */
router.get("/", async (req, res) => {
  try {
    const { platform, full } = req.query;
    const ownerId = req.workspaceOwnerId || req.user._id;
    const query = { user: ownerId };
    if (platform) {
      query.platform = String(platform).toLowerCase();
    }

    const apps = await App.find(query).sort({ name: 1 });

    if (full === "true") {
      if (apps.length === 0) {
        return res.json({ apps: [] });
      }
      const appOrFilters = apps.map((a) => ({
        platform: String(a.platform || "").toLowerCase(),
        appId: a.appId,
      }));
      const statsRows = await Review.aggregate([
        { $match: { $or: appOrFilters } },
        {
          $group: {
            _id: { platform: "$platform", appId: "$appId" },
            reviewsCount: { $sum: 1 },
            avgRating: { $avg: "$rating" },
            posCount: { $sum: { $cond: [{ $eq: ["$sentiment", "Positive"] }, 1, 0] } },
            neuCount: { $sum: { $cond: [{ $eq: ["$sentiment", "Neutral"] }, 1, 0] } },
            negCount: { $sum: { $cond: [{ $eq: ["$sentiment", "Negative"] }, 1, 0] } },
          },
        },
      ]);
      const statsMap = new Map();
      statsRows.forEach((row) => {
        const key = `${String(row._id?.platform || "").toLowerCase()}:${row._id?.appId}`;
        const total = row.reviewsCount || 0;
        statsMap.set(key, {
          reviewsCount: total,
          avgRating: total > 0 ? Number((row.avgRating || 0).toFixed(1)) : 0,
          posPct: total > 0 ? Math.round(((row.posCount || 0) / total) * 100) : 0,
          neuPct: total > 0 ? Math.round(((row.neuCount || 0) / total) * 100) : 0,
          negPct: total > 0 ? Math.round(((row.negCount || 0) / total) * 100) : 0,
        });
      });

      const enriched = apps.map((a) => {
        const key = `${String(a.platform || "").toLowerCase()}:${a.appId}`;
        const st = statsMap.get(key) || {
          reviewsCount: 0,
          avgRating: 0,
          posPct: 0,
          neuPct: 0,
          negPct: 0,
        };
        return {
          ...a.toObject(),
          ...st,
        };
      });
      return res.json({ apps: enriched });
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
 * Add a new application to monitor for the authenticated user
 */
router.post("/", async (req, res) => {
  try {
    if (req.workspaceRole === "staff") {
      return res.status(403).json({ message: "Staff members cannot add monitored apps." });
    }
    const { name, platform, appId } = req.body;

    if (!name || !platform || !appId) {
      return res.status(400).json({ message: "Provide 'name', 'platform', and 'appId'" });
    }

    const normalizedPlatform = String(platform).toLowerCase();
    const ownerId = req.workspaceOwnerId || req.user._id;
    const existingApp = await App.findOne({
      user: ownerId,
      platform: normalizedPlatform,
      appId
    });
    if (existingApp) {
      return res.status(400).json({ message: "App already registered for this platform" });
    }

    const app = await App.create({
      name,
      platform: normalizedPlatform,
      appId,
      user: ownerId
    });

    res.status(201).json({ message: "App added successfully", app });
  } catch (err) {
    console.error("Add app error:", err);
    res.status(500).json({ message: "Server error while adding app" });
  }
});

/**
 * DELETE /apps/:id
 * Remove a tracked application owned by the authenticated user
 */
router.delete("/:id", async (req, res) => {
  try {
    if (req.workspaceRole === "staff") {
      return res.status(403).json({ message: "Staff members cannot remove monitored apps." });
    }
    const ownerId = req.workspaceOwnerId || req.user._id;
    const app = await App.findOneAndDelete({ _id: req.params.id, user: ownerId });
    if (!app) {
      return res.status(404).json({ message: "App not found" });
    }

    res.json({ message: "App removed successfully" });
  } catch (err) {
    console.error("Delete app error:", err);
    res.status(500).json({ message: "Server error while deleting app" });
  }
});

/**
 * GET /apps/details
 * Query: ?platform=google&appId=com.whatsapp
 * Fetches live store metadata ("About", developer, category, installs)
 */
router.get("/details", async (req, res) => {
  const platform = String(req.query.platform || "google").toLowerCase();
  const appId = String(req.query.appId || req.query.packageName || "").trim();
  if (!appId) {
    return res.status(400).json({ message: "Provide 'appId'" });
  }

  try {
    if (platform === "google") {
      const d = await gplay.app({ appId, lang: "en", country: "us" });
      return res.json({
        title: d.title || null,
        summary: d.summary || null,
        description: d.description || null,
        developer: d.developer || null,
        genre: d.genre || null,
        installs: d.installs || null,
        version: d.version || null,
        released: d.released || null,
        icon: d.icon || null,
      });
    }

    if (platform === "apple") {
      const d = await appleStore.app({ id: appId });
      return res.json({
        title: d.title || null,
        summary: null,
        description: d.description || null,
        developer: d.developer || null,
        genre: d.primaryGenre || null,
        installs: null,
        version: d.version || null,
        released: d.released || null,
        icon: d.icon || null,
      });
    }

    return res.json({
      title: null,
      summary: null,
      description: null,
      developer: null,
      genre: null,
      installs: null,
      version: null,
      released: null,
      icon: null,
    });
  } catch (err) {
    console.warn(`[Apps Details] Lookup failed for ${platform}:${appId}:`, err.message);
    return res.json({
      title: null,
      summary: null,
      description: null,
      developer: null,
      genre: null,
      installs: null,
      version: null,
      released: null,
      icon: null,
    });
  }
});

module.exports = router;
