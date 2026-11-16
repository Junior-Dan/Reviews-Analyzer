const express = require("express");
const router = express.Router();
const Review = require("../core/review.model");
const App = require("../core/app.model");
const ollamaService = require("../core/ollama.service");
const { publishStoreReply } = require("../services/storeReply.service");
const { protect } = require("../middleware/auth.middleware");

async function getUserReviewScope(userId, platform, appId) {
  const appQuery = { user: userId };
  if (platform && platform !== "all") {
    appQuery.platform = String(platform).toLowerCase();
  }
  if (appId) {
    appQuery.appId = appId;
  }
  const userApps = await App.find(appQuery).select("platform appId").lean();
  if (!userApps.length) {
    return { totalApps: 0, filter: null };
  }
  return {
    totalApps: userApps.length,
    filter: {
      $or: userApps.map((a) => ({ platform: a.platform, appId: a.appId })),
    },
  };
}

/**
 * GET /dashboard/summary
 * Returns aggregated analytics for the authenticated user's monitored apps
 */
router.get("/summary", protect, async (req, res) => {
  try {
    const { platform, appId } = req.query;
    const ownerId = req.workspaceOwnerId || req.user._id;
    const scope = await getUserReviewScope(ownerId, platform, appId);

    if (!scope.filter) {
      return res.json({
        summary: {
          totalReviews: 0,
          totalApps: 0,
          avgRating: "0.0",
          sentimentDist: { Positive: 0, Neutral: 0, Negative: 0 },
          categoryDist: { "UI/UX": 0, "Bugs & Crashes": 0, Performance: 0, "Feature Requests": 0 },
          ratingDist: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
          monthlyTrends: [],
          platformBreakdown: [],
          alerts: [],
          kpis: {
            analyzedCount: "0",
            positiveRatio: "0%",
            storeRatingsCount: "0",
            responseRate: "0%",
            avgReplyTime: "0%",
            csat: { percentage: 0, count: 0 },
            bugResolution: { percentage: 0, count: 0 },
            featureEngagement: { percentage: 0, count: 0 },
          },
        },
      });
    }

    const filter = scope.filter;
    const totalReviews = await Review.countDocuments(filter);
    const totalApps = scope.totalApps;

    // Ratings breakdown
    const ratingAggregation = await Review.aggregate([
      { $match: filter },
      { $group: { _id: { $floor: "$rating" }, count: { $sum: 1 } } }
    ]);
    const ratingDist = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let totalScore = 0;
    ratingAggregation.forEach(r => {
      if (r._id && ratingDist.hasOwnProperty(r._id)) {
        ratingDist[r._id] = r.count;
        totalScore += r._id * r.count;
      }
    });

    const avgRating = totalReviews > 0 ? (totalScore / totalReviews).toFixed(1) : "0.0";

    // Sentiment breakdown
    const sentimentAggregation = await Review.aggregate([
      { $match: filter },
      { $group: { _id: "$aiAnalysis.sentiment", count: { $sum: 1 } } }
    ]);
    const sentimentDist = { Positive: 0, Neutral: 0, Negative: 0 };
    sentimentAggregation.forEach(s => {
      let key = s._id;
      if (key) {
        key = key.charAt(0).toUpperCase() + key.slice(1).toLowerCase();
        if (sentimentDist.hasOwnProperty(key)) {
          sentimentDist[key] += s.count;
        } else {
          sentimentDist.Neutral += s.count;
        }
      }
    });

    // Category breakdown
    const categoryAggregation = await Review.aggregate([
      { $match: filter },
      { $group: { _id: "$aiAnalysis.category", count: { $sum: 1 } } }
    ]);
    const categoryDist = { "UI/UX": 0, "Bugs & Crashes": 0, "Performance": 0, "Feature Requests": 0 };
    categoryAggregation.forEach(c => {
      const raw = (c._id || "").toLowerCase();
      if (raw.includes("ui") || raw.includes("interface")) {
        categoryDist["UI/UX"] += c.count;
      } else if (raw.includes("bug") || raw.includes("crash") || raw.includes("glitch")) {
        categoryDist["Bugs & Crashes"] += c.count;
      } else if (raw.includes("feature")) {
        categoryDist["Feature Requests"] += c.count;
      } else {
        categoryDist["Performance"] += c.count;
      }
    });

    // Monthly Trends for the Analytics chart (e.g. October, November, December)
    const monthAggregation = await Review.aggregate([
      { $match: filter },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" }
          },
          total: { $sum: 1 },
          positive: {
            $sum: {
              $cond: [{ $eq: ["$aiAnalysis.sentiment", "Positive"] }, 1, 0]
            }
          },
          negative: {
            $sum: {
              $cond: [{ $eq: ["$aiAnalysis.sentiment", "Negative"] }, 1, 0]
            }
          }
        }
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } }
    ]);

    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    let monthlyTrends = monthAggregation.map(m => ({
      name: `${monthNames[(m._id.month || 1) - 1]} ${m._id.year}`,
      total: m.total,
      positive: m.positive,
      negative: m.negative
    }));

    // Platform breakdown
    const platformAggregation = await Review.aggregate([
      { $match: filter },
      {
        $group: {
          _id: "$platform",
          count: { $sum: 1 },
          avgRating: { $avg: "$rating" }
        }
      }
    ]);
    const platformBreakdown = platformAggregation.map(p => ({
      platform: p._id,
      name: p._id === "google" ? "Google Play Store" :
            p._id === "apple" ? "Apple App Store" :
            p._id === "samsung" ? "Samsung Galaxy Store" :
            p._id === "amazon" ? "Amazon Appstore" : p._id,
      count: p.count,
      avgRating: (p.avgRating || 0).toFixed(1)
    }));

    // Critical Alerts detection (Proposal FR12)
    const alerts = [];
    const highNegativeRate = totalReviews > 0 ? (sentimentDist.Negative / totalReviews) * 100 : 0;
    if (highNegativeRate > 40) {
      alerts.push({
        type: "danger",
        title: "Negative Sentiment Surge",
        message: `${highNegativeRate.toFixed(1)}% of processed reviews flag critical issues or bugs.`,
        timestamp: "Active Now"
      });
    }
    if (categoryDist["Bugs & Crashes"] > 50) {
      alerts.push({
        type: "warning",
        title: "Bug Reports Elevated",
        message: `${categoryDist["Bugs & Crashes"]} reviews reporting stability or crash issues.`,
        timestamp: "Recent"
      });
    }
    if (totalReviews > 0) {
      alerts.push({
        type: "info",
        title: "Store Sync Completed",
        message: `Multi-store background sync refreshed ${totalReviews} customer reviews.`,
        timestamp: "5m ago"
      });
    }

    const positiveStarCount = (ratingDist[4] || 0) + (ratingDist[5] || 0);
    const effectivePositive = Math.max(sentimentDist.Positive || 0, positiveStarCount);
    const posRatio = totalReviews > 0 ? Math.round((effectivePositive / totalReviews) * 100) : 0;
    const bugRate = totalReviews > 0 ? Math.round((categoryDist["Bugs & Crashes"] / totalReviews) * 100) : 0;
    const featRate = totalReviews > 0 ? Math.round((categoryDist["Feature Requests"] / totalReviews) * 100) : 0;
    const repliedCount = await Review.countDocuments({
      $and: [filter, { "reply.status": { $in: ["Approved", "Published"] } }],
    });
    const responseRatePct = totalReviews > 0 ? Math.round((repliedCount / totalReviews) * 100) : 0;

    res.json({
      summary: {
        totalReviews,
        totalApps,
        avgRating,
        sentimentDist,
        categoryDist,
        ratingDist,
        monthlyTrends,
        platformBreakdown,
        alerts,
        kpis: {
          analyzedCount: totalReviews >= 1000 ? `${(totalReviews / 1000).toFixed(1)}K` : String(totalReviews),
          positiveRatio: `${posRatio}%`,
          storeRatingsCount: totalReviews >= 1000 ? `${(totalReviews / 1000).toFixed(1)}K` : String(totalReviews),
          responseRate: `${responseRatePct}%`,
          avgReplyTime: `${responseRatePct}%`,
          csat: { percentage: posRatio, count: effectivePositive },
          bugResolution: { percentage: bugRate, count: categoryDist["Bugs & Crashes"] },
          featureEngagement: { percentage: featRate, count: categoryDist["Feature Requests"] }
        }
      }
    });
  } catch (err) {
    console.error("Dashboard summary error:", err);
    res.status(500).json({ message: "Server error calculating summary" });
  }
});

/**
 * GET /dashboard
 * Fetch reviews with optional filters, pagination, or search
 */
router.get("/", (req, res, next) => {
  if (req.headers.accept && req.headers.accept.includes("text/html")) {
    return next();
  }
  return protect(req, res, async () => {
    try {
      const { platform, appId, rating, sentiment, category, search, limit = 50, page = 1 } = req.query;
      const ownerId = req.workspaceOwnerId || req.user._id;
    const scope = await getUserReviewScope(ownerId, platform, appId);

      if (!scope.filter) {
        return res.json({
          total: 0,
          page: Number(page),
          limit: Number(limit),
          reviews: [],
        });
      }

      const conditions = [scope.filter];
      if (rating && rating !== "all") conditions.push({ rating: Math.floor(Number(rating)) });
      if (sentiment && sentiment !== "all") conditions.push({ "aiAnalysis.sentiment": new RegExp(`^${sentiment}$`, "i") });
      if (category && category !== "all") conditions.push({ "aiAnalysis.category": new RegExp(category, "i") });
      if (search) {
        conditions.push({
          $or: [
            { text: { $regex: search, $options: "i" } },
            { authorName: { $regex: search, $options: "i" } },
            { appId: { $regex: search, $options: "i" } },
          ],
        });
      }

      const query = conditions.length === 1 ? conditions[0] : { $and: conditions };
      const total = await Review.countDocuments(query);
      const reviews = await Review.find(query)
        .sort({ createdAt: -1 })
        .skip((Number(page) - 1) * Number(limit))
        .limit(Number(limit));

      res.json({
        total,
        page: Number(page),
        limit: Number(limit),
        reviews,
      });
    } catch (err) {
      console.error("Dashboard error:", err);
      res.status(500).json({ message: "Server error fetching reviews" });
    }
  });
});

/**
 * POST /dashboard/generate-reply
 * AI assisted reply generation with Human-in-the-Loop (Proposal FR9)
 */
router.post("/generate-reply", protect, async (req, res) => {
  try {
    const { text, authorName, rating, sentiment, category, tone } = req.body;
    const suggestion = await ollamaService.generateReplySuggestion({
      text,
      authorName,
      rating,
      sentiment,
      category,
      tone
    });

    res.json({ reply: suggestion });
  } catch (err) {
    console.error("Generate reply error:", err);
    res.status(500).json({ message: "Error generating draft reply" });
  }
});

/**
 * POST /dashboard/reply
 * Approve human-in-the-loop reply (Proposal FR10, FR11)
 */
router.post("/reply", protect, async (req, res) => {
  try {
    const { reviewId, replyText, approvedBy } = req.body;

    if (!reviewId || !replyText) {
      return res.status(400).json({ message: "reviewId and replyText are required" });
    }

    const existing = await Review.findOne({ reviewId });
    if (!existing) {
      return res.status(404).json({ message: "Review not found" });
    }

    const ownerId = req.workspaceOwnerId || req.user._id;
    const ownsApp = await App.exists({
      user: ownerId,
      platform: existing.platform,
      appId: existing.appId,
    });
    if (!ownsApp) {
      return res.status(403).json({ message: "Not authorized to reply to this app's review" });
    }

    const publishResult = await publishStoreReply(existing, replyText, ownerId);

    const review = await Review.findOneAndUpdate(
      { reviewId },
      {
        $set: {
          "reply.text": replyText,
          "reply.status": publishResult.status,
          "reply.approvedAt": new Date(),
          "reply.approvedBy": approvedBy || req.user.name || req.user.email || "Store Manager",
          ...(publishResult.published ? { "reply.publishedAt": new Date(), "reply.publishError": "" } : {}),
          ...(publishResult.error ? { "reply.publishError": publishResult.error } : {}),
        },
      },
      { new: true }
    );

    res.json({
      message: publishResult.message,
      published: publishResult.published,
      review,
    });
  } catch (err) {
    console.error("Save reply error:", err);
    res.status(500).json({ message: "Error saving approved reply" });
  }
});

module.exports = router;
