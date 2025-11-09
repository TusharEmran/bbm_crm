import mongoose from "mongoose";

const showroomCustomerSchema = new mongoose.Schema(
  {
    customerName: { type: String, required: true, trim: true },
    phoneNumber: { type: String, required: true, trim: true },
    category: { type: String, required: true, trim: true },
    showroomBranch: { type: String, required: true, trim: true },
    status: { type: String, enum: ["Interested", "Not Interested", "Follow-up"], default: "Interested" },
    notes: { type: String, default: "" },
  },
  { timestamps: true }
);

export const ShowroomCustomer = mongoose.model("ShowroomCustomer", showroomCustomerSchema);

