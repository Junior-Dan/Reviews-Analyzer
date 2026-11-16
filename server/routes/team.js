const crypto = require("crypto");
const express = require("express");
const nodemailer = require("nodemailer");
const User = require("../core/user.model");
const TeamMembership = require("../core/teamMembership.model");
const { logAuditEvent } = require("../utils/auditLogger");
const { protect } = require("../middleware/auth.middleware");

const router = express.Router();

const VALID_ROLES = new Set(["admin", "dev", "staff"]);
const AVATAR_PALETTE = [
  "#059669",
  "#2563eb",
  "#7c3aed",
  "#db2777",
  "#d97706",
  "#0d9488",
  "#4f46e5",
  "#dc2626",
];

function createTransporter(overridePort) {
  const host = (process.env.SMTP_HOST || "").trim();
  const port = overridePort || Number(process.env.SMTP_PORT || 587);
  const user = (process.env.SMTP_USER || "").trim();
  const pass = process.env.SMTP_PASS || "";
  const secure =
    overridePort === 465 ||
    String(process.env.SMTP_SECURE || "").toLowerCase() === "true" ||
    port === 465;

  if (!host || !user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    family: 4,
    connectionTimeout: 7000,
    greetingTimeout: 7000,
    auth: { user, pass },
  });
}

async function sendMailWithFallback(mailOptions) {
  const primary = createTransporter();
  if (!primary) return { sent: false, reason: "SMTP_NOT_CONFIGURED" };

  try {
    await primary.sendMail(mailOptions);
    return { sent: true };
  } catch (err) {
    const isNetworkErr = ["ESOCKET", "ETIMEDOUT", "EHOSTUNREACH", "ECONNREFUSED"].includes(err?.code);
    const configuredPort = Number(process.env.SMTP_PORT || 587);
    if (isNetworkErr && configuredPort !== 465) {
      try {
        const fallback = createTransporter(465);
        await fallback.sendMail(mailOptions);
        return { sent: true };
      } catch (fallbackErr) {
        return { sent: false, error: fallbackErr };
      }
    }
    return { sent: false, error: err };
  }
}

function formatRoleLabel(role) {
  if (role === "admin") return "Admin";
  if (role === "dev") return "Dev";
  return "Staff";
}

function formatShortDate(date) {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
}

function renderAcceptPage({ title, message, success }) {
  const accent = success ? "#169c46" : "#dc2626";
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title} — Sentriqe</title>
  <style>
    body { margin: 0; font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f8fafc; color: #0f172a; display: grid; place-items: center; min-height: 100vh; padding: 20px; }
    .card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 20px; max-width: 440px; width: 100%; padding: 32px; text-align: center; box-shadow: 0 14px 36px rgba(15, 23, 42, 0.08); }
    .badge { width: 48px; height: 48px; border-radius: 50%; margin: 0 auto 16px; display: grid; place-items: center; background: ${success ? "#ecfdf5" : "#fef2f2"}; color: ${accent}; font-size: 22px; font-weight: 700; }
    h1 { margin: 0 0 10px; font-size: 20px; }
    p { margin: 0 0 24px; font-size: 14px; line-height: 1.6; color: #475569; }
    a { display: inline-block; padding: 11px 24px; border-radius: 999px; background: #169c46; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 600; }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">${success ? "&#10003;" : "!"}</div>
    <h1>${title}</h1>
    <p>${message}</p>
    <a href="/login">Open Sentriqe</a>
  </div>
</body>
</html>`;
}

/**
 * GET /api/team/accept?token=...
 * Public endpoint clicked from the invitation email to accept the team invite.
 */
router.get("/accept", async (req, res) => {
  try {
    const token = typeof req.query?.token === "string" ? req.query.token.trim() : "";
    if (!token) {
      return res.status(400).send(
        renderAcceptPage({
          title: "Invalid Invitation Link",
          message: "This invitation link is missing a token.",
          success: false,
        })
      );
    }

    const membership = await TeamMembership.findOne({ inviteToken: token }).populate(
      "owner",
      "name email"
    );
    if (!membership) {
      return res.status(404).send(
        renderAcceptPage({
          title: "Invitation Not Found",
          message: "This invitation link has expired or was already used.",
          success: false,
        })
      );
    }

    membership.status = "accepted";
    membership.acceptedAt = new Date();
    membership.inviteToken = null;
    await membership.save();

    return res.redirect("/login");
  } catch (err) {
    console.error("Accept invite error:", err);
    return res.status(500).send(
      renderAcceptPage({
        title: "Something Went Wrong",
        message: "We could not process this invitation right now. Please try again.",
        success: false,
      })
    );
  }
});

// All routes below require an authenticated user
router.use(protect);

/**
 * GET /api/team
 * Returns the workspace owner + accepted team members, plus pending invites for admins/owners.
 */
router.get("/", async (req, res) => {
  try {
    const ownerId = req.workspaceOwnerId || req.user._id;
    const workspaceRole = req.workspaceRole || "owner";
    const canManageTeam = workspaceRole === "owner" || workspaceRole === "admin";

    const [ownerUser, acceptedMemberships, pendingMemberships] = await Promise.all([
      User.findById(ownerId).select("name email createdAt updatedAt lastActiveAt"),
      TeamMembership.find({
        owner: ownerId,
        status: "accepted",
      })
        .populate("memberUser", "name email updatedAt lastActiveAt")
        .sort({ acceptedAt: -1, createdAt: -1 }),
      canManageTeam
        ? TeamMembership.find({
            owner: ownerId,
            status: "pending",
          })
            .populate("memberUser", "name email")
            .sort({ updatedAt: -1, createdAt: -1 })
        : Promise.resolve([]),
    ]);

    const formatLastActive = (value) => {
      if (!value) return { label: "Never", isOnline: false };
      const ts = new Date(value).getTime();
      if (Number.isNaN(ts)) return { label: "Never", isOnline: false };
      const diffMs = Math.max(0, Date.now() - ts);
      if (diffMs < 5 * 60 * 1000) return { label: "Active", isOnline: true };
      if (diffMs < 60 * 60 * 1000) return { label: `${Math.floor(diffMs / 60000)}m ago`, isOnline: false };
      if (diffMs < 24 * 60 * 60 * 1000) return { label: `${Math.floor(diffMs / 3600000)}h ago`, isOnline: false };
      return { label: formatShortDate(value), isOnline: false };
    };

    const members = [];
    if (ownerUser) {
      const activity = formatLastActive(ownerUser.lastActiveAt || ownerUser.updatedAt || ownerUser.createdAt);
      members.push({
        id: `owner-${ownerUser._id}`,
        name: ownerUser.name || ownerUser.email,
        email: ownerUser.email,
        role: "admin",
        isOwner: true,
        isSelf: String(ownerUser._id) === String(req.user._id),
        dateAdded: formatShortDate(ownerUser.createdAt),
        lastActive: activity.label,
        isOnline: activity.isOnline,
        avatarBg: AVATAR_PALETTE[0],
      });
    }

    acceptedMemberships
      .filter((m) => m.memberUser)
      .forEach((m, idx) => {
        const activity = formatLastActive(m.memberUser.lastActiveAt || m.memberUser.updatedAt || m.acceptedAt);
        members.push({
          id: String(m._id),
          name: m.memberUser.name || m.email,
          email: m.memberUser.email || m.email,
          role: m.role,
          isOwner: false,
          isSelf: String(m.memberUser._id) === String(req.user._id),
          dateAdded: formatShortDate(m.acceptedAt || m.createdAt),
          lastActive: activity.label,
          isOnline: activity.isOnline,
          avatarBg: AVATAR_PALETTE[(idx + 1) % AVATAR_PALETTE.length],
        });
      });

    const pendingInvites = pendingMemberships.map((m, idx) => ({
      id: String(m._id),
      name: m.memberUser?.name || m.email.split("@")[0] || m.email,
      email: m.memberUser?.email || m.email,
      role: m.role,
      invitedAt: formatShortDate(m.updatedAt || m.createdAt),
      avatarBg: AVATAR_PALETTE[(idx + 2) % AVATAR_PALETTE.length],
    }));

    return res.json({ members, pendingInvites, workspaceRole });
  } catch (err) {
    console.error("List team members error:", err);
    return res.status(500).json({ message: "Failed to load team members." });
  }
});

/**
 * POST /api/team/invite
 * Verifies the recipient already has a Sentriqe account, creates a pending invite,
 * and sends an email with an Accept Invitation link. Does NOT save as active until accepted.
 */
router.post("/invite", async (req, res) => {
  try {
    if (req.workspaceRole !== "owner" && req.workspaceRole !== "admin") {
      return res.status(403).json({ message: "Only workspace owners or admins can invite team members." });
    }
    const ownerId = req.workspaceOwnerId || req.user._id;
    const email =
      typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
    const rawRole =
      typeof req.body?.role === "string" ? req.body.role.trim().toLowerCase() : "staff";
    const role = VALID_ROLES.has(rawRole) ? rawRole : "staff";

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ message: "Please provide a valid email address." });
    }

    if (req.user?.email && req.user.email.toLowerCase() === email) {
      return res.status(400).json({ message: "You cannot invite your own account." });
    }

    const targetUser = await User.findOne({ email }).select("_id name email");
    if (targetUser && String(targetUser._id) === String(ownerId)) {
      return res.status(400).json({ message: "The workspace owner is already part of this team." });
    }

    const existing = await TeamMembership.findOne({
      owner: ownerId,
      email,
    });
    if (existing && existing.status === "accepted") {
      return res.status(409).json({
        message: "This user has already accepted and is on your team.",
      });
    }

    const transporter = createTransporter();
    if (!transporter) {
      return res.status(503).json({
        message:
          "SMTP is not configured. Set SMTP_HOST, SMTP_PORT, SMTP_USER, and SMTP_PASS in .env and restart the server.",
      });
    }

    const inviteToken = crypto.randomBytes(24).toString("hex");
    if (existing) {
      existing.role = role;
      existing.status = "pending";
      existing.inviteToken = inviteToken;
      existing.email = email;
      if (targetUser) existing.memberUser = targetUser._id;
      await existing.save();
    } else {
      await TeamMembership.create({
        owner: ownerId,
        memberUser: targetUser ? targetUser._id : null,
        email,
        role,
        status: "pending",
        inviteToken,
      });
    }

    const recipientName = targetUser?.name || email.split("@")[0] || "there";
    const inviterName = req.user?.name || req.user?.email || "A team admin";
    const roleLabel = formatRoleLabel(role);
    const appUrl = (
      process.env.APP_URL || `${req.protocol}://${req.get("host")}`
    ).replace(/\/+$/, "");
    const acceptUrl = `${appUrl}/api/team/accept?token=${inviteToken}`;
    const fromAddress =
      (process.env.SMTP_FROM || "").trim() || `Sentriqe <${process.env.SMTP_USER}>`;

    const mailResult = await sendMailWithFallback({
      from: fromAddress,
      to: email,
      subject: `${inviterName} invited you to join Sentriqe as ${roleLabel}`,
      text: [
        `Hi ${recipientName},`,
        ``,
        `${inviterName} has invited you to join their workspace on Sentriqe with the ${roleLabel} role.`,
        ``,
        `Accept invitation: ${acceptUrl}`,
        ``,
        `You will only be added to the team after accepting this invitation.`,
        ``,
        `— Sentriqe`,
      ].join("\n"),
      html: `
        <div style="font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #0f172a; max-width: 520px; margin: 0 auto; padding: 24px;">
          <h2 style="margin: 0 0 12px; font-size: 20px;">You're invited to Sentriqe</h2>
          <p style="margin: 0 0 16px; font-size: 14px; line-height: 1.6; color: #334155;">
            Hi ${recipientName},<br /><br />
            <strong>${inviterName}</strong> has invited you to join their workspace on Sentriqe as <strong>${roleLabel}</strong>.
          </p>
          <a href="${acceptUrl}" style="display: inline-block; padding: 11px 22px; border-radius: 999px; background: #169c46; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 600;">
            Accept Invitation
          </a>
          <p style="margin: 20px 0 0; font-size: 12px; color: #64748b;">
            If you weren't expecting this invitation, you can safely ignore this email.
          </p>
        </div>
      `,
    });

    void logAuditEvent({
      owner: ownerId,
      actor: req.user._id,
      actorEmail: req.user.email,
      severity: "LOW",
      action: "TEAM INVITE_SENT",
      entity: "Team",
      description: `Invited ${email} as ${roleLabel}`,
      metadata: { email, role, emailSent: mailResult.sent },
    });

    if (!mailResult.sent) {
      console.warn("Team invite SMTP warning:", mailResult.error?.message || mailResult.reason);
      return res.json({
        ok: true,
        emailSent: false,
        acceptUrl,
        message: `Invite saved for ${email} (SMTP blocked on network). Link: ${acceptUrl}`,
      });
    }

    return res.json({
      ok: true,
      emailSent: true,
      message: `Invitation sent to ${email}. They will appear once they accept.`,
    });
  } catch (err) {
    console.error("Team invite email error:", err);
    return res.status(500).json({
      message: err?.message || "Failed to send invitation email via SMTP.",
    });
  }
});

/**
 * POST /api/team/invites/:id/resend
 * Resends a pending invitation email with a fresh token.
 */
router.post("/invites/:id/resend", async (req, res) => {
  try {
    if (req.workspaceRole !== "owner" && req.workspaceRole !== "admin") {
      return res.status(403).json({ message: "Only workspace owners or admins can resend invites." });
    }
    const ownerId = req.workspaceOwnerId || req.user._id;
    const pending = await TeamMembership.findOne({
      _id: req.params.id,
      owner: ownerId,
      status: "pending",
    }).populate("memberUser", "name email");

    if (!pending) {
      return res.status(404).json({ message: "Pending invitation not found." });
    }

    const recipientEmail = pending.memberUser?.email || pending.email;
    const recipientName = pending.memberUser?.name || recipientEmail.split("@")[0] || "there";

    const transporter = createTransporter();
    if (!transporter) {
      return res.status(503).json({
        message:
          "SMTP is not configured. Set SMTP_HOST, SMTP_PORT, SMTP_USER, and SMTP_PASS in .env and restart the server.",
      });
    }

    const inviteToken = crypto.randomBytes(24).toString("hex");
    pending.inviteToken = inviteToken;
    await pending.save();

    const inviterName = req.user?.name || req.user?.email || "A team admin";
    const roleLabel = formatRoleLabel(pending.role);
    const appUrl = (
      process.env.APP_URL || `${req.protocol}://${req.get("host")}`
    ).replace(/\/+$/, "");
    const acceptUrl = `${appUrl}/api/team/accept?token=${inviteToken}`;
    const fromAddress =
      (process.env.SMTP_FROM || "").trim() || `Sentriqe <${process.env.SMTP_USER}>`;

    const mailResult = await sendMailWithFallback({
      from: fromAddress,
      to: recipientEmail,
      subject: `Reminder: ${inviterName} invited you to join Sentriqe as ${roleLabel}`,
      text: [
        `Hi ${recipientName},`,
        ``,
        `${inviterName} has invited you to join their workspace on Sentriqe with the ${roleLabel} role.`,
        ``,
        `Accept invitation: ${acceptUrl}`,
        ``,
        `— Sentriqe`,
      ].join("\n"),
      html: `
        <div style="font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #0f172a; max-width: 520px; margin: 0 auto; padding: 24px;">
          <h2 style="margin: 0 0 12px; font-size: 20px;">You're invited to Sentriqe</h2>
          <p style="margin: 0 0 16px; font-size: 14px; line-height: 1.6; color: #334155;">
            Hi ${recipientName},<br /><br />
            <strong>${inviterName}</strong> has invited you to join their workspace on Sentriqe as <strong>${roleLabel}</strong>.
          </p>
          <a href="${acceptUrl}" style="display: inline-block; padding: 11px 22px; border-radius: 999px; background: #169c46; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 600;">
            Accept Invitation
          </a>
          <p style="margin: 20px 0 0; font-size: 12px; color: #64748b;">
            If you weren't expecting this invitation, you can safely ignore this email.
          </p>
        </div>
      `,
    });

    if (!mailResult.sent) {
      return res.json({
        ok: true,
        emailSent: false,
        acceptUrl,
        message: `Invite link for ${recipientEmail} (SMTP blocked on network): ${acceptUrl}`,
      });
    }

    return res.json({
      ok: true,
      emailSent: true,
      message: `Invitation resent to ${recipientEmail}.`,
    });
  } catch (err) {
    console.error("Resend invite error:", err);
    return res.status(500).json({ message: err?.message || "Failed to resend invitation." });
  }
});

/**
 * PATCH /api/team/:id
 * Updates an accepted member's role.
 */
router.patch("/:id", async (req, res) => {
  try {
    if (req.workspaceRole !== "owner" && req.workspaceRole !== "admin") {
      return res.status(403).json({ message: "Only workspace owners or admins can update team roles." });
    }
    const ownerId = req.workspaceOwnerId || req.user._id;
    const rawRole =
      typeof req.body?.role === "string" ? req.body.role.trim().toLowerCase() : "";
    if (!VALID_ROLES.has(rawRole)) {
      return res.status(400).json({ message: "Invalid role." });
    }

    const updated = await TeamMembership.findOneAndUpdate(
      { _id: req.params.id, owner: ownerId, status: "accepted" },
      { role: rawRole },
      { new: true }
    );
    if (!updated) {
      return res.status(404).json({ message: "Team member not found." });
    }

    void logAuditEvent({
      owner: ownerId,
      actor: req.user._id,
      actorEmail: req.user.email,
      severity: "MEDIUM",
      action: "TEAM ROLE_UPDATED",
      entity: "Team",
      description: `Updated ${updated.email} role to ${updated.role}`,
      metadata: { email: updated.email, role: updated.role },
    });

    return res.json({ ok: true, role: updated.role });
  } catch (err) {
    console.error("Update team member error:", err);
    return res.status(500).json({ message: "Failed to update team member." });
  }
});

/**
 * DELETE /api/team/:id
 * Removes a team member from the current user's workspace.
 */
router.delete("/:id", async (req, res) => {
  try {
    if (req.workspaceRole !== "owner" && req.workspaceRole !== "admin") {
      return res.status(403).json({ message: "Only workspace owners or admins can remove team members." });
    }
    const ownerId = req.workspaceOwnerId || req.user._id;
    const deleted = await TeamMembership.findOneAndDelete({
      _id: req.params.id,
      owner: ownerId,
    });
    if (!deleted) {
      return res.status(404).json({ message: "Team member not found." });
    }

    void logAuditEvent({
      owner: ownerId,
      actor: req.user._id,
      actorEmail: req.user.email,
      severity: "HIGH",
      action: "TEAM MEMBER_REMOVED",
      entity: "Team",
      description: `Removed team member ${deleted.email}`,
      metadata: { email: deleted.email },
    });

    return res.json({ ok: true });
  } catch (err) {
    console.error("Delete team member error:", err);
    return res.status(500).json({ message: "Failed to remove team member." });
  }
});

module.exports = router;
