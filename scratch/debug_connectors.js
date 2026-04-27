const { fetchAppleReviews } = require("../server/connectors/apple/apple.connector");
const { fetchSamsungReviews } = require("../server/connectors/samsung/samsung.connector");

async function debug() {
    console.log("--- Debugging Apple (TikTok) ---");
    const apple = await fetchAppleReviews("835599320");
    console.log("Apple Result:", {
        totalCount: apple.totalCount,
        averageRating: apple.averageRating,
        reviewsCount: apple.reviews.length,
        ratingDist: apple.ratingDist
    });

    console.log("\n--- Debugging Samsung (Browser 000005006635) ---");
    const samsung = await fetchSamsungReviews("000005006635");
    console.log("Samsung Reviews Count:", samsung.length);
    if (samsung.length > 0) {
        console.log("Sample Samsung Review:", samsung[0]);
    }
}

debug();
