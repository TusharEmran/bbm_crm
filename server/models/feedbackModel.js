import mongoose from "mongoose";

const feedbackSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    showroom: { type: String, default: "" },
    category: { type: String, default: "" },
    status: { type: String, enum: ["new", "reviewed", "resolved"], default: "new" },
  },
  { timestamps: true }
);

export const Feedback = mongoose.model("Feedback", feedbackSchema);

