const { fetchRokuReviews } = require('../server/connectors/roku/roku.connector');

async function testRoku() {
    const appId = "594920/the-top-cartoon-tv";
    console.log(`--- Debugging Roku (${appId}) ---`);
    const result = await fetchRokuReviews(appId);
    console.log('Roku Result:', JSON.stringify(result, null, 2));
}

testRoku();
