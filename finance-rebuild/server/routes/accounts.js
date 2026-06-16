// =============================================
// ACCOUNT ROUTES - CRUD for Bank Accounts
// =============================================

const express = require("express");
const Account = require("../models/Account");
const Transaction = require("../models/Transaction");
const protect = require("../middleware/auth");

const router = express.Router();

// All account routes require login (protected)
router.use(protect);

// -----------------------------------------------
// GET /api/accounts - Get all accounts for logged-in user
// -----------------------------------------------
router.get("/", async (req, res) => {
  try {
    const accounts = await Account.find({ userId: req.user._id }).sort({ createdAt: -1 });
    res.json({ success: true, data: accounts });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// -----------------------------------------------
// POST /api/accounts - Create a new account
// -----------------------------------------------
router.post("/", async (req, res) => {
  try {
    const { name, type, balance, isDefault } = req.body;

    if (!name || !type) {
      return res.status(400).json({ message: "Name and type are required." });
    }

    // If new account is set as default, remove default from all other accounts first
    if (isDefault) {
      await Account.updateMany(
        { userId: req.user._id },
        { isDefault: false }
      );
    }

    // If this is the user's very first account, make it default automatically
    const existingAccounts = await Account.countDocuments({ userId: req.user._id });
    const shouldBeDefault = isDefault || existingAccounts === 0;

    const account = await Account.create({
      name,
      type,
      balance: balance || 0,
      isDefault: shouldBeDefault,
      userId: req.user._id,
    });

    res.status(201).json({ success: true, data: account });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// -----------------------------------------------
// GET /api/accounts/:id - Get a single account with transactions
// -----------------------------------------------
router.get("/:id", async (req, res) => {
  try {
    const account = await Account.findOne({
      _id: req.params.id,
      userId: req.user._id, // Make sure user owns this account
    });

    if (!account) {
      return res.status(404).json({ message: "Account not found." });
    }

    // Get all transactions for this account
    const transactions = await Transaction.find({
      accountId: account._id,
      userId: req.user._id,
    }).sort({ date: -1 }); // Newest first

    res.json({ success: true, data: { account, transactions } });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// -----------------------------------------------
// PUT /api/accounts/:id/default - Set account as default
// -----------------------------------------------
router.put("/:id/default", async (req, res) => {
  try {
    // Remove default from all user's accounts
    await Account.updateMany({ userId: req.user._id }, { isDefault: false });

    // Set the selected account as default
    const account = await Account.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { isDefault: true },
      { new: true } // Return the updated document
    );

    if (!account) {
      return res.status(404).json({ message: "Account not found." });
    }

    res.json({ success: true, data: account });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// -----------------------------------------------
// DELETE /api/accounts/:id - Delete an account
// -----------------------------------------------
router.delete("/:id", async (req, res) => {
  try {
    const account = await Account.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!account) {
      return res.status(404).json({ message: "Account not found." });
    }

    // Also delete all transactions for this account
    await Transaction.deleteMany({ accountId: req.params.id });

    res.json({ success: true, message: "Account deleted successfully." });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
