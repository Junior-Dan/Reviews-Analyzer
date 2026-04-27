# 🏗️ Architecture

The Reviews Analyzer is built with a modular **Connector Pattern**. This ensures that adding support for a new platform doesn't require changing the core logic of the application.

## System Flow

1.  **Request:** The user selects an app from the dashboard.
2.  **Dispatch:** The `server/core` logic identifies the platform (Google, Apple, etc.) and calls the corresponding **Connector**.
3.  **Fetch:** The Connector retrieves raw data via API or web scraping.
4.  **Normalize:** The raw data is converted into a standard `Review` model.
5.  **Analyze:** Optional AI analysis (via Gemini or Ollama) processes the text for sentiment and key themes.
6.  **Store/Serve:** Results are stored in MongoDB and sent to the frontend.

## The Connector Pattern

Every platform integration lives in `server/connectors/`. A standard connector must implement:
*   `fetchReviews(appId)`: Retrieves new reviews.
*   `getAppMetadata(appId)`: Gets app icon, name, and total ratings.

## Database Schema

The system uses MongoDB to store configurations and scraped data. The schema is designed to be flexible enough for all platforms.

### 📱 Apps Collection (`apps`)
Stores the configuration for each application being monitored.

| Field | Type | Description |
| :--- | :--- | :--- |
| `name` | String | The display name of the app (e.g., "The Top Cartoon TV"). |
| `platform` | String | The platform identifier (e.g., `google`, `apple`, `lg`, `roku`). |
| `appId` | String | The unique identifier used by the platform's API/URL to fetch data. |
| `createdAt` | Date | MongoDB timestamp of when the app was added. |
| `updatedAt` | Date | MongoDB timestamp of the last modification. |

### 📝 Reviews Collection (`reviews`)
Stores normalized reviews fetched from various platforms.

| Field | Type | Description |
| :--- | :--- | :--- |
| `platform` | String | The source platform identifier. |
| `appId` | String | The identifier of the app this review belongs to. |
| `reviewId` | String | Unique ID from the platform (used for deduplication). |
| `authorName`| String | The name of the user who wrote the review. |
| `rating` | Number | Numeric rating (normalized to a platform-specific scale). |
| `text` | String | The raw text content of the review. |
| `createdAt` | Date | The date/time the review was published on the platform. |
| `aiAnalysis` | Object | Nested object containing AI-processed insights. |
| `aiAnalysis.sentiment` | String | Sentiment classification (Positive, Negative, Neutral). |
| `aiAnalysis.category` | String | Thematic category (e.g., "Bugs", "Performance"). |
| `aiAnalysis.summary` | String | A short, AI-generated summary of the user's feedback. |
