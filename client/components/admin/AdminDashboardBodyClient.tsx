"use client";

import React, { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import type { ActivityPoint, InterestPoint } from "@/components/DashboardChartsClient";

const DashboardChartsClient = dynamic(() => import("@/components/DashboardChartsClient"), { ssr: false });

const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

interface CustomerDoc {
  id?: string;
  _id?: string;
  customerName: string;
  phoneNumber: string;
  category: string;
  showroomBranch?: string;
  createdAt: string;
}

interface FeedbackDoc {
  _id?: string;
  id?: string;
  customerName?: string;
  message?: string;
  date?: string;
  phone?: string;
  email?: string;
  status?: string;
}

const COLORS = [
  "#8B9F7E",
  "#D4C5A9",
  "#9FA8C5",
  "#B8A8D8",
  "#A7C7E7",
  "#F7C59F",
  "#E8A2A8",
  "#C3E6CB",
  "#FFD6A5",
  "#A0E7E5",
];

function formatDayLabel(d: Date): string {
  return d.toLocaleDateString("en-US", { weekday: "short" });
}

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export default function AdminDashboardBodyClient() {
  const [customers, setCustomers] = useState<CustomerDoc[]>([]);
  const [feedbacks, setFeedbacks] = useState<FeedbackDoc[]>([]);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    const load = async () => {
      try {
        const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
        if (!token) return;
        const [custRes, fbRes] = await Promise.all([
          fetch(`${baseUrl}/api/user/showroom/customers?limit=2000`, {
            headers: { Authorization: `Bearer ${token}` },
            credentials: 'include'
          }).catch(() => ({ status: 401, ok: false } as Response)),
          fetch(`${baseUrl}/api/user/feedbacks?page=1&limit=500`, {
            headers: { Authorization: `Bearer ${token}` },
            credentials: 'include'
          }).catch(() => ({ status: 401, ok: false } as Response)),
        ]);
        if (custRes.status === 401 || fbRes.status === 401) {
          try {
            await fetch(`${baseUrl}/api/user/logout`, {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
              credentials: 'include'
            }).catch(() => { });
          } catch { }
          if (typeof window !== "undefined") {
            localStorage.removeItem("token");
            localStorage.removeItem("user");
          }
          return;
        }
        if (!custRes.ok) throw new Error("Failed to load customers");
        const [custData, fbData] = await Promise.all([custRes.json(), fbRes.ok ? fbRes.json() : Promise.resolve({ feedbacks: [] })]);
        setCustomers(Array.isArray(custData.customers) ? custData.customers : []);
        setFeedbacks(Array.isArray(fbData.feedbacks) ? fbData.feedbacks : []);
      } catch (e: any) {

        if (e?.message && !e.message.includes("401")) {
          setError(e?.message || "Failed to load dashboard data");
        }
      }
    };
    load();
  }, []);

  const { activityData, interestData, recentActivities, feedbackList } = useMemo(() => {

    const today = startOfDay(new Date());
    const days: Date[] = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() - (6 - i));
      return d;
    });
    const counts = days.map((d) => ({ key: d.getTime(), day: formatDayLabel(d), visitors: 0 }));
    const indexByKey = new Map(counts.map((c, i) => [c.key, i] as const));
    customers.forEach((c) => {
      const created = startOfDay(new Date(c.createdAt)).getTime();
      const idx = indexByKey.get(created);
      if (idx !== undefined) counts[idx].visitors += 1;
    });
    const activity: ActivityPoint[] = counts.map(({ day, visitors }) => ({ day, visitors }));

    const totals: Record<string, number> = {};
    customers.forEach((c) => {
      const cat = c.category || "Unknown";
      totals[cat] = (totals[cat] || 0) + 1;
    });
    const totalCount = Object.values(totals).reduce((a, b) => a + b, 0) || 1;
    const interest: InterestPoint[] = Object.entries(totals)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 9)
      .map(([name, value], idx) => ({ name, value: Math.round((value / totalCount) * 100), color: COLORS[idx % COLORS.length] }));

    const activities = [...customers]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 4)
      .map((c, i) => ({
        id: i + 1,
        event: `New customer visit at ${c.showroomBranch || "Showroom"}`,
        time: new Date(c.createdAt).toLocaleString("en-US", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }),
        icon: "\uD83D\uDC65",
      }));

    const fbList = [...feedbacks]
      .sort((a, b) => new Date((b as any).createdAt || (b as any).date || 0).getTime() - new Date((a as any).createdAt || (a as any).date || 0).getTime())
      .slice(0, 4)
      .map((f, i) => ({
        id: String(f._id || f.id || i),
        user: (f as any).name || "Anonymous",
        comment: f.message || "",
        color: COLORS[i % COLORS.length].replace("#", "bg-") || "bg-blue-500",
      }));

    return { activityData: activity, interestData: interest, recentActivities: activities, feedbackList: fbList };
  }, [customers, feedbacks]);

  return (
    <>
      <DashboardChartsClient activityData={activityData} interestData={interestData} />
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-12">
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-bold text-gray-900">Recent Activities</h2>
            <a href="/admin/reports" className="text-sm text-blue-600 hover:text-blue-800">See All</a>
          </div>
          <div className="space-y-4">
            {recentActivities.map((item) => (
              <div key={item.id} className="flex items-center justify-between p-4 border border-gray-100 rounded-lg hover:bg-gray-50 transition">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-xl">{item.icon}</div>
                  <div>
                    <p className="font-medium text-gray-900 text-sm">{item.event}</p>
                    <p className="text-xs text-gray-500">{item.time}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-bold text-gray-900">Feedbacks Overview</h2>
            <a href="/admin/feedbacks" className="text-sm text-blue-600 hover:text-blue-800">See All</a>
          </div>
          <div className="space-y-4">
            {feedbackList.map((fb) => (
              <div key={fb.id} className="p-4 border border-gray-100 rounded-lg hover:bg-gray-50 transition">
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-xs`}>
                    {(fb.user || "U").charAt(0)}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 text-sm">{fb.user}</p>
                    <p className="text-sm text-gray-600 mt-1">{fb.comment}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}


