const mongoose = require("mongoose");

const storeConnectionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    platform: {
      type: String,
      required: true,
      enum: ["google", "apple", "samsung", "amazon"]
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

module.exports = mongoose.model("StoreConnection", storeConnectionSchema);
