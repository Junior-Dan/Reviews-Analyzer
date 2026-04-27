const gplay = require("google-play-scraper").default || require("google-play-scraper");

// Fetch reviews using google-play-scraper library
async function fetchGoogleReviews(appId) {
  try {
    const results = await gplay.reviews({
      appId,
      sort: gplay.sort?.NEWEST || 0,
      num: 2000,
      lang: 'en',
      country: 'us'
    });

    let totalCount = 0;
    try {
      const details = await gplay.app({ appId, lang: 'en', country: 'us' });
      totalCount = details.ratings || 0;
    } catch (e) {
      console.warn(`[Google] Could not fetch total ratings: ${e.message}`);
    }

    const reviewsRaw = Array.isArray(results) ? results : (results.data || []);
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    const reviews = reviewsRaw
      .filter(r => new Date(r.date) >= oneYearAgo)
      .map(r => ({
        reviewId: r.id,
        authorName: r.userName || "Anonymous",
        rating: r.score,
        text: r.text || "",
        createdAt: new Date(r.date)
      }));

    return { reviews, totalCount };
  } catch (err) {
    console.error(`[Google] Error: ${err.message}`);
    return { reviews: [], totalCount: 0 };
  }
}

module.exports = { fetchGoogleReviews };
