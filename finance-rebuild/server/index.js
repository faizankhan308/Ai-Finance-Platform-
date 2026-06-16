// =============================================
// MAIN SERVER FILE - Entry point of the backend
// =============================================

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");

// Load environment variables from .env file
dotenv.config();

// Import all route files
const authRoutes = require("./routes/auth");
const accountRoutes = require("./routes/accounts");
const transactionRoutes = require("./routes/transactions");
const budgetRoutes = require("./routes/budget");
const dashboardRoutes = require("./routes/dashboard");
const aiRoutes = require("./routes/ai");

// Import rate limiter middleware
const rateLimiter = require("./middleware/rateLimiter");

// Start cron jobs (background tasks that run automatically)
require("./services/cronJobs");

// Create Express app
const app = express();

// =============================================
// MIDDLEWARE SETUP
// =============================================

// Allow frontend (React on port 5173) to talk to backend
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);

// Parse JSON request bodies (allows us to read req.body)
app.use(express.json({ limit: "10mb" })); // 10mb limit for receipt images

// Apply rate limiting to all routes (prevents abuse)
app.use(rateLimiter);

// =============================================
// CONNECT TO MONGODB DATABASE
// =============================================

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("✅ MongoDB Connected Successfully"))
  .catch((err) => console.log("❌ MongoDB Connection Error:", err));

// =============================================
// REGISTER ALL API ROUTES
// =============================================

app.use("/api/auth", authRoutes);           // Login, Register
app.use("/api/accounts", accountRoutes);    // Bank accounts CRUD
app.use("/api/transactions", transactionRoutes); // Transactions CRUD
app.use("/api/budget", budgetRoutes);       // Budget management
app.use("/api/dashboard", dashboardRoutes); // Dashboard data
app.use("/api/ai", aiRoutes);              // AI receipt scanning

// Health check route
app.get("/", (req, res) => {
  res.json({ message: "AI Finance Platform API is running!" });
});

// =============================================
// START THE SERVER
// =============================================

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
