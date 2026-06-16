// =============================================
// CRON JOBS SERVICE - Background Tasks
// Handles budget audits, recurring logic, and reports
// =============================================

const cron = require("node-cron");
const Transaction = require("../models/Transaction");
const Account = require("../models/Account");
const Budget = require("../models/Budget");
const User = require("../models/User");
const { sendBudgetAlertEmail, sendMonthlyReportEmail } = require("./emailService");

// 1. Process Recurring Transactions (Daily at Midnight)
cron.schedule("0 0 * * *", async () => {
  console.log("⏰ Running Recurring Transactions cron job...");
  try {
    const today = new Date();
    // Fetch all active recurring transactions that are due
    const transactions = await Transaction.find({
      isRecurring: true,
      status: "COMPLETED",
      $or: [
        { lastProcessed: null },
        { nextRecurringDate: { $lte: today } }
      ]
    });

    for (const tx of transactions) {
      // Create new transaction clone
      const newTx = new Transaction({
        type: tx.type,
        amount: tx.amount,
        description: `${tx.description} (Recurring)`,
        date: new Date(),
        category: tx.category,
        userId: tx.userId,
        accountId: tx.accountId,
        isRecurring: false
      });
      await newTx.save();

      // Update associated account balance
      const change = tx.type === "EXPENSE" ? -tx.amount : tx.amount;
      await Account.findByIdAndUpdate(tx.accountId, { $inc: { balance: change } });

      // Update date parameters on the recurring parent transaction
      tx.lastProcessed = new Date();
      tx.nextRecurringDate = calculateNextDueDate(new Date(), tx.recurringInterval);
      await tx.save();
    }
    console.log(`✅ Processed ${transactions.length} recurring transactions.`);
  } catch (err) {
    console.error("❌ Error in Recurring Transactions job:", err);
  }
});

// 2. Check Budget Alerts (Every 6 hours)
cron.schedule("0 */6 * * *", async () => {
  console.log("⏰ Running Budget Alerts check job...");
  try {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0,0,0,0);

    const budgets = await Budget.find().populate({
      path: "userId",
      populate: { path: "accounts" }
    });

    for (const budget of budgets) {
      if (!budget.userId) continue;
      
      const defaultAccount = await Account.findOne({ userId: budget.userId, isDefault: true });
      if (!defaultAccount) continue;

      // Aggregate expenses for default account this month
      const expenseAggregation = await Transaction.aggregate([
        {
          $match: {
            userId: budget.userId,
            accountId: defaultAccount._id,
            type: "EXPENSE",
            date: { $gte: startOfMonth }
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: "$amount" }
          }
        }
      ]);

      const totalExpenses = expenseAggregation[0]?.total || 0;
      const percentageUsed = (totalExpenses / budget.amount) * 100;

      // Trigger email if over 80% and no warning sent this month
      if (percentageUsed >= 80 && (!budget.lastAlertSent || isNewMonth(budget.lastAlertSent))) {
        await sendBudgetAlertEmail({
          to: budget.userId.email,
          userName: budget.userId.name,
          accountName: defaultAccount.name,
          budgetAmount: budget.amount,
          totalExpenses,
          percentageUsed
        });

        budget.lastAlertSent = new Date();
        await budget.save();
      }
    }
  } catch (err) {
    console.error("❌ Error in Budget Alerts check job:", err);
  }
});

// Helpers
function calculateNextDueDate(date, interval) {
  const next = new Date(date);
  if (interval === "DAILY") next.setDate(next.getDate() + 1);
  if (interval === "WEEKLY") next.setDate(next.getDate() + 7);
  if (interval === "MONTHLY") next.setMonth(next.getMonth() + 1);
  if (interval === "YEARLY") next.setFullYear(next.getFullYear() + 1);
  return next;
}

function isNewMonth(lastAlertDate) {
  const today = new Date();
  const alertDate = new Date(lastAlertDate);
  return alertDate.getMonth() !== today.getMonth() || alertDate.getFullYear() !== today.getFullYear();
}
