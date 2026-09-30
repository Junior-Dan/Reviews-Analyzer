const express = require("express");
const cors = require("cors");

const reviewsRoute = require("../routes/reviews");
const packagesRoute = require("../routes/packages");
const authRoute = require("../routes/auth");
const appsRoute = require("../routes/apps");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    message: "Reviews Analyzer API is running"
  });
});

// API Routes
app.use("/api/auth", authRoute);
app.use("/apps", appsRoute);
app.use("/reviews", reviewsRoute);
app.use("/packages", packagesRoute);

// API 404 Handler - ensure API routes return JSON instead of HTML
app.use((req, res, next) => {
  const isApi = req.path.startsWith("/api") || 
                req.path.startsWith("/reviews") || 
                req.path.startsWith("/packages") || 
                req.path.startsWith("/apps") ||
                req.headers.accept?.includes("application/json");

  if (isApi) {
    return res.status(404).json({ message: `API route '${req.originalUrl}' not found` });
  }
  next();
});

// Global Error Handler - ensure errors return JSON
app.use((err, req, res, next) => {
  console.error("Global API Error:", err);
  res.status(err.status || 500).json({ message: err.message || "Internal Server Error" });
});

module.exports = app;
