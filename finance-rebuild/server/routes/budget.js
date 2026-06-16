// =============================================
// BUDGET ROUTES - Monthly budget management
// =============================================

const express = require("express");
const Budget = require("../models/Budget");
const Transaction = require("../models/Transaction");
const Account = require("../models/Account");
const protect = require("../middleware/auth");

const router = express.Router();
router.use(protect);

// -----------------------------------------------
// GET /api/budget - Get user's current budget
// -----------------------------------------------
router.get("/", async (req, res) => {
  try {
    const budget = await Budget.findOne({ userId: req.user._id });

    // Get default account's expenses this month
    const defaultAccount = await Account.findOne({
      userId: req.user._id,
      isDefault: true,
    });

    let currentExpenses = 0;
    if (defaultAccount && budget) {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      // Sum all expenses this month from the default account
      const result = await Transaction.aggregate([
        {
          $match: {
            userId: req.user._id,
            accountId: defaultAccount._id,
            type: "EXPENSE",
            date: { $gte: startOfMonth },
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: "$amount" },
          },
        },
      ]);

      currentExpenses = result[0]?.total || 0;
    }

    const percentageUsed = budget
      ? (currentExpenses / budget.amount) * 100
      : 0;

    res.json({
      success: true,
      data: {
        budget,
        currentExpenses,
        percentageUsed: Math.min(percentageUsed, 100), // Cap at 100%
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// -----------------------------------------------
// POST /api/budget - Create or update budget
// (If budget exists, update it; if not, create it)
// -----------------------------------------------
router.post("/", async (req, res) => {
  try {
    const { amount } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: "Please enter a valid budget amount." });
    }

    // upsert: true means "create if doesn't exist, update if it does"
    const budget = await Budget.findOneAndUpdate(
      { userId: req.user._id },
      { amount, lastAlertSent: null }, // Reset alert when budget changes
      { new: true, upsert: true }
    );

    res.json({ success: true, data: budget });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// -----------------------------------------------
// DELETE /api/budget - Remove budget
// -----------------------------------------------
router.delete("/", async (req, res) => {
  try {
    await Budget.findOneAndDelete({ userId: req.user._id });
    res.json({ success: true, message: "Budget removed." });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
