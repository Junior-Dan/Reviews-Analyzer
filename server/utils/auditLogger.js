const AuditLog = require("../core/auditLog.model");

async function logAuditEvent({
  owner,
  actor = null,
  actorEmail = "system",
  severity = "LOW",
  action,
  entity,
  description,
  metadata = {},
}) {
  if (!owner || !action || !entity || !description) return;
  try {
    await AuditLog.create({
      owner,
      actor,
      actorEmail,
      severity,
      action,
      entity,
      description,
      metadata,
    });
  } catch (err) {
    console.warn("[AuditLog] Failed to record event:", err.message);
  }
}

module.exports = { logAuditEvent };
