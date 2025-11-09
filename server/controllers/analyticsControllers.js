import mongoose from "mongoose";
import { ShowroomCustomer } from "../models/showroomCustomerModel.js";
import { Feedback } from "../models/feedbackModel.js";
import { Showroom } from "../models/showroomModel.js";
import { Sale } from "../models/salesModel.js";

const startOfDay = (d) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

const addDays = (d, n) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};

const parseRange = (q) => {
  const now = new Date();

  const endDate = q?.end || q?.to;
  const startDate = q?.start || q?.from;

  const end = endDate ? new Date(endDate) : addDays(startOfDay(now), 1);
  const start = startDate ? new Date(startDate) : addDays(startOfDay(now), -29);

  return { start, end };
};

const escapeRegex = (s = "") => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const showroomSummary = async (req, res) => {
  try {
    const { start, end } = parseRange(req.query);
    const matchRange = { createdAt: { $gte: start, $lt: end } };

    const customerAgg = await ShowroomCustomer.aggregate([
      { $match: matchRange },
      {
        $group: {
          _id: "$showroomBranch",
          uniquePhones: { $addToSet: "$phoneNumber" },
          lastActivity: { $max: "$createdAt" },
        },
      },
      {
        $project: {
          showroom: "$_id",
          uniqueCustomers: { $size: "$uniquePhones" },
          lastActivity: 1,
          _id: 0,
        },
      },
    ]);

    const feedbackAgg = await Feedback.aggregate([
      { $match: matchRange },
      {
        $group: {
          _id: "$showroom",
          uniquePhones: { $addToSet: "$phone" },
        },
      },
      { $project: { showroom: "$_id", uniqueFeedbacks: { $size: "$uniquePhones" }, _id: 0 } },
    ]);

    const byShowroom = new Map();
    for (const c of customerAgg) {
      byShowroom.set(c.showroom || "", {
        showroom: c.showroom || "",
        uniqueCustomers: c.uniqueCustomers || 0,
        uniqueFeedbacks: 0,
        lastActivity: c.lastActivity || null,
      });
    }
    for (const f of feedbackAgg) {
      const prev = byShowroom.get(f.showroom || "") || {
        showroom: f.showroom || "",
        uniqueCustomers: 0,
        uniqueFeedbacks: 0,
        lastActivity: null,
      };
      prev.uniqueFeedbacks = f.uniqueFeedbacks || 0;
      byShowroom.set(f.showroom || "", prev);
    }


    const activeShowrooms = await Showroom.find({}).select("name status active");
    const activeSet = new Set(
      activeShowrooms
        .filter((s) => (s?.active === true) || !s?.status || s?.status === "Active")
        .map((s) => (s.name || "").toString())
    );

    const nowMs = Date.now();
    const items = Array.from(byShowroom.values())
      .filter((r) => activeSet.size === 0 || activeSet.has(r.showroom || ""))
      .map((r) => {
        const acc = r.uniqueCustomers > 0 ? Math.round((r.uniqueFeedbacks / r.uniqueCustomers) * 100) : 0;
        const status = r.lastActivity && nowMs - new Date(r.lastActivity).getTime() < 24 * 3600 * 1000 ? "Active" : "Inactive";
        const performance = acc; 
        return { ...r, accuracy: acc, performance, status };
      });

    const accVals = items.map((i) => Number(i.accuracy) || 0);
    const perfVals = items.map((i) => Number(i.performance) || 0);
    const avgAccuracy = accVals.length ? Math.round(accVals.reduce((a, b) => a + b, 0) / accVals.length) : 0;
    const avgPerformance = perfVals.length ? Math.round(perfVals.reduce((a, b) => a + b, 0) / perfVals.length) : 0;

    res.set("Cache-Control", "private, max-age=30");
    return res.status(200).json({ items, from: start, to: end, avgAccuracy, avgPerformance });
  } catch (e) {
    return res.status(500).json({ message: "Server error" });
  }
};

export const showroomReport = async (req, res) => {
  try {

    const { start, end } = parseRange(req.query);

    const showroomFilter = (req.query.showroom || "").toString().trim();
    const categoryFilter = (req.query.category || "").toString().trim();

    const matchCust = { createdAt: { $gte: start, $lt: end } };
    if (showroomFilter) matchCust.showroomBranch = { $regex: `^${escapeRegex(showroomFilter)}$`, $options: "i" };
    if (categoryFilter) matchCust.category = { $regex: `^${escapeRegex(categoryFilter)}$`, $options: "i" };

    const custGroupId = categoryFilter ? "$showroomBranch" : { showroom: "$showroomBranch", category: "$category" };


    const custAgg = await ShowroomCustomer.aggregate([
      {
        $match: matchCust
      },
      {
        $group: {
          _id: custGroupId,
          uniquePhones: { $addToSet: "$phoneNumber" },
          showroomName: { $first: "$showroomBranch" },
          categoryName: { $first: "$category" }
        },
      },
      {
        $project: {
          _id: 0,
          showroom: categoryFilter ? "$showroomName" : "$_id.showroom",
          category: categoryFilter ? "$categoryName" : { $ifNull: ["$_id.category", ""] },
          customerCount: { $size: "$uniquePhones" },
        },
      },
    ]);


    const matchFb = { createdAt: { $gte: start, $lt: end } };
    if (showroomFilter) matchFb.showroom = { $regex: `^${escapeRegex(showroomFilter)}$`, $options: "i" };
    if (categoryFilter) matchFb.category = { $regex: `^${escapeRegex(categoryFilter)}$`, $options: "i" };


    const fbGroupId = categoryFilter ? "$showroom" : { showroom: "$showroom", category: "$category" };
    const fbAgg = await Feedback.aggregate([
      { $match: matchFb },
      {
        $group: {
          _id: fbGroupId,
          uniquePhones: { $addToSet: "$phone" },
        },
      },
      {
        $project: {
          _id: 0,
          showroom: categoryFilter ? "$_id" : "$_id.showroom",
          category: categoryFilter ? (categoryFilter || "") : { $ifNull: ["$_id.category", ""] },
          feedbackCount: { $size: "$uniquePhones" },
        },
      },
    ]);

    const byKey = new Map();
    for (const c of custAgg) {
      const key = `${c.showroom}||${c.category || ""}`;
      byKey.set(key, { showroom: c.showroom || "", category: c.category || "", customers: c.customerCount || 0, feedbacks: 0 });
    }

    const activeShowrooms = await Showroom.find({}).select("name status active");
    const activeSet = new Set(
      activeShowrooms
        .filter((s) => (s?.active === true) || !s?.status || s?.status === "Active")
        .map((s) => (s.name || "").toString())
    );

    for (const f of fbAgg) {
      const prev = byKey.get(`${f.showroom}||${f.category || ""}`) || {
        showroom: f.showroom || "",
        category: f.category || "",
        customers: 0,
        feedbacks: 0,
      };
      prev.feedbacks = f.feedbackCount || 0;
      byKey.set(`${f.showroom}||${f.category || ""}`, prev);
    }

    const rows = Array.from(byKey.values()).filter((r) => activeSet.size === 0 || activeSet.has(r.showroom || ""));


    res.set("Cache-Control", "private, max-age=30");
    return res.status(200).json({ rows, from: start, to: end });
  } catch (e) {
    console.error('Analytics Error:', e);
    return res.status(500).json({ message: "Server error", details: e.message });
  }
};

export const showroomDaily = async (req, res) => {
  try {
    const { start, end } = parseRange(req.query);
    const showroomFilter = (req.query.showroom || "").toString().trim();

    const matchRange = { createdAt: { $gte: start, $lt: end } };
    if (showroomFilter) {
      matchRange.showroomBranch = showroomFilter;
    }

    const dailyCust = await ShowroomCustomer.aggregate([
      { $match: matchRange },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          uniquePhones: { $addToSet: "$phoneNumber" },
        },
      },
      { $project: { day: "$_id", visitors: { $size: "$uniquePhones" }, _id: 0 } },
      { $sort: { day: 1 } },
    ]);

    const matchFb = { createdAt: { $gte: start, $lt: end } };
    if (showroomFilter) {
      matchFb.showroom = showroomFilter;
    }

    const dailyFb = await Feedback.aggregate([
      { $match: matchFb },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          uniquePhones: { $addToSet: "$phone" },
        },
      },
      { $project: { day: "$_id", feedbacks: { $size: "$uniquePhones" }, _id: 0 } },
      { $sort: { day: 1 } },
    ]);

    const matchSales = { createdAt: { $gte: start, $lt: end } };
    if (showroomFilter) {
      matchSales.showroomBranch = showroomFilter;
    }
    const dailySales = await Sale.aggregate([
      { $match: matchSales },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          totalAmount: { $sum: "$amount" },
        },
      },
      { $project: { day: "$_id", sales: "$totalAmount", _id: 0 } },
      { $sort: { day: 1 } },
    ]);

    const dayMap = new Map();
    dailyCust.forEach((d) => {
      dayMap.set(d.day, { day: d.day, visitors: d.visitors || 0, feedbacks: 0, accuracy: 0, performance: 0, sales: 0 });
    });
    dailyFb.forEach((d) => {
      const existing = dayMap.get(d.day) || { day: d.day, visitors: 0, feedbacks: 0, accuracy: 0, performance: 0, sales: 0 };
      existing.feedbacks = d.feedbacks || 0;
      dayMap.set(d.day, existing);
    });
    dailySales.forEach((d) => {
      const existing = dayMap.get(d.day) || { day: d.day, visitors: 0, feedbacks: 0, accuracy: 0, performance: 0, sales: 0 };
      existing.sales = Number(d.sales || 0);
      dayMap.set(d.day, existing);
    });

    const days = Array.from(dayMap.values()).map((d) => {
      const accuracy = d.visitors > 0 ? Math.round((d.feedbacks / d.visitors) * 100) : 0;
      const performance = accuracy; 
      return {
        day: d.day,
        visitors: d.visitors,
        accuracy,
        performance,
        sales: Number(d.sales || 0),
      };
    });

    const totalVisitors = days.reduce((sum, d) => sum + d.visitors, 0);
    const accVals = days.map((d) => d.accuracy).filter((v) => v > 0);
    const perfVals = days.map((d) => d.performance).filter((v) => v > 0);
    const avgAccuracy = accVals.length > 0 ? Math.round(accVals.reduce((a, b) => a + b, 0) / accVals.length) : 0;
    const avgPerformance = perfVals.length > 0 ? Math.round(perfVals.reduce((a, b) => a + b, 0) / perfVals.length) : 0;

    res.set("Cache-Control", "private, max-age=30");
    return res.status(200).json({
      days,
      totalVisitors,
      avgAccuracy,
      avgPerformance,
      from: start,
      to: end,
    });
  } catch (e) {
    console.error("showroomDaily error:", e);
    return res.status(500).json({ message: "Server error" });
  }
};


