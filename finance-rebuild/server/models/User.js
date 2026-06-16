// =============================================
// USER MODEL - Defines the User data structure in MongoDB
// =============================================

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

// Define the schema (structure) for a User document
const userSchema = new mongoose.Schema(
  {
    // User's full name
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },

    // Email must be unique (no two users with same email)
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
    },

    // Password stored as a hash (never store plain text passwords!)
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters"],
    },

    // Profile image URL (optional)
    imageUrl: {
      type: String,
      default: "",
    },
  },
  {
    // Automatically add createdAt and updatedAt fields
    timestamps: true,
  }
);

// =============================================
// MIDDLEWARE - Hash password before saving
// This runs automatically before every .save()
// =============================================
userSchema.pre("save", async function (next) {
  // Only hash if password was changed (not on every save)
  if (!this.isModified("password")) return next();

  // Hash the password with 12 rounds of salting
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// =============================================
// METHOD - Compare passwords for login
// =============================================
userSchema.methods.comparePassword = async function (candidatePassword) {
  // bcrypt.compare checks if plain text matches the hashed version
  return await bcrypt.compare(candidatePassword, this.password);
};

// Export the model so other files can use it
module.exports = mongoose.model("User", userSchema);
