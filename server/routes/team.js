const crypto = require("crypto");
const express = require("express");
const nodemailer = require("nodemailer");
const User = require("../core/user.model");
const TeamMembership = require("../core/teamMembership.model");
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

function createTransporter() {
  const host = (process.env.SMTP_HOST || "").trim();
  const port = Number(process.env.SMTP_PORT || 587);
  const user = (process.env.SMTP_USER || "").trim();
  const pass = process.env.SMTP_PASS || "";
  const secure =
    String(process.env.SMTP_SECURE || "").toLowerCase() === "true" || port === 465;

  if (!host || !user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });
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

    const ownerName = membership.owner?.name || membership.owner?.email || "the workspace";
    return res.send(
      renderAcceptPage({
        title: "Invitation Accepted",
        message: `You have joined ${ownerName}'s team as ${formatRoleLabel(membership.role)}. You can now sign in to Sentriqe.`,
        success: true,
      })
    );
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
      User.findById(ownerId).select("name email createdAt updatedAt"),
      TeamMembership.find({
        owner: ownerId,
        status: "accepted",
      })
        .populate("memberUser", "name email updatedAt")
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

    const members = [];
    if (ownerUser) {
      members.push({
        id: `owner-${ownerUser._id}`,
        name: ownerUser.name || ownerUser.email,
        email: ownerUser.email,
        role: "admin",
        isOwner: true,
        isSelf: String(ownerUser._id) === String(req.user._id),
        dateAdded: formatShortDate(ownerUser.createdAt),
        lastActive: formatShortDate(ownerUser.updatedAt || ownerUser.createdAt),
        avatarBg: AVATAR_PALETTE[0],
      });
    }

    acceptedMemberships
      .filter((m) => m.memberUser)
      .forEach((m, idx) => {
        members.push({
          id: String(m._id),
          name: m.memberUser.name || m.email,
          email: m.memberUser.email || m.email,
          role: m.role,
          isOwner: false,
          isSelf: String(m.memberUser._id) === String(req.user._id),
          dateAdded: formatShortDate(m.acceptedAt || m.createdAt),
          lastActive: formatShortDate(m.memberUser.updatedAt || m.acceptedAt),
          avatarBg: AVATAR_PALETTE[(idx + 1) % AVATAR_PALETTE.length],
        });
      });

    const pendingInvites = pendingMemberships
      .filter((m) => m.memberUser)
      .map((m, idx) => ({
        id: String(m._id),
        name: m.memberUser.name || m.email,
        email: m.memberUser.email || m.email,
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
    if (!targetUser) {
      return res.status(404).json({
        message:
          "No Sentriqe account exists for this email. They must create an account before you can invite them.",
      });
    }

    if (String(targetUser._id) === String(ownerId)) {
      return res.status(400).json({ message: "The workspace owner is already part of this team." });
    }

    const existing = await TeamMembership.findOne({
      owner: ownerId,
      memberUser: targetUser._id,
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
      existing.email = targetUser.email;
      await existing.save();
    } else {
      await TeamMembership.create({
        owner: ownerId,
        memberUser: targetUser._id,
        email: targetUser.email,
        role,
        status: "pending",
        inviteToken,
      });
    }

    const inviterName = req.user?.name || req.user?.email || "A team admin";
    const roleLabel = formatRoleLabel(role);
    const appUrl = (
      process.env.APP_URL || `${req.protocol}://${req.get("host")}`
    ).replace(/\/+$/, "");
    const acceptUrl = `${appUrl}/api/team/accept?token=${inviteToken}`;
    const fromAddress =
      (process.env.SMTP_FROM || "").trim() || `Sentriqe <${process.env.SMTP_USER}>`;

    await transporter.sendMail({
      from: fromAddress,
      to: targetUser.email,
      subject: `${inviterName} invited you to join Sentriqe as ${roleLabel}`,
      text: [
        `Hi ${targetUser.name || ""},`,
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
            Hi ${targetUser.name || "there"},<br /><br />
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

    return res.json({
      ok: true,
      message: `Invitation sent to ${targetUser.email}. They will appear once they accept.`,
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

    if (!pending || !pending.memberUser) {
      return res.status(404).json({ message: "Pending invitation not found." });
    }

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

    await transporter.sendMail({
      from: fromAddress,
      to: pending.memberUser.email,
      subject: `Reminder: ${inviterName} invited you to join Sentriqe as ${roleLabel}`,
      text: [
        `Hi ${pending.memberUser.name || ""},`,
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
            Hi ${pending.memberUser.name || "there"},<br /><br />
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

    return res.json({
      ok: true,
      message: `Invitation resent to ${pending.memberUser.email}.`,
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

    return res.json({ ok: true });
  } catch (err) {
    console.error("Delete team member error:", err);
    return res.status(500).json({ message: "Failed to remove team member." });
  }
});

module.exports = router;
