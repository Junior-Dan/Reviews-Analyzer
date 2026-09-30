const axios = require("axios");

// Fetch reviews from Samsung Galaxy Store internal APIs
async function fetchSamsungReviews(appId) {
  try {
    let contentId = appId;

    // Resolve package name to numeric contentId if necessary
    if (!/^\d+$/.test(appId)) {
      const { data: details } = await axios.get(`https://galaxystore.samsung.com/api/detail/${appId}`, {
        headers: { "User-Agent": "Mozilla/5.0" }
      });
      if (details.errCode !== "0000") return [];
      contentId = details.contentId;
    }

    if (!contentId) return [];

    let reviews = [];
    let startNum = 1;
    let hasMore = true;
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    while (reviews.length < 500 && hasMore) {
      const { data } = await axios.get(`https://galaxystore.samsung.com/api/commentList/contentId=${contentId}&startNum=${startNum}`, {
        headers: { "User-Agent": "Mozilla/5.0" }
      });

      // Relaxed errCode check since successful response might not have it
      if (!data.commentList?.length) break;

      for (const review of data.commentList) {
        // Handle "YYYY.MM.DD." format or standard ISO
        const cleanDateStr = review.createDate.replace(/\.$/, "").replace(/\./g, "-");
        const date = new Date(cleanDateStr);
        
        if (isNaN(date.getTime())) {
          hasMore = false;
          break;
        }

        const rating = parseFloat(review.ratingValueNumber?.replace("stars rating-stars-", "").replace("-", ".")) || 0;

        reviews.push({
          reviewId: review.commentId || `${appId}-${review.createDate}-${reviews.length}`,
          authorName: review.loginId || "Anonymous",
          rating,
          text: review.commentText,
          createdAt: date
        });
      }
      startNum += data.commentList.length;
    }

    return reviews;
  } catch (err) {
    console.error(`[Samsung] Error: ${err.message}`);
    return [];
  }
}

module.exports = { fetchSamsungReviews };
