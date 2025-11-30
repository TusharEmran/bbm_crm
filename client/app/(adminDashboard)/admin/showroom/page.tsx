'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Activity, TrendingUp, Users, Clock, Plus, X } from 'lucide-react';
import Toast from '@/components/Toast';

interface ShowroomActivity {
  id: number;
  showroomName: string;
  dailyVisitors: number;
  accuracy: number;
  performance: number;
  lastActivity: Date;
  status: 'Active' | 'Inactive';
}

const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

const getAccuracyColor = (accuracy: number): string => {
  if (accuracy >= 90) return 'bg-green-500';
  if (accuracy >= 80) return 'bg-blue-500';
  if (accuracy >= 70) return 'bg-yellow-500';
  return 'bg-red-500';
};

const getAccuracyTextColor = (accuracy: number): string => {
  if (accuracy >= 90) return 'text-green-700 bg-green-50';
  if (accuracy >= 80) return 'text-blue-700 bg-blue-50';
  if (accuracy >= 70) return 'text-yellow-700 bg-yellow-50';
  return 'text-red-700 bg-red-50';
};

const getStatusColor = (status: string): string => {
  return status === 'Active'
    ? 'bg-green-100 text-green-800'
    : 'bg-gray-100 text-gray-800';
};

export default function ShowroomActivityPage() {
  const [showroomData, setShowroomData] = useState<ShowroomActivity[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'visitors' | 'accuracy' | 'name'>('visitors');
  const [toastMessage, setToastMessage] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [totalCustomers, setTotalCustomers] = useState<number>(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newShowroomName, setNewShowroomName] = useState('');
  const [isSavingShowroom, setIsSavingShowroom] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        if (!token) throw new Error('অনুগ্রহ করে লগইন করুন');
        const params = new URLSearchParams();
        params.set('ts', String(Date.now()));
        const [custRes, summaryRes] = await Promise.all([
          fetch(`${baseUrl}/api/user/showroom/customers?limit=10000&ts=${params.get('ts')}`, {
            headers: { Authorization: `Bearer ${token}` },
            credentials: 'include',
            cache: 'no-store',
          }),
          fetch(`${baseUrl}/api/user/analytics/showroom-summary?${params.toString()}`, {
            headers: { Authorization: `Bearer ${token}` },
            cache: 'no-store',
          }),
        ]);

        if (!custRes.ok) throw new Error('গ্রাহকের তথ্য লোড করতে ব্যর্থ হয়েছে');
        if (!summaryRes.ok) throw new Error('শোরুম সামারি লোড করতে ব্যর্থ হয়েছে');

        const [custData, summaryData] = await Promise.all([
          custRes.json(),
          summaryRes.json(),
        ]);

        const customers = Array.isArray(custData.customers) ? custData.customers : [];
        setTotalCustomers(customers.length);

        const items = Array.isArray(summaryData.items) ? summaryData.items : [];

        const mapped: ShowroomActivity[] = items.map((it: any, idx: number) => {
          const showroomName = it.showroom || 'অজানা শোরুম';
          return {
          id: idx + 1,
          showroomName,
          dailyVisitors: Number(it.uniqueCustomers || 0),
          accuracy: Number(it.accuracy || 0),
          performance: Number(it.performance || 0),
          lastActivity: it.lastActivity ? new Date(it.lastActivity) : new Date(0),
          status: (it.status === 'Active' ? 'Active' : 'Inactive') as 'Active' | 'Inactive',
        };
        });
        setShowroomData(mapped);
      } catch (e: any) {
        setToastMessage(e?.message || 'শোরুম সামারি লোড করতে সমস্যা হয়েছে');
        setShowToast(true);
      }
    };
    load();
  }, []);

  const filteredAndSortedData = useMemo(() => {
    let filtered = showroomData.filter((showroom) =>
      showroom.showroomName.toLowerCase().includes(searchQuery.toLowerCase())
    );

    switch (sortBy) {
      case 'visitors':
        filtered.sort((a, b) => b.dailyVisitors - a.dailyVisitors);
        break;
      case 'accuracy':
        filtered.sort((a, b) => b.accuracy - a.accuracy);
        break;
      case 'name':
        filtered.sort((a, b) => a.showroomName.localeCompare(b.showroomName));
        break;
    }

    return filtered;
  }, [showroomData, searchQuery, sortBy]);

  const stats = useMemo(() => {
    const totalVisitors = totalCustomers;
    const avgAccuracy = (
      showroomData.reduce((sum, s) => sum + s.performance, 0) / (showroomData.length || 1)
    ).toFixed(1);
    const activeShowrooms = showroomData.filter((s) => s.status === 'Active').length;

    return { totalVisitors, avgAccuracy, activeShowrooms };
  }, [showroomData, totalCustomers]);

  const formatLastActivity = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'এইমাত্র';
    if (diffMins < 60) return `${diffMins} মিনিট আগে`;
    if (diffHours < 24) return `${diffHours} ঘন্টা আগে`;
    return `${diffDays} দিন আগে`;
  };

  return (
    <div className="min-h-screen p-8 bg-white">
      <div className="max-w-7xl mx-auto">
        { }
        <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">শোরুম কার্যক্রম</h1>
            <p className="text-gray-600">শোরুমের পারফরম্যান্স ও ভিজিটর মেট্রিক্স মনিটর করুন</p>
          </div>
          <button
            type="button"
            onClick={() => { setNewShowroomName(''); setIsModalOpen(true); }}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-gray-900 text-white text-sm font-semibold hover:bg-gray-800 shadow-sm"
          >
            <Plus size={18} />
            শোরুম যোগ করুন
          </button>
        </div>

        { }
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          { }
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-600 mb-1">মোট গ্রাহক</h3>
                <p className="text-3xl font-bold text-gray-900">{stats.totalVisitors}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          { }
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-600 mb-1">গড় পারফরম্যান্স</h3>
                <p className="text-3xl font-bold text-gray-900">{stats.avgAccuracy}%</p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          { }
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-600 mb-1">সক্রিয় শোরুম</h3>
                <p className="text-3xl font-bold text-gray-900">
                  {stats.activeShowrooms}/{showroomData.length}
                </p>
              </div>
              <div className="p-3 bg-purple-100 rounded-lg">
                <Activity className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>
        </div>

        { }
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            { }
            <div>
              <input
                type="text"
                placeholder="শোরুম খুঁজুন..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 border text-black border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 transition"
              />
            </div>

            { }
            <div>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'visitors' | 'accuracy' | 'name')}
                className="w-full px-4 py-2 border text-black border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 transition"
              >
                <option value="visitors">সোর্ট করুন: দৈনিক ভিজিটর</option>
                <option value="accuracy">সোর্ট করুন: পারফরম্যান্স</option>
                <option value="name">সোর্ট করুন: নাম</option>
              </select>
            </div>
          </div>
        </div>

        { }
        <div className="bg-white rounded-lg shadow overflow-hidden">
          { }
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">
              Showroom Performance ({filteredAndSortedData.length})
            </h2>
          </div>

          { }
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    শোরুমের নাম
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    দৈনিক ভিজিটর
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    পারফরম্যান্স
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    সর্বশেষ কার্যক্রম
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    স্ট্যাটাস
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredAndSortedData.length > 0 ? (
                  filteredAndSortedData.map((showroom) => (
                    <tr
                      key={showroom.id}
                      className="border-b border-gray-200 hover:bg-gray-50 transition"
                    >
                      <td className="px-6 py-4 text-sm text-gray-900 font-medium">
                        {showroom.showroomName}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div className="flex items-center gap-2">
                          <Users size={16} className="text-blue-600" />
                          <span className="text-gray-900 font-medium">
                            {showroom.dailyVisitors}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getAccuracyTextColor(showroom.performance)}`}>
                              {showroom.performance}%
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full transition-all ${getAccuracyColor(
                                showroom.performance
                              )}`}
                              style={{ width: `${Math.max(-100, Math.min(100, showroom.performance))}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div className="flex items-center gap-2 text-gray-600">
                          <Clock size={16} />
                          <span>{formatLastActivity(showroom.lastActivity)}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(
                            showroom.status
                          )}`}
                        >
                          {showroom.status}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                      আপনার অনুসন্ধানের সাথে মিলিয়ে কোন শোরুম পাওয়া যায়নি
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        { }
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          { }
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">সর্বোচ্চ পারফরম্যান্স</h3>
            {showroomData.length > 0 && (
              <div>
                <p className="text-lg font-bold text-gray-900">
                  {showroomData.reduce((max, s) => (s.performance > max.performance ? s : max)).showroomName}
                </p>
                <p className="text-2xl font-bold text-green-600 mt-1">
                  {Math.max(...showroomData.map((s) => s.performance))}%
                </p>
              </div>
            )}
          </div>

          { }
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">সর্বাধিক ভিজিটর</h3>
            {showroomData.length > 0 && (
              <div>
                <p className="text-lg font-bold text-gray-900">
                  {showroomData.reduce((max, s) => (s.dailyVisitors > max.dailyVisitors ? s : max)).showroomName}
                </p>
                <p className="text-2xl font-bold text-blue-600 mt-1">
                  {Math.max(...showroomData.map((s) => s.dailyVisitors))} জন ভিজিটর
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      { }

      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => !isSavingShowroom && setIsModalOpen(false)}
        >
          <div
            className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-auto p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => !isSavingShowroom && setIsModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-gray-100 text-gray-500"
              aria-label="Close"
            >
              <X size={18} />
            </button>
            <h2 className="text-xl font-bold text-gray-900 mb-1">নতুন শোরুম যোগ করুন</h2>
            <p className="text-sm text-gray-600 mb-5">শোরুমের নাম লিখে সেভ করুন।</p>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const name = newShowroomName.trim();
                if (!name) {
                  setToastMessage('অনুগ্রহ করে শোরুমের নাম লিখুন');
                  setShowToast(true);
                  return;
                }
                try {
                  setIsSavingShowroom(true);
                  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
                  if (!token) throw new Error('অনুগ্রহ করে লগইন করুন');
                  const res = await fetch(`${baseUrl}/api/user/showrooms`, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({ name }),
                  });
                  if (!res.ok) {
                    const txt = await res.text();
                    throw new Error(txt || 'শোরুম যোগ করতে ব্যর্থ হয়েছে');
                  }
                  setToastMessage(`"${name}" শোরুম সফলভাবে যোগ হয়েছে!`);
                  setShowToast(true);
                  setIsModalOpen(false);
                  setNewShowroomName('');
                } catch (err: any) {
                  setToastMessage(err?.message || 'শোরুম যোগ করতে সমস্যা হয়েছে');
                  setShowToast(true);
                } finally {
                  setIsSavingShowroom(false);
                }
              }}
              className="space-y-4 mt-2"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">শোরুমের নাম</label>
                <input
                  type="text"
                  value={newShowroomName}
                  onChange={(e) => setNewShowroomName(e.target.value)}
                  placeholder="যেমন, ডাউনটাউন শোরুম"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 text-black"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  disabled={isSavingShowroom}
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-900 rounded-lg transition font-medium disabled:opacity-60"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={isSavingShowroom}
                  className="flex-1 px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white rounded-lg transition font-medium disabled:opacity-60"
                >
                  {isSavingShowroom ? 'সেভ হচ্ছে...' : 'শোরুম সেভ করুন'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <Toast
        message={toastMessage}
        show={showToast}
        onClose={() => setShowToast(false)}
        duration={3000}
      />
    </div>
  );
}

