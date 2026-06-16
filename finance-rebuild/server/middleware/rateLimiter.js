// =============================================
// RATE LIMITER MIDDLEWARE
// Replaces ArcJet from the original project
// Prevents users from making too many requests (abuse/spam)
// =============================================

const rateLimit = require("express-rate-limit");

const rateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute window
  max: 100,                  // Max 100 requests per minute per IP
  message: {
    message: "Too many requests. Please slow down and try again after a minute.",
  },
  standardHeaders: true,  // Send rate limit info in headers
  legacyHeaders: false,
});

module.exports = rateLimiter;
