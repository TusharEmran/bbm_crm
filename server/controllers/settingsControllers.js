import { Settings } from "../models/settingsModel.js";

export const getMessageSettings = async (req, res) => {
  try {
    const s = await Settings.findOne({}) || new Settings({});
    console.log("[settings:get] settings=", {
      smsProvider: s.smsProvider,
      hasApiKey: Boolean(s.smsApiKey),
      smsSenderId: s.smsSenderId,
      feedbackUrl: s.feedbackUrl,
      _id: s._id?.toString?.()
    });
    return res.status(200).json({
      settings: {
        smsProvider: s.smsProvider || "greenweb",
        smsApiKey: s.smsApiKey || "",
        smsSenderId: s.smsSenderId || "",
        feedbackUrl: s.feedbackUrl || "",
      },
    });
  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
};

export const updateMessageSettings = async (req, res) => {
  try {
    const { smsProvider, smsApiKey, smsSenderId, feedbackUrl } = req.body || {};

    const allowedProviders = ["greenweb", "bulksmsbd", "smsnetbd"];
    if (smsProvider && !allowedProviders.includes(String(smsProvider).toLowerCase())) {
      return res.status(400).json({ message: "Invalid smsProvider" });
    }

    const update = {};
    if (smsProvider !== undefined) update.smsProvider = String(smsProvider).toLowerCase();
    if (smsApiKey !== undefined) update.smsApiKey = String(smsApiKey);
    if (smsSenderId !== undefined) update.smsSenderId = String(smsSenderId);
    if (feedbackUrl !== undefined) update.feedbackUrl = String(feedbackUrl);

    const s = await Settings.findOneAndUpdate({}, update, { upsert: true, new: true });
    console.log("[settings:put] update=", update, "=> stored=", {
      smsProvider: s.smsProvider,
      hasApiKey: Boolean(s.smsApiKey),
      smsSenderId: s.smsSenderId,
      feedbackUrl: s.feedbackUrl,
      _id: s._id?.toString?.()
    });
    return res.status(200).json({
      settings: {
        smsProvider: s.smsProvider || "greenweb",
        smsApiKey: s.smsApiKey || "",
        smsSenderId: s.smsSenderId || "",
        feedbackUrl: s.feedbackUrl || "",
      },
    });
  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
};

