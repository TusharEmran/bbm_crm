"use client";

import React, { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { Users, BarChart3, LineChart } from "lucide-react";

export interface VisitorTrendData { day: string; visitors: number; accuracy: number; performance: number }

const OfficeDashboardChartsClient = dynamic(() => import("@/components/officeAdmin/OfficeDashboardChartsClient"), { ssr: false });

const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

interface CustomerDoc {
  createdAt: string;
}

interface FeedbackDoc {
  createdAt?: string;
}

interface ShowroomItem { id: string; name: string }

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function formatDayLabel(d: Date): string {
  return d.toLocaleDateString("en-US", { weekday: "short" });
}

export default function OfficeDashboardClient() {
  const [customers, setCustomers] = useState<CustomerDoc[]>([]);
  const [feedbacks, setFeedbacks] = useState<FeedbackDoc[]>([]);
  const [summary, setSummary] = useState<any[]>([]);
  const [avgAccBackend, setAvgAccBackend] = useState<number | null>(null);
  const [avgPerfBackend, setAvgPerfBackend] = useState<number | null>(null);
  const [adminToday, setAdminToday] = useState<number>(0);
  const [ratioPercent, setRatioPercent] = useState<number>(0);
  const [openAdminCountModal, setOpenAdminCountModal] = useState(false);
  const [pendingCount, setPendingCount] = useState<string>("");
  const [savingCount, setSavingCount] = useState<boolean>(false);
  const [showrooms, setShowrooms] = useState<ShowroomItem[]>([]);
  const [selectedShowroom, setSelectedShowroom] = useState<string>("");
  const [adminBreakdown, setAdminBreakdown] = useState<Array<{ showroom: string; count: number }>>([]);
  const [accuracyBreakdown, setAccuracyBreakdown] = useState<Array<{ showroom: string; accuracyPercent: number; visitors: number; admin: number }>>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        if (!token) return;
        const ts = Date.now();
        const [custRes, fbRes, sumRes, todayStatsRes, showroomsRes] = await Promise.all([
          fetch(`${baseUrl}/api/user/showroom/customers?limit=10000&ts=${ts}`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' }),
          fetch(`${baseUrl}/api/user/feedbacks?page=1&limit=10000&ts=${ts}`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' }),
          fetch(`${baseUrl}/api/user/analytics/showroom-summary?ts=${ts}`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' }),
          fetch(`${baseUrl}/api/user/showroom/today-stats?ts=${ts}`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' }),
          fetch(`${baseUrl}/api/user/showrooms-public?ts=${ts}`, { cache: 'no-store' })
        ]);
        if (custRes.status === 401 || fbRes.status === 401 || sumRes.status === 401 || todayStatsRes.status === 401) {

          return;
        }
        const [custData, fbData, sData, todayStats, srData] = await Promise.all([
          custRes.json(),
          fbRes.ok ? fbRes.json() : Promise.resolve({ feedbacks: [] }),
          sumRes.ok ? sumRes.json() : Promise.resolve({ items: [] }),
          todayStatsRes.ok ? todayStatsRes.json() : Promise.resolve({ showroomToday: 0, adminToday: 0, ratioPercent: 0 }),
          showroomsRes.ok ? showroomsRes.json() : Promise.resolve({ showrooms: [] })
        ]);
        setCustomers(Array.isArray(custData.customers) ? custData.customers : []);
        setFeedbacks(Array.isArray(fbData.feedbacks) ? fbData.feedbacks : []);
        const items = Array.isArray(sData.items) ? sData.items : [];
        setSummary(items);
        if (typeof sData.avgAccuracy === 'number') setAvgAccBackend(sData.avgAccuracy);
        if (typeof sData.avgPerformance === 'number') setAvgPerfBackend(sData.avgPerformance);
        setAdminToday(Number(todayStats.adminToday || 0));
        setRatioPercent(Number(todayStats.ratioPercent || 0));
        // Derive adminBreakdown from accuracyBreakdown if not provided
        const abList: any[] = Array.isArray(todayStats.accuracyBreakdown) ? todayStats.accuracyBreakdown : [];
        if (abList.length > 0) {
          setAdminBreakdown(abList.map((r: any) => ({ showroom: String(r.showroom || ''), count: Number(r.admin || 0) })));
          setAccuracyBreakdown(abList.map((r: any) => ({ showroom: String(r.showroom || ''), accuracyPercent: Number(r.accuracyPercent || 0), visitors: Number(r.visitors || 0), admin: Number(r.admin || 0) })));
        }
        const srs = Array.isArray(srData.showrooms) ? srData.showrooms as ShowroomItem[] : [];
        setShowrooms(srs);
        if (srs.length > 0) setSelectedShowroom((prev) => prev || srs[0].name);
      } catch { }
    };
    load();
  }, []);

  useEffect(() => {
    let timer: any;

    const fetchTodayStats = async () => {
      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        if (!token) return;
        const ts = Date.now();
        const res = await fetch(`${baseUrl}/api/user/showroom/today-stats?ts=${ts}`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
        if (!res.ok) return;
        const js = await res.json();
        setAdminToday(Number(js.adminToday || 0));
        setRatioPercent(Number(js.ratioPercent || 0));
        const abList: any[] = Array.isArray(js.accuracyBreakdown) ? js.accuracyBreakdown : [];
        setAccuracyBreakdown(abList);
        setAdminBreakdown(abList.length > 0 ? abList.map((r: any) => ({ showroom: String(r.showroom || ''), count: Number(r.admin || 0) })) : []);
      } catch { }
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') fetchTodayStats();
    };
    const handleFocus = () => fetchTodayStats();

    fetchTodayStats();
    timer = setInterval(fetchTodayStats, 15000);
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      if (timer) clearInterval(timer);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  const { totalVisitors, avgAccuracy, avgPerformance, visitorTrendData } = useMemo(() => {

    const base = startOfDay(new Date());
    const days: Date[] = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(base);
      d.setDate(base.getDate() - (6 - i));
      return d;
    });
    const counts = days.map(d => ({ ts: d.getTime(), day: formatDayLabel(d), visitors: 0, custPhones: new Set<string>(), fbPhones: new Set<string>() }));
    const indexByTs = new Map(counts.map((c, i) => [c.ts, i] as const));

    const normalize = (p: string) => {
      const digits = (p || '').replace(/\D+/g, '');
      return digits.length >= 10 ? digits.slice(-10) : digits;
    };

    customers.forEach(c => {
      const ts = startOfDay(new Date(c.createdAt)).getTime();
      const idx = indexByTs.get(ts);
      if (idx !== undefined) {
        counts[idx].visitors += 1;
        const phone = normalize((c as any).phoneNumber || '');
        if (phone) counts[idx].custPhones.add(phone);
      }
    });

    feedbacks.forEach(f => {
      const ts = startOfDay(new Date((f as any).createdAt || (f as any).date || 0)).getTime();
      const idx = indexByTs.get(ts);
      if (idx !== undefined) {
        const phone = normalize((f as any).phone || '');
        if (phone) counts[idx].fbPhones.add(phone);
      }
    });

    const trend: VisitorTrendData[] = counts.map(c => {
      const cust = c.custPhones.size;
      const fbs = c.fbPhones.size;
      const acc = cust > 0 ? Math.round((fbs / cust) * 100) : 0;
      return { day: c.day, visitors: c.visitors, accuracy: acc, performance: 0 };
    });

    // Compute performance as ratio today/yesterday * 100 (Option B)
    for (let i = 0; i < trend.length; i++) {
      if (i === 0) { trend[i].performance = 0; continue; }
      const today = Number(trend[i].visitors || 0);
      const yesterday = Number(trend[i - 1].visitors || 0);
      trend[i].performance = yesterday > 0 ? Math.round((today / yesterday) * 100) : 0;
    }

    const todayVisitors = counts[counts.length - 1]?.visitors || 0;

    const accuracyVals = trend.map(t => t.accuracy);
    const avgAccClient = accuracyVals.length ? (accuracyVals.reduce((a, b) => a + b, 0) / accuracyVals.length) : 0;
    const avgPerfClient = trend.length ? Math.round(trend.reduce((sum, pt) => sum + pt.performance, 0) / trend.length) : 0;

    function tAccuracyToPerf(acc: number) { return Math.max(0, Math.min(40, Math.round((acc - 60) * 0.8))); }

    const acc = (avgAccBackend ?? avgAccClient).toFixed(1);
    const perf = String(avgPerfBackend ?? avgPerfClient);
    return { totalVisitors: todayVisitors, avgAccuracy: acc, avgPerformance: perf, visitorTrendData: trend };
  }, [customers, feedbacks, avgAccBackend, avgPerfBackend]);

  const perfByShowroom = useMemo(() => {
    const today = startOfDay(new Date());
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    const norm = (p: string) => {
      const digits = (p || '').replace(/\D+/g, '');
      return digits.length >= 10 ? digits.slice(-10) : digits;
    };

    const todayMap = new Map<string, Set<string>>();
    const yestMap = new Map<string, Set<string>>();

    customers.forEach((c: any) => {
      const created = new Date(c.createdAt);
      const showroom = (c.showroomBranch || '').toString().toLowerCase().trim();
      const phone = norm(c.phoneNumber || '');
      if (!showroom || !phone) return;
      const d0 = startOfDay(created).getTime();
      if (d0 === today.getTime()) {
        if (!todayMap.has(showroom)) todayMap.set(showroom, new Set());
        todayMap.get(showroom)!.add(phone);
      } else if (d0 === yesterday.getTime()) {
        if (!yestMap.has(showroom)) yestMap.set(showroom, new Set());
        yestMap.get(showroom)!.add(phone);
      }
    });

    const perf = new Map<string, { t: number; y: number; perf: number }>();
    const keys = new Set<string>([...todayMap.keys(), ...yestMap.keys()]);
    keys.forEach((k) => {
      const t = todayMap.get(k)?.size || 0;
      const y = yestMap.get(k)?.size || 0;
      const denom = y > 0 ? y : 1;
      const val = t > 0 ? Math.round((t / denom) * 100) : 0;
      perf.set(k, { t, y, perf: val });
    });
    return perf;
  }, [customers]);

  const avgPerfByShowroom = useMemo(() => {
    const vals = Array.from(perfByShowroom.values()).map((v) => Number((v as any).perf ?? 0)).filter((n) => Number.isFinite(n));
    if (!vals.length) return 0;
    return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
  }, [perfByShowroom]);

  return (
    <div className="min-h-screen p-8 bg-white">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-10">
          <div>
            <h1 className="text-4xl font-bold text-slate-900 mb-2">Dashboard</h1>
            <p className="text-slate-600 text-lg">
              Welcome back! Here's your business performance overview.
            </p>
          </div>

          <button
            onClick={() => {
              setPendingCount(String(adminToday || ""));
              // keep selection
              setOpenAdminCountModal(true);
            }}
            className="mt-4 md:mt-0 px-4 py-2 text-sm font-semibold rounded-lg bg-black text-white transition-all duration-200 shadow-sm"
          >
            Todays Customer Entries
          </button>
        </div>


        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-8 hover:shadow-md transition-shadow duration-300">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Total Visitors Today</p>
                <div className="flex items-baseline gap-3">
                  <p className="text-5xl font-bold text-slate-900">{totalVisitors}</p>
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 rounded-lg">
                    <span className="text-sm font-semibold text-emerald-600">live</span>
                  </div>
                </div>
                <p className="text-xs text-slate-400 mt-3">based on showroom entries</p>
              </div>
              <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl">
                <Users className="w-8 h-8 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-8 hover:shadow-md transition-shadow duration-300">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Admin Customers Today</p>
                <div className="flex items-center gap-4">
                </div>
                {adminBreakdown.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1"> {/* Tighter gap */}
                    {adminBreakdown.map((b, i) => (
                      <span key={`${b.showroom}-${i}`} className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-slate-100 rounded text-xs"> {/* Smaller padding */}
                        <span className="font-semibold text-slate-900">{b.count}</span>
                        <span className="text-slate-600 max-w-[80px] truncate" title={b.showroom}>{b.showroom}</span> {/* Limit text width */}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>


<div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 hover:shadow-md transition-shadow duration-300">
  <div className="flex items-start justify-between">
    <div className="flex-1">
      <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">Data Accuracy</p>
      <p className="text-xs text-slate-400 mb-3">based on showroom vs admin</p>
      
      {accuracyBreakdown.length > 0 && (
        <div className="flex flex-wrap gap-0.5">
          {accuracyBreakdown.map((r, i) => (
            <span
              key={`${r.showroom}-${i}`}
              className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium ${
                r.accuracyPercent >= 90 
                  ? 'bg-emerald-50 text-emerald-700' 
                  : r.accuracyPercent >= 80 
                  ? 'bg-cyan-50 text-cyan-700'
                  : r.accuracyPercent >= 70 
                  ? 'bg-amber-50 text-amber-700'
                  : 'bg-rose-50 text-rose-700'
              }`}
              title={`${r.showroom} • ${r.accuracyPercent}% (Visitors: ${r.visitors} | Admin: ${r.admin})`}
            >
              <span className="font-bold">{r.accuracyPercent}%</span>
              <span className="max-w-[60px] truncate">{r.showroom}</span>
            </span>
          ))}
        </div>
      )}
    </div>
    
    <div className="p-3 bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl ml-4 flex-shrink-0">
      <BarChart3 className="w-6 h-6 text-emerald-600" />
    </div>
  </div>
</div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-8 hover:shadow-md transition-shadow duration-300">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Avg Performance</p>
                <div className="flex items-baseline gap-3">
                  <p className="text-5xl font-bold text-slate-900">{avgPerfByShowroom}%</p>
                </div>
                <p className="text-xs text-slate-400 mt-3">per showroom</p>
              </div>
              <div className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl">
                <LineChart className="w-8 h-8 text-purple-600" />
              </div>
            </div>
          </div>
        </div>

        <OfficeDashboardChartsClient visitorTrendData={visitorTrendData} />

        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden mt-8">
          <div className="p-8 border-b border-slate-100">
            <h2 className="text-xl font-bold text-slate-900">Showroom Performance Summary</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-8 py-4 text-left text-sm font-bold text-slate-900">Showroom</th>
                  <th className="px-8 py-4 text-left text-sm font-bold text-slate-900">Visitors</th>
                  <th className="px-8 py-4 text-left text-sm font-bold text-slate-900">Accuracy</th>
                  <th className="px-8 py-4 text-left text-sm font-bold text-slate-900">Performance</th>
                  <th className="px-8 py-4 text-left text-sm font-bold text-slate-900">Status</th>
                </tr>
              </thead>
              <tbody>
                {summary.map((it, idx) => {
                  const showroomName = it.showroom || it.showroomName || 'Showroom';
                  const visitors = Number(it.uniqueCustomers || it.visitorsToday || 0);
                  const accRow = accuracyBreakdown.find((r) => (r.showroom || '') === (showroomName || ''));
                  const accuracy = accRow ? Number(accRow.accuracyPercent || 0) : Number(it.accuracy || 0);
                  const status = (it.status === 'Active' ? 'Active' : 'Active');
                  const perfKey = (showroomName || '').toString().toLowerCase().trim();
                  const perfEntry = perfByShowroom.get(perfKey);
                  const perfApi = Number(it.performance || 0);
                  const perfComputed = Number(perfEntry?.perf || 0);
                  const performance = Math.max(0, Math.min(100, perfApi > 0 ? perfApi : perfComputed));
                  return (
                    <tr key={`${showroomName}-${idx}`} className={`border-b border-slate-100 hover:bg-slate-50 transition ${idx === summary.length - 1 ? 'border-b-0' : ''}`}>
                      <td className="px-8 py-5 text-sm font-semibold text-slate-900">{showroomName}</td>
                      <td className="px-8 py-5 text-sm">
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-blue-600" />
                          <span className="font-semibold text-slate-900">{visitors}</span>
                        </div>
                      </td>
                      <td className="px-8 py-5 text-sm">
                        <span className={`px-3 py-1.5 rounded-lg text-xs font-bold ${accuracy >= 90 ? 'text-emerald-600' : accuracy >= 80 ? 'text-cyan-600' : accuracy >= 70 ? 'text-amber-600' : 'text-rose-600'}`}>{accuracy}%</span>
                      </td>
                      <td className="px-8 py-5 text-sm">
                        <div className="flex items-center gap-3">
                          <div className="w-28 bg-slate-200 rounded-full h-2">
                            <div className="h-2 rounded-full bg-gradient-to-r from-blue-500 to-blue-600" style={{ width: `${performance}%` }} />
                          </div>
                          <span className="font-semibold text-slate-900 text-xs min-w-[40px]">{performance}%</span>
                        </div>
                      </td>
                      <td className="px-8 py-5 text-sm">
                        <span className={`px-3 py-1.5 rounded-lg text-xs font-bold ${status === 'Active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-50 text-slate-700 border border-slate-200'}`}>{status}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {openAdminCountModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full">
            <div className="p-6 border-b border-slate-100">
              <h3 className="text-lg font-semibold text-slate-900">Set Admin Customers Today</h3>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Showroom</label>
                <select
                  value={selectedShowroom}
                  onChange={(e) => setSelectedShowroom(e.target.value)}
                  className="w-full px-4 py-2 border text-black border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {showrooms.map((s) => (
                    <option key={s.id} value={s.name}>{s.name}</option>
                  ))}
                </select>
              </div>
              <input
                type="number"
                min={0}
                value={pendingCount}
                onChange={(e) => setPendingCount(e.target.value)}
                className="w-full px-4 py-2 border text-black border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter count"
              />
              <div className="flex gap-3">
                <button
                  onClick={() => setOpenAdminCountModal(false)}
                  className="flex-1 px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-900 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  disabled={savingCount || !selectedShowroom}
                  onClick={async () => {
                    try {
                      setSavingCount(true);
                      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
                      if (!token) return;
                      const res = await fetch(`${baseUrl}/api/user/office-admin/daily-count`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                        body: JSON.stringify({ count: Number(pendingCount), showroom: selectedShowroom })
                      });
                      if (!res.ok) throw new Error('Failed to save');
                      const js = await res.json();
                      setAdminToday(Number(js.count || 0));
                      // refresh today stats
                      const st = await fetch(`${baseUrl}/api/user/office-admin/today-stats`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
                      if (st.ok) {
                        const stat = await st.json();
                        setAdminToday(Number(stat.adminToday || 0));
                        setAdminBreakdown(Array.isArray(stat.adminBreakdown) ? stat.adminBreakdown : []);
                        setAccuracyBreakdown(Array.isArray(stat.accuracyBreakdown) ? stat.accuracyBreakdown : []);
                      }
                      setOpenAdminCountModal(false);
                    } catch {
                    } finally {
                      setSavingCount(false);
                    }
                  }}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
