// =============================================
// BUDGET MODEL - Monthly budget with alert tracking
// =============================================

const mongoose = require("mongoose");

const budgetSchema = new mongoose.Schema(
  {
    // Monthly budget amount (e.g. 50000 rupees per month)
    amount: {
      type: Number,
      required: [true, "Budget amount is required"],
      min: [1, "Budget must be at least 1"],
    },

    // When was the last budget alert email sent?
    // Used to avoid sending duplicate alerts in the same month
    lastAlertSent: {
      type: Date,
      default: null,
    },

    // Each user has only ONE budget (one-to-one relationship)
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true, // Only one budget per user
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Budget", budgetSchema);
