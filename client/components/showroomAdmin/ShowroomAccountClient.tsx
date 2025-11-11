"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { Users, MessageSquare, TrendingUp, Plus, Calendar } from "lucide-react";
import Toast from "@/components/Toast";

export interface CustomerEntry {
  id: string;
  name: string;
  phone: string;
  interest: string;
  visitDate: string;
  feedbackStatus: "Received" | "Pending" | "No Feedback";
}

function getFeedbackStatusColor(status: string): string {
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
}

interface ShowroomAccountClientProps {
  initialTodayEntries: CustomerEntry[];
}

export default function ShowroomAccountClient({ initialTodayEntries }: ShowroomAccountClientProps) {
  const [todayEntries, setTodayEntries] = useState<CustomerEntry[]>(initialTodayEntries || []);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [showToast, setShowToast] = useState(false);
  const [formData, setFormData] = useState({ name: "", phone: "", interest: "" });

  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

  const formatVisitTime = (iso: string): string => {
    try {
      const d = new Date(iso);
      const hh = String(d.getHours()).padStart(2, '0');
      const mm = String(d.getMinutes()).padStart(2, '0');
      return `${hh}:${mm}`;
    } catch {
      return '';
    }
  };

  const normalizePhone = (p: string): string => {
    const digits = (p || '').replace(/\D+/g, '');
    if (digits.length >= 10) return digits.slice(-10);
    return digits;
  };

  const isToday = (iso: string): boolean => {
    try {
      const d = new Date(iso);
      const today = new Date();
      return d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth() && d.getDate() === today.getDate();
    } catch { return false; }
  };

  const isWithinHours = (iso: string, hours: number): boolean => {
    try {
      const d = new Date(iso).getTime();
      const now = Date.now();
      return now - d <= hours * 60 * 60 * 1000;
    } catch { return false; }
  };

  React.useEffect(() => {
    const load = async () => {
      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        if (!token) return;
        const [custRes, fbRes] = await Promise.all([
          fetch(`${baseUrl}/api/user/showroom/customers?limit=500`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${baseUrl}/api/user/feedbacks?page=1&limit=500`, { headers: { Authorization: `Bearer ${token}` } }),
        ]);
        if (fbRes.status === 401 || custRes.status === 401) {

          return;
        }
        if (!custRes.ok) throw new Error('Failed to load entries');
        const [custData, fbData] = await Promise.all([custRes.json(), fbRes.ok ? fbRes.json() : Promise.resolve({ feedbacks: [] })]);
        const fbPhones = new Set<string>((fbData.feedbacks || []).map((f: any) => normalizePhone(f.phone || '')));
        const items: CustomerEntry[] = (custData.customers || [])
          .filter((c: any) => isToday(c.createdAt))
          .map((c: any) => {
            const hasFeedback = fbPhones.has(normalizePhone(c.phoneNumber));
            const status: CustomerEntry["feedbackStatus"] = hasFeedback ? 'Received' : (isWithinHours(c.createdAt, 6) ? 'Pending' : 'No Feedback');
            return {
              id: String(c.id || c._id),
              name: c.customerName,
              phone: c.phoneNumber,
              interest: c.category,
              visitDate: formatVisitTime(c.createdAt),
              feedbackStatus: status,
            };
          });
        setTodayEntries(items);
      } catch (e: any) {
        setToastMessage(e?.message || 'Error loading dashboard');
        setShowToast(true);
      }
    };
    load();

  }, []);

  const stats = useMemo(() => {
    const feedbackReceived = todayEntries.filter((e) => e.feedbackStatus === "Received").length;
    const totalEntries = todayEntries.length;
    const performancePercent = totalEntries > 0 ? Math.round((feedbackReceived / totalEntries) * 100) : 0;
    return { todayEntries: totalEntries, feedbackReceived, performance: performancePercent };
  }, [todayEntries]);

  return (
    <div className="min-h-screen p-8 bg-white">
      <div className="max-w-7xl mx-auto">

        <div className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-1 md:mb-2">Welcome Back!</h1>
            <p className="text-slate-600 text-base md:text-lg">
              {new Date().toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>

          <Link
            href="/showroom-account/add-customer"
            className="w-full md:w-auto inline-flex justify-center items-center gap-2 px-4 py-2 md:px-6 md:py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl font-bold transition shadow-lg"
          >
            <Plus size={20} />
            Add New Customer
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">

          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-8 hover:shadow-md transition-shadow duration-300">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Today's Entries</p>
                <div className="flex items-baseline gap-3">
                  <p className="text-5xl font-bold text-slate-900">{stats.todayEntries}</p>
                  <span className="text-xs text-slate-400">customer visits</span>
                </div>
                <p className="text-xs text-slate-400 mt-4">Updated just now</p>
              </div>
              <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl">
                <Users className="w-8 h-8 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-8 hover:shadow-md transition-shadow duration-300">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Feedback Received</p>
                <div className="flex items-baseline gap-3">
                  <p className="text-5xl font-bold text-emerald-600">{stats.feedbackReceived}</p>
                  <span className="text-xs text-slate-400">
                    {stats.todayEntries > 0 ? Math.round((stats.feedbackReceived / stats.todayEntries) * 100) : 0}%
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-4">of total customers</p>
              </div>
              <div className="p-4 bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl">
                <MessageSquare className="w-8 h-8 text-emerald-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-8 hover:shadow-md transition-shadow duration-300">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Performance %</p>
                <div className="flex items-baseline gap-3">
                  <p className="text-5xl font-bold text-purple-600">{stats.performance}%</p>
                </div>
                <div className="mt-4 w-full bg-slate-200 rounded-full h-2">
                  <div className="h-2 rounded-full bg-gradient-to-r from-purple-500 to-purple-600" style={{ width: `${stats.performance}%` }} />
                </div>
              </div>
              <div className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl">
                <TrendingUp className="w-8 h-8 text-purple-600" />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-8 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <Calendar className="w-6 h-6 text-slate-900" />
              <div>
                <h2 className="text-xl font-bold text-slate-900">Today's Customer Entries</h2>
                <p className="text-sm text-slate-500 mt-1">{todayEntries.length} customers visited today</p>
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-8 py-4 text-left text-sm font-bold text-slate-900">Customer Name</th>
                  <th className="px-8 py-4 text-left text-sm font-bold text-slate-900">Phone</th>
                  <th className="px-8 py-4 text-left text-sm font-bold text-slate-900">Interest</th>
                  <th className="px-8 py-4 text-left text-sm font-bold text-slate-900">Visit Time</th>
                  <th className="px-8 py-4 text-left text-sm font-bold text-slate-900">Feedback Status</th>
                </tr>
              </thead>
              <tbody>
                {todayEntries.map((entry, idx) => (
                  <tr key={entry.id} className={`border-b border-slate-100 hover:bg-slate-50 transition ${idx === todayEntries.length - 1 ? 'border-b-0' : ''}`}>
                    <td className="px-8 py-5 text-sm font-semibold text-slate-900">{entry.name}</td>
                    <td className="px-8 py-5 text-sm text-slate-600 font-medium">{entry.phone}</td>
                    <td className="px-8 py-5 text-sm">
                      <span className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-xs font-bold">{entry.interest}</span>
                    </td>
                    <td className="px-8 py-5 text-sm text-slate-600 font-medium">{entry.visitDate}</td>
                    <td className="px-8 py-5 text-sm">
                      <span className={`px-3 py-1.5 rounded-lg text-xs font-bold ${getFeedbackStatusColor(entry.feedbackStatus)}`}>{entry.feedbackStatus}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <Toast message={toastMessage} show={showToast} onClose={() => setShowToast(false)} duration={3000} />
    </div>
  );
}


