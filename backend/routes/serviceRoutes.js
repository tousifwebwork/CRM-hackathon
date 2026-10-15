const express = require("express");
const mongoose = require("mongoose");
const Service = require("../models/Service");
const { protect } = require("../middleware/auth");

const router = express.Router();
router.use(protect); // every service route requires a valid token

// Copy only allowed fields from the request body
const pickServiceFields = (body) => {
  const data = {};
  ["name", "description", "status"].forEach((key) => {
    if (typeof body[key] === "string") data[key] = body[key];
  });
  if (body.price !== undefined && body.price !== "" && body.price !== null) {
    data.price = Number(body.price); // NaN fails Mongoose number validation with a 400
  }
  return data;
};

const checkId = (req, res, next) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ message: "Invalid service ID." });
  }
  next();
};

// GET /api/services
router.get("/", async (req, res, next) => {
  try {
    const services = await Service.find({ owner: req.user._id }).sort({ createdAt: -1 });
    res.json(services);
  } catch (err) {
    next(err);
  }
});

// POST /api/services
router.post("/", async (req, res, next) => {
  try {
    const service = await Service.create({ ...pickServiceFields(req.body), owner: req.user._id });
    res.status(201).json(service);
  } catch (err) {
    next(err);
  }
});

// PUT /api/services/:id
router.put("/:id", checkId, async (req, res, next) => {
  try {
    const service = await Service.findOneAndUpdate(
      { _id: req.params.id, owner: req.user._id },
      pickServiceFields(req.body),
      { new: true, runValidators: true }
    );
    if (!service) return res.status(404).json({ message: "Service not found." });
    res.json(service);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/services/:id
router.delete("/:id", checkId, async (req, res, next) => {
  try {
    const service = await Service.findOneAndDelete({ _id: req.params.id, owner: req.user._id });
    if (!service) return res.status(404).json({ message: "Service not found." });
    res.json({ message: "Service deleted." });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
