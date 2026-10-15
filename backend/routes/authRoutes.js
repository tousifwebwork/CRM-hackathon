const express = require("express");
const jwt = require("jsonwebtoken");
const rateLimit = require("express-rate-limit");
const User = require("../models/User");
const { protect } = require("../middleware/auth");

const router = express.Router();
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Limit login/register attempts per IP
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many attempts. Please try again in 15 minutes." },
});

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || "1d" });

const asString = (v) => (typeof v === "string" ? v : "");

// POST /api/auth/register
router.post("/register", authLimiter, async (req, res, next) => {
  try {
    const name = asString(req.body.name).trim();
    const email = asString(req.body.email).trim().toLowerCase();
    const password = asString(req.body.password);

    if (!name) return res.status(400).json({ message: "Name is required." });
    if (!EMAIL_RE.test(email)) return res.status(400).json({ message: "Enter a valid email address." });
    if (password.length < 6) return res.status(400).json({ message: "Password must be at least 6 characters." });

    if (await User.findOne({ email })) {
      return res.status(409).json({ message: "An account with this email already exists." });
    }

    const user = await User.create({ name, email, password });
    res.status(201).json({ message: "Account created successfully.", token: signToken(user._id), user });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/login
router.post("/login", authLimiter, async (req, res, next) => {
  try {
    const email = asString(req.body.email).trim().toLowerCase();
    const password = asString(req.body.password);

    if (!email || !password) return res.status(400).json({ message: "Email and password are required." });

    const user = await User.findOne({ email }).select("+password");
    // Same message for unknown email and wrong password, so emails cannot be probed
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    res.json({ message: "Logged in successfully.", token: signToken(user._id), user });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/logout
// Tokens are stateless, so the server has nothing to delete. The frontend clears the token.
router.post("/logout", (req, res) => {
  res.json({ message: "Logged out successfully." });
});

// GET /api/auth/profile
router.get("/profile", protect, (req, res) => {
  res.json({ user: req.user });
});

// PUT /api/auth/profile
router.put("/profile", protect, async (req, res, next) => {
  try {
    const name = asString(req.body.name).trim();
    const email = asString(req.body.email).trim().toLowerCase();

    if (!name) return res.status(400).json({ message: "Name is required." });
    if (!EMAIL_RE.test(email)) return res.status(400).json({ message: "Enter a valid email address." });

    const taken = await User.findOne({ email, _id: { $ne: req.user._id } });
    if (taken) return res.status(409).json({ message: "That email is already in use." });

    req.user.name = name;
    req.user.email = email;
    await req.user.save();

    res.json({ message: "Profile updated.", user: req.user });
  } catch (err) {
    next(err);
  }
});

// PUT /api/auth/change-password
router.put("/change-password", protect, async (req, res, next) => {
  try {
    const currentPassword = asString(req.body.currentPassword);
    const newPassword = asString(req.body.newPassword);

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "Current and new password are required." });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ message: "New password must be at least 6 characters." });
    }
    if (newPassword === currentPassword) {
      return res.status(400).json({ message: "New password must be different from the current one." });
    }

    const user = await User.findById(req.user._id).select("+password");
    if (!(await user.comparePassword(currentPassword))) {
      return res.status(400).json({ message: "Current password is incorrect." });
    }

    user.password = newPassword; // hashed by the pre-save hook
    await user.save();

    res.json({ message: "Password changed successfully." });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
