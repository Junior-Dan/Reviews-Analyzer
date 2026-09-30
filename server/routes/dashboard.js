const express = require("express");
const router = express.Router();
const Review = require("../core/review.model");

/**
 * GET /dashboard
 * Query params: ?platform=google&appId=com.example.app
 * Returns reviews from MongoDB
 */
router.get("/", async (req, res) => {
  try {
    const { platform, appId } = req.query;

    if (!platform || !appId) {
      return res.status(400).json({
        message: "Please provide both 'platform' and 'appId' query parameters"
      });
    }

    // Fetch all reviews for this app from MongoDB
    const reviews = await Review.find({ 
      platform, 
      appId
    }).sort({ createdAt: -1 });

    res.json({
      platform,
      appId,
      total: reviews.length,
      reviews
    });
  } catch (err) {
    console.error("Dashboard error:", err);
    res.status(500).json({ message: "Server error" });
  }
});


module.exports = router;
