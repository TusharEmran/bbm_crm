"use client";

import React, { useState, useMemo, useEffect } from "react";
import { Edit2, Trash2, X, Save, Calendar, Eye, EyeOff } from "lucide-react";
import Toast from "@/components/Toast";

interface Customer {
  id: string;
  name: string;
  phone: string;
  category: string;
  visitDate: string;
  createdAt: string;
  feedbackStatus: "Received" | "Pending" | "No Feedback";
  visitCount?: number;
  email?: string;
  division?: string;
  zila?: string;
  interestLevel?: number;
  customerType?: string;
  businessName?: string;
  quotation?: string;
  rememberNote?: string;
  rememberDate?: string;
  notes?: string;
  randomCustomer?: string;
  showroom?: string;
  sellNote?: string;
}

interface EditingCustomer {
  id: string;
  name: string;
  phone: string;
  category: string;
}

const formatVisitTime = (iso: string): string => {
  try {
    const d = new Date(iso);
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    return `${hh}:${mm}`;
  } catch {
    return iso;
  }
};

const getFeedbackStatusColor = (status: string): string => {
  switch (status) {
    case "Received":
      return "bg-emerald-50 text-emerald-700 border border-emerald-200";
    case "Pending":
      return "bg-amber-50 text-amber-700 border border-amber-200";
    case "No Feedback":
      return "bg-slate-50 text-slate-700 border border-slate-200";
    default:
      return "bg-slate-50 text-slate-700 border border-slate-200";
  }
};

export default function CustomerListPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingData, setEditingData] = useState<EditingCustomer | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState("");
  const [showToast, setShowToast] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
  const [categories, setCategories] = useState<string[]>([]);
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [detailsOpen, setDetailsOpen] = useState<Record<string, boolean>>({});
  const [noteFilter, setNoteFilter] = useState<"all" | "quotation" | "random" | "call">("all");
  const [dateFilter, setDateFilter] = useState<
    "all" | "today" | "yesterday" | "7" | "30"
  >("all");
  const [showroomFilter, setShowroomFilter] = useState<string>("all");
  const [visitSort, setVisitSort] = useState<"none" | "asc" | "desc">("none");

  const show = (msg: string) => {
    setToastMessage(msg);
    setShowToast(true);
  };

  const normalizePhone = (p: string): string => {
    const digits = (p || "").replace(/\D+/g, "");
    if (digits.length >= 10) return digits.slice(-10);
    return digits;
  };

  const maskPhone = (p: string): string => {
    const digits = (p || "").replace(/\D+/g, "");
    if (!digits) return "••••••••••";
    const last2 = digits.slice(-2);
    return `••••••••${last2}`;
  };

  const isWithinHours = (iso: string, hours: number): boolean => {
    try {
      const d = new Date(iso).getTime();
      const now = Date.now();
      return now - d <= hours * 60 * 60 * 1000;
    } catch {
      return false;
    }
  };

  const fmtDate = (iso?: string): string => {
    if (!iso) return "";
    try {
      return new Date(iso).toISOString().slice(0, 10);
    } catch {
      return iso;
    }
  };

  const loadCustomers = async () => {
    try {
      const token =
        typeof window !== "undefined" ? localStorage.getItem("token") : null;
      if (!token) return show("আপনি লগইন করেননি");

      // Fetch all showroom customers (no date filter) with a reasonable limit
      const [custRes, fbRes] = await Promise.all([
        fetch(`${baseUrl}/api/user/showroom/customers?limit=1000`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${baseUrl}/api/user/feedbacks?page=1&limit=1000`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (!custRes.ok) throw new Error("এন্ট্রি লোড করা যায়নি");
      if (fbRes.status === 401) {
        try {
          await fetch(`${baseUrl}/api/user/logout`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          });
        } catch {}
        if (typeof window !== "undefined") localStorage.removeItem("token");
        return;
      }

      const [custData, fbData] = await Promise.all([
        custRes.json(),
        fbRes.ok ? fbRes.json() : Promise.resolve({ feedbacks: [] }),
      ]);

      const fbPhones = new Set<string>(
        (fbData.feedbacks || []).map((f: any) => normalizePhone(f.phone || ""))
      );

      const mapped: Customer[] = (custData.customers || []).map((c: any) => {
        const hasFeedback = fbPhones.has(normalizePhone(c.phoneNumber));
        const status: "Received" | "Pending" | "No Feedback" = hasFeedback
          ? "Received"
          : isWithinHours(c.createdAt, 6)
          ? "Pending"
          : "No Feedback";

        return {
          id: String(c.id || c._id),
          name: c.customerName,
          phone: c.phoneNumber,
          category: c.category,
          visitDate: formatVisitTime(c.createdAt),
          createdAt: c.createdAt,
          feedbackStatus: status,
          email: c.email || "",
          division: c.division || "",
          zila: c.upazila || "",
          interestLevel:
            typeof c.interestLevel === "number" ? c.interestLevel : undefined,
          customerType: c.customerType || "",
          businessName: c.businessName || "",
          quotation: c.quotation || "",
          rememberNote: c.rememberNote || "",
          rememberDate: c.rememberDate || "",
          notes: c.note || c.notes || "",
          randomCustomer: c.randomCustomer || "",
          showroom: c.showroomBranch || "",
          sellNote: c.sellNote || "",
        };
      });

      // Compute visit count per normalized phone across all loaded customers
      const visitCounts = new Map<string, number>();
      mapped.forEach((cust) => {
        const key = normalizePhone(cust.phone);
        if (!key) return;
        visitCounts.set(key, (visitCounts.get(key) || 0) + 1);
      });

      const withCounts = mapped.map((cust) => {
        const key = normalizePhone(cust.phone);
        const count = key ? visitCounts.get(key) || 0 : 0;
        return { ...cust, visitCount: count };
      });

      setCustomers(withCounts);
    } catch (e: any) {
      show(e?.message || "এন্ট্রি লোড করতে সমস্যা হয়েছে");
    }
  };

  useEffect(() => {
    loadCustomers();
  }, []);

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const res = await fetch(`${baseUrl}/api/user/categories-public`);
        if (!res.ok) return;
        const data = await res.json();
        const names: string[] = (data.categories || []).map(
          (c: any) => c.name || c
        );
        setCategories(names);
      } catch {}
    };
    loadCategories();
  }, [baseUrl]);

  // Lock this page to the logged-in showroom admin's showroomName
  useEffect(() => {
    const loadCurrentShowroom = async () => {
      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        if (!token) return;
        const res = await fetch(`${baseUrl}/api/user/me`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store',
        });
        if (!res.ok) return;
        const js = await res.json();
        const showroomName = (js?.user?.showroomName || "").toString();
        const role = (js?.user?.role || "").toString().toLowerCase();
        if (showroomName && role === 'showroom') {
          setShowroomFilter(showroomName);
        }
      } catch {
        // ignore errors; page will just show unfiltered data
      }
    };
    loadCurrentShowroom();
  }, [baseUrl]);

  const filteredCustomers = useMemo(() => {
    const q = searchQuery.toLowerCase();

    // Precompute today's date at midnight for date range filtering
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const msPerDay = 24 * 60 * 60 * 1000;

    const filtered = customers.filter((customer) => {
      const matchesSearch =
        customer.name.toLowerCase().includes(q) ||
        customer.phone.includes(searchQuery) ||
        customer.category.toLowerCase().includes(q);

      if (!matchesSearch) return false;

      // Note type filter
      if (noteFilter === "quotation" && !customer.quotation) {
        return false;
      }
      if (noteFilter === "random" && !customer.randomCustomer) {
        return false;
      }
      if (noteFilter === "call" && !customer.notes) {
        return false;
      }

      // Date range filter based on createdAt
      if (dateFilter !== "all") {
        try {
          const created = new Date(customer.createdAt);
          created.setHours(0, 0, 0, 0);
          const diffDays = Math.floor(
            (today.getTime() - created.getTime()) / msPerDay
          );

          if (diffDays < 0) {
            // Future dates are not included in any range
            return false;
          }

          if (dateFilter === "today" && diffDays !== 0) return false;
          if (dateFilter === "yesterday" && diffDays !== 1) return false;
          if (dateFilter === "7" && diffDays > 6) return false; // last 7 days
          if (dateFilter === "30" && diffDays > 29) return false; // last 30 days
        } catch {
          // If date parsing fails, exclude when a specific range is selected
          return false;
        }
      }

      // Showroom filter
      if (showroomFilter !== "all") {
        if (!customer.showroom || customer.showroom !== showroomFilter) {
          return false;
        }
      }

      return true;
    });

    // Sort by visit count if requested
    if (visitSort === "none") return filtered;

    return [...filtered].sort((a, b) => {
      const av = a.visitCount || 0;
      const bv = b.visitCount || 0;
      if (visitSort === "asc") return av - bv;
      return bv - av;
    });
  }, [customers, searchQuery, noteFilter, dateFilter, showroomFilter, visitSort]);

  const showroomOptions = useMemo(() => {
    const set = new Set<string>();
    customers.forEach((c) => {
      if (c.showroom) set.add(c.showroom);
    });
    return Array.from(set).sort();
  }, [customers]);

  const handleEdit = (customer: Customer) => {
    setEditingId(customer.id);
    setEditingData({
      id: customer.id,
      name: customer.name,
      phone: customer.phone,
      category: customer.category,
    });
  };

  const handleEditFieldChange = (field: keyof EditingCustomer, value: string) => {
    if (editingData) {
      setEditingData({ ...editingData, [field]: value });
    }
  };

  const handleSaveEdit = async (id: string) => {
    if (!editingData) return;

    if (!editingData.name.trim()) {
      return show("কাস্টমারের নাম খালি রাখা যাবে না");
    }
    if (!editingData.phone.trim()) {
      return show("ফোন নম্বর খালি রাখা যাবে না");
    }
    if (!editingData.category) {
      return show("ক্যাটাগরি খালি রাখা যাবে না");
    }

    try {
      const token =
        typeof window !== "undefined" ? localStorage.getItem("token") : null;
      if (!token) return show("Not authenticated");

      const res = await fetch(`${baseUrl}/api/user/showroom/customers/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          customerName: editingData.name,
          phoneNumber: editingData.phone,
          category: editingData.category,
        }),
      });

      if (!res.ok) throw new Error("আপডেট করা যায়নি");
      const data = await res.json();
      const u = data.customer;
      setCustomers((prev) =>
        prev.map((c) =>
          c.id === id
            ? {
                ...c,
                name: u.customerName,
                phone: u.phoneNumber,
                category: u.category,
              }
            : c
        )
      );
      setEditingId(null);
      setEditingData(null);
      show("কাস্টমারের তথ্য সফলভাবে আপডেট হয়েছে!");
    } catch (e: any) {
      show(e?.message || "আপডেট ব্যর্থ হয়েছে");
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingData(null);
  };

  const handleSaveDetails = async (customer: Customer) => {
    try {
      const token =
        typeof window !== "undefined" ? localStorage.getItem("token") : null;
      if (!token) return show("Not authenticated");

      const res = await fetch(
        `${baseUrl}/api/user/showroom/customers/${customer.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            customerName: customer.name,
            phoneNumber: customer.phone,
            category: customer.category,
            email: customer.email,
            division: customer.division,
            upazila: customer.zila,
            interestLevel: customer.interestLevel,
            customerType: customer.customerType,
            businessName: customer.businessName,
            quotation: customer.quotation,
            rememberNote: customer.rememberNote,
            rememberDate: customer.rememberDate,
            randomCustomer: customer.randomCustomer,
            showroomBranch: customer.showroom,
            note: customer.notes,
            sellNote: customer.sellNote,
          }),
        }
      );

      if (!res.ok) throw new Error("ডিটেইলস আপডেট করা যায়নি");
      await res.json();
      show("ডিটেইলস সফলভাবে আপডেট হয়েছে!");
    } catch (e: any) {
      show(e?.message || "ডিটেইলস আপডেট করা যায়নি");
    }
  };

  const handleDeleteConfirm = async (id: string) => {
    try {
      const token =
        typeof window !== "undefined" ? localStorage.getItem("token") : null;
      if (!token) return show("Not authenticated");

      const res = await fetch(`${baseUrl}/api/user/showroom/customers/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error("মুছে ফেলা যায়নি");
      const customer = customers.find((c) => c.id === id);
      setCustomers((prev) => prev.filter((c) => c.id !== id));
      setDeleteConfirmId(null);
      show(`${customer?.name || "এন্ট্রি"} সফলভাবে মুছে ফেলা হয়েছে!`);
    } catch (e: any) {
      show(e?.message || "মুছে ফেলা ব্যর্থ হয়েছে");
    }
  };

  return (
    <div className="min-h-screen p-8 bg-white">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold text-slate-900 mb-2">
              শোরুম কাস্টমার তালিকা
            </h1>
            <p className="text-slate-600 text-lg">
              সব ভিজিটের কাস্টমার তথ্য দেখুন, ম্যানেজ ও আপডেট করুন
            </p>
          </div>
        </div>

        {/* Search + Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
            <div className="relative flex-1">
              <svg
                className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <input
                type="text"
                placeholder="নাম, ফোন বা ক্যাটাগরি দিয়ে খুঁজুন..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 transition text-slate-900 font-medium"
              />
            </div>

            <div className="w-full md:w-auto flex flex-col md:flex-row gap-4">
              <div className="w-full md:w-52">
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  নোট টাইপ ফিল্টার
                </label>
                <select
                  value={noteFilter}
                  onChange={(e) => setNoteFilter(e.target.value as any)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white text-slate-900 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  <option value="all">সব কাস্টমার</option>
                  <option value="quotation">কোটেশন কাস্টমার</option>
                  <option value="random">র‍্যান্ডম কাস্টমার</option>
                  <option value="call">কল কাস্টমার (সাধারণ নোট)</option>
                </select>
              </div>

              <div className="w-full md:w-48">
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  তারিখ ফিল্টার
                </label>
                <select
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value as any)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white text-slate-900 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  <option value="all">সব দিন</option>
                  <option value="today">আজ</option>
                  <option value="yesterday">গতকাল</option>
                  <option value="7">শেষ ৭ দিন</option>
                  <option value="30">শেষ ৩০ দিন</option>
                </select>
              </div>

              <div className="w-full md:w-56">
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  আপনার শোরুম
                </label>
                <div className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-900 text-sm font-semibold flex items-center">
                  {showroomFilter !== 'all' ? showroomFilter : 'শোরুম তথ্য পাওয়া যায়নি'}
                </div>
              </div>

              <div className="w-full md:w-52">
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  ভিজিট সংখ্যার ভিত্তিতে সাজান
                </label>
                <select
                  value={visitSort}
                  onChange={(e) => setVisitSort(e.target.value as any)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white text-slate-900 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  <option value="none">ডিফল্ট</option>
                  <option value="desc">বেশি ভিজিট প্রথমে</option>
                  <option value="asc">কম ভিজিট প্রথমে</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
          {/* Table Header */}
          <div className="p-8 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <Calendar className="w-6 h-6 text-slate-900" />
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  কাস্টমার এন্ট্রি তালিকা
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                  মোট {filteredCustomers.length} জন কাস্টমার
                </p>
              </div>
            </div>
          </div>

          {/* Table Body */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-8 py-4 text-left text-sm font-bold text-slate-900">
                    কাস্টমারের নাম
                  </th>
                  <th className="px-8 py-4 text-left text-sm font-bold text-slate-900">
                    ফোন
                  </th>
                  <th className="px-8 py-4 text-left text-sm font-bold text-slate-900">
                    ক্যাটাগরি
                  </th>
                  <th className="px-8 py-4 text-left text-sm font-bold text-slate-900">
                    ভিজিটের সময়
                  </th>
                  <th className="px-8 py-4 text-left text-sm font-bold text-slate-900">
                    মোট ভিজিট
                  </th>
                  <th className="px-8 py-4 text-left text-sm font-bold text-slate-900">
                    ফিডব্যাক স্ট্যাটাস
                  </th>
                  <th className="px-8 py-4 text-center text-sm font-bold text-slate-900">
                    অ্যাকশন
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.length > 0 ? (
                  filteredCustomers.map((customer, idx) => (
                    <React.Fragment key={customer.id}>
                      <tr
                        className={`border-b border-slate-100 hover:bg-slate-50 transition ${
                          idx === filteredCustomers.length - 1 && !detailsOpen[customer.id]
                            ? "border-b-0"
                            : ""
                        }`}
                      >
                        {/* Name */}
                        <td className="px-8 py-5 text-sm">
                          {editingId === customer.id && editingData ? (
                            <input
                              type="text"
                              value={editingData.name}
                              onChange={(e) =>
                                handleEditFieldChange("name", e.target.value)
                              }
                              className="w-full px-3 py-2 border border-blue-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 text-slate-900 font-semibold"
                            />
                          ) : (
                            <span className="font-semibold text-slate-900">
                              {customer.name}
                            </span>
                          )}
                        </td>

                        {/* Phone */}
                        <td className="px-8 py-5 text-sm">
                          {editingId === customer.id && editingData ? (
                            <input
                              type="tel"
                              value={editingData.phone}
                              onChange={(e) =>
                                handleEditFieldChange("phone", e.target.value)
                              }
                              className="w-full px-3 py-2 border border-blue-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 text-slate-900 font-medium"
                            />
                          ) : (
                            <div className="flex items-center gap-2 text-slate-600 font-medium">
                              <span className="font-mono tracking-wide">
                                {revealed[customer.id]
                                  ? customer.phone
                                  : maskPhone(customer.phone)}
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  setRevealed((prev) => ({
                                    ...prev,
                                    [customer.id]: !prev[customer.id],
                                  }))
                                }
                                className="p-1.5 rounded hover:bg-slate-100 border border-slate-200"
                                aria-label={
                                  revealed[customer.id]
                                    ? "ফোন লুকান"
                                    : "ফোন দেখুন"
                                }
                                title={
                                  revealed[customer.id]
                                    ? "ফোন লুকান"
                                    : "ফোন দেখুন"
                                }
                              >
                                {revealed[customer.id] ? (
                                  <EyeOff size={16} className="text-slate-700" />
                                ) : (
                                  <Eye size={16} className="text-slate-700" />
                                )}
                              </button>
                            </div>
                          )}
                        </td>

                        {/* Category */}
                        <td className="px-8 py-5 text-sm">
                          {editingId === customer.id && editingData ? (
                            <select
                              value={editingData.category}
                              onChange={(e) =>
                                handleEditFieldChange("category", e.target.value)
                              }
                              className="w-full px-3 py-2 border border-blue-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 bg-white text-slate-900 font-medium"
                            >
                              {categories.map((cat) => (
                                <option key={cat} value={cat}>
                                  {cat}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <span className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-xs font-bold inline-block">
                              {customer.category}
                            </span>
                          )}
                        </td>

                        {/* Visit time */}
                        <td className="px-8 py-5 text-sm text-slate-600 font-medium">
                          {customer.visitDate}
                        </td>

                        {/* Visit count */}
                        <td className="px-8 py-5 text-sm text-slate-700 font-semibold">
                          {customer.visitCount ?? 0}
                        </td>

                        {/* Feedback status */}
                        <td className="px-8 py-5 text-sm">
                          <span
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold ${getFeedbackStatusColor(
                              customer.feedbackStatus
                            )}`}
                          >
                            {customer.feedbackStatus}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="px-8 py-5 text-sm">
                          <div className="flex items-center justify-center gap-2">
                            {editingId === customer.id && editingData ? (
                              <>
                                <button
                                  onClick={() => handleSaveEdit(customer.id)}
                                  className="p-2 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 rounded-lg transition"
                                  title="পরিবর্তন সংরক্ষণ করুন"
                                >
                                  <Save size={18} />
                                </button>
                                <button
                                  onClick={handleCancelEdit}
                                  className="p-2 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-lg transition"
                                  title="এডিট বাতিল করুন"
                                >
                                  <X size={18} />
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() =>
                                    setDetailsOpen((prev) => ({
                                      ...prev,
                                      [customer.id]: !prev[customer.id],
                                    }))
                                  }
                                  className="p-2 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg transition"
                                  title={
                                    detailsOpen[customer.id]
                                      ? "বিস্তারিত লুকান"
                                      : "বিস্তারিত দেখুন"
                                  }
                                >
                                  {detailsOpen[customer.id] ? (
                                    <EyeOff size={18} />
                                  ) : (
                                    <Eye size={18} />
                                  )}
                                </button>
                                <button
                                  onClick={() => handleEdit(customer)}
                                  className="p-2 bg-blue-100 text-blue-600 hover:bg-blue-200 rounded-lg transition"
                                  title="কাস্টমার এডিট করুন"
                                >
                                  <Edit2 size={18} />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>

                      {/* Expanded details row - fully editable */}
                      {detailsOpen[customer.id] && (
                        <tr className="bg-slate-50 border-b border-slate-100">
                          <td className="px-8 py-5 text-sm" colSpan={7}>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-slate-700">
                              <div>
                                <div className="text-xs font-bold text-slate-500">
                                  ইমেইল
                                </div>
                                <input
                                  type="email"
                                  value={customer.email || ""}
                                  onChange={(e) =>
                                    setCustomers((prev) =>
                                      prev.map((c) =>
                                        c.id === customer.id
                                          ? { ...c, email: e.target.value }
                                          : c
                                      )
                                    )
                                  }
                                  className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 text-sm"
                                />
                              </div>
                              <div>
                                <div className="text-xs font-bold text-slate-500">
                                  বিভাগ
                                </div>
                                <input
                                  type="text"
                                  value={customer.division || ""}
                                  onChange={(e) =>
                                    setCustomers((prev) =>
                                      prev.map((c) =>
                                        c.id === customer.id
                                          ? { ...c, division: e.target.value }
                                          : c
                                      )
                                    )
                                  }
                                  className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 text-sm"
                                />
                              </div>
                              <div>
                                <div className="text-xs font-bold text-slate-500">
                                  জেলা
                                </div>
                                <input
                                  type="text"
                                  value={customer.zila || ""}
                                  onChange={(e) =>
                                    setCustomers((prev) =>
                                      prev.map((c) =>
                                        c.id === customer.id
                                          ? { ...c, zila: e.target.value }
                                          : c
                                      )
                                    )
                                  }
                                  className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 text-sm"
                                />
                              </div>
                              <div>
                                <div className="text-xs font-bold text-slate-500">
                                  আগ্রহের মাত্রা (০-৫)
                                </div>
                                <input
                                  type="number"
                                  min={0}
                                  max={5}
                                  value={
                                    typeof customer.interestLevel === "number"
                                      ? customer.interestLevel
                                      : ""
                                  }
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    const num = val === "" ? undefined : Number(val);
                                    setCustomers((prev) =>
                                      prev.map((c) =>
                                        c.id === customer.id
                                          ? { ...c, interestLevel: num as number | undefined }
                                          : c
                                      )
                                    );
                                  }}
                                  className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 text-sm"
                                />
                              </div>
                              <div>
                                <div className="text-xs font-bold text-slate-500">
                                  কাস্টমার টাইপ
                                </div>
                                <input
                                  type="text"
                                  value={customer.customerType || ""}
                                  onChange={(e) =>
                                    setCustomers((prev) =>
                                      prev.map((c) =>
                                        c.id === customer.id
                                          ? { ...c, customerType: e.target.value }
                                          : c
                                      )
                                    )
                                  }
                                  className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 text-sm"
                                />
                              </div>
                              <div>
                                <div className="text-xs font-bold text-slate-500">
                                  ব্যবসার নাম
                                </div>
                                <input
                                  type="text"
                                  value={customer.businessName || ""}
                                  onChange={(e) =>
                                    setCustomers((prev) =>
                                      prev.map((c) =>
                                        c.id === customer.id
                                          ? { ...c, businessName: e.target.value }
                                          : c
                                      )
                                    )
                                  }
                                  className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 text-sm"
                                />
                              </div>
                              <div>
                                <div className="text-xs font-bold text-slate-500">
                                  কোটেশন
                                </div>
                                <input
                                  type="text"
                                  value={customer.quotation || ""}
                                  onChange={(e) =>
                                    setCustomers((prev) =>
                                      prev.map((c) =>
                                        c.id === customer.id
                                          ? { ...c, quotation: e.target.value }
                                          : c
                                      )
                                    )
                                  }
                                  className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 text-sm"
                                />
                              </div>
                              <div>
                                <div className="text-xs font-bold text-slate-500">
                                  রিমাইন্ডারের তারিখ
                                </div>
                                <input
                                  type="date"
                                  value={fmtDate(customer.rememberDate) || ""}
                                  onChange={(e) =>
                                    setCustomers((prev) =>
                                      prev.map((c) =>
                                        c.id === customer.id
                                          ? { ...c, rememberDate: e.target.value }
                                          : c
                                      )
                                    )
                                  }
                                  className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 text-sm"
                                />
                              </div>
                              <div className="md:col-span-1">
                                <div className="text-xs font-bold text-slate-500">
                                  রিমাইন্ডার নোট
                                </div>
                                <textarea
                                  value={customer.rememberNote || ""}
                                  onChange={(e) =>
                                    setCustomers((prev) =>
                                      prev.map((c) =>
                                        c.id === customer.id
                                          ? { ...c, rememberNote: e.target.value }
                                          : c
                                      )
                                    )
                                  }
                                  className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 text-sm min-h-[60px]"
                                />
                              </div>
                              <div className="md:col-span-1">
                                <div className="text-xs font-bold text-slate-500">
                                  র‍্যান্ডম কাস্টমার নোট
                                </div>
                                <textarea
                                  value={customer.randomCustomer || ""}
                                  onChange={(e) =>
                                    setCustomers((prev) =>
                                      prev.map((c) =>
                                        c.id === customer.id
                                          ? { ...c, randomCustomer: e.target.value }
                                          : c
                                      )
                                    )
                                  }
                                  className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 text-sm min-h-[60px]"
                                />
                              </div>
                              <div className="md:col-span-1">
                                <div className="text-xs font-bold text-slate-500">
                                  সাধারণ নোট
                                </div>
                                <textarea
                                  value={customer.notes || ""}
                                  onChange={(e) =>
                                    setCustomers((prev) =>
                                      prev.map((c) =>
                                        c.id === customer.id
                                          ? { ...c, notes: e.target.value }
                                          : c
                                      )
                                    )
                                  }
                                  className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 text-sm min-h-[80px]"
                                />
                              </div>
                              <div className="md:col-span-1">
                                <div className="text-xs font-bold text-slate-500">
                                  সেল নোট / বিল নম্বর
                                </div>
                                <textarea
                                  value={customer.sellNote || ""}
                                  onChange={(e) =>
                                    setCustomers((prev) =>
                                      prev.map((c) =>
                                        c.id === customer.id
                                          ? { ...c, sellNote: e.target.value }
                                          : c
                                      )
                                    )
                                  }
                                  className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 text-sm min-h-[60px]"
                                />
                              </div>
                              <div>
                                <div className="text-xs font-bold text-slate-500">
                                  সব ভিজিটের তারিখ
                                </div>
                                <div className="font-medium text-sm text-slate-800 mt-1">
                                  {(() => {
                                    const key = normalizePhone(customer.phone);
                                    if (!key) return "-";
                                    const dates = customers
                                      .filter((c) => normalizePhone(c.phone) === key && c.createdAt)
                                      .map((c) => {
                                        const d = new Date(c.createdAt);
                                        return isNaN(d.getTime())
                                          ? String(c.createdAt)
                                          : d.toISOString().slice(0, 10);
                                      });
                                    if (!dates.length) return "-";
                                    const unique = Array.from(new Set(dates));
                                    return unique.map((d, idx) => `${idx + 1}. ${d}`).join(" | ");
                                  })()}
                                </div>
                              </div>
                              <div>
                                <div className="text-xs font-bold text-slate-500">
                                  শোরুম
                                </div>
                                <div className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-lg bg-slate-50 text-slate-900 text-sm">
                                  {customer.showroom || "-"}
                                </div>
                              </div>
                            </div>
                            <div className="mt-6 flex justify-end gap-2">
                              <button
                                type="button"
                                onClick={() =>
                                  setDetailsOpen((prev) => ({
                                    ...prev,
                                    [customer.id]: false,
                                  }))
                                }
                                className="px-4 py-2 bg-slate-200 text-slate-800 rounded-lg hover:bg-slate-300 text-sm font-semibold"
                              >
                                বন্ধ করুন
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSaveDetails(customer)}
                                className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm font-semibold"
                              >
                                সব ডিটেইলস সেভ করুন
                              </button>
                            </div>
                          </td>
                        </tr>
                      )}
                      {/* Delete confirm inline row */}
                      {deleteConfirmId === customer.id && (
                        <tr className="bg-red-50 border-b border-red-100">
                          <td className="px-8 py-4 text-sm" colSpan={7}>
                            <div className="flex items-center justify-between gap-4">
                              <p className="text-red-700 font-medium">
                                আপনি কি নিশ্চিত যে "{customer.name}" কাস্টমার এন্ট্রি
                                মুছে ফেলতে চান?
                              </p>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => setDeleteConfirmId(null)}
                                  className="px-4 py-2 bg-white text-slate-700 rounded-lg border border-slate-200 hover:bg-slate-100 text-sm font-semibold"
                                >
                                  বাতিল
                                </button>
                                <button
                                  onClick={() => handleDeleteConfirm(customer.id)}
                                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-semibold"
                                >
                                  হ্যাঁ, মুছে ফেলুন
                                </button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-8 py-12 text-center text-slate-500"
                    >
                      <p className="text-lg font-semibold">
                        কোনো কাস্টমার পাওয়া যায়নি
                      </p>
                      <p className="text-sm mt-2">
                        সার্চ পরিবর্তন করে দেখুন অথবা নতুন কাস্টমার যোগ করুন।
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Footer summary */}
          {filteredCustomers.length > 0 && (
            <div className="p-6 bg-slate-50 border-t border-slate-100 text-center">
              <p className="text-sm text-slate-600 font-medium">
                মোট <span className="font-bold text-slate-900">{customers.length}</span>{" "}
                কাস্টমারের মধ্যে দেখানো হচ্ছে{" "}
                <span className="font-bold text-slate-900">
                  {filteredCustomers.length}
                </span>
              </p>
            </div>
          )}
        </div>

        {/* Hint */}
        <div className="mt-10 bg-blue-50 border border-blue-200 rounded-xl p-6">
          <h3 className="text-sm font-bold text-blue-900 mb-2">পরামর্শ</h3>
          <p className="text-sm text-blue-800">
            কাস্টমারের তথ্য পরিবর্তন করতে এডিট আইকনে ক্লিক করুন। পরিবর্তনগুলো সাথে
            সাথে সংরক্ষিত হবে। প্রয়োজন না হলে ডিলিট বাটনে ক্লিক করে এন্ট্রি মুছে
            ফেলতে পারেন।
          </p>
        </div>
      </div>

      {/* Toast */}
      <Toast
        message={toastMessage}
        show={showToast}
        onClose={() => setShowToast(false)}
        duration={3000}
      />
    </div>
  );
}