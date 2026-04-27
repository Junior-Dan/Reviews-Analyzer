# 📚 API Reference

**Reviews Analyzer API** documentation. Our API is designed to follow RESTful principles, returning JSON responses for all requests.

## 🌐 Base URL
All API requests should be made to:
`http://localhost:3000/api` (Local Development)

---

## 🏗️ Core Endpoints

### 1. Fetch & Analyze Reviews
`GET /reviews`

This is the primary endpoint for the application. It triggers a multi-step process:
1.  Fetches raw reviews from the external platform.
2.  Cleans the text (removes system artifacts).
3.  Performs AI sentiment and category analysis.
4.  Syncs the results to the local MongoDB database.

#### **Query Parameters**
| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `platform` | string | **Yes** | One of: `google`, `apple`, `samsung`, `roku`, `amazon`. |
| `appId` | string | **Yes** | Identity of the app (e.g., `com.netflix.mediaclient`). |
| `packageName` | string | No | Alias for `appId` used in some frontend flows. |

#### **Success Response (200 OK)**
```json
{
  "platform": "google",
  "appId": "com.example.app",
  "stats": {
    "total": 500,
    "avgRating": 4.5,
    "sentimentDist": { "Positive": 80, "Neutral": 10, "Negative": 10 },
    "ratingDist": { "1": 5, "2": 2, "3": 3, "4": 10, "5": 480 },
    "categoryDist": { "Performance": 5, "Bugs": 2, "UI": 3, "Features": 30 }
  },
  "reviews": [
    {
      "reviewId": "gp:AOqpTOH...",
      "userName": "John Doe",
      "text": "Amazing experience, very fast!",
      "rating": 5,
      "createdAt": "2024-01-20T10:00:00.000Z",
      "aiAnalysis": {
        "sentiment": "Positive",
        "category": "Performance",
        "keyKeywords": ["fast", "experience"]
      }
    }
  ]
}
```

---

### 2. Dashboard Filtered Data
`GET /dashboard`

Retrieves data directly from the local database. By default, this endpoint is optimized for the "Urgent Action" view, returning only **Negative reviews (Rating < 4)**.

#### **Query Parameters**
*   `platform` (Required): The platform to filter by.
*   `appId` (Required): The App ID to filter by.

#### **Success Response (200 OK)**
```json
{
  "platform": "google",
  "appId": "com.example.app",
  "total": 12,
  "reviews": [
    {
      "reviewId": "gp:AOqp...",
      "text": "App keeps crashing on startup",
      "rating": 1,
      "aiAnalysis": {
        "sentiment": "Negative",
        "category": "Bugs"
      }
    }
  ]
}
```

---

### 3. App Catalog
`GET /packages`

Returns a list of all apps currently configured in the system. The system scans the `.ignore/platforms/` directory to build this list dynamically.

#### **Response Structure**
```json
{
  "packages": [
    {
      "name": "Netflix",
      "packageName": "com.netflix.mediaclient",
      "platform": "google",
      "icon": "..."
    }
  ]
}
```

---

## 📊 Data Models

### The `Review` Object
| Field | Type | Description |
| :--- | :--- | :--- |
| `reviewId` | string | Unique identifier from the source platform. |
| `text` | string | The cleaned body of the review. |
| `rating` | number | Star rating (1-5). |
| `aiAnalysis` | object | Contains `sentiment`, `category`, and AI-extracted tags. |

### The `Stats` Object
| Field | Type | Description |
| :--- | :--- | :--- |
| `total` | number | Total number of ratings (scraped or reported). |
| `avgRating` | number | Mathematical average of the current batch. |
| `sentimentDist`| object | Count of reviews per sentiment (Positive/Neutral/Negative). |

---

## ⚠️ Error Handling

The API uses standard HTTP status codes:
*   **400 Bad Request:** Missing required parameters (e.g., `platform` or `appId`).
*   **500 Internal Server Error:** Failures during scraping or AI processing.

**Error Response Example:**
```json
{
  "message": "Please provide 'platform' and 'appId' query parameters"
}
```

---

> **Note on AI Analysis:** To ensure high availability, if the AI service (Ollama/Gemini) is unavailable, the API will still return the reviews but will mark sentiment as `Unknown` instead of failing the request.
