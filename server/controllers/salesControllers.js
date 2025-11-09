import { Sale } from "../models/salesModel.js";

const startOfDay = (d) => { const x = new Date(d); x.setHours(0,0,0,0); return x; };

export const createSale = async (req, res) => {
  try {
    const { showroomBranch, amount, notes, date } = req.body || {};
    if (!showroomBranch || typeof amount !== 'number') {
      return res.status(400).json({ message: 'showroomBranch and numeric amount are required' });
    }
    const doc = new Sale({ showroomBranch, amount, notes: notes || '' });
    if (date) {
      const when = new Date(date);
      if (!isNaN(when.getTime())) {

        doc.createdAt = startOfDay(when);
      }
    }
    await doc.save();
    return res.status(201).json({ message: 'Sale recorded', sale: doc });
  } catch (e) {
    return res.status(500).json({ message: 'Server error' });
  }
};

export const listSales = async (req, res) => {
  try {
    const now = new Date();
    const end = req.query.to ? new Date(req.query.to) : new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const start = req.query.from ? new Date(req.query.from) : new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29);
    const showroom = (req.query.showroom || '').toString().trim();

    const match = { createdAt: { $gte: start, $lt: end } };
    if (showroom) match.showroomBranch = showroom;

    const items = await Sale.find(match).sort({ createdAt: -1 });
    return res.status(200).json({ items, from: start, to: end });
  } catch (e) {
    return res.status(500).json({ message: 'Server error' });
  }
};

