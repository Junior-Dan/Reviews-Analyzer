const express = require("express");
const cors = require("cors");

const reviewsRoute = require("../routes/reviews");
const packagesRoute = require("../routes/packages");

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

// Reviews API
app.use("/reviews", reviewsRoute);
app.use("/packages", packagesRoute);

module.exports = app;
