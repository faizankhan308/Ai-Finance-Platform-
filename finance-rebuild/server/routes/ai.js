// =============================================
// AI ROUTES - Receipt Scanner using Google Gemini
// Same as the original project's AI feature
// =============================================

const express = require("express");
const multer = require("multer");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const protect = require("../middleware/auth");

const router = express.Router();
router.use(protect);

// Initialize Google Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Multer: handles file uploads - stores files in memory (as Buffer)
const upload = multer({
  storage: multer.memoryStorage(),  // Don't save to disk, keep in memory
  limits: { fileSize: 5 * 1024 * 1024 }, // Max 5MB
  fileFilter: (req, file, cb) => {
    // Only allow image files
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed!"), false);
    }
  },
});

// -----------------------------------------------
// POST /api/ai/scan-receipt - Scan a receipt image with Gemini
// -----------------------------------------------
router.post("/scan-receipt", upload.single("receipt"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Please upload a receipt image." });
    }

    // Use the Gemini Vision model (can read images)
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // Convert image to base64 string (required by Gemini API)
    const base64Image = req.file.buffer.toString("base64");

    // The prompt tells Gemini what to extract from the receipt
    const prompt = `
      Analyze this receipt image and extract the following information in JSON format:
      - Total amount (just the number)
      - Date (in ISO format like 2024-01-15)
      - Description or items purchased (brief summary)
      - Merchant/store name
      - Suggested category (one of: housing, transportation, groceries, utilities, entertainment, food, shopping, healthcare, education, personal, travel, insurance, gifts, bills, other-expense)
      
      Only respond with valid JSON in this exact format:
      {
        "amount": 150.50,
        "date": "2024-01-15",
        "description": "Grocery shopping",
        "merchantName": "BigMart Store",
        "category": "groceries"
      }

      If this is not a receipt image, return: {}
    `;

    // Send image + prompt to Gemini
    const result = await model.generateContent([
      {
        inlineData: {
          data: base64Image,
          mimeType: req.file.mimetype,
        },
      },
      prompt,
    ]);

    // Get the text response
    const text = result.response.text();

    // Remove markdown code blocks if Gemini wrapped the JSON in them
    const cleanedText = text.replace(/```(?:json)?\n?/g, "").trim();

    // Parse the JSON response
    const data = JSON.parse(cleanedText);

    if (!data.amount) {
      return res.status(400).json({ message: "Could not extract data from image. Please make sure it's a valid receipt." });
    }

    res.json({
      success: true,
      data: {
        amount: parseFloat(data.amount),
        date: new Date(data.date),
        description: data.description || "",
        merchantName: data.merchantName || "",
        category: data.category || "other-expense",
      },
    });
  } catch (error) {
    console.error("Receipt scan error:", error);
    res.status(500).json({ message: "Failed to scan receipt. Please try again." });
  }
});

// -----------------------------------------------
// POST /api/ai/insights - Generate financial insights using Gemini
// -----------------------------------------------
router.post("/insights", async (req, res) => {
  try {
    const { stats, month } = req.body;

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `
      Analyze this financial data and provide 3 concise, actionable insights.
      Focus on spending patterns and practical advice.
      Keep it friendly and conversational.

      Financial Data for ${month}:
      - Total Income: $${stats.totalIncome}
      - Total Expenses: $${stats.totalExpenses}
      - Net Income: $${stats.totalIncome - stats.totalExpenses}
      - Expense Categories: ${Object.entries(stats.byCategory || {})
        .map(([cat, amt]) => `${cat}: $${amt}`)
        .join(", ")}

      Format the response as a JSON array of strings:
      ["insight 1", "insight 2", "insight 3"]
    `;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const cleanedText = text.replace(/```(?:json)?\n?/g, "").trim();
    const insights = JSON.parse(cleanedText);

    res.json({ success: true, data: insights });
  } catch (error) {
    console.error("Insights error:", error);
    // Return default insights if AI fails
    res.json({
      success: true,
      data: [
        "Your highest expense category this month might need attention.",
        "Consider setting up a budget for better financial management.",
        "Track your recurring expenses to identify potential savings.",
      ],
    });
  }
});

module.exports = router;
