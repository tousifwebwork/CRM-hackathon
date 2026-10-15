const mongoose = require("mongoose");

const LEAD_STATUSES = ["New", "Contacted", "Qualified", "Converted", "Lost"];
const LEAD_SOURCES = ["Website", "Referral", "Social Media", "Email Campaign", "Cold Call", "Event", "Other"];

const leadSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, "Full name is required."], trim: true, maxlength: 100 },
    email: {
      type: String,
      required: [true, "Email is required."],
      trim: true,
      lowercase: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Enter a valid email address."],
    },
    phone: { type: String, trim: true, default: "", maxlength: 30 },
    company: { type: String, trim: true, default: "", maxlength: 100 },
    serviceOfInterest: { type: String, trim: true, default: "", maxlength: 100 },
    source: { type: String, enum: { values: LEAD_SOURCES, message: "Invalid lead source." }, default: "Other" },
    status: { type: String, enum: { values: LEAD_STATUSES, message: "Invalid lead status." }, default: "New" },
    notes: { type: String, trim: true, default: "", maxlength: 2000 },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  },
  {
    timestamps: true,
    toJSON: {
      // The frontend calls this field "service", so it is renamed in responses
      transform: (doc, ret) => {
        ret.service = ret.serviceOfInterest;
        delete ret.serviceOfInterest;
        delete ret.owner;
        delete ret.__v;
        return ret;
      },
    },
  }
);

module.exports = mongoose.model("Lead", leadSchema);
