const { fetchSamsungReviews } = require("./server/connectors/samsung/samsung.connector");
require("dotenv").config();

async function testSamsung() {
    const apps = [
        "com.sec.android.app.sbrowser", // Browser
        "000007985347",                 // Gallery ID
        "com.samsung.android.messaging" // Messaging
    ];

    for (const app of apps) {
        console.log(`\nTesting Samsung for: ${app}`);
        try {
            const reviews = await fetchSamsungReviews(app);
            console.log(`Found ${reviews.length} reviews.`);
            if (reviews.length > 0) {
                console.log("Example:", reviews[0].text.substring(0, 50) + "...");
            }
        } catch (e) {
            console.error(`Failed for ${app}:`, e.message);
        }
    }
}

testSamsung();
