"use client";

import React, { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { Users, BarChart3, LineChart } from "lucide-react";

export interface VisitorTrendData { day: string; visitors: number; accuracy: number }

const OfficeDashboardChartsClient = dynamic(() => import("@/components/officeAdmin/OfficeDashboardChartsClient"), { ssr: false });

const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

interface CustomerDoc {
  createdAt: string;
}

interface FeedbackDoc {
  createdAt?: string;
}

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

  useEffect(() => {
    const load = async () => {
      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        if (!token) return;
        const ts = Date.now();
        const [custRes, fbRes, sumRes] = await Promise.all([
          fetch(`${baseUrl}/api/user/showroom/customers?limit=10000&ts=${ts}`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' }),
          fetch(`${baseUrl}/api/user/feedbacks?page=1&limit=10000&ts=${ts}`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' }),
          fetch(`${baseUrl}/api/user/analytics/showroom-summary?ts=${ts}`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' }),
        ]);
        if (custRes.status === 401 || fbRes.status === 401 || sumRes.status === 401) {

          return;
        }
        const [custData, fbData, sData] = await Promise.all([
          custRes.json(),
          fbRes.ok ? fbRes.json() : Promise.resolve({ feedbacks: [] }),
          sumRes.ok ? sumRes.json() : Promise.resolve({ items: [] }),
        ]);
        setCustomers(Array.isArray(custData.customers) ? custData.customers : []);
        setFeedbacks(Array.isArray(fbData.feedbacks) ? fbData.feedbacks : []);
        const items = Array.isArray(sData.items) ? sData.items : [];
        setSummary(items);
        if (typeof sData.avgAccuracy === 'number') setAvgAccBackend(sData.avgAccuracy);
        if (typeof sData.avgPerformance === 'number') setAvgPerfBackend(sData.avgPerformance);
      } catch {}
    };
    load();
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
      return { day: c.day, visitors: c.visitors, accuracy: acc };
    });

    const todayVisitors = counts[counts.length - 1]?.visitors || 0;

    const accuracyVals = trend.map(t => t.accuracy);
    const avgAccClient = accuracyVals.length ? (accuracyVals.reduce((a,b)=>a+b,0)/accuracyVals.length) : 0;
    const avgPerfClient = trend.length ? Math.round(trend.reduce((sum, pt)=> sum + Math.min(100, 60 + tAccuracyToPerf(pt.accuracy)), 0) / trend.length) : 0;

    function tAccuracyToPerf(acc: number) {

      return Math.max(0, Math.min(40, Math.round((acc - 60) * 0.8)));
    }

    const acc = (avgAccBackend ?? avgAccClient).toFixed(1);
    const perf = String(avgPerfBackend ?? avgPerfClient);
    return { totalVisitors: todayVisitors, avgAccuracy: acc, avgPerformance: perf, visitorTrendData: trend };
  }, [customers, feedbacks, avgAccBackend, avgPerfBackend]);

  return (
    <div className="min-h-screen p-8 bg-white">
      <div className="max-w-7xl mx-auto">
        <div className="mb-10">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Dashboard</h1>
          <p className="text-slate-600 text-lg">Welcome back! Here's your business performance overview.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
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
                <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Data Accuracy</p>
                <div className="flex items-baseline gap-3">
                  <p className={`text-5xl font-bold ${parseFloat(String(avgAccuracy)) >= 90 ? 'text-emerald-600' : parseFloat(String(avgAccuracy)) >= 80 ? 'text-cyan-600' : parseFloat(String(avgAccuracy)) >= 70 ? 'text-amber-600' : 'text-rose-600'}`}>{avgAccuracy}%</p>
                </div>
                <p className="text-xs text-slate-400 mt-3">system wide average</p>
              </div>
              <div className="p-4 bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl">
                <BarChart3 className="w-8 h-8 text-emerald-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-8 hover:shadow-md transition-shadow duration-300">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Avg Performance</p>
                <div className="flex items-baseline gap-3">
                  <p className="text-5xl font-bold text-slate-900">{avgPerformance}%</p>
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
                  const accuracy = Number(it.accuracy || 0);
                  const status = (it.status === 'Active' ? 'Active' : 'Active');
                  const performance = typeof it.performance === 'number'
                    ? Math.max(0, Math.min(100, Number(it.performance)))
                    : Math.min(100, Math.round(60 + (accuracy % 40))); 
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
    </div>
  );
}


