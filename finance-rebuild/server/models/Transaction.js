// =============================================
// TRANSACTION MODEL - Income and Expense records
// =============================================

const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema(
  {
    // INCOME or EXPENSE
    type: {
      type: String,
      enum: ["INCOME", "EXPENSE"],
      required: true,
    },

    // Transaction amount (always positive number)
    amount: {
      type: Number,
      required: [true, "Amount is required"],
      min: [0.01, "Amount must be greater than 0"],
    },

    // Optional description (e.g. "Grocery shopping at BigMart")
    description: {
      type: String,
      trim: true,
      default: "",
    },

    // Date of the transaction
    date: {
      type: Date,
      required: true,
      default: Date.now,
    },

    // Category (e.g. "food", "transport", "salary")
    category: {
      type: String,
      required: true,
    },

    // URL of uploaded receipt image (optional)
    receiptUrl: {
      type: String,
      default: "",
    },

    // Is this a recurring transaction? (e.g. monthly rent)
    isRecurring: {
      type: Boolean,
      default: false,
    },

    // How often does it recur? (only used if isRecurring is true)
    recurringInterval: {
      type: String,
      enum: ["DAILY", "WEEKLY", "MONTHLY", "YEARLY", null],
      default: null,
    },

    // When should the next recurring transaction be created?
    nextRecurringDate: {
      type: Date,
      default: null,
    },

    // When was the recurring transaction last processed?
    lastProcessed: {
      type: Date,
      default: null,
    },

    // Status of the transaction
    status: {
      type: String,
      enum: ["PENDING", "COMPLETED", "FAILED"],
      default: "COMPLETED",
    },

    // Which user made this transaction
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Which account was used for this transaction
    accountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Add indexes for faster queries (like original used @@index in Prisma)
transactionSchema.index({ userId: 1 });
transactionSchema.index({ accountId: 1 });
transactionSchema.index({ date: -1 }); // For sorting by date

module.exports = mongoose.model("Transaction", transactionSchema);
