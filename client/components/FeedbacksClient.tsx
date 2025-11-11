'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';

import { Calendar, Eye, X } from 'lucide-react';
import Toast from '@/components/Toast';

interface Feedback {
  id: string;
  customerName: string;
  showroom: string;
  category: string;
  message: string;
  date: string;
  email?: string;
  phone?: string;
  status: 'new' | 'reviewed' | 'resolved';
}

const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export default function FeedbacksClient() {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [dateRange, setDateRange] = useState<'last7' | 'last30' | 'all'>('last30');
  const [selectedShowroom, setSelectedShowroom] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null);
  const [toastMessage, setToastMessage] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const router = useRouter();

  const show = (msg: string) => {
    setToastMessage(msg);
    setShowToast(true);
  };

  const handleStatusChange = async (id: string, status: 'new' | 'reviewed' | 'resolved') => {
    try {
      setUpdatingId(id);
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      if (!token) return show('Not authenticated');
      const res = await fetch(`${baseUrl}/api/user/feedbacks/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status }),
      });
      if (res.status === 401) {
        return;
      }
      if (!res.ok) throw new Error('Failed to update status');
      setFeedbacks((prev: Feedback[]) => prev.map((f: Feedback) => (f.id === id ? { ...f, status } : f)));
      show('Status updated');
    } catch (e: any) {
      show(e?.message || 'Failed to update status');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      if (!token) return show('Not authenticated');
      const res = await fetch(`${baseUrl}/api/user/feedbacks/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) {
        try { await fetch(`${baseUrl}/api/user/logout`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` } }); } catch { }
        if (typeof window !== 'undefined') localStorage.removeItem('token');
        router.push('/');
        return;
      }
      if (!res.ok) throw new Error('Failed to delete');
      setFeedbacks((prev: Feedback[]) => prev.filter((f: Feedback) => f.id !== id));
      setDeleteConfirmId(null);
      show('Feedback deleted');
    } catch (e: any) {
      show(e?.message || 'Failed to delete');
    }
  };

  const fetchFeedbacks = async () => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      if (!token) return show('Not authenticated');
      const showroomParam = selectedShowroom !== 'all' ? `&showroom=${encodeURIComponent(selectedShowroom)}` : '';
      const res = await fetch(`${baseUrl}/api/user/feedbacks?page=1&limit=50${showroomParam}&ts=${Date.now()}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store'
      });
      if (res.status === 401) {
        return;
      }
      if (!res.ok) throw new Error('Failed to load feedbacks');
      const data = await res.json();
      const mapped: Feedback[] = (data.feedbacks || []).map((d: any) => ({
        id: d.id,
        customerName: d.name,
        showroom: d.showroom || 'N/A',
        category: d.category || 'General',
        message: d.message,
        date: d.createdAt,
        email: d.email,
        phone: d.phone,
        status: (d.status as any) || 'new',
      }));
      setFeedbacks(mapped);
    } catch (e: any) {
      show(e.message || 'Error loading feedbacks');
    }
  };

  useEffect(() => {
    fetchFeedbacks();
  }, [selectedShowroom]);

  const showrooms = useMemo(() => {
    return Array.from(new Set(feedbacks.map((f) => f.showroom)));
  }, [feedbacks]);

  const categories = useMemo(() => {
    return Array.from(new Set(feedbacks.map((f) => f.category)));
  }, [feedbacks]);

  const filteredFeedbacks = useMemo(() => {
    const now = new Date();
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    return feedbacks.filter((feedback) => {
      let dateMatch = true;
      if (dateRange === 'last7') {
        dateMatch = new Date(feedback.date) >= last7Days;
      } else if (dateRange === 'last30') {
        dateMatch = new Date(feedback.date) >= last30Days;
      }

      const showroomMatch =
        selectedShowroom === 'all' || feedback.showroom === selectedShowroom;

      const categoryMatch =
        selectedCategory === 'all' || feedback.category === selectedCategory;

      return dateMatch && showroomMatch && categoryMatch;
    });
  }, [feedbacks, dateRange, selectedShowroom, selectedCategory]);

  const stats = useMemo(() => {
    const totalFeedbacks = filteredFeedbacks.length;
    return { totalFeedbacks };
  }, [filteredFeedbacks]);

  return (
    <div className="min-h-screen p-8 bg-white">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Feedback Management</h1>
          <p className="text-gray-600">View and manage customer feedbacks</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar size={16} className="inline mr-2" />
                Date Range
              </label>
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value as 'last7' | 'last30' | 'all')}
                className="w-full px-3 py-2 border text-black border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
              >
                <option value="last7">Last 7 Days</option>
                <option value="last30">Last 30 Days</option>
                <option value="all">All Time</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Showroom
              </label>
              <select
                value={selectedShowroom}
                onChange={(e) => setSelectedShowroom(e.target.value)}
                className="w-full px-3 py-2 text-black border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
              >
                <option value="all">All Showrooms</option>
                {showrooms.map((showroom) => (
                  <option key={showroom} value={showroom}>
                    {showroom}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-3 py-2 text-black border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
              >
                <option value="all">All Categories</option>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">
              Feedbacks ({filteredFeedbacks.length})
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Customer</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Showroom</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Category</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Date</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Status</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredFeedbacks.length > 0 ? (
                  filteredFeedbacks.map((feedback) => (
                    <tr key={feedback.id} className="border-b border-gray-200 hover:bg-gray-50 transition">
                      <td className="px-6 py-4 text-sm text-gray-900 font-medium">{feedback.customerName}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{feedback.showroom}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{feedback.category}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {new Date(feedback.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        <select
                          value={feedback.status}
                          onChange={(e) => handleStatusChange(feedback.id, e.target.value as 'new' | 'reviewed' | 'resolved')}
                          className="px-2 py-1 border border-gray-300 rounded-md"
                          disabled={updatingId === feedback.id}
                        >
                          <option value="new">new</option>
                          <option value="reviewed">reviewed</option>
                          <option value="resolved">resolved</option>
                        </select>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setSelectedFeedback(feedback)}
                            className="inline-flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition font-medium text-xs"
                          >
                            <Eye size={14} />
                            View
                          </button>
                          <div className="relative">
                            <button
                              onClick={() => setDeleteConfirmId(deleteConfirmId === feedback.id ? null : feedback.id)}
                              className="inline-flex items-center gap-2 px-3 py-1 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition font-medium text-xs"
                            >
                              Delete
                            </button>
                            {deleteConfirmId === feedback.id && (
                              <div className="absolute right-0 top-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg p-3 z-10 whitespace-nowrap">
                                <p className="text-sm font-medium text-gray-900 mb-2">Delete this feedback?</p>
                                <div className="flex gap-2">
                                  <button onClick={() => handleDelete(feedback.id)} className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition">Delete</button>
                                  <button onClick={() => setDeleteConfirmId(null)} className="px-3 py-1 bg-gray-200 text-gray-700 text-sm rounded hover:bg-gray-300 transition">Cancel</button>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500">No feedbacks found for the selected filters</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {selectedFeedback && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center"
            onClick={() => setSelectedFeedback(null)}
          >
            <div
              className="relative bg-white rounded-lg shadow-xl w-full max-w-md mx-4 p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setSelectedFeedback(null)}
                className="absolute top-4 right-4 p-1 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Close modal"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>

              <h2 className="text-2xl font-bold text-gray-900 mb-1">Feedback Details</h2>
              <p className="text-gray-600 text-sm mb-6">
                Received on{' '}
                {new Date(selectedFeedback.date).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Customer Name
                  </label>
                  <p className="text-gray-900">{selectedFeedback.customerName}</p>
                </div>

                {selectedFeedback.email && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email
                    </label>
                    <p className="text-gray-900 break-all">{selectedFeedback.email}</p>
                  </div>
                )}

                {selectedFeedback.phone && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phone
                    </label>
                    <p className="text-gray-900">{selectedFeedback.phone}</p>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Feedback Message
                  </label>
                  <p className="text-gray-900 bg-gray-50 p-3 rounded-lg">
                    {selectedFeedback.message}
                  </p>
                </div>
              </div>

              <div className="flex gap-3 pt-6 border-t border-gray-200 mt-6">
                <button
                  onClick={() => setSelectedFeedback(null)}
                  className="flex-1 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors font-medium"
                >
                  Close
                </button>
              </div>
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
    </div>
  );
}


