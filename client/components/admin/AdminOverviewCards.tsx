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
  const [visitorsToday, setVisitorsToday] = useState<number>(0);
  const [visitorsYesterday, setVisitorsYesterday] = useState<number>(0);

  useEffect(() => {
    const load = async () => {
      try {
        const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
        if (!token) return;
        const ts = Date.now();
        const startOfToday = () => { const d = new Date(); d.setHours(0,0,0,0); return d; };
        const startOfYesterday = () => { const d = new Date(); d.setHours(0,0,0,0); d.setDate(d.getDate()-1); return d; };
        const startOfTomorrow = () => { const d = new Date(); d.setHours(0,0,0,0); d.setDate(d.getDate()+1); return d; };
        const yStartIso = startOfYesterday().toISOString();
        const tomorrowIso = startOfTomorrow().toISOString();

        const [custRes, fbRes, shRes, dailyRes] = await Promise.all([
          fetch(`${baseUrl}/api/user/showroom/customers?limit=10000&ts=${ts}`, {
            headers: { Authorization: `Bearer ${token}` },
            credentials: 'include',
            cache: 'no-store'
          }).catch(() => ({ status: 401, ok: false } as Response)),
          fetch(`${baseUrl}/api/user/feedbacks?page=1&limit=10000&ts=${ts}`, {
            headers: { Authorization: `Bearer ${token}` },
            credentials: 'include',
            cache: 'no-store'
          }).catch(() => ({ status: 401, ok: false } as Response)),
          fetch(`${baseUrl}/api/user/showrooms?ts=${ts}`, {
            headers: { Authorization: `Bearer ${token}` },
            credentials: 'include',
            cache: 'no-store'
          }).catch(() => ({ status: 200, ok: true, json: async () => ({ showrooms: [] }) } as any)),
          fetch(`${baseUrl}/api/user/analytics/showroom-daily?start=${encodeURIComponent(yStartIso)}&end=${encodeURIComponent(tomorrowIso)}&ts=${ts}`, {
            headers: { Authorization: `Bearer ${token}` },
            credentials: 'include',
            cache: 'no-store'
          }).catch(() => ({ status: 200, ok: true, json: async () => ({ days: [] }) } as any)),
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
        const [custData, fbData, shData, dailyData] = await Promise.all([
          custRes.json(),
          fbRes.ok ? fbRes.json() : Promise.resolve({ feedbacks: [] }),
          shRes.ok ? shRes.json() : Promise.resolve({ showrooms: [] }),
          dailyRes.ok ? dailyRes.json() : Promise.resolve({ days: [] }),
        ]);
        setCustomers(Array.isArray(custData.customers) ? custData.customers : []);
        setFeedbacks(Array.isArray(fbData.feedbacks) ? fbData.feedbacks : []);
        setShowrooms(Array.isArray(shData) ? shData : (Array.isArray(shData?.showrooms) ? shData.showrooms : []));
        const days = Array.isArray(dailyData?.days) ? dailyData.days : [];
        const byDay = new Map<string, any>();
        days.forEach((d: any) => { if (d?.day) byDay.set(String(d.day), d); });
        const todayKey = new Date().toISOString().slice(0,10);
        const yKey = (() => { const d=new Date(); d.setDate(d.getDate()-1); return d.toISOString().slice(0,10); })();
        setVisitorsToday(Number(byDay.get(todayKey)?.visitors || 0));
        setVisitorsYesterday(Number(byDay.get(yKey)?.visitors || 0));
      } catch (e: any) {

        if (e?.message && !e.message.includes("401")) {
          setError(e?.message || "Failed to load");
        }
      }
    };
    load();
  }, []);

  useEffect(() => {
    let timer: any;

    const refresh = async () => {
      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        if (!token) return;
        const ts = Date.now();
        const startOfToday = () => { const d = new Date(); d.setHours(0,0,0,0); return d; };
        const startOfYesterday = () => { const d = new Date(); d.setHours(0,0,0,0); d.setDate(d.getDate()-1); return d; };
        const startOfTomorrow = () => { const d = new Date(); d.setHours(0,0,0,0); d.setDate(d.getDate()+1); return d; };
        const yStartIso = startOfYesterday().toISOString();
        const tomorrowIso = startOfTomorrow().toISOString();
        const [custRes, fbRes, shRes, dailyRes] = await Promise.all([
          fetch(`${baseUrl}/api/user/showroom/customers?limit=10000&ts=${ts}`, { headers: { Authorization: `Bearer ${token}` }, credentials: 'include', cache: 'no-store' }),
          fetch(`${baseUrl}/api/user/feedbacks?page=1&limit=10000&ts=${ts}`, { headers: { Authorization: `Bearer ${token}` }, credentials: 'include', cache: 'no-store' }),
          fetch(`${baseUrl}/api/user/showrooms?ts=${ts}`, { headers: { Authorization: `Bearer ${token}` }, credentials: 'include', cache: 'no-store' }),
          fetch(`${baseUrl}/api/user/analytics/showroom-daily?start=${encodeURIComponent(yStartIso)}&end=${encodeURIComponent(tomorrowIso)}&ts=${ts}`, { headers: { Authorization: `Bearer ${token}` }, credentials: 'include', cache: 'no-store' }),
        ]);
        if (custRes.ok) {
          const custData = await custRes.json();
          setCustomers(Array.isArray(custData.customers) ? custData.customers : []);
        }
        if (fbRes.ok) {
          const fbData = await fbRes.json();
          setFeedbacks(Array.isArray(fbData.feedbacks) ? fbData.feedbacks : []);
        }
        if (shRes.ok) {
          const shData = await shRes.json();
          const items = Array.isArray(shData) ? shData : (Array.isArray(shData?.showrooms) ? shData.showrooms : []);
          setShowrooms(items);
        }
        if (dailyRes.ok) {
          const dailyData = await dailyRes.json();
          const days = Array.isArray(dailyData?.days) ? dailyData.days : [];
          const byDay = new Map<string, any>();
          days.forEach((d: any) => { if (d?.day) byDay.set(String(d.day), d); });
          const todayKey = new Date().toISOString().slice(0,10);
          const yKey = (() => { const d=new Date(); d.setDate(d.getDate()-1); return d.toISOString().slice(0,10); })();
          setVisitorsToday(Number(byDay.get(todayKey)?.visitors || 0));
          setVisitorsYesterday(Number(byDay.get(yKey)?.visitors || 0));
        }
      } catch {}
    };

    const onFocus = () => refresh();
    const onVis = () => { if (document.visibilityState === 'visible') refresh(); };

    refresh();
    timer = setInterval(refresh, 15000);
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVis);

    return () => {
      if (timer) clearInterval(timer);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, []);

  const stats: OverviewStat[] = useMemo(() => {
    const startOfToday = () => {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      return d;
    };
    const startOfYesterday = () => {
      const d = startOfToday();
      d.setDate(d.getDate() - 1);
      return d;
    };
    const endOfYesterday = () => {
      const d = startOfToday();
      d.setMilliseconds(-1);
      return d;
    };

    const inRange = (iso: string, from: Date, to: Date) => {
      try {
        const t = new Date(iso).getTime();
        return t >= from.getTime() && t <= to.getTime();
      } catch {
        return false;
      }
    };

    const todayStart = startOfToday();
    const yStart = startOfYesterday();
    const yEnd = endOfYesterday();

    const totalCustomers = customers.length;
    const totalShowrooms = showrooms.length || undefined;

    const normalize = (p: string) => {
      const digits = (p || '').replace(/\D+/g, '');
      return digits.length >= 10 ? digits.slice(-10) : digits;
    };

    const todayCustomers = customers.filter((c) => inRange(c.createdAt, todayStart, new Date()));
    const yCustomers = customers.filter((c) => inRange(c.createdAt, yStart, yEnd));

    const todaysVisitors = Number(visitorsToday || todayCustomers.length);
    const yVisitors = Number(visitorsYesterday || yCustomers.length);

    const todayCustomerPhones = new Set(todayCustomers.map((c) => normalize(c.phoneNumber)));
    const yCustomerPhones = new Set(yCustomers.map((c) => normalize(c.phoneNumber)));

    const todaysFeedbackMatches = feedbacks
      .filter((f) => inRange((f as any).createdAt || (f as any).date || '', todayStart, new Date()))
      .map((f) => normalize(f.phone || ''))
      .filter((p) => p && todayCustomerPhones.has(p)).length;

    const yFeedbackMatches = feedbacks
      .filter((f) => inRange((f as any).createdAt || (f as any).date || '', yStart, yEnd))
      .map((f) => normalize(f.phone || ''))
      .filter((p) => p && yCustomerPhones.has(p)).length;

    const performancePct = todaysVisitors > 0 ? Math.round((todaysFeedbackMatches / todaysVisitors) * 100) : 0;
    const yPerformancePct = yVisitors > 0 ? Math.round((yFeedbackMatches / yVisitors) * 100) : 0;

    const pctChange = (cur: number, prev: number) => {
      if (prev === 0) {
        if (cur === 0) return 0;
        return 100; // from 0 to something => +100%
      }
      return Math.round(((cur - prev) / prev) * 100);
    };

    const visitorsChange = pctChange(todaysVisitors, yVisitors);
    const perfDelta = performancePct - yPerformancePct; // show delta in percentage points

    const cumulativeYesterday = customers.filter((c) => inRange(c.createdAt, new Date(0), yEnd)).length;
    const cumulativeToday = totalCustomers; // equals customers.length (all fetched)
    const customersChange = pctChange(cumulativeToday, cumulativeYesterday);

    const yesterdayShowroomsTotal = showrooms.filter((s: any) => {
      const t = new Date((s as any)?.createdAt || 0).getTime();
      return t > 0 && t <= yEnd.getTime();
    }).length;
    const showroomChange = (() => {
      const cur = Number(totalShowrooms || 0);
      const prev = Number(yesterdayShowroomsTotal || 0);
      if (prev === 0) return cur === 0 ? 0 : 100;
      return Math.round(((cur - prev) / prev) * 100);
    })();

    return [
      { title: "Total Customers", value: String(totalCustomers), change: `${customersChange >= 0 ? "+" : ""}${customersChange}%`, lastMonth: "vs Yesterday total", icon: <Users className="w-5 h-5 text-gray-700" /> },
      { title: "Total Showrooms", value: String(totalShowrooms ?? '-') , change: `${showroomChange >= 0 ? "+" : ""}${showroomChange}%`, lastMonth: "vs Yesterday", icon: <Building2 className="w-5 h-5 text-gray-700" /> },
      { title: "Today's Visitors", value: String(visitorsToday), change: `${visitorsChange >= 0 ? "+" : ""}${visitorsChange}%`, lastMonth: "vs Yesterday", icon: <UserCheck className="w-5 h-5 text-gray-700" /> },
      { title: "Overall Performance", value: `${performancePct}%`, change: `${perfDelta >= 0 ? "+" : ""}${perfDelta}%`, lastMonth: "pts vs Yesterday", icon: <TrendingUp className="w-5 h-5 text-gray-700" /> },
    ];
  }, [customers, feedbacks, showrooms, visitorsToday, visitorsYesterday]);

  return <OverviewCards stats={stats} />;
}


