import mongoose from "mongoose";

const adminSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    role: { type: String, enum: ["admin", "officeAdmin", "showroom"], default: "showroom" },
    status: { type: String, enum: ["Active", "Inactive", "Pending", "Suspend"], default: "Active" },
  },
  { timestamps: true }
);

export const Admin = mongoose.models.adminmodels || mongoose.model("adminmodels", adminSchema);


