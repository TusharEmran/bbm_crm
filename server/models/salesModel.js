import mongoose from "mongoose";

const salesSchema = new mongoose.Schema(
  {
    showroomBranch: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0 },
    notes: { type: String, default: "" },
  },
  { timestamps: true }
);

export const Sale = mongoose.model("Sale", salesSchema);

