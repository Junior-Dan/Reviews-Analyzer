const mongoose = require("mongoose");

const storeConnectionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    platform: {
      type: String,
      required: true,
      enum: ["google", "apple", "samsung", "amazon", "roku"]
    },
    connectionName: {
      type: String,
      required: true
    },
    credentials: {
      type: Object,
      default: {}
    },
    status: {
      type: String,
      enum: ["Active", "Invalid", "Pending"],
      default: "Active"
    }
  },
  { timestamps: true }
);

storeConnectionSchema.index({ user: 1, platform: 1 }, { unique: true });

module.exports = mongoose.model("StoreConnection", storeConnectionSchema);
