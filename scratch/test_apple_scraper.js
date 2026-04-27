const store = require('app-store-scraper');

async function test() {
  try {
    const appId = '835599320'; // TikTok
    console.log('--- Testing App Info ---');
    const app = await store.app({ id: appId });
    console.log('App Name:', app.title);
    console.log('Total Ratings:', app.reviews);
    console.log('Avg Rating:', app.score);
    
    console.log('\n--- Testing Reviews ---');
    const reviews = await store.reviews({
      id: appId,
      sort: store.sort.RECENT,
      page: 1
    });
    console.log('Reviews Count:', reviews.length);
    if (reviews.length > 0) {
      console.log('Sample Review:', reviews[0]);
    }
  } catch (e) {
    console.error('Error:', e.message);
  }
}

test();
