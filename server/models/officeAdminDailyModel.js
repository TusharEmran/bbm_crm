import mongoose from "mongoose";

const officeAdminDailySchema = new mongoose.Schema(
  {
    officeAdminId: { type: mongoose.Schema.Types.ObjectId, ref: "Admin", required: true, index: true },
    date: { type: String, required: true, index: true }, // YYYY-MM-DD
    count: { type: Number, required: true, min: 0 },
  },
  { timestamps: true }
);

officeAdminDailySchema.index({ officeAdminId: 1, date: 1 }, { unique: true });

export const OfficeAdminDaily = mongoose.model("OfficeAdminDaily", officeAdminDailySchema);
