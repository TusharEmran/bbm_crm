import { Feedback } from "../models/feedbackModel.js";

export const createFeedback = async (req, res) => {
  try {
    const { name, email, phone, message, showroom = "", category = "" } = req.body || {};
    if (!name || !email || !phone || !message) {
      return res.status(400).json({ message: "name, email, phone, message are required" });
    }

    const doc = await Feedback.create({ name, email, phone, message, showroom, category });
    return res.status(201).json({
      feedback: {
        id: doc._id.toString(),
        name: doc.name,
        email: doc.email,
        phone: doc.phone,
        message: doc.message,
        showroom: doc.showroom || "",
        category: doc.category || "",
        status: doc.status,
        createdAt: doc.createdAt,
      },
    });
  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
};

export const listFeedbacks = async (req, res) => {
  try {
    const pageRaw = req.query.page;
    const limitRaw = req.query.limit;
    const showroom = (req.query.showroom || "").toString().trim();
    const query = showroom ? { showroom } : {};

    if (pageRaw !== undefined || limitRaw !== undefined) {
      const page = Math.max(parseInt(String(pageRaw), 10) || 1, 1);
      const limit = Math.min(Math.max(parseInt(String(limitRaw), 10) || 20, 1), 100);
      const skip = (page - 1) * limit;
      const [total, docs] = await Promise.all([
        Feedback.countDocuments(query),
        Feedback.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
      ]);
      const feedbacks = docs.map((d) => ({
        id: d._id.toString(),
        name: d.name,
        email: d.email,
        phone: d.phone,
        message: d.message,
        showroom: d.showroom || "",
        category: d.category || "",
        status: d.status,
        createdAt: d.createdAt,
      }));
      res.set("Cache-Control", "private, max-age=30");
      return res.status(200).json({ feedbacks, page, limit, total });
    }

    const docs = await Feedback.find(query).sort({ createdAt: -1 });
    const feedbacks = docs.map((d) => ({
      id: d._id.toString(),
      name: d.name,
      email: d.email,
      phone: d.phone,
      message: d.message,
      showroom: d.showroom || "",
      category: d.category || "",
      status: d.status,
      createdAt: d.createdAt,
    }));
    res.set("Cache-Control", "private, max-age=30");
    return res.status(200).json({ feedbacks });
  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
};

export const updateFeedbackStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body || {};
    const allowed = ["new", "reviewed", "resolved"];
    if (!status || !allowed.includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }
    const updated = await Feedback.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );
    if (!updated) return res.status(404).json({ message: "Not found" });
    return res.status(200).json({
      feedback: {
        id: updated._id.toString(),
        name: updated.name,
        email: updated.email,
        phone: updated.phone,
        message: updated.message,
        showroom: updated.showroom || "",
        category: updated.category || "",
        status: updated.status,
        createdAt: updated.createdAt,
      },
    });
  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
};

export const deleteFeedback = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Feedback.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ message: "Not found" });
    return res.status(200).json({ message: "Deleted" });
  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
};

