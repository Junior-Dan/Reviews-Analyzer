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

module.exports = app;

