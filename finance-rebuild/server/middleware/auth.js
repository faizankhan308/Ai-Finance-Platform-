// =============================================
// AUTH MIDDLEWARE - Verify JWT Token
// This protects routes that require login
// =============================================

const jwt = require("jsonwebtoken");
const User = require("../models/User");

const protect = async (req, res, next) => {
  try {
    // 1. Check if Authorization header exists
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Not authorized. No token provided." });
    }

    // 2. Extract the token from "Bearer <token>"
    const token = authHeader.split(" ")[1];

    // 3. Verify the token using our secret key
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 4. Find the user in the database
    const user = await User.findById(decoded.id).select("-password"); // Exclude password

    if (!user) {
      return res.status(401).json({ message: "User no longer exists." });
    }

    // 5. Attach user to the request object
    // Now in any route handler, you can use req.user to get the logged-in user
    req.user = user;

    // 6. Call next() to proceed to the actual route handler
    next();
  } catch (error) {
    // Token is invalid or expired
    return res.status(401).json({ message: "Not authorized. Invalid token." });
  }
};

module.exports = protect;
