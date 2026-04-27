const mongoose = require("mongoose");

const appSchema = new mongoose.Schema({
  name: { type: String, required: true },       // Display name
  platform: { type: String, required: true },   // google, samsung, etc
  appId: { type: String, required: true },      // The ID used to fetch reviews
}, { timestamps: true });

module.exports = mongoose.model("App", appSchema);
