const store = require("app-store-scraper");
async function test() {
    try {
        const result = await store.reviews({ appId: "com.netflix.Netflix", id: "363590051", page: 1, sort: store.sort.RECENT });
        console.log(result.length, result[0]);
    } catch(e) { console.error(e); }
}
test();
