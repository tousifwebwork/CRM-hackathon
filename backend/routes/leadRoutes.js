const express = require("express");
const mongoose = require("mongoose");
const Lead = require("../models/Lead");
const { protect } = require("../middleware/auth");

const router = express.Router();
router.use(protect); // every lead route requires a valid token

// Copy only allowed fields from the request body.
// The frontend sends "service"; the model stores it as "serviceOfInterest".
// Extra fields such as _id, owner, createdAt are ignored.
const pickLeadFields = (body) => {
  const data = {};
  ["name", "email", "phone", "company", "source", "status", "notes"].forEach((key) => {
    if (typeof body[key] === "string") data[key] = body[key];
  });
  if (typeof body.service === "string") data.serviceOfInterest = body.service;
  return data;
};

const checkId = (req, res, next) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ message: "Invalid lead ID." });
  }
  next();
};

// GET /api/leads
router.get("/", async (req, res, next) => {
  try {
    const leads = await Lead.find({ owner: req.user._id }).sort({ createdAt: -1 });
    res.json(leads);
  } catch (err) {
    next(err);
  }
});

// POST /api/leads
router.post("/", async (req, res, next) => {
  try {
    const lead = await Lead.create({ ...pickLeadFields(req.body), owner: req.user._id });
    res.status(201).json(lead);
  } catch (err) {
    next(err);
  }
});

// PUT /api/leads/:id
router.put("/:id", checkId, async (req, res, next) => {
  try {
    const lead = await Lead.findOneAndUpdate(
      { _id: req.params.id, owner: req.user._id }, // owner check blocks other users' records
      pickLeadFields(req.body),
      { new: true, runValidators: true }
    );
    if (!lead) return res.status(404).json({ message: "Lead not found." });
    res.json(lead);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/leads/:id
router.delete("/:id", checkId, async (req, res, next) => {
  try {
    const lead = await Lead.findOneAndDelete({ _id: req.params.id, owner: req.user._id });
    if (!lead) return res.status(404).json({ message: "Lead not found." });
    res.json({ message: "Lead deleted." });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
