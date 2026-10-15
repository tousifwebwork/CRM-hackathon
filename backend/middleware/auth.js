const jwt = require("jsonwebtoken");
const User = require("../models/User");

// Verifies the Bearer token and attaches the user to req.user.
// The user ID always comes from the verified token, never from the request body.
const protect = async (req, res, next) => {
  try {
    const header = req.headers.authorization || "";
    const [scheme, token] = header.split(" ");

    if (scheme !== "Bearer" || !token) {
      return res.status(401).json({ message: "Not authorized. Please log in." });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      const message = err.name === "TokenExpiredError" ? "Session expired. Please log in again." : "Invalid token. Please log in again.";
      return res.status(401).json({ message });
    }

    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ message: "This account no longer exists." });
    }

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
};

module.exports = { protect };
