import mongoose from "mongoose";

const settingsSchema = new mongoose.Schema(
  {
    smsProvider: { type: String, enum: ["greenweb", "bulksmsbd", "smsnetbd"], default: "greenweb" },
    smsApiKey: { type: String, default: "" },
    smsSenderId: { type: String, default: "" },
    feedbackUrl: { type: String, default: "" },
  },
  { timestamps: true }
);

export const Settings = mongoose.model("Settings", settingsSchema);

