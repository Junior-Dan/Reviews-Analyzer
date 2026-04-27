const { fetchAppleReviews } = require("./server/connectors/apple/apple.connector");
const { fetchSamsungReviews } = require("./server/connectors/samsung/samsung.connector");
require("dotenv").config();

async function testConnectors() {
    console.log("--- Testing Apple ---");
    try {
        const apple = await fetchAppleReviews("1201739921");
        console.log("Apple Stats:", {
            total: apple.totalCount,
            avg: apple.averageRating,
            reviewsCount: apple.reviews.length
        });
        if (apple.reviews.length > 0) {
            console.log("Apple First Review Example:", apple.reviews[0]);
        }
    } catch (e) {
        console.error("Apple check failed:", e);
    }

    console.log("\n--- Testing Samsung ---");
    try {
        // Using "com.samsung.android.app.shealth" as it's a popular app
        const samsung = await fetchSamsungReviews("com.samsung.android.app.shealth");
        console.log("Samsung Reviews Found:", samsung.length);
        if (samsung.length > 0) {
            console.log("Samsung First Review Example:", samsung[0]);
        }
    } catch (e) {
        console.error("Samsung check failed:", e);
    }
}

testConnectors();
