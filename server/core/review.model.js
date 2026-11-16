const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema({
  platform: { type: String, required: true },
  appId: { type: String, required: true },
  reviewId: { type: String, required: true },
  authorName: String,
  rating: Number,
  text: String,
  createdAt: Date,
  aiAnalysis: {
    sentiment: String,
    category: String,
    summary: String
  },
  reply: {
    text: String,
    status: { type: String, default: "Pending" },
    approvedAt: Date,
    approvedBy: String,
    publishedAt: Date,
    publishError: String
  }
}, { timestamps: true });

const Review = mongoose.model("Review", reviewSchema);

module.exports = Review;

