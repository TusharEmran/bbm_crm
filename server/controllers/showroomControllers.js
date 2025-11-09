import { sendSMS } from "../services/smsService.js";
import mongoose from "mongoose";
import { Settings } from "../models/settingsModel.js";
import { ShowroomCustomer } from "../models/showroomCustomerModel.js";
import { Showroom } from "../models/showroomModel.js";

function normalizeBdPhone(number) {
  if (!number) return number;
  const digits = ("" + number).replace(/\D+/g, "");
  if (digits.startsWith("880")) return digits;
  if (digits.startsWith("01")) return "88" + digits; 
  if (digits.startsWith("1")) return "880" + digits; 
  if (digits.startsWith("0")) return "88" + digits.slice(0); 
  return digits;
}

export const createShowroomCustomer = async (req, res) => {
  try {
    const { customerName, phoneNumber, category, showroomBranch } = req.body || {};
    if (!customerName || !phoneNumber || !category || !showroomBranch) {
      return res.status(400).json({ message: "customerName, phoneNumber, category, showroomBranch are required" });
    }

    const s = (await Settings.findOne({})) || {};
    const feedbackBase = s.feedbackUrl || process.env.FEEDBACK_URL || "http://localhost:3000/user/feedback";
    const provider = s.smsProvider || process.env.SMS_PROVIDER;
    const apiKey = s.smsApiKey || process.env.SMS_API_KEY;
    const senderId = s.smsSenderId || process.env.SMS_SENDER_ID;

    const msg = `Dear Sir/Madam, thank you for visiting ${showroomBranch}. You showed interest in ${category}. Please share your feedback here: ${feedbackBase}`;

    const to = normalizeBdPhone(phoneNumber);
    const smsResult = await sendSMS(to, msg, { provider, apiKey, senderId });

    const saved = await ShowroomCustomer.create({
      customerName,
      phoneNumber,
      category,
      showroomBranch,

    });

    return res.status(201).json({
      message: "Customer recorded and SMS sent",
      sms: smsResult,
      customer: {
        id: saved._id.toString(),
        customerName: saved.customerName,
        phoneNumber: saved.phoneNumber,
        category: saved.category,
        showroomBranch: saved.showroomBranch,
        status: saved.status,
        notes: saved.notes,
        createdAt: saved.createdAt,
      },
    });
  } catch (err) {
    console.error("createShowroomCustomer error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

export const listShowroomCustomers = async (req, res) => {
  try {
    const { page, limit, showroom, date } = req.query || {};
    const q = {};
    if (showroom) q.showroomBranch = String(showroom);
    if (date) {

      const start = new Date(String(date));
      const end = new Date(start);
      end.setDate(start.getDate() + 1);
      q.createdAt = { $gte: start, $lt: end };
    }

    const p = page ? Math.max(parseInt(String(page), 10) || 1, 1) : undefined;
    const l = limit ? Math.min(Math.max(parseInt(String(limit), 10) || 20, 1), 100) : undefined;

    if (p && l) {
      const skip = (p - 1) * l;
      const [total, docs] = await Promise.all([
        ShowroomCustomer.countDocuments(q),
        ShowroomCustomer.find(q).sort({ createdAt: -1 }).skip(skip).limit(l),
      ]);
      const customers = docs.map((d) => ({
        id: d._id.toString(),
        customerName: d.customerName,
        phoneNumber: d.phoneNumber,
        category: d.category,
        showroomBranch: d.showroomBranch,
        status: d.status,
        notes: d.notes,
        createdAt: d.createdAt,
      }));
      res.set("Cache-Control", "private, max-age=15");
      return res.status(200).json({ customers, page: p, limit: l, total });
    }

    const docs = await ShowroomCustomer.find(q).sort({ createdAt: -1 });
    const customers = docs.map((d) => ({
      id: d._id.toString(),
      customerName: d.customerName,
      phoneNumber: d.phoneNumber,
      category: d.category,
      showroomBranch: d.showroomBranch,
      status: d.status,
      notes: d.notes,
      createdAt: d.createdAt,
    }));
    res.set("Cache-Control", "private, max-age=15");
    return res.status(200).json({ customers });
  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
};

export const updateShowroomCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id || !mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid customer id" });
    }
    const { customerName, phoneNumber, category, status, notes } = req.body || {};
    const update = {};
    if (customerName) update.customerName = customerName;
    if (phoneNumber) update.phoneNumber = phoneNumber;
    if (category) update.category = category;
    if (status) update.status = status;
    if (notes !== undefined) update.notes = String(notes);
    const doc = await ShowroomCustomer.findByIdAndUpdate(id, update, { new: true });
    if (!doc) return res.status(404).json({ message: "Customer not found" });
    return res.status(200).json({
      customer: {
        id: doc._id.toString(),
        customerName: doc.customerName,
        phoneNumber: doc.phoneNumber,
        category: doc.category,
        showroomBranch: doc.showroomBranch,
        status: doc.status,
        notes: doc.notes,
        createdAt: doc.createdAt,
      },
    });
  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
};

export const deleteShowroomCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await ShowroomCustomer.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ message: "Not found" });
    return res.status(200).json({ message: "Deleted" });
  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
};

export const getShowroomCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id || !id.match(/^[a-fA-F0-9]{24}$/)) {
      return res.status(400).json({ message: "Invalid customer id" });
    }
    const doc = await ShowroomCustomer.findById(id);
    if (!doc) return res.status(404).json({ message: "Customer not found" });
    return res.status(200).json({
      customer: {
        id: doc._id.toString(),
        customerName: doc.customerName,
        phoneNumber: doc.phoneNumber,
        category: doc.category,
        showroomBranch: doc.showroomBranch,
        status: doc.status,
        notes: doc.notes,
        createdAt: doc.createdAt,
      },
    });
  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
};

export const listShowroomsPublic = async (req, res) => {
  try {
    const docs = await Showroom.find({ active: true }).sort({ name: 1 });
    const items = docs.map((d) => ({ id: d._id.toString(), name: d.name }));
    res.set("Cache-Control", "public, max-age=300, s-maxage=300, stale-while-revalidate=60");
    return res.status(200).json({ showrooms: items });
  } catch (e) {
    return res.status(500).json({ message: "Server error" });
  }
};

export const listShowrooms = async (req, res) => {
  try {
    const docs = await Showroom.find({}).sort({ name: 1 });
    const items = docs.map((d) => ({ id: d._id.toString(), name: d.name, active: d.active, createdAt: d.createdAt }));
    res.set("Cache-Control", "private, max-age=30");
    return res.status(200).json({ showrooms: items });
  } catch (e) {
    return res.status(500).json({ message: "Server error" });
  }
};

export const createShowroom = async (req, res) => {
  try {
    const { name, active } = req.body || {};
    if (!name || !String(name).trim()) return res.status(400).json({ message: "name is required" });
    const exists = await Showroom.findOne({ name: String(name).trim() });
    if (exists) return res.status(409).json({ message: "Showroom already exists" });
    const doc = await Showroom.create({ name: String(name).trim(), active: active !== undefined ? !!active : true });
    return res.status(201).json({ showroom: { id: doc._id.toString(), name: doc.name, active: doc.active } });
  } catch (e) {
    return res.status(500).json({ message: "Server error" });
  }
};

export const updateShowroom = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, active } = req.body || {};
    const update = {};
    if (name !== undefined) update.name = String(name).trim();
    if (active !== undefined) update.active = !!active;
    const doc = await Showroom.findByIdAndUpdate(id, update, { new: true });
    if (!doc) return res.status(404).json({ message: "Not found" });
    return res.status(200).json({ showroom: { id: doc._id.toString(), name: doc.name, active: doc.active } });
  } catch (e) {
    return res.status(500).json({ message: "Server error" });
  }
};

export const deleteShowroom = async (req, res) => {
  try {
    const { id } = req.params;
    const del = await Showroom.findByIdAndDelete(id);
    if (!del) return res.status(404).json({ message: "Not found" });
    return res.status(200).json({ message: "Deleted" });
  } catch (e) {
    return res.status(500).json({ message: "Server error" });
  }
};

