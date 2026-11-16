const express = require("express");
const router = express.Router();
const AuditLog = require("../core/auditLog.model");
const { protect } = require("../middleware/auth.middleware");

router.use(protect);

/**
 * GET /api/audit-logs/unread-count
 */
router.get("/unread-count", async (req, res) => {
  try {
    const role = req.workspaceRole || "owner";
    if (role !== "owner" && role !== "admin") {
      return res.json({ count: 0 });
    }
    const ownerId = req.workspaceOwnerId || req.user._id;
    const query = { owner: ownerId };
    if (req.user.auditLogsLastSeenAt) {
      query.createdAt = { $gt: req.user.auditLogsLastSeenAt };
    }
    const count = await AuditLog.countDocuments(query);
    return res.json({ count });
  } catch (err) {
    console.error("Unread audit logs count error:", err);
    return res.json({ count: 0 });
  }
});

/**
 * POST /api/audit-logs/mark-seen
 */
router.post("/mark-seen", async (req, res) => {
  try {
    const now = new Date();
    req.user.auditLogsLastSeenAt = now;
    await req.user.save();
    return res.json({ ok: true, seenAt: now.toISOString() });
  } catch (err) {
    console.error("Mark audit logs seen error:", err);
    return res.status(500).json({ message: "Failed to mark audit logs seen." });
  }
});

/**
 * GET /api/audit-logs
 * Query: ?severity=LOW&entity=Auth&user=...&search=...&dateFrom=...&dateTo=...&page=1&limit=10
 */
router.get("/", async (req, res) => {
  try {
    const role = req.workspaceRole || "owner";
    if (role !== "owner" && role !== "admin") {
      return res.status(403).json({ message: "Only admins can view audit logs." });
    }
    const ownerId = req.workspaceOwnerId || req.user._id;
    const {
      severity,
      entity,
      user,
      search,
      dateFrom,
      dateTo,
      page = "1",
      limit = "10",
    } = req.query;

    const query = { owner: ownerId };

    if (severity && severity !== "all") {
      query.severity = String(severity).toUpperCase();
    }
    if (entity && entity !== "all") {
      query.entity = String(entity);
    }
    if (user && user !== "all") {
      query.actorEmail = String(user);
    }
    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) query.createdAt.$gte = new Date(String(dateFrom));
      if (dateTo) {
        const end = new Date(String(dateTo));
        end.setHours(23, 59, 59, 999);
        query.createdAt.$lte = end;
      }
    }
    if (search && String(search).trim()) {
      const rx = new RegExp(String(search).trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      query.$or = [
        { action: rx },
        { actorEmail: rx },
        { entity: rx },
        { description: rx },
      ];
    }

    const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(String(limit), 10) || 10));
    const skip = (pageNum - 1) * limitNum;

    const [events, total, entities, users] = await Promise.all([
      AuditLog.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      AuditLog.countDocuments(query),
      AuditLog.distinct("entity", { owner: ownerId }),
      AuditLog.distinct("actorEmail", { owner: ownerId }),
    ]);

    return res.json({
      events: events.map((ev) => ({
        id: String(ev._id),
        severity: ev.severity,
        action: ev.action,
        user: ev.actorEmail || "system",
        entity: ev.entity,
        description: ev.description,
        metadata: ev.metadata || {},
        createdAt: ev.createdAt,
      })),
      total,
      page: pageNum,
      limit: limitNum,
      facets: {
        entities: entities.filter(Boolean).sort(),
        users: users.filter(Boolean).sort(),
      },
    });
  } catch (err) {
    console.error("List audit logs error:", err);
    return res.status(500).json({ message: "Failed to load audit logs." });
  }
});

module.exports = router;
