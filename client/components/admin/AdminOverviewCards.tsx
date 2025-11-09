"use client";

import React, { useEffect, useMemo, useState } from "react";
import OverviewCards, { OverviewStat } from "@/components/OverviewCards";
import { Users, Building2, UserCheck, TrendingUp } from "lucide-react";

interface ShowroomCustomer {
  id: string;
  customerName: string;
  phoneNumber: string;
  category: string;
  showroomBranch: string;
  createdAt: string;
}

interface FeedbackItem {
  id?: string;
  _id?: string;
  phone?: string;
  date?: string;
}

interface ShowroomPublic { id?: string; _id?: string; name?: string }

const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

const isToday = (iso: string): boolean => {
  try {
    const d = new Date(iso);
    const today = new Date();
    return (
      d.getFullYear() === today.getFullYear() &&
      d.getMonth() === today.getMonth() &&
      d.getDate() === today.getDate()
    );
  } catch {
    return false;
  }
};

export default function AdminOverviewCards() {
  const [customers, setCustomers] = useState<ShowroomCustomer[]>([]);
  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);
  const [showrooms, setShowrooms] = useState<ShowroomPublic[]>([]);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    const load = async () => {
      try {
        const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
        if (!token) return;
        const [custRes, fbRes, shRes] = await Promise.all([
          fetch(`${baseUrl}/api/user/showroom/customers?limit=10000`, {
            headers: { Authorization: `Bearer ${token}` },
            credentials: 'include'
          }).catch(() => ({ status: 401, ok: false } as Response)),
          fetch(`${baseUrl}/api/user/feedbacks?page=1&limit=10000`, {
            headers: { Authorization: `Bearer ${token}` },
            credentials: 'include'
          }).catch(() => ({ status: 401, ok: false } as Response)),
          fetch(`${baseUrl}/api/user/showrooms-public`, {
            credentials: 'include'
          }).catch(() => ({ status: 200, ok: true, json: async () => ({ showrooms: [] }) } as any)),
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
        const [custData, fbData, shData] = await Promise.all([
          custRes.json(),
          fbRes.ok ? fbRes.json() : Promise.resolve({ feedbacks: [] }),
          shRes.ok ? shRes.json() : Promise.resolve({ showrooms: [] }),
        ]);
        setCustomers(Array.isArray(custData.customers) ? custData.customers : []);
        setFeedbacks(Array.isArray(fbData.feedbacks) ? fbData.feedbacks : []);
        setShowrooms(Array.isArray(shData) ? shData : (Array.isArray(shData?.showrooms) ? shData.showrooms : []));
      } catch (e: any) {

        if (e?.message && !e.message.includes("401")) {
          setError(e?.message || "Failed to load");
        }
      }
    };
    load();
  }, []);

  const stats: OverviewStat[] = useMemo(() => {
    const todaysVisitors = customers.filter((c) => isToday(c.createdAt)).length;
    const totalCustomers = customers.length;
    const totalShowrooms = showrooms.length || undefined;
    const normalize = (p: string) => {
      const digits = (p || '').replace(/\D+/g, '');
      return digits.length >= 10 ? digits.slice(-10) : digits;
    };
    const todayCustomerPhones = new Set(
      customers.filter((c) => isToday(c.createdAt)).map((c) => normalize(c.phoneNumber))
    );
    const todaysFeedbackMatches = feedbacks
      .filter((f) => isToday((f as any).createdAt || (f as any).date || ''))
      .map((f) => normalize(f.phone || ''))
      .filter((p) => p && todayCustomerPhones.has(p)).length;
    const performancePct = todaysVisitors > 0 ? Math.round((todaysFeedbackMatches / todaysVisitors) * 100) : 0;
    return [
      { title: "Total Customers", value: String(totalCustomers), change: "+0%", lastMonth: "All time", icon: <Users className="w-5 h-5 text-gray-700" /> },
      { title: "Total Showrooms", value: String(totalShowrooms ?? '-'), change: "+0%", lastMonth: "Active", icon: <Building2 className="w-5 h-5 text-gray-700" /> },
      { title: "Today's Visitors", value: String(todaysVisitors), change: "+0%", lastMonth: "Today", icon: <UserCheck className="w-5 h-5 text-gray-700" /> },
      { title: "Overall Performance", value: `${performancePct}%`, change: "+0%", lastMonth: "Feedback/Visits", icon: <TrendingUp className="w-5 h-5 text-gray-700" /> },
    ];
  }, [customers, feedbacks, showrooms]);

  return <OverviewCards stats={stats} />;
}


