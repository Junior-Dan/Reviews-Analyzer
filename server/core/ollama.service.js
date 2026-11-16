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
3. 'summary' (max 15 words, written in your own words summarizing the key point—do not repeat or quote the review verbatim).

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
            }, { timeout: 4000 });

            const result = JSON.parse(response.data.response);
            return {
                sentiment: result.sentiment || "Neutral",
                category: result.category || "Performance",
                summary: result.summary || "Summary unavailable"
            };
        } catch (err) {
            // Intelligent heuristic fallback if Ollama service is unreachable
            const lower = text.toLowerCase();
            let sentiment = "Neutral";
            if (lower.match(/love|great|good|awesome|excellent|best|amazing|perfect|nice|super|helpful/)) {
                sentiment = "Positive";
            } else if (lower.match(/crash|bug|terrible|worst|slow|freeze|hate|error|fail|broken|lag|useless/)) {
                sentiment = "Negative";
            }

            let category = "Performance";
            if (lower.match(/ui|button|color|layout|screen|look|font|interface|theme|dark/)) {
                category = "UI";
            } else if (lower.match(/bug|crash|freeze|glitch|broke|fix|error|close|stop/)) {
                category = "Bugs";
            } else if (lower.match(/feature|add|support|wish|option|request|please add|can you/)) {
                category = "Features";
            }

            const summary = this.buildHeuristicSummary(text, sentiment, category);

            return {
                sentiment,
                category,
                summary
            };
        }
    }

    buildHeuristicSummary(text, sentiment, category) {
        const lower = (text || "").toLowerCase();
        const themes = [];

        if (lower.match(/force\s*(update|upgrade)|after\s*update|new\s*update|latest\s*update|version/)) {
            themes.push("forced or recent updates");
        }
        if (lower.match(/crash|freeze|hang|force\s*close|won't\s*open|not\s*opening|black\s*screen/)) {
            themes.push("app crashes or freezing");
        }
        if (lower.match(/bug|glitch|error|broken|issue|problem|fail/)) {
            themes.push("software bugs or errors");
        }
        if (lower.match(/slow|lag|battery|drain|heavy|memory|loading|stuck/)) {
            themes.push("slow performance or lag");
        }
        if (lower.match(/login|log\s*in|sign\s*in|account|otp|password|verify|ban|block/)) {
            themes.push("login or account access");
        }
        if (lower.match(/ui|interface|design|layout|dark\s*mode|font|screen|theme/)) {
            themes.push("UI and visual design");
        }
        if (lower.match(/\bad\b|\bads\b|popup|subscription|pay|price|money|charge|expensive/)) {
            themes.push("ads or pricing");
        }
        if (lower.match(/notification|sound|call|video|message|chat|sync|backup|data/)) {
            themes.push("messaging, calls, or data sync");
        }
        if (lower.match(/feature|add|option|wish|missing|support|need/)) {
            themes.push("feature requests");
        }
        if (lower.match(/easy|simple|fast|smooth|useful|helpful|reliable|secure|convenient|communicat/)) {
            themes.push("ease of use and reliability");
        }

        const picked = themes.slice(0, 2);
        if (picked.length > 0) {
            const topicStr = picked.join(" and ");
            if (sentiment === "Positive") return `User praises ${topicStr}.`;
            if (sentiment === "Negative") return `User reports issues with ${topicStr}.`;
            return `User shares feedback on ${topicStr}.`;
        }

        if (sentiment === "Positive") return `User expresses satisfaction with ${category.toLowerCase()} experience.`;
        if (sentiment === "Negative") return `User reports dissatisfaction with ${category.toLowerCase()}.`;
        return `User left brief general feedback on ${category.toLowerCase()}.`;
    }

    async generateReplySuggestion({ text, authorName, rating, sentiment, category, tone = "professional" }) {
        const author = authorName || "valued user";
        const prompt = `You are a professional customer support and product specialist for a mobile app. 
Draft a concise, polite, helpful response (2-3 sentences) to the following user review.
User: ${author}
Rating: ${rating} / 5 stars
Sentiment: ${sentiment}
Category: ${category}
Tone: ${tone}
Review: "${text}"

Provide only the reply text, no quotes or explanations.`;

        try {
            const response = await axios.post(this.baseUrl, {
                model: this.model,
                prompt: prompt,
                stream: false
            }, { timeout: 4000 });

            if (response.data?.response) {
                return response.data.response.trim();
            }
        } catch (err) {
            // Fallback smart response template matching tone and sentiment
        }

        if (sentiment === "Positive" || rating >= 4) {
            return `Hi ${author}, thank you so much for your wonderful ${rating}-star review and kind feedback! Our team is dedicated to providing the best experience possible. If you ever have ideas or suggestions, please let us know. Have a fantastic day!`;
        } else if (sentiment === "Negative" || rating <= 2) {
            return `Hi ${author}, thank you for bringing this to our attention. We are truly sorry to hear that you experienced issues with ${category || "the app"}. Our engineering team is actively investigating this. Please reach out to us at support@example.com so we can resolve this for you right away.`;
        } else {
            return `Hi ${author}, thank you for taking the time to share your feedback. We appreciate your observations regarding ${category || "our features"} and are constantly working on refinements. Stay tuned for our upcoming updates!`;
        }
    }
}

module.exports = new OllamaService();

