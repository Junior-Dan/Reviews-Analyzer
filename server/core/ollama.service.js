const axios = require("axios");

class OllamaService {
    constructor() {
        this.baseUrl = process.env.OLLAMA_BASE_URL || "http://localhost:11434/api/generate";
        this.model = process.env.OLLAMA_MODEL || "llama3.2";
    }

    async analyzeReview(text) {
        if (!text || text.trim() === "") {
            return { sentiment: "Neutral", summary: "No comment provided." };
        }

        const prompt = `Analyze this app review. Provide a JSON response with:
1. 'sentiment' (one of: Positive, Negative, Neutral)
2. 'category' (one of: Performance, Bugs, UI, Features)
3. 'summary' (max 15 words).

Review text: "${text}"

JSON format:
{
  "sentiment": "...",
  "category": "...",
  "summary": "..."
}`;

        try {
            const response = await axios.post(this.baseUrl, {
                model: this.model,
                prompt: prompt,
                stream: false,
                format: "json"
            });

            const result = JSON.parse(response.data.response);
            return {
                sentiment: result.sentiment || "Neutral",
                category: result.category || "Performance",
                summary: result.summary || "Summary unavailable"
            };
        } catch (err) {
            console.error("Ollama analysis error:", err.message);
            return {
                sentiment: "Unknown",
                category: "Performance",
                summary: "Error during AI analysis"
            };
        }
    }
}

module.exports = new OllamaService();
