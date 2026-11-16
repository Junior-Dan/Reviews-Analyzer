const mongoose = require("mongoose");

const appSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    platform: { type: String, required: true, lowercase: true },
    appId: { type: String, required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true }
  },
  { timestamps: true }
);

appSchema.index({ user: 1, platform: 1, appId: 1 }, { unique: true });

module.exports = mongoose.model("App", appSchema);
