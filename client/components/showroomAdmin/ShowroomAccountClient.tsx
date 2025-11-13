"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { Users, MessageSquare, TrendingUp, Plus, Calendar, Eye, EyeOff } from "lucide-react";
import Toast from "@/components/Toast";

export interface CustomerEntry {
  id: string;
  name: string;
  phone: string;
  interest: string;
  visitDate: string;
  feedbackStatus: "Received" | "Pending" | "No Feedback";
  showroom?: string;
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
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [showrooms, setShowrooms] = useState<string[]>([]);
  const [selectedShowroom, setSelectedShowroom] = useState<string>("");
  const [oaAccuracy, setOaAccuracy] = useState<number>(0);
  const [oaAdminCount, setOaAdminCount] = useState<number>(0);
  const [allReminders, setAllReminders] = useState<Array<{ id: string; name: string; showroom?: string; date: string }>>([]);
  const [dismissedReminders, setDismissedReminders] = useState<Set<string>>(new Set());
  const [rangePreset, setRangePreset] = useState<'day' | 'week' | 'lastMonth' | 'thisMonth' | 'custom'>('day');
  const localToday = (() => { const d = new Date(); const y=d.getFullYear(); const m=String(d.getMonth()+1).padStart(2,'0'); const dd=String(d.getDate()).padStart(2,'0'); return `${y}-${m}-${dd}`; })();
  const [fromDate, setFromDate] = useState<string>(localToday);
  const [toDate, setToDate] = useState<string>(localToday);
  const [chartDays, setChartDays] = useState<Array<{ date: string; ratioPercent: number }>>([]);

  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

  // simple yyyymmdd helper (local date normalized)
  const yyyymmdd = (d: Date): string => {
    const x = new Date(d);
    const yyyy = x.getFullYear();
    const mm = String(x.getMonth() + 1).padStart(2, '0');
    const dd = String(x.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  // load dismissed reminders from localStorage
  React.useEffect(() => {
    try {
      const raw = typeof window !== 'undefined' ? localStorage.getItem('dismissed_reminders') : null;
      if (raw) {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) setDismissedReminders(new Set<string>(arr as string[]));
      }
    } catch {}
  }, []);

  const saveDismissed = (next: Set<string>) => {
    try {
      if (typeof window !== 'undefined') localStorage.setItem('dismissed_reminders', JSON.stringify(Array.from(next)));
    } catch {}
  };

  const dismissReminder = (id: string) => {
    const next = new Set(dismissedReminders);
    next.add(id);
    setDismissedReminders(next);
    saveDismissed(next);
  };

  const remindersDue = useMemo(() => {
    return allReminders.filter((r: { id: string; name: string; showroom?: string; date: string }) =>
      (!selectedShowroom || (r.showroom || '') === selectedShowroom) && !dismissedReminders.has(r.id)
    );
  }, [allReminders, selectedShowroom, dismissedReminders]);

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

  const maskPhone = (p: string): string => {
    const digits = (p || '').replace(/\D+/g, '');
    if (!digits) return '••••••••••';
    const last2 = digits.slice(-2);
    return `••••••••••${last2}`;
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
              showroom: (c.showroomBranch || '').toString(),
            };
          });
        setTodayEntries(items);

        // compute reminders due today from rememberDate
        const todayKey = yyyymmdd(new Date());
        const reminders: Array<{ id: string; name: string; showroom?: string; date: string }> = (custData.customers || [])
          .filter((c: any) => !!c.rememberDate)
          .filter((c: any) => {
            try { return yyyymmdd(new Date(c.rememberDate)) === todayKey; } catch { return false; }
          })
          .map((c: any) => ({ id: String(c.id || c._id), name: c.customerName, showroom: (c.showroomBranch || '').toString(), date: todayKey }));
        setAllReminders(reminders);
      } catch (e: any) {
        setToastMessage(e?.message || 'Error loading dashboard');
        setShowToast(true);
      }
    };
    load();

  }, []);

  // Load showrooms for dropdown
  React.useEffect(() => {
    const loadShowrooms = async () => {
      try {
        const res = await fetch(`${baseUrl}/api/user/showrooms-public`);
        if (!res.ok) return;
        const js = await res.json();
        const names: string[] = Array.isArray(js) ? js.map((s: any) => s.name) : (js.showrooms || []).map((s: any) => s.name);
        setShowrooms(names);
        // keep selectedShowroom as empty to represent 'All Showrooms' by default
      } catch {}
    };
    loadShowrooms();
  }, [baseUrl]);

  const filteredEntries = useMemo(() => {
    return todayEntries.filter(e => !selectedShowroom || (e.showroom || '') === selectedShowroom);
  }, [todayEntries, selectedShowroom]);

  const stats = useMemo(() => {
    const feedbackReceived = filteredEntries.filter((e) => e.feedbackStatus === "Received").length;
    const totalEntries = filteredEntries.length;
    const accuracyPercent = totalEntries > 0 ? Math.round((feedbackReceived / totalEntries) * 100) : 0;
    // show OA accuracy if available, else client-estimated accuracy
    return { todayEntries: totalEntries, feedbackReceived, accuracy: Number.isFinite(oaAccuracy) && oaAccuracy > 0 ? oaAccuracy : accuracyPercent };
  }, [filteredEntries, oaAccuracy]);

  // Fetch Office Admin today-stats to mirror OA accuracy card
  React.useEffect(() => {
    const loadTodayStats = async () => {
      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        if (!token) return;
        const ts = Date.now();
        const sr = selectedShowroom ? `&showroom=${encodeURIComponent(selectedShowroom)}` : '';
        const res = await fetch(`${baseUrl}/api/user/showroom/today-stats?ts=${ts}${sr}`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
        if (!res.ok) return;
        const js = await res.json();
        const list: any[] = Array.isArray(js.accuracyBreakdown) ? js.accuracyBreakdown : [];
        if (selectedShowroom) {
          const key = selectedShowroom.toString().toLowerCase().trim();
          const row = list.find((r) => String(r.showroom || '').toLowerCase().trim() === key);
          if (row && typeof row.accuracyPercent === 'number') {
            setOaAccuracy(Math.round(Number(row.accuracyPercent)));
            setOaAdminCount(typeof row.admin === 'number' ? Number(row.admin) : 0);
          } else {
            // No matching showroom; show 0 for selected showroom instead of aggregate
            setOaAccuracy(0);
            setOaAdminCount(0);
          }
        } else {
          if (typeof js.ratioPercent === 'number') setOaAccuracy(Math.round(Number(js.ratioPercent)));
          if (typeof js.adminToday === 'number') setOaAdminCount(Number(js.adminToday));
        }
      } catch {}
    };
    loadTodayStats();
  }, [selectedShowroom, baseUrl]);

  // Compute date range based on preset
  const computePresetRange = React.useCallback(() => {
    const today = new Date();
    const fmt = (d: Date) => {
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    };
    if (rangePreset === 'day') {
      const t = fmt(today);
      return { from: t, to: t };
    }
    if (rangePreset === 'week') {
      const from = new Date(today);
      from.setDate(today.getDate() - 6);
      return { from: fmt(from), to: fmt(today) };
    }
    if (rangePreset === 'lastMonth') {
      const first = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const last = new Date(today.getFullYear(), today.getMonth(), 0);
      return { from: fmt(first), to: fmt(last) };
    }
    if (rangePreset === 'thisMonth') {
      const first = new Date(today.getFullYear(), today.getMonth(), 1);
      return { from: fmt(first), to: fmt(today) };
    }
    return { from: fromDate, to: toDate };
  }, [rangePreset, fromDate, toDate]);

  // Load range stats for graph
  React.useEffect(() => {
    const loadRange = async () => {
      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        if (!token) return;
        const { from, to } = computePresetRange();
        const sr = selectedShowroom ? `&showroom=${encodeURIComponent(selectedShowroom)}` : '';
        const res = await fetch(`${baseUrl}/api/user/showroom/range-stats?from=${from}&to=${to}${sr}`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
        if (!res.ok) return;
        const js = await res.json();
        const days: Array<{ date: string; ratioPercent: number }> = (js.days || []).map((d: any) => ({ date: String(d.date), ratioPercent: Number(d.ratioPercent || 0) }));
        setChartDays(days);
      } catch {}
    };
    loadRange();
  }, [rangePreset, fromDate, toDate, selectedShowroom, baseUrl, computePresetRange]);

  return (
    <div className="min-h-screen p-8 bg-white">
      <div className="max-w-7xl mx-auto">

        <div className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-1 md:mb-2">স্বাগতম!</h1>
            <p className="text-slate-600 text-base md:text-lg">
              {new Date().toLocaleDateString("bn-BD", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
            </p>
          </div>
          <Link href="/showroom-account/add-customer" className="w-full md:w-auto inline-flex justify-center items-center gap-2 px-4 py-2 md:px-6 md:py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl font-bold transition shadow-lg">
            <Plus size={20} />
            নতুন কাস্টমার যোগ করুন
          </Link>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 mb-6">
          <label className="block text-sm font-bold text-slate-900 mb-3">শোরুম নির্বাচন করুন</label>
          <select value={selectedShowroom} onChange={(e) => setSelectedShowroom(e.target.value)} className="w-full md:w-64 px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white text-slate-900 font-medium">
            <option value="">সব শোরুম</option>
            {showrooms.map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-10">

          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 hover:shadow-md transition-shadow duration-300">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">আজকের এন্ট্রি</p>
                <div className="flex items-baseline gap-3">
                  <p className="text-5xl font-bold text-slate-900">{stats.todayEntries}</p>
                  <span className="text-xs text-slate-400">কাস্টমার ভিজিট</span>
                </div>
                <p className="text-xs text-slate-400 mt-4">এখনই হালনাগাদ</p>
              </div>
              <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl">
                <Users className="w-8 h-8 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-8 hover:shadow-md transition-shadow duration-300">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">প্রাপ্ত ফিডব্যাক</p>
                <div className="flex items-baseline gap-3">
                  <p className="text-5xl font-bold text-emerald-600">{stats.feedbackReceived}</p>
                  <span className="text-xs text-slate-400">{stats.todayEntries > 0 ? Math.round((stats.feedbackReceived / stats.todayEntries) * 100) : 0}%</span>
                </div>
                <p className="text-xs text-slate-400 mt-4">মোট কাস্টমারের মধ্যে</p>
              </div>
              <div className="p-4 bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl">
                <MessageSquare className="w-8 h-8 text-emerald-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-8 hover:shadow-md transition-shadow duration-300">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">নির্ভুলতা</p>
                <div className="flex items-baseline gap-3">
                  <p className="text-5xl font-bold text-purple-600">{stats.accuracy}%</p>
                </div>
                <div className="mt-4 w-full bg-slate-200 rounded-full h-2">
                  <div className="h-2 rounded-full bg-gradient-to-r from-purple-500 to-purple-600" style={{ width: `${stats.accuracy}%` }} />
                </div>
              </div>
              <div className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl">
                <TrendingUp className="w-8 h-8 text-purple-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 hover:shadow-md transition-shadow duration-300">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">অফিস-অ্যাডমিন ইনপুট</p>
                <div className="flex items-baseline gap-3">
                  <p className="text-5xl font-bold text-emerald-600">{oaAdminCount}</p>
                  <span className="text-xs text-slate-400">আজ</span>
                </div>
                <p className="text-xs text-slate-400 mt-4">{selectedShowroom ? `${selectedShowroom} এর জন্য` : 'সব শোরুম'}</p>
              </div>
              <div className="p-4 bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl">
                <Users className="w-8 h-8 text-emerald-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 hover:shadow-md transition-shadow duration-300">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">আজকের রিমাইন্ডার</p>
                <div className="flex items-baseline gap-3">
                  <p className="text-5xl font-bold text-amber-600">{remindersDue.length}</p>
                  <span className="text-xs text-slate-400">বাকি</span>
                </div>
                {remindersDue.length > 0 && (
                  <ul className="mt-4 space-y-2 max-h-32 overflow-auto">
                    {remindersDue.slice(0,5).map((r: { id: string; name: string; showroom?: string; date: string }) => (
                      <li key={r.id} className="flex items-center justify-between text-sm">
                        <span className="font-semibold text-slate-800 truncate mr-3">{r.name}</span>
                        <button type="button" onClick={() => dismissReminder(r.id)} className="px-2 py-1 text-xs rounded border border-slate-300 hover:bg-slate-100" title="রিমাইন্ডার বাতিল করুন">ডিসমিস</button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-8 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <Calendar className="w-6 h-6 text-slate-900" />
              <div>
                <h2 className="text-xl font-bold text-slate-900">আজকের কাস্টমার এন্ট্রি</h2>
                <p className="text-sm text-slate-500 mt-1">আজ {filteredEntries.length} জন কাস্টমার ভিজিট করেছেন</p>
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-8 py-4 text-left text-sm font-bold text-slate-900">কাস্টমারের নাম</th>
                  <th className="px-8 py-4 text-left text-sm font-bold text-slate-900">ফোন</th>
                  <th className="px-8 py-4 text-left text-sm font-bold text-slate-900">আগ্রহ</th>
                  <th className="px-8 py-4 text-left text-sm font-bold text-slate-900">ভিজিটের সময়</th>
                  <th className="px-8 py-4 text-left text-sm font-bold text-slate-900">ফিডব্যাক স্ট্যাটাস</th>
                </tr>
              </thead>
              <tbody>
                {filteredEntries.map((entry, idx) => (
                  <tr key={entry.id} className={`border-b border-slate-100 hover:bg-slate-50 transition ${idx === filteredEntries.length - 1 ? 'border-b-0' : ''}`}>
                    <td className="px-8 py-5 text-sm font-semibold text-slate-900">{entry.name}</td>
                    <td className="px-8 py-5 text-sm text-slate-600 font-medium">
                      <div className="flex items-center gap-2">
                        <span className="font-mono tracking-wide">{revealed[entry.id] ? entry.phone : maskPhone(entry.phone)}</span>
                        <button type="button" onClick={() => setRevealed((prev) => ({ ...prev, [entry.id]: !prev[entry.id] }))} className="p-1.5 rounded hover:bg-slate-100 border border-slate-200" aria-label={revealed[entry.id] ? 'ফোন লুকান' : 'ফোন দেখুন'} title={revealed[entry.id] ? 'ফোন লুকান' : 'ফোন দেখুন'}>
                          {revealed[entry.id] ? <EyeOff size={16} className="text-slate-700" /> : <Eye size={16} className="text-slate-700" />}
                        </button>
                      </div>
                    </td>
                    <td className="px-8 py-5 text-sm"><span className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-xs font-bold">{entry.interest}</span></td>
                    <td className="px-8 py-5 text-sm text-slate-600 font-medium">{entry.visitDate}</td>
                    <td className="px-8 py-5 text-sm"><span className={`px-3 py-1.5 rounded-lg text-xs font-bold ${getFeedbackStatusColor(entry.feedbackStatus)}`}>{entry.feedbackStatus}</span></td>
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
