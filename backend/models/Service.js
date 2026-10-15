const mongoose = require("mongoose");

const serviceSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, "Service name is required."], trim: true, maxlength: 100 },
    description: { type: String, trim: true, default: "", maxlength: 1000 },
    price: {
      type: Number,
      required: [true, "Price is required."],
      min: [0, "Price cannot be negative."],
    },
    status: {
      type: String,
      enum: { values: ["Active", "Inactive"], message: "Status must be Active or Inactive." },
      default: "Active",
    },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (doc, ret) => {
        delete ret.owner;
        delete ret.__v;
        return ret;
      },
    },
  }
);

module.exports = mongoose.model("Service", serviceSchema);
