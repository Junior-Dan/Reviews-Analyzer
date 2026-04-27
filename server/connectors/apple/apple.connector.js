const axios = require("axios");
const cheerio = require("cheerio");
const store = require("app-store-scraper");

// Fetch reviews and stats from Apple App Store
async function fetchAppleReviews(appId) {
    try {
        const pageUrl = `https://apps.apple.com/us/app/id${appId}`;
        // Scrape page for stars
        let pageRes;
        try {
            pageRes = await axios.get(pageUrl, { headers: { "User-Agent": "Mozilla/5.0" } });
            pageRes.status = 'fulfilled'; // Mock for compatibility with existing code
            pageRes.value = { data: pageRes.data };
        } catch (err) {
            pageRes = { status: 'rejected', reason: err };
        }

        let reviews = [];
        let totalCount = 0;
        let averageRating = 0;
        let ratingDist = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

        // Process HTML for aggregate stats
        if (pageRes.status === 'fulfilled') {
            const $ = cheerio.load(pageRes.value.data);
            try {
                // Try JSON-LD first (most reliable)
                const jsonLd = $('script[type="application/ld+json"]#software-application').html() || 
                               $('script[type="application/ld+json"]').map((i, el) => $(el).html()).get().find(h => h.includes('SoftwareApplication'));
                
                if (jsonLd) {
                    const data = JSON.parse(jsonLd);
                    if (data.aggregateRating) {
                        averageRating = data.aggregateRating.ratingValue;
                        totalCount = data.aggregateRating.reviewCount;
                    }
                }

                // Fallback to scraping if JSON-LD didn't give us everything
                if (!totalCount) {
                    const ratingCountText = $(".we-customer-ratings__count").text() ||
                        $("figcaption[class*='we-rating-count']").text();

                    if (ratingCountText) {
                        const numStr = ratingCountText.replace(/Ratings?/i, '').trim().toUpperCase();
                        if (numStr.includes('K')) totalCount = parseFloat(numStr) * 1000;
                        else if (numStr.includes('M')) totalCount = parseFloat(numStr) * 1000000;
                        else totalCount = parseInt(numStr.replace(/,/g, ''));
                    }
                }

                if (!averageRating) {
                    const avgText = $(".we-customer-ratings__averages__display").text();
                    if (avgText) averageRating = parseFloat(avgText);
                }

                $(".we-star-bar-graph__row").each((i, row) => {
                    const countText = $(row).find(".we-star-bar-graph__bar").attr("aria-label");
                    if (countText) {
                        const stars = 5 - i;
                        let match = countText.match(/(\d+)\s+ratings?/i);
                        if (match) {
                            ratingDist[stars] = parseInt(match[1]);
                        } else {
                            match = countText.match(/(\d+)%/);
                            if (match && totalCount > 0) {
                                ratingDist[stars] = Math.round((totalCount * parseInt(match[1])) / 100);
                            }
                        }
                    }
                });
            } catch (e) {
                console.error("[Apple] Stats Parse Error:", e.message);
            }
        }

        // 2. Fetch stats using app-store-scraper (more reliable for aggregate data)
        try {
            const appInfo = await store.app({ id: appId });
            totalCount = appInfo.reviews || 0;
            averageRating = appInfo.score || 0;
        } catch (e) {
            console.warn(`[Apple] app-store-scraper failed, falling back to JSON-LD: ${e.message}`);
        }

        // 3. Scrape reviews from the HTML page (RSS is often empty)
        const reviewsUrl = `https://apps.apple.com/us/app/id${appId}?see-all=reviews`;
        let reviewsHtml = "";
        try {
            const res = await axios.get(reviewsUrl, { headers: { "User-Agent": "Mozilla/5.0" } });
            reviewsHtml = res.data;
            const $ = cheerio.load(reviewsHtml);

            // The reviews are in containers with class svelte-1hjpbwc
            $('.container.svelte-1hjpbwc').each((i, el) => {
                const title = $(el).find('.title').text().trim();
                const author = $(el).find('.author').text().trim();
                const ratingText = $(el).find('.stars').attr('aria-label') || ""; // e.g. "5 Stars"
                const rating = parseInt(ratingText) || 0;
                const date = $(el).find('time').attr('datetime');
                const content = $(el).find('.content p').text().trim();

                if (content) {
                    reviews.push({
                        reviewId: `apple-${appId}-${i}-${date}`,
                        authorName: author || "Anonymous",
                        rating: rating,
                        text: title ? `${title}\n${content}` : content,
                        createdAt: date ? new Date(date) : new Date()
                    });
                }
            });
            
            console.log(`[Apple] Scraped ${reviews.length} reviews from HTML`);
        } catch (e) {
            console.error(`[Apple] Error scraping reviews HTML:`, e.message);
        }

        // Fallback for stats if still zero
        if (totalCount === 0 && pageRes.status === 'fulfilled') {
            const $ = cheerio.load(pageRes.value.data);
            const jsonLdText = $('script[type="application/ld+json"]#software-application').html() || 
                               $('script[type="application/ld+json"]').map((i, el) => $(el).html()).get().find(h => h.includes('SoftwareApplication'));
            
            if (jsonLdText) {
                try {
                    const data = JSON.parse(jsonLdText);
                    if (data.aggregateRating) {
                        averageRating = parseFloat(data.aggregateRating.ratingValue);
                        totalCount = parseInt(data.aggregateRating.reviewCount);
                    }
                } catch (e) {}
            }
        }

        // 4. Scrape rating distribution from the HTML
        ratingDist = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        try {
            if (reviewsHtml) {
                const $ = cheerio.load(reviewsHtml);
                for (let i = 1; i <= 5; i++) {
                const widthStyle = $(`[data-testid="star-row-${i}"]`).attr('style') || "";
                const match = widthStyle.match(/width:\s*(\d+)%/);
                if (match) {
                    const percentage = parseInt(match[1]);
                    // Store as estimated count if totalCount exists, else just the percentage
                    ratingDist[i] = totalCount ? Math.round((percentage / 100) * totalCount) : percentage;
                }
            }
            }
            console.log(`[Apple] Scraped rating distribution:`, ratingDist);
        } catch (e) {
            console.warn(`[Apple] Could not scrape rating distribution: ${e.message}`);
        }

        return {
            platform: 'apple',
            appId,
            totalCount,
            averageRating,
            reviewsCount: reviews.length,
            reviews,
            ratingDist
        };
    } catch (err) {
        console.error("[Apple] Connector Error:", err.message);
        return { reviews: [], totalCount: 0, averageRating: 0, ratingDist: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } };
    }
}

module.exports = { fetchAppleReviews };
