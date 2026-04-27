require("dotenv").config();
const express = require("express");
const path = require("path");
const connectDB = require("./server/config/db");
const app = require("./server/app");
const dashboardRouter = require("./server/routes/dashboard");
const appsRouter = require("./server/routes/apps");

// Configuration from environment variables
const PORT = process.env.PORT || 5501;

// Initialize database connection
connectDB();

// Serve static frontend files and define API routes
app.use(express.static(path.join(__dirname, "public")));

// Root route redirects to dashboard.html
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "dashboard.html"));
});

app.use("/dashboard", dashboardRouter);
app.use("/apps", appsRouter);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
