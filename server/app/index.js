const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const reviewsRoute = require("../routes/reviews");
const packagesRoute = require("../routes/packages");
const authRoute = require("../routes/auth");
const appsRoute = require("../routes/apps");
const dashboardRoute = require("../routes/dashboard");
const integrationsRoute = require("../routes/integrations");
const teamRoute = require("../routes/team");
const devicesRoute = require("../routes/devices");
const auditLogsRoute = require("../routes/auditLogs");

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: "5mb" }));

// Health check
app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    message: "Reviews Analyzer API is running"
  });
});

// Build version check for silent auto-update
app.get("/api/app-version", (req, res) => {
  try {
    const html = fs.readFileSync(path.join(__dirname, "../../dist/index.html"), "utf8");
    const match = html.match(/src="(\/assets\/[^"]+)"/);
    res.set("Cache-Control", "no-store");
    return res.json({ version: match ? match[1] : "dev" });
  } catch {
    return res.json({ version: "dev" });
  }
});

// API Routes
app.use("/api/auth", authRoute);
app.use("/apps", appsRoute);
app.use("/reviews", reviewsRoute);
app.use("/packages", packagesRoute);
app.use("/dashboard", dashboardRoute);
app.use("/api/integrations", integrationsRoute);
app.use("/api/team", teamRoute);
app.use("/api/devices", devicesRoute);
app.use("/api/audit-logs", auditLogsRoute);

// API 404 Handler - ensure API routes return JSON instead of HTML
app.use((req, res, next) => {
  if (
    req.path.endsWith(".html") ||
    ((req.path === "/dashboard" ||
      req.path === "/dashboard/" ||
      req.path === "/reviews" ||
      req.path === "/reviews/") &&
      req.headers.accept?.includes("text/html"))
  ) {
    return next();
  }
  const isApi = req.path.startsWith("/api") || 
                req.path.startsWith("/reviews") || 
                req.path.startsWith("/packages") || 
                req.path.startsWith("/apps") ||
                req.path.startsWith("/dashboard") ||
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
