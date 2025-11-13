import mongoose from "mongoose";

const showroomCustomerSchema = new mongoose.Schema(
  {
    customerName: { type: String, required: true, trim: true },
    phoneNumber: { type: String, required: true, trim: true },
    category: { type: String, required: true, trim: true },
    showroomBranch: { type: String, required: true, trim: true },
    status: { type: String, enum: ["Interested", "Not Interested", "Follow-up"], default: "Interested" },
    // existing general notes field
    notes: { type: String, default: "" },

    // newly supported optional fields
    email: { type: String, trim: true, default: "" },
    division: { type: String, trim: true, default: "" },
    upazila: { type: String, trim: true, default: "" },
    interestLevel: { type: Number, min: 0, max: 5, default: 0 },
    randomCustomer: { type: String, default: "" },
    quotation: { type: String, default: "" },
    rememberNote: { type: String, default: "" },
    rememberDate: { type: Date, default: null },
    customerType: { type: String, enum: ["individual", "business"], default: "individual" },
    businessName: { type: String, trim: true, default: "" },
  },
  { timestamps: true }
);

export const ShowroomCustomer = mongoose.model("ShowroomCustomer", showroomCustomerSchema);

