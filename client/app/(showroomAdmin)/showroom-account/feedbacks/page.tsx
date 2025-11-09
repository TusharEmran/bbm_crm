'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { MessageSquare, Calendar, Phone, Search } from 'lucide-react';
import Toast from '@/components/Toast';
import { useRouter } from 'next/navigation';

interface FeedbackItem {
  id: string;
  customerName: string;
  phone: string;
  message: string;
  date: string;
  showroom: string;
  category: string;
  email?: string;
  status: 'new' | 'reviewed' | 'resolved';
}

export default function FeedbackSummaryPage() {
  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [phoneSearch, setPhoneSearch] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const [limit] = useState<number>(20);
  const [total, setTotal] = useState<number>(0);
  const [toastMessage, setToastMessage] = useState('');
  const [showToast, setShowToast] = useState(false);
  const router = useRouter();
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

  const fetchFeedbacks = async () => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      if (!token) return;
      const res = await fetch(`${baseUrl}/api/user/feedbacks?page=${page}&limit=${limit}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) {
        try {
          await fetch(`${baseUrl}/api/user/logout`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` } });
        } catch {}
        if (typeof window !== 'undefined') localStorage.removeItem('token');
        router.push('/');
        return;
      }
      if (!res.ok) throw new Error('Failed to load feedbacks');
      const data = await res.json();
      const items: FeedbackItem[] = (data.feedbacks || []).map((d: any) => ({
        id: d.id,
        customerName: d.name,
        phone: d.phone || '',
        message: d.message || '',
        date: d.createdAt,
        showroom: d.showroom || '',
        category: d.category || '',
        email: d.email || '',
        status: (d.status as any) || 'new',
      }));
      setFeedbacks(items);
      if (typeof data.total === 'number') setTotal(data.total);
    } catch (e: any) {
      setToastMessage(e?.message || 'Error loading feedbacks');
      setShowToast(true);
    }
  };

  useEffect(() => {
    fetchFeedbacks();
  }, [page, limit]);

  const uniqueDates = useMemo(() => {
    return Array.from(new Set(feedbacks.map((f) => (f.date || '').toString().split('T')[0]))).sort().reverse();
  }, [feedbacks]);

  const filteredFeedback = useMemo(() => {
    return feedbacks.filter((item) => {
      const dateStr = (item.date || '').toString().split('T')[0];
      const dateMatch = !selectedDate || dateStr === selectedDate;
      const phoneMatch = !phoneSearch || (item.phone || '').includes(phoneSearch);
      return dateMatch && phoneMatch;
    });
  }, [feedbacks, selectedDate, phoneSearch]);

  const stats = useMemo(() => {
    return { total: filteredFeedback.length };
  }, [filteredFeedback]);

  const handleClearFilters = () => {
    setSelectedDate('');
    setPhoneSearch('');
    setToastMessage('Filters cleared!');
    setShowToast(true);
    setPage(1);
  };

  return (
    <div className="min-h-screen p-8 bg-white">
      <div className="max-w-7xl mx-auto">
        {}
        <div className="mb-10">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Feedback Summary</h1>
          <p className="text-slate-600 text-lg">View and analyze customer feedback and reviews</p>
        </div>

        {}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
          {}
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-8 hover:shadow-md transition-shadow duration-300">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Total Feedback</p>
                <p className="text-4xl font-bold text-slate-900">{stats.total}</p>
                <p className="text-xs text-slate-400 mt-2">customer reviews</p>
              </div>
              <div className="p-4 gradient-to-br from-blue-50 to-blue-100 rounded-xl">
                <MessageSquare className="w-8 h-8 text-blue-600" />
              </div>
            </div>
          </div>
        </div>

        {}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-8 mb-10">
          <h2 className="text-xl font-bold text-slate-900 mb-6">Filters</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {}
            <div>
              <label className="block text-sm font-bold text-slate-900 mb-3">
                <Calendar size={16} className="inline mr-2" />
                Select Date
              </label>
              <select
                value={selectedDate}
                onChange={(e) => { setSelectedDate(e.target.value); setPage(1); }}
                className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 transition bg-white text-slate-900 font-medium"
              >
                <option value="">All Dates</option>
                {uniqueDates.map((date) => (
                  <option key={date} value={date}>
                    {new Date(date).toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </option>
                ))}
              </select>
            </div>

            {}
            <div>
              <label className="block text-sm font-bold text-slate-900 mb-3">
                <Phone size={16} className="inline mr-2" />
                Search by Phone
              </label>
              <div className="relative">
                <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Enter phone number..."
                  value={phoneSearch}
                  onChange={(e) => { setPhoneSearch(e.target.value); setPage(1); }}
                  className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 transition text-slate-900 font-medium"
                />
              </div>
            </div>

            {}
            <div className="flex items-end">
              <button
                onClick={handleClearFilters}
                className="w-full px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold transition"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>

        {}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
          {}
          <div className="p-8 border-b border-slate-100">
            <h2 className="text-xl font-bold text-slate-900">
              Customer Feedback ({stats.total})
            </h2>
          </div>

          {}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-8 py-4 text-left text-sm font-bold text-slate-900">Customer Name</th>
                  <th className="px-8 py-4 text-left text-sm font-bold text-slate-900">Phone</th>
                  <th className="px-8 py-4 text-left text-sm font-bold text-slate-900">Feedback</th>
                  <th className="px-8 py-4 text-left text-sm font-bold text-slate-900">Date</th>
                </tr>
              </thead>
              <tbody>
                {filteredFeedback.length > 0 ? (
                  filteredFeedback.map((feedback, idx) => (
                    <tr
                      key={feedback.id}
                      className={`border-b border-slate-100 hover:bg-slate-50 transition ${
                        idx === filteredFeedback.length - 1 ? 'border-b-0' : ''
                      }`}
                    >
                      {}
                      <td className="px-8 py-5 text-sm font-semibold text-slate-900">
                        {feedback.customerName}
                      </td>

                      {}
                      <td className="px-8 py-5 text-sm text-slate-600 font-medium">
                        {feedback.phone}
                      </td>

                      {}
                      <td className="px-8 py-5 text-sm text-slate-600 max-w-xs">
                        <div className="truncate hover:text-clip" title={feedback.message}>
                          {feedback.message}
                        </div>
                      </td>

                      {}
                      <td className="px-8 py-5 text-sm text-slate-600 font-medium">
                        {new Date(feedback.date).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-8 py-12 text-center text-slate-500">
                      <p className="text-lg font-semibold">No feedback found</p>
                      <p className="text-sm mt-2">Try adjusting your filters to see feedback entries.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {}
          {filteredFeedback.length > 0 && (
            <div className="p-6 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-4">
              <div className="text-sm text-slate-600 font-medium">
                Page <span className="font-bold text-slate-900">{page}</span> of{' '}
                <span className="font-bold text-slate-900">{Math.max(1, Math.ceil((total || 0) / limit))}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold ${page <= 1 ? 'bg-slate-100 text-slate-400' : 'bg-slate-900 text-white hover:bg-slate-800'}`}
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page >= Math.ceil((total || 0) / limit)}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold ${page >= Math.ceil((total || 0) / limit) ? 'bg-slate-100 text-slate-400' : 'bg-slate-900 text-white hover:bg-slate-800'}`}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {}
      <Toast
        message={toastMessage}
        show={showToast}
        onClose={() => setShowToast(false)}
        duration={3000}
      />
    </div>
  );
}

