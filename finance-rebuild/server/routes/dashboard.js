// =============================================
// DASHBOARD ROUTES - Summary data for the dashboard
// =============================================

const express = require("express");
const Transaction = require("../models/Transaction");
const Account = require("../models/Account");
const Budget = require("../models/Budget");
const protect = require("../middleware/auth");

const router = express.Router();
router.use(protect);

// -----------------------------------------------
// GET /api/dashboard - Get all dashboard data
// Returns accounts, recent transactions, charts data, budget
// -----------------------------------------------
router.get("/", async (req, res) => {
  try {
    const userId = req.user._id;

    // Fetch all accounts
    const accounts = await Account.find({ userId }).sort({ isDefault: -1 });

    // Date range: last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Fetch recent transactions (last 5)
    const recentTransactions = await Transaction.find({ userId })
      .populate("accountId", "name")
      .sort({ date: -1 })
      .limit(5);

    // Get monthly income vs expense for chart (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const monthlyData = await Transaction.aggregate([
      {
        $match: {
          userId,
          date: { $gte: sixMonthsAgo },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: "$date" },
            month: { $month: "$date" },
            type: "$type",
          },
          total: { $sum: "$amount" },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);

    // Format monthly data for Recharts
    const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const chartDataMap = {};
    monthlyData.forEach(({ _id, total }) => {
      const key = `${_id.year}-${_id.month}`;
      if (!chartDataMap[key]) {
        chartDataMap[key] = {
          name: monthNames[_id.month - 1],
          income: 0,
          expense: 0,
        };
      }
      if (_id.type === "INCOME") chartDataMap[key].income = total;
      if (_id.type === "EXPENSE") chartDataMap[key].expense = total;
    });
    const monthlyChartData = Object.values(chartDataMap);

    // Get category breakdown for pie chart (this month)
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const categoryData = await Transaction.aggregate([
      {
        $match: {
          userId,
          type: "EXPENSE",
          date: { $gte: startOfMonth },
        },
      },
      {
        $group: {
          _id: "$category",
          total: { $sum: "$amount" },
        },
      },
      { $sort: { total: -1 } },
    ]);

    // Get budget info
    const budget = await Budget.findOne({ userId });

    // Total balance across all accounts
    const totalBalance = accounts.reduce((sum, acc) => sum + acc.balance, 0);

    // This month's income and expense
    const thisMonthStats = await Transaction.aggregate([
      {
        $match: {
          userId,
          date: { $gte: startOfMonth },
        },
      },
      {
        $group: {
          _id: "$type",
          total: { $sum: "$amount" },
        },
      },
    ]);

    let monthlyIncome = 0;
    let monthlyExpense = 0;
    thisMonthStats.forEach(({ _id, total }) => {
      if (_id === "INCOME") monthlyIncome = total;
      if (_id === "EXPENSE") monthlyExpense = total;
    });

    res.json({
      success: true,
      data: {
        accounts,
        recentTransactions,
        monthlyChartData,
        categoryData: categoryData.map((c) => ({ name: c._id, value: c.total })),
        budget,
        totalBalance,
        monthlyIncome,
        monthlyExpense,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
