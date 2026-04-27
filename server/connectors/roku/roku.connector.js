const axios = require("axios");
const cheerio = require("cheerio");

// Scrape summary ratings from Roku Channel Store web page
async function fetchRokuReviews(appId) {
    try {
        const url = `https://channelstore.roku.com/details/${appId}`;
        const { data } = await axios.get(url, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
            }
        });

        const $ = cheerio.load(data);
        const ratingText = $(".rating-rounded").first().text().trim();
        const avgRating = ratingText ? parseFloat(ratingText) : 0;

        const countText = $(".rating-count").first().text().trim();
        const totalCount = countText ? parseInt(countText.replace(/,/g, "").match(/\d+/)[0]) : 0;

        return {
            reviews: [],
            totalCount,
            avgRating
        };
    } catch (err) {
        console.error(`[Roku] Error: ${err.message}`);
        return { reviews: [], totalCount: 0, avgRating: 0 };
    }
}

module.exports = { fetchRokuReviews };
