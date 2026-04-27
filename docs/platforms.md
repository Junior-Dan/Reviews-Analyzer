# 🔌 Supported Platforms

The ability to extract reviews varies significantly depending on the platform's openness. Below is the current status of supported connectors.

| Platform | Extraction Method | Review Text? | Stability |
| :--- | :--- | :--- | :--- |
| **Google Play** | API Scraper | Yes | ✅ High |
| **Apple App Store** | RSS/API | Yes | ✅ High |
| **Roku** | Web Scraping | Star Rating Only | ⚠️ Medium |
| **Samsung TV** | Web Scraping | Limited | ❌ Low |
| **Amazon Fire TV** | Web Scraping | Yes (w/ CAPTCHA) | ⚠️ Medium |

## Platform Specifics

### 📱 Mobile (Google & Apple)
These are the most reliable sources. They provide full text, user names, dates, and version numbers. 

### 📺 Smart TV (Roku, Samsung, LG)
TV platforms are generally "closed." 
*   **Roku:** We can currently fetch the aggregate star rating, but written comments are not publicly exposed via web.
*   **Samsung:** Store pages are inconsistent and often block automated requests.
*   **Vizio/Vidaa:** These platforms do not have public web-based app stores, making automated extraction impossible at this time.

## Why some platforms are limited
Unlike mobile stores, Smart TV manufacturers (Samsung, LG, etc.) treat their "Store" as a private feature for the TV interface rather than a public website. We use advanced scraping techniques where possible, but some data simply isn't available online.
