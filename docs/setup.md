# 🚀 Getting Started

Follow these steps to get the Reviews Analyzer running on your local machine.

### Prerequisites
*   **Node.js** (v18 or higher recommended)
*   **MongoDB** (Local instance or Atlas connection string)
*   **Ollama** (Optional, for local AI analysis)

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd reviews-analyzer
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure Environment Variables**
   Create a `.env` file in the root directory and add your configurations:
   ```env
   PORT=3000
   MONGODB_URI=mongodb://localhost:27017/reviews-analyzer
   GEMINI_API_KEY=your_key_here
   OLLAMA_BASE_URL=http://localhost:11434
   ```

4. **Start the server**
   ```bash
   npm start
   ```
   The dashboard should now be accessible at `http://localhost:3000`.

### Project Structure
*   `/server`: Backend logic and API routes.
*   `/server/connectors`: Platform-specific scrapers and API integrations.
*   `/public`: Frontend assets and dashboard UI.
