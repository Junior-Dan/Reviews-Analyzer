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

// Serve static frontend files (React/Vite dist build + public static assets) and define API routes
const distDir = path.join(__dirname, "dist");
const distIndex = path.join(distDir, "index.html");

app.use(express.static(distDir));
app.use(express.static(path.join(__dirname, "public"), { index: false }));

const spaRoutes = [
  "/",
  "/dashboard",
  "/dashboard.html",
  "/reviews",
  "/messages",
  "/messages.html",
  "/monitored-apps",
  "/monitored-apps.html",
  "/integrations",
  "/integrations.html",
  "/alerts",
  "/alerts.html",
  "/settings",
  "/settings.html",
  "/team",
  "/teams",
  "/login",
  "/login.html",
  "/register",
  "/register.html",
  "/privacy",
  "/privacy.html",
  "/terms",
  "/terms.html",
];

spaRoutes.forEach((routePath) => {
  app.get(routePath, (req, res) => {
    res.sendFile(distIndex);
  });
});

app.use("/dashboard", dashboardRouter);
app.use("/apps", appsRouter);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
