const mongoose = require("mongoose");

const teamMembershipSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    memberUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    role: {
      type: String,
      enum: ["admin", "dev", "staff"],
      default: "staff",
    },
    status: {
      type: String,
      enum: ["pending", "accepted"],
      default: "pending",
      index: true,
    },
    inviteToken: {
      type: String,
      default: null,
      index: true,
    },
    acceptedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

teamMembershipSchema.index({ owner: 1, memberUser: 1 }, { unique: true });

module.exports = mongoose.model("TeamMembership", teamMembershipSchema);
