require("dotenv").config();
const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");

const authRoutes = require("./routes/authRoutes");
const leadRoutes = require("./routes/leadRoutes");
const serviceRoutes = require("./routes/serviceRoutes");
const chatRoutes = require("./routes/chatRoutes");

// Fail fast if required settings are missing
["MONGODB_URI", "JWT_SECRET"].forEach((key) => {
  if (!process.env[key]) {
    console.error(`Missing ${key}. Copy .env.example to .env and fill it in.`);
    process.exit(1);
  }
});

const app = express();
const isProd = process.env.NODE_ENV === "production";
const allowedOrigins = new Set([
  "https://tww-crm.netlify.app",
  "http://localhost:5173",
  ...(process.env.CLIENT_URL || "").split(",").map((origin) => origin.trim()).filter(Boolean),
]);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.has(origin)) return callback(null, true);
    return callback(null, false);
  },
}));
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (req, res) => res.json({ status: "ok" }));
app.use("/api/auth", authRoutes);
app.use("/api/leads", leadRoutes);
app.use("/api/services", serviceRoutes);
app.use("/api/chat", chatRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
});

// Central error handler (must have 4 arguments)
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  let status = err.status || 500;
  let message = err.message || "Server error";

  if (err.name === "ValidationError") {
    status = 400;
    message = Object.values(err.errors).map((e) => e.message).join(" ");
  } else if (err.name === "CastError") {
    status = 400;
    message = "Invalid ID or value.";
  } else if (err.code === 11000) {
    status = 409;
    message = "A record with that value already exists.";
  } else if (err.type === "entity.parse.failed") {
    status = 400;
    message = "Invalid JSON in request body.";
  }

  if (status >= 500) {
    console.error(err);
    if (isProd) message = "Something went wrong on the server.";
  }

  const body = { message };
  if (!isProd && status >= 500) body.stack = err.stack;
  res.status(status).json(body);
});

const PORT = process.env.PORT || 5000;

connectDB()
  .then(() => app.listen(PORT, () => console.log(`Server running on port ${PORT}`)))
  .catch((err) => {
    console.error("MongoDB connection failed:", err.message);
    process.exit(1);
  });
