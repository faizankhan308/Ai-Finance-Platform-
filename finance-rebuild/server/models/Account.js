// =============================================
// ACCOUNT MODEL - Bank accounts (Savings / Current)
// =============================================

const mongoose = require("mongoose");

const accountSchema = new mongoose.Schema(
  {
    // Account name (e.g. "My Savings", "Main Account")
    name: {
      type: String,
      required: [true, "Account name is required"],
      trim: true,
    },

    // Type of account
    type: {
      type: String,
      enum: ["SAVINGS", "CURRENT"], // Only these two values allowed
      required: true,
    },

    // Current balance
    balance: {
      type: Number,
      default: 0,
    },

    // Is this the default account? (only one can be default)
    isDefault: {
      type: Boolean,
      default: false,
    },

    // Which user owns this account
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",           // References the User model
      required: true,
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt automatically
  }
);

module.exports = mongoose.model("Account", accountSchema);
