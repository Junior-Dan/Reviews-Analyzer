const express = require("express");
const router = express.Router();
const App = require("../core/app.model");

/**
 * GET /apps
 * Query: ?platform=google (optional filter)
 * Returns all unique apps stored in MongoDB
 */
router.get("/", async (req, res) => {
  try {
    const { platform } = req.query;
    const query = {};
    if (platform) {
      query.platform = platform;
    }

    const apps = await App.find(query).sort({ name: 1 });
    // Map to simple array of IDs to maintain backward compatibility with frontend 
    // or return full objects if frontend can handle it.
    // The previous implementation returned { apps: [ "com.example" ] }
    // Let's return { apps: [ "com.example" ] } to avoid breaking changes for now,
    // OR update frontend. Frontend expects: `data.apps.forEach(appId => ...)`
    // So we should return list of appIds.

    res.json({
      apps: apps.map(a => a.appId)
    });
  } catch (err) {
    console.error("Apps route error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
