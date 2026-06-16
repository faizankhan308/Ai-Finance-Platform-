// =============================================
// TRANSACTION ROUTES - Full CRUD for transactions
// =============================================

const express = require("express");
const Transaction = require("../models/Transaction");
const Account = require("../models/Account");
const protect = require("../middleware/auth");

const router = express.Router();
router.use(protect);

// -----------------------------------------------
// Helper: Calculate next recurring date
// -----------------------------------------------
function calculateNextRecurringDate(date, interval) {
  const next = new Date(date);
  switch (interval) {
    case "DAILY":   next.setDate(next.getDate() + 1);        break;
    case "WEEKLY":  next.setDate(next.getDate() + 7);        break;
    case "MONTHLY": next.setMonth(next.getMonth() + 1);      break;
    case "YEARLY":  next.setFullYear(next.getFullYear() + 1); break;
  }
  return next;
}

// -----------------------------------------------
// GET /api/transactions - Get all user transactions
// -----------------------------------------------
router.get("/", async (req, res) => {
  try {
    const { accountId, type, startDate, endDate, category } = req.query;

    // Build filter object
    let filter = { userId: req.user._id };
    if (accountId)  filter.accountId = accountId;
    if (type)       filter.type = type;
    if (category)   filter.category = category;
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate)   filter.date.$lte = new Date(endDate);
    }

    const transactions = await Transaction.find(filter)
      .populate("accountId", "name type") // Include account name
      .sort({ date: -1 })
      .limit(100);

    res.json({ success: true, data: transactions });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// -----------------------------------------------
// POST /api/transactions - Create new transaction
// -----------------------------------------------
router.post("/", async (req, res) => {
  try {
    const { type, amount, description, date, category, accountId, isRecurring, recurringInterval } = req.body;

    if (!type || !amount || !category || !accountId) {
      return res.status(400).json({ message: "Type, amount, category and account are required." });
    }

    // Make sure the account belongs to the user
    const account = await Account.findOne({ _id: accountId, userId: req.user._id });
    if (!account) {
      return res.status(404).json({ message: "Account not found." });
    }

    // Calculate new balance
    const balanceChange = type === "EXPENSE" ? -amount : +amount;
    const newBalance = account.balance + balanceChange;

    // Calculate next recurring date if needed
    const nextRecurringDate =
      isRecurring && recurringInterval
        ? calculateNextRecurringDate(date || new Date(), recurringInterval)
        : null;

    // Create transaction
    const transaction = await Transaction.create({
      type,
      amount,
      description,
      date: date || new Date(),
      category,
      accountId,
      userId: req.user._id,
      isRecurring: isRecurring || false,
      recurringInterval: recurringInterval || null,
      nextRecurringDate,
    });

    // Update account balance
    await Account.findByIdAndUpdate(accountId, { balance: newBalance });

    res.status(201).json({ success: true, data: transaction });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// -----------------------------------------------
// GET /api/transactions/:id - Get single transaction
// -----------------------------------------------
router.get("/:id", async (req, res) => {
  try {
    const transaction = await Transaction.findOne({
      _id: req.params.id,
      userId: req.user._id,
    }).populate("accountId", "name type");

    if (!transaction) {
      return res.status(404).json({ message: "Transaction not found." });
    }

    res.json({ success: true, data: transaction });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// -----------------------------------------------
// PUT /api/transactions/:id - Update a transaction
// -----------------------------------------------
router.put("/:id", async (req, res) => {
  try {
    const { type, amount, description, date, category, accountId, isRecurring, recurringInterval } = req.body;

    // Get the original transaction
    const originalTransaction = await Transaction.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!originalTransaction) {
      return res.status(404).json({ message: "Transaction not found." });
    }

    // Reverse the old balance change, then apply new one
    const oldBalanceChange = originalTransaction.type === "EXPENSE"
      ? -originalTransaction.amount
      : +originalTransaction.amount;

    const newBalanceChange = type === "EXPENSE" ? -amount : +amount;
    const netChange = newBalanceChange - oldBalanceChange;

    // Calculate next recurring date
    const nextRecurringDate =
      isRecurring && recurringInterval
        ? calculateNextRecurringDate(date || new Date(), recurringInterval)
        : null;

    // Update the transaction
    const transaction = await Transaction.findByIdAndUpdate(
      req.params.id,
      { type, amount, description, date, category, accountId, isRecurring, recurringInterval, nextRecurringDate },
      { new: true }
    );

    // Update account balance
    await Account.findByIdAndUpdate(accountId, { $inc: { balance: netChange } });

    res.json({ success: true, data: transaction });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// -----------------------------------------------
// DELETE /api/transactions/:id - Delete a transaction
// -----------------------------------------------
router.delete("/:id", async (req, res) => {
  try {
    const transaction = await Transaction.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!transaction) {
      return res.status(404).json({ message: "Transaction not found." });
    }

    // Reverse the balance change
    const balanceChange = transaction.type === "EXPENSE"
      ? +transaction.amount   // Expense deleted → add back
      : -transaction.amount;  // Income deleted → subtract

    await Account.findByIdAndUpdate(transaction.accountId, {
      $inc: { balance: balanceChange },
    });

    res.json({ success: true, message: "Transaction deleted." });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// -----------------------------------------------
// DELETE /api/transactions/bulk/delete - Delete multiple
// -----------------------------------------------
router.delete("/bulk/delete", async (req, res) => {
  try {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids)) {
      return res.status(400).json({ message: "Please provide an array of transaction IDs." });
    }

    // Get all transactions to reverse their balance effects
    const transactions = await Transaction.find({
      _id: { $in: ids },
      userId: req.user._id,
    });

    // Group balance changes by account
    const accountChanges = {};
    for (const t of transactions) {
      const change = t.type === "EXPENSE" ? +t.amount : -t.amount;
      const accountId = t.accountId.toString();
      accountChanges[accountId] = (accountChanges[accountId] || 0) + change;
    }

    // Delete all transactions
    await Transaction.deleteMany({ _id: { $in: ids }, userId: req.user._id });

    // Update all affected accounts
    for (const [accountId, change] of Object.entries(accountChanges)) {
      await Account.findByIdAndUpdate(accountId, { $inc: { balance: change } });
    }

    res.json({ success: true, message: `${transactions.length} transactions deleted.` });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
