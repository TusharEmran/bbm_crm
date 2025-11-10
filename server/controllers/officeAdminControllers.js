import { OfficeAdminDaily } from "../models/officeAdminDailyModel.js";
import { ShowroomCustomer } from "../models/showroomCustomerModel.js";

const yyyymmdd = (d) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  const iso = x.toISOString();
  return iso.slice(0, 10);
};

export const getOfficeAdminDailyStats = async (req, res) => {
  try {
    const officeAdminId = req.user?.id;
    if (!officeAdminId) return res.status(401).json({ message: "Unauthenticated" });

    const fromStr = (req.query.from || yyyymmdd(Date.now())).toString();
    const toStr = (req.query.to || fromStr).toString();
    const from = new Date(fromStr);
    const toExclusive = new Date(toStr);
    toExclusive.setDate(toExclusive.getDate() + 1);

    // Aggregate showroom customers per day (unique phones)
    const showroomAgg = await ShowroomCustomer.aggregate([
      { $match: { createdAt: { $gte: from, $lt: toExclusive } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          uniquePhones: { $addToSet: "$phoneNumber" },
        },
      },
      {
        $project: {
          _id: 0,
          date: "$_id",
          showroom: { $size: "$uniquePhones" },
        },
      },
    ]);

    // Read office admin entered counts in range
    const adminDocs = await OfficeAdminDaily.find({ officeAdminId, date: { $gte: fromStr, $lte: toStr } })
      .select("date count");

    const byDate = new Map();
    for (const r of showroomAgg) {
      byDate.set(r.date, { date: r.date, showroom: Number(r.showroom || 0), admin: 0, ratioPercent: 0 });
    }
    for (const d of adminDocs) {
      const prev = byDate.get(d.date) || { date: d.date, showroom: 0, admin: 0, ratioPercent: 0 };
      prev.admin = Number(d.count || 0);
      byDate.set(d.date, prev);
    }

    // Fill missing days with zeros
    const cursor = new Date(from);
    const end = new Date(toExclusive);
    const days = [];
    while (cursor < end) {
      const key = yyyymmdd(cursor);
      const row = byDate.get(key) || { date: key, showroom: 0, admin: 0, ratioPercent: 0 };
      const admin = Number(row.admin || 0);
      const showroom = Number(row.showroom || 0);
      row.ratioPercent = admin > 0 ? Math.round((showroom / admin) * 100) : 0;
      days.push(row);
      cursor.setDate(cursor.getDate() + 1);
    }

    const totalShowroom = days.reduce((s, d) => s + (Number(d.showroom) || 0), 0);
    return res.status(200).json({ from: fromStr, to: toStr, days, totalShowroom });
  } catch (e) {
    return res.status(500).json({ message: "Server error" });
  }
};

export const getOfficeAdminDaily = async (req, res) => {
  try {
    const officeAdminId = req.user?.id;
    if (!officeAdminId) return res.status(401).json({ message: "Unauthenticated" });
    const date = (req.query.date || yyyymmdd(Date.now())).toString();
    const doc = await OfficeAdminDaily.findOne({ officeAdminId, date });
    const count = doc?.count || 0;
    return res.status(200).json({ date, count });
  } catch (e) {
    return res.status(500).json({ message: "Server error" });
  }
};

export const upsertOfficeAdminDaily = async (req, res) => {
  try {
    const officeAdminId = req.user?.id;
    if (!officeAdminId) return res.status(401).json({ message: "Unauthenticated" });
    const date = (req.body?.date || yyyymmdd(Date.now())).toString();
    const rawCount = req.body?.count;
    const count = Number(rawCount);
    if (!Number.isFinite(count) || count < 0) return res.status(400).json({ message: "Invalid count" });

    const doc = await OfficeAdminDaily.findOneAndUpdate(
      { officeAdminId, date },
      { $set: { count } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    return res.status(200).json({ date: doc.date, count: doc.count });
  } catch (e) {
    if (e.code === 11000) return res.status(409).json({ message: "Duplicate" });
    return res.status(500).json({ message: "Server error" });
  }
};

export const getOfficeAdminTodayStats = async (req, res) => {
  try {
    const officeAdminId = req.user?.id;
    if (!officeAdminId) return res.status(401).json({ message: "Unauthenticated" });

    const date = yyyymmdd(Date.now());
    const start = new Date(date);
    const end = new Date(start);
    end.setDate(start.getDate() + 1);

    const [showroomToday, daily] = await Promise.all([
      ShowroomCustomer.countDocuments({ createdAt: { $gte: start, $lt: end } }),
      OfficeAdminDaily.findOne({ officeAdminId, date }),
    ]);

    const adminToday = daily?.count || 0;
    const ratio = adminToday > 0 ? showroomToday / adminToday : 0;
    const ratioPercent = adminToday > 0 ? Math.round((showroomToday / adminToday) * 100) : 0;

    return res.status(200).json({ date, showroomToday, adminToday, ratio, ratioPercent });
  } catch (e) {
    return res.status(500).json({ message: "Server error" });
  }
};
