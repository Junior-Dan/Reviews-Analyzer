const express = require("express");
const router = express.Router();
const { fetchGoogleReviews } = require("../connectors/google/google.connector");
const { fetchSamsungReviews } = require("../connectors/samsung/samsung.connector");
const { fetchAppleReviews } = require("../connectors/apple/apple.connector");
const { fetchRokuReviews } = require("../connectors/roku/roku.connector");
const { fetchAmazonReviews } = require("../connectors/amazon/amazon.connector");
const Review = require("../core/review.model");
const App = require("../core/app.model");
const ollamaService = require("../core/ollama.service");

// Helper to clean review text
const cleanReviewText = (text) => {
  if (!text) return "";
  return text.replace(/\(⭐ ≤ 3\)/g, "").trim();
};

/**
 * GET /reviews
 * Query: platform (google, apple, roku, etc.), appId
 */
router.get("/", async (req, res) => {
  try {
    let { platform, appId, packageName } = req.query;

    if (packageName && !appId) appId = packageName;

    if (!platform || !appId) {
      return res.status(400).json({ message: "Provide 'platform' and 'appId'" });
    }

    let allReviews = [];
    let realTotalCount = 0;
    let scrapedStats;

    // 1. Fetch from corresponding platform connector
    const plat = platform.toLowerCase();
    if (plat === "google") {
      const result = await fetchGoogleReviews(appId);
      allReviews = result.reviews || [];
      realTotalCount = result.totalCount;
    } else if (plat === "samsung") {
      const contentId = req.query.contentId;
      allReviews = await fetchSamsungReviews(contentId || appId);
    } else if (plat === "apple") {
      const result = await fetchAppleReviews(appId);
      allReviews = result.reviews || [];
      realTotalCount = result.totalCount;
      scrapedStats = { ratingDist: result.ratingDist };
    } else if (plat === "roku") {
      const result = await fetchRokuReviews(appId);
      allReviews = result.reviews || [];
      realTotalCount = result.totalCount;
      scrapedStats = { avgRating: result.avgRating, total: result.totalCount };
    } else if (plat === "amazon") {
      const result = await fetchAmazonReviews(appId);
      allReviews = result.reviews || [];
      realTotalCount = result.totalCount;
      scrapedStats = { ratingDist: result.ratingDist };
    } else {
      return res.status(400).json({ message: `Platform '${platform}' not supported` });
    }
    // Filter for last year (Google specific)
    const cutoffDate = new Date();
    cutoffDate.setFullYear(cutoffDate.getFullYear() - 1);
    if (plat === "google" || plat === "samsung") {
      allReviews = allReviews.filter(r => new Date(r.createdAt) >= cutoffDate);
    }

    // 2. Clean and Analyze with AI
    console.log(`[Reviews Route] Processing ${allReviews.length} reviews...`);

    // Get existing reviews to avoid redundant AI calls
    const existingReviews = await Review.find({ platform, appId });
    const existingMap = new Map(existingReviews.map(r => [r.reviewId, r]));

    const processedReviews = [];
    let newAnalysisCount = 0;
    const MAX_NEW_ANALYSIS = 50; // Safety limit for Ollama

    for (const r of allReviews) {
      r.text = cleanReviewText(r.text);
      const existing = existingMap.get(r.reviewId);

      if (existing?.aiAnalysis?.sentiment && existing.aiAnalysis.sentiment !== "Unknown") {
        r.aiAnalysis = existing.aiAnalysis;
      } else if (newAnalysisCount < MAX_NEW_ANALYSIS) {
        // Only analyze first N new reviews to avoid long timeouts
        r.aiAnalysis = await ollamaService.analyzeReview(r.text);
        newAnalysisCount++;
      } else {
        r.aiAnalysis = { sentiment: "Pending", category: "Other", summary: "Queued for analysis" };
      }

      processedReviews.push(r);
      
      // Upsert to DB (don't await every one if it's too many, but for now it's okay)
      await Review.findOneAndUpdate(
        { platform, appId, reviewId: r.reviewId },
        { $set: { ...r, platform, appId } },
        { upsert: true, new: true }
      );
    }

    // 3. Aggregate Stats for Dashboard
    const stats = {
      total: realTotalCount || allReviews.length,
      avgRating: 0,
      sentimentDist: { Positive: 0, Neutral: 0, Negative: 0 },
      ratingDist: scrapedStats?.ratingDist || { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      categoryDist: { Performance: 0, Bugs: 0, UI: 0, Features: 0 }
    };

    let totalRating = 0;
    processedReviews.forEach(r => {
      totalRating += r.rating;
      if (!scrapedStats?.ratingDist) {
        stats.ratingDist[Math.floor(r.rating)] = (stats.ratingDist[Math.floor(r.rating)] || 0) + 1;
      }

      if (r.aiAnalysis) {
        if (r.aiAnalysis.sentiment) stats.sentimentDist[r.aiAnalysis.sentiment]++;
        let cat = r.aiAnalysis.category;
        if (cat === 'Other' || !stats.categoryDist.hasOwnProperty(cat)) cat = 'Performance';
        if (stats.categoryDist.hasOwnProperty(cat)) stats.categoryDist[cat]++;
      }
    });

    const calculatedAvg = processedReviews.length > 0 ? (totalRating / processedReviews.length).toFixed(1) : 0;
    stats.avgRating = scrapedStats?.avgRating || calculatedAvg;

    // 4. Update App Registry
    await App.findOneAndUpdate(
      { platform, appId },
      { $set: { name: appId, platform, appId } },
      { upsert: true }
    );

    res.json({ platform, appId, stats, reviews: processedReviews });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
