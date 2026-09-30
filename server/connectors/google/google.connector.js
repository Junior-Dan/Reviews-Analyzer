const gplay = require("google-play-scraper").default || require("google-play-scraper");

// Fetch reviews using google-play-scraper library
async function fetchGoogleReviews(appId) {
  try {
    let allResultsMap = new Map();
    const sortMethod = gplay.sort.NEWEST;

    let nextToken;
    let countForThisSort = 0;
    
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    do {
      const result = await gplay.reviews({
        appId,
        sort: sortMethod,
        num: 150,
        paginate: true,
        nextPaginationToken: nextToken
      });
      const reviews = result.data || [];
      
      let reachedOldReviews = false;
      reviews.forEach(r => {
        if (new Date(r.date) >= oneYearAgo) {
          allResultsMap.set(r.id, r);
        } else {
          reachedOldReviews = true;
        }
      });
      
      countForThisSort += reviews.length;
      nextToken = result.nextPaginationToken;
      
      // Break if no more or we've hit a reasonable limit per sort or reached older reviews
      if (!nextToken || countForThisSort >= 5000 || reachedOldReviews) break; 
    } while (true);

    const allResults = Array.from(allResultsMap.values());

    let totalCount = 0;
    try {
      const details = await gplay.app({ appId, lang: 'en', country: 'us' });
      totalCount = details.ratings || 0;
    } catch (e) {
      console.warn(`[Google] Could not fetch total ratings: ${e.message}`);
    }

    const reviews = allResults.map(r => ({
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
