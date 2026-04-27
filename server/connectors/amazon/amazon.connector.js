const axios = require("axios");
const cheerio = require("cheerio");

// Scrape reviews from Amazon Appstore product pages
async function fetchAmazonReviews(asin) {
    const reviews = [];
    let totalCount = 0;
    let averageRating = 0;
    let ratingDist = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    const maxPages = 5; // Limit to prevent blocking

    const headers = {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
        "Referer": "https://www.amazon.com/"
    };

    try {
        for (let page = 1; page <= maxPages; page++) {
            const url = `https://www.amazon.com/product-reviews/${asin}/?reviewerType=all_reviews&sortBy=recent&pageNumber=${page}`;
            const { data } = await axios.get(url, { headers, timeout: 10000 });

            const $ = cheerio.load(data);
            if (data.includes('Robot Check') || data.includes('signIn')) break;

            if (page === 1) {
                try {
                    const totalText = $('[data-hook="total-review-count"]').text() || $('[data-hook="cr-filter-info-review-count"]').text();
                    if (totalText) totalCount = parseInt(totalText.match(/([\d,]+)/)?.[1].replace(/,/g, '')) || 0;

                    const avgText = $('[data-hook="rating-out-of-text"]').text();
                    if (avgText) averageRating = parseFloat(avgText.match(/(\d+\.?\d*)/)?.[1]) || 0;

                    $('.histogram-row').each((i, row) => {
                        const starMatch = $(row).find('.a-link-normal').attr('title')?.match(/(\d)\s*stars?/i);
                        const percentMatch = $(row).find('.a-text-right .a-size-base').text().trim().match(/(\d+)%/);
                        if (starMatch && percentMatch && totalCount > 0) {
                            ratingDist[parseInt(starMatch[1])] = Math.round((totalCount * parseInt(percentMatch[1])) / 100);
                        }
                    });
                } catch (e) {
                    console.error("[Amazon] Stats Parse Error:", e.message);
                }
            }

            const pageReviews = [];
            $('[data-hook="review"]').each((i, elem) => {
                const text = $(elem).find('[data-hook="review-body"]').text().trim();
                const ratingMatch = $(elem).find('[data-hook="review-star-rating"] .a-icon-alt').text().trim().match(/(\d+\.?\d*)/);
                const dateMatch = $(elem).find('[data-hook="review-date"]').text().trim().match(/on\s+(.*)$/);

                if (text) {
                    pageReviews.push({
                        reviewId: $(elem).attr('id') || `amazon-${asin}-${page}-${i}`,
                        authorName: $(elem).find('.a-profile-name').text().trim() || "Anonymous",
                        rating: parseFloat(ratingMatch?.[1]) || 0,
                        text: text,
                        createdAt: dateMatch ? new Date(dateMatch[1]) : new Date()
                    });
                }
            });

            if (pageReviews.length === 0) break;
            reviews.push(...pageReviews);
            if (page < maxPages) await new Promise(resolve => setTimeout(resolve, 3000));
        }

        return { reviews, totalCount, averageRating, ratingDist };
    } catch (err) {
        console.error(`[Amazon] Error: ${err.message}`);
        return { reviews, totalCount, averageRating, ratingDist };
    }
}

module.exports = { fetchAmazonReviews };
