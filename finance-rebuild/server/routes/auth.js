// =============================================
// AUTH ROUTES - Register and Login
// Replaces Clerk from the original project
// =============================================

const express = require("express");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const protect = require("../middleware/auth");

const router = express.Router();

// -----------------------------------------------
// Helper: Generate JWT Token
// -----------------------------------------------
const generateToken = (userId) => {
  return jwt.sign(
    { id: userId },          // Payload: what we store in the token
    process.env.JWT_SECRET,  // Secret key to sign the token
    { expiresIn: "7d" }      // Token expires in 7 days
  );
};

// -----------------------------------------------
// POST /api/auth/register - Create new account
// -----------------------------------------------
router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Validate input
    if (!name || !email || !password) {
      return res.status(400).json({ message: "Please fill in all fields." });
    }

    // Check if email is already registered
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Email is already registered." });
    }

    // Create new user (password gets hashed automatically by the model)
    const user = await User.create({ name, email, password });

    // Generate JWT token
    const token = generateToken(user._id);

    res.status(201).json({
      message: "Account created successfully!",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Server error: " + error.message });
  }
});

// -----------------------------------------------
// POST /api/auth/login - Login to existing account
// -----------------------------------------------
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ message: "Please enter email and password." });
    }

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    // Check if password matches
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    // Generate JWT token
    const token = generateToken(user._id);

    res.json({
      message: "Login successful!",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Server error: " + error.message });
  }
});

// -----------------------------------------------
// GET /api/auth/me - Get current logged-in user
// Protected route (requires token)
// -----------------------------------------------
router.get("/me", protect, async (req, res) => {
  res.json({
    user: {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
    },
  });
});

module.exports = router;
