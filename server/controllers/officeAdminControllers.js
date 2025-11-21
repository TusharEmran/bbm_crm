import { OfficeAdminDaily } from "../models/officeAdminDailyModel.js";
import { ShowroomCustomer } from "../models/showroomCustomerModel.js";

const yyyymmdd = (d) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  const iso = x.toISOString();
  return iso.slice(0, 10);
};

// Fixed timezone for showroom stats: GMT+6 (Asia/Dhaka)
const TZ_OFFSET_MIN = 6 * 60; // +06:00

// Given a Date (or timestamp), compute the UTC start/end that correspond to
// the local (GMT+6) calendar day boundaries 00:00 to next 00:00
function getUtcRangeForLocalDay(refDate) {
  const now = new Date(refDate);
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60000; // to UTC ms
  const localMs = utcMs + TZ_OFFSET_MIN * 60000; // shift to GMT+6 local ms
  const local = new Date(localMs);
  const y = local.getFullYear();
  const m = local.getMonth();
  const d = local.getDate();
  // Build UTC moments that align with local midnight boundaries
  const startUtc = new Date(Date.UTC(y, m, d, 0, 0, 0, 0) - TZ_OFFSET_MIN * 60000);
  const endUtc = new Date(Date.UTC(y, m, d + 1, 0, 0, 0, 0) - TZ_OFFSET_MIN * 60000);
  return { startUtc, endUtc, localY: y, localM: m + 1, localD: d };
}

// Parse YYYY-MM-DD as a date in GMT+6 local time, then return the UTC range
// that covers that entire local day.
function parseLocalDateRange(str) {
  const parts = String(str).split("-");
  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  const d = parseInt(parts[2], 10);
  if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
    const startLocalUtc = Date.UTC(y, m - 1, d, 0, 0, 0, 0) - TZ_OFFSET_MIN * 60000;
    const endLocalUtc = Date.UTC(y, m - 1, d + 1, 0, 0, 0, 0) - TZ_OFFSET_MIN * 60000;
    return { startUtc: new Date(startLocalUtc), endUtc: new Date(endLocalUtc) };
  }
  // Fallback: treat as reference date
  return getUtcRangeForLocalDay(str);
}

// Helper to build a local (GMT+6) YYYY-MM-DD key for a given reference date
function localDayKey(refDate) {
  const { startUtc } = getUtcRangeForLocalDay(refDate);
  const shifted = new Date(startUtc.getTime() + TZ_OFFSET_MIN * 60000);
  return shifted.toISOString().slice(0, 10);
}

// Public (authenticated) range stats for showroom users: returns days with ratioPercent
export const getShowroomRangeStatsPublic = async (req, res) => {
  try {
    const fromStr = (req.query.from || yyyymmdd(Date.now())).toString();
    const toStr = (req.query.to || fromStr).toString();
    const showroom = (req.query.showroom || "").toString();

    // Interpret date strings in GMT+6 and convert to UTC boundaries
    const fromRange = parseLocalDateRange(fromStr);
    const toRange = parseLocalDateRange(toStr);
    const from = fromRange.startUtc;
    const toExclusive = toRange.endUtc;

    // Aggregate showroom customers per day (unique phones), optional showroom filter
    const matchShowroom = { createdAt: { $gte: from, $lt: toExclusive } };
    if (showroom) (matchShowroom).showroomBranch = showroom;
    const showroomAgg = await ShowroomCustomer.aggregate([
      { $match: matchShowroom },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: "+06:00" } },
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

    // Read office-admin entered counts for date range, optionally per showroom, summed across all office admins
    const adminFind = { date: { $gte: fromStr, $lte: toStr } };
    if (showroom) (adminFind).showroom = showroom;
    const adminDocs = await OfficeAdminDaily.find(adminFind).select("date count showroom");

    const byDate = new Map();
    for (const r of showroomAgg) {
      byDate.set(r.date, { date: r.date, showroom: Number(r.showroom || 0), admin: 0, ratioPercent: 0 });
    }
    for (const d of adminDocs) {
      const key = (d.date || '').toString();
      const prev = byDate.get(key) || { date: key, showroom: 0, admin: 0, ratioPercent: 0 };
      prev.admin = Number(prev.admin || 0) + Number(d.count || 0);
      byDate.set(key, prev);
    }

    // Fill missing days in range (iterate local days in GMT+6)
    const cursor = new Date(from);
    const end = new Date(toExclusive);
    const days = [];
    while (cursor < end) {
      // Build key in GMT+6
      const shifted = new Date(cursor.getTime() + TZ_OFFSET_MIN * 60000);
      const key = shifted.toISOString().slice(0, 10);
      const row = byDate.get(key) || { date: key, showroom: 0, admin: 0, ratioPercent: 0 };
      const admin = Number(row.admin || 0);
      const showroomCount = Number(row.showroom || 0);
      // Accuracy: Showroom Count / Admin Count * 100
      row.ratioPercent = admin > 0 ? Math.round((showroomCount / admin) * 100) : 0;
      days.push(row);
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }

    return res.status(200).json({ from: fromStr, to: toStr, showroom, days });
  } catch (e) {
    return res.status(500).json({ message: "Server error" });
  }
};

// Public (authenticated) today-stats for showroom users: no officeAdmin role required
// Computes today's showroom unique visitors vs admin-entered counts (summed across all office admins)
export const getShowroomTodayStatsPublic = async (req, res) => {
  try {
    // Compute today boundaries for GMT+6
    const { startUtc: from, endUtc: toExclusive } = getUtcRangeForLocalDay(Date.now());

    const showroom = (req.query.showroom || "").toString();

    // Unique showroom visitors today per showroom
    const matchShowroom = { createdAt: { $gte: from, $lt: toExclusive } };
    if (showroom) matchShowroom.showroomBranch = showroom;
    const showroomAgg = await ShowroomCustomer.aggregate([
      { $match: matchShowroom },
      {
        $group: {
          _id: "$showroomBranch",
          uniquePhones: { $addToSet: "$phoneNumber" },
        },
      },
      {
        $project: {
          _id: 0,
          showroom: "$_id",
          visitors: { $size: "$uniquePhones" },
        },
      },
    ]);

    // Sum admin-entered counts across all office admins for today, optionally filter by showroom
    // Build date string for today in GMT+6
    const localKey = new Date(from.getTime() + TZ_OFFSET_MIN * 60000).toISOString().slice(0, 10);
    const adminFind = { date: localKey };
    if (showroom) adminFind.showroom = showroom;
    const adminDocs = await OfficeAdminDaily.find(adminFind).select("showroom count");

    const adminByShowroom = new Map();
    for (const d of adminDocs) {
      const key = (d.showroom || "").toString();
      adminByShowroom.set(key, (adminByShowroom.get(key) || 0) + Number(d.count || 0));
    }

    // Build accuracy breakdown over union of keys (showrooms with visitors or admin input)
    const byVisitors = new Map();
    showroomAgg.forEach((r) => byVisitors.set(String(r.showroom || ""), Number(r.visitors || 0)));
    const allKeys = new Set([...byVisitors.keys(), ...adminByShowroom.keys()].map((k) => String(k || "")));

    const breakdown = [];
    let visitorsToday = 0;
    let adminToday = 0;
    for (const key of allKeys) {
      const v = Number(byVisitors.get(key) || 0);
      const a = Number(adminByShowroom.get(key) || 0);
      visitorsToday += v;
      adminToday += a;
      // Accuracy per showroom: Showroom Count / Admin Count * 100
      const accuracyPercent = a > 0 ? Math.round((v / a) * 100) : 0;
      breakdown.push({ showroom: key, accuracyPercent, visitors: v, admin: a });
    }

    // Overall accuracy: VisitorsToday / AdminToday * 100
    const ratioPercent = adminToday > 0 ? Math.round((visitorsToday / adminToday) * 100) : 0;
    return res.status(200).json({ showroom, visitorsToday, adminToday, ratioPercent, accuracyBreakdown: breakdown });
  } catch (e) {
    return res.status(500).json({ message: "Server error" });
  }
};

export const getOfficeAdminDailyStats = async (req, res) => {
  try {
    const officeAdminId = req.user?.id;
    if (!officeAdminId) return res.status(401).json({ message: "Unauthenticated" });

    const fromStr = (req.query.from || yyyymmdd(Date.now())).toString();
    const toStr = (req.query.to || fromStr).toString();
    const showroom = (req.query.showroom || "").toString();
    const from = new Date(fromStr);
    const toExclusive = new Date(toStr);
    toExclusive.setDate(toExclusive.getDate() + 1);

    // Aggregate showroom customers per day (unique phones), optional showroom filter
    const matchShowroom = { createdAt: { $gte: from, $lt: toExclusive } };
    if (showroom) (matchShowroom).showroomBranch = showroom;
    const showroomAgg = await ShowroomCustomer.aggregate([
      { $match: matchShowroom },
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

    // Read office admin entered counts in range, optional showroom filter
    const adminFind = { officeAdminId, date: { $gte: fromStr, $lte: toStr } };
    if (showroom) (adminFind).showroom = showroom;
    const adminDocs = await OfficeAdminDaily.find(adminFind).select("date count showroom");

    const byDate = new Map();
    for (const r of showroomAgg) {
      byDate.set(r.date, { date: r.date, showroom: Number(r.showroom || 0), admin: 0, ratioPercent: 0 });
    }
    for (const d of adminDocs) {
      const prev = byDate.get(d.date) || { date: d.date, showroom: 0, admin: 0, ratioPercent: 0 };
      // sum across showrooms for the same day (when no showroom filter)
      prev.admin = Number(prev.admin || 0) + Number(d.count || 0);
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
      // Accuracy: Showroom Count / Admin Count * 100
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
    // Use GMT+6 local day key for consistency with showroom stats
    const date = (req.query.date || localDayKey(Date.now())).toString();
    const showroom = (req.query.showroom || "").toString();
    if (!showroom) return res.status(200).json({ date, showroom: "", count: 0 });
    const doc = await OfficeAdminDaily.findOne({ officeAdminId, date, showroom });
    const count = doc?.count || 0;
    return res.status(200).json({ date, showroom, count });
  } catch (e) {
    return res.status(500).json({ message: "Server error" });
  }
};

export const upsertOfficeAdminDaily = async (req, res) => {
  try {
    const officeAdminId = req.user?.id;
    if (!officeAdminId) return res.status(401).json({ message: "Unauthenticated" });
    // Store date as GMT+6 local day key by default
    const date = (req.body?.date || localDayKey(Date.now())).toString();
    const showroom = (req.body?.showroom || "").toString();
    if (!showroom) return res.status(400).json({ message: "showroom is required" });
    const rawCount = req.body?.count;
    const count = Number(rawCount);
    if (!Number.isFinite(count) || count < 0) return res.status(400).json({ message: "Invalid count" });

    const doc = await OfficeAdminDaily.findOneAndUpdate(
      { officeAdminId, date, showroom },
      { $set: { count, showroom } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    return res.status(200).json({ date: doc.date, showroom: doc.showroom, count: doc.count });
  } catch (e) {
    if (e.code === 11000) return res.status(409).json({ message: "Duplicate" });
    return res.status(500).json({ message: "Server error" });
  }
};

export const getOfficeAdminTodayStats = async (req, res) => {
  try {
    const officeAdminId = req.user?.id;
    if (!officeAdminId) return res.status(401).json({ message: "Unauthenticated" });
    // Use GMT+6 local day and corresponding UTC range
    const date = localDayKey(Date.now());
    const { startUtc: start, endUtc: end } = getUtcRangeForLocalDay(Date.now());
    const showroom = (req.query.showroom || "").toString();

    const showroomMatch = { createdAt: { $gte: start, $lt: end } };
    if (showroom) (showroomMatch).showroomBranch = showroom;

    const [adminDocs, showroomGroup] = await Promise.all([
      // Sum across ALL office-admin entries for the org (not just current user)
      OfficeAdminDaily.find({ date, ...(showroom ? { showroom } : {}) }).select("count showroom"),
      // group showroom customers by showroomBranch for today
      ShowroomCustomer.aggregate([
        { $match: showroomMatch },
        { $group: { _id: "$showroomBranch", uniquePhones: { $addToSet: "$phoneNumber" } } },
        { $project: { _id: 1, visitors: { $size: "$uniquePhones" } } },
      ]),
    ]);

    const adminToday = adminDocs.reduce((s, d) => s + Number(d.count || 0), 0);
    const visitorsToday = showroomGroup.reduce((s, r) => s + Number(r.visitors || 0), 0);
    // Overall accuracy ratio: Showroom / Admin * 100
    const ratio = adminToday > 0 ? visitorsToday / adminToday : 0;
    const ratioPercent = adminToday > 0 ? Math.round((visitorsToday / adminToday) * 100) : 0;

    let breakdown = undefined;
    let accuracyBreakdown = undefined;
    if (!showroom) {
      const by = new Map();
      for (const d of adminDocs) {
        const key = (d.showroom || "").toString();
        by.set(key, (by.get(key) || 0) + Number(d.count || 0));
      }
      breakdown = Array.from(by.entries()).map(([name, count]) => ({ showroom: name, count }));

      // compute visitors per showroom and derive accuracy per showroom
      const visitorsBy = new Map();
      for (const r of showroomGroup) {
        const key = (r._id || "").toString();
        visitorsBy.set(key, Number(r.visitors || 0));
      }
      accuracyBreakdown = Array.from(new Set([...Array.from(by.keys()), ...Array.from(visitorsBy.keys())])).map((name) => {
        const adminCount = Number(by.get(name) || 0);
        const visitors = Number(visitorsBy.get(name) || 0);
        // Accuracy per showroom: Showroom Count / Admin Count * 100
        const acc = adminCount > 0 ? Math.round((visitors / adminCount) * 100) : 0;
        return { showroom: name, accuracyPercent: acc, visitors, admin: adminCount };
      });
    }

    return res.status(200).json({ date, showroom: showroom || "", visitorsToday, adminToday, ratio, ratioPercent, adminBreakdown: breakdown, accuracyBreakdown });
  } catch (e) {
    return res.status(500).json({ message: "Server error" });
  }
};
