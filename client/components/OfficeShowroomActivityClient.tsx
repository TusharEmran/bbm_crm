'use client';

import React, { useState, useMemo } from 'react';
import { Calendar, Users, TrendingUp, Eye, X } from 'lucide-react';
import Toast from '@/components/Toast';

interface Customer {
  id: number;
  name: string;
  email: string;
  phone: string;
  visitTime: string;
  purchaseAmount?: number;
}

export interface ShowroomActivity {
  id: number;
  showroomName: string;
  visitorCount: number;
  accuracy: number;
  performance: number;
  date: string; // ISO string for serialization across the boundary
  status: 'Active' | 'Inactive';
  customers: Customer[];
}

interface Props {
  initialActivityData: ShowroomActivity[];
}

export default function OfficeShowroomActivityClient({ initialActivityData }: Props) {
  const [activityData] = useState<ShowroomActivity[]>(initialActivityData || []);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedShowroom, setSelectedShowroom] = useState<string>('all');
  const [selectedActivity, setSelectedActivity] = useState<ShowroomActivity | null>(null);
  const [toastMessage, setToastMessage] = useState('');
  const [showToast, setShowToast] = useState(false);

  const getAccuracyColor = (accuracy: number): string => {
    if (accuracy >= 90) return 'text-emerald-600';
    if (accuracy >= 80) return 'text-cyan-600';
    if (accuracy >= 70) return 'text-amber-600';
    return 'text-rose-600';
  };

  const getStatusColor = (status: string): string => {
    return status === 'Active'
      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
      : 'bg-slate-50 text-slate-700 border border-slate-200';
  };

  // Get unique showrooms and dates
  const showrooms = useMemo(() => {
    return Array.from(new Set(activityData.map((a) => a.showroomName))).sort();
  }, [activityData]);

  const dates = useMemo(() => {
    return Array.from(new Set(activityData.map((a) => a.date.split('T')[0]))).sort().reverse();
  }, [activityData]);

  // Filter data
  const filteredData = useMemo(() => {
    return activityData.filter((activity) => {
      const activityDate = activity.date.split('T')[0];
      const dateMatch = !selectedDate || activityDate === selectedDate;
      const showroomMatch = selectedShowroom === 'all' || activity.showroomName === selectedShowroom;
      return dateMatch && showroomMatch;
    });
  }, [activityData, selectedDate, selectedShowroom]);

  // Calculate statistics
  const stats = useMemo(() => {
    const totalVisitors = filteredData.reduce((sum, a) => sum + a.visitorCount, 0);
    const avgAccuracy = filteredData.length > 0
      ? (filteredData.reduce((sum, a) => sum + a.accuracy, 0) / filteredData.length).toFixed(1)
      : 0;
    const avgPerformance = filteredData.length > 0
      ? (filteredData.reduce((sum, a) => sum + a.performance, 0) / filteredData.length).toFixed(1)
      : 0;

    return { totalVisitors, avgAccuracy, avgPerformance };
  }, [filteredData]);

  const handleViewDetails = (activity: ShowroomActivity) => {
    setSelectedActivity(activity);
  };

  const closeDetailsModal = () => {
    setSelectedActivity(null);
  };

  return (
    <div className="min-h-screen p-8 bg-white">
      <div className="max-w-7xl mx-auto">
        <div className="mb-10">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Showroom Activity</h1>
          <p className="text-slate-600 text-lg">Monitor visitor traffic and performance metrics across showrooms</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-8 hover:shadow-md transition-shadow duration-300">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Total Visitors</p>
                <p className="text-5xl font-bold text-slate-900">{stats.totalVisitors}</p>
                <p className="text-xs text-slate-400 mt-3">across selected filters</p>
              </div>
              <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl">
                <Users className="w-8 h-8 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-8 hover:shadow-md transition-shadow duration-300">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Avg Accuracy</p>
                <p className={`text-5xl font-bold ${getAccuracyColor(parseFloat(String(stats.avgAccuracy)))}`}>
                  {stats.avgAccuracy}%
                </p>
                <p className="text-xs text-slate-400 mt-3">data quality score</p>
              </div>
              <div className="p-4 bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl">
                <TrendingUp className="w-8 h-8 text-emerald-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-8 hover:shadow-md transition-shadow duration-300">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Avg Performance</p>
                <p className="text-5xl font-bold text-slate-900">{stats.avgPerformance}%</p>
                <p className="text-xs text-slate-400 mt-3">operational efficiency</p>
              </div>
              <div className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl">
                <TrendingUp className="w-8 h-8 text-purple-600" />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-8 mb-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-bold text-slate-900 mb-3">
                <Calendar size={16} className="inline mr-2" />
                Select Date
              </label>
              <select
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 transition bg-white text-slate-900 font-medium"
              >
                <option value="">All Dates</option>
                {dates.map((date) => (
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

            <div>
              <label className="block text-sm font-bold text-slate-900 mb-3">
                Select Showroom
              </label>
              <select
                value={selectedShowroom}
                onChange={(e) => setSelectedShowroom(e.target.value)}
                className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 transition bg-white text-slate-900 font-medium"
              >
                <option value="all">All Showrooms</option>
                {showrooms.map((showroom) => (
                  <option key={showroom} value={showroom}>
                    {showroom}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-8 border-b border-slate-100">
            <h2 className="text-xl font-bold text-slate-900">Activity Records ({filteredData.length})</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-8 py-4 text-left text-sm font-bold text-slate-900">Showroom Name</th>
                  <th className="px-8 py-4 text-left text-sm font-bold text-slate-900">Visitor Count</th>
                  <th className="px-8 py-4 text-left text-sm font-bold text-slate-900">Accuracy</th>
                  <th className="px-8 py-4 text-left text-sm font-bold text-slate-900">Performance</th>
                  <th className="px-8 py-4 text-left text-sm font-bold text-slate-900">Status</th>
                  <th className="px-8 py-4 text-left text-sm font-bold text-slate-900">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.length > 0 ? (
                  filteredData.map((activity, idx) => (
                    <tr
                      key={activity.id}
                      className={`border-b border-slate-100 hover:bg-slate-50 transition ${idx === filteredData.length - 1 ? 'border-b-0' : ''}`}
                    >
                      <td className="px-8 py-5 text-sm font-semibold text-slate-900">{activity.showroomName}</td>
                      <td className="px-8 py-5 text-sm">
                        <div className="flex items-center gap-2">
                          <Users size={16} className="text-blue-600" />
                          <span className="font-semibold text-slate-900">{activity.visitorCount}</span>
                        </div>
                      </td>
                      <td className="px-8 py-5 text-sm">
                        <span className={`px-3 py-1.5 rounded-lg text-xs font-bold ${getAccuracyColor(activity.accuracy)}`}>{activity.accuracy}%</span>
                      </td>
                      <td className="px-8 py-5 text-sm">
                        <div className="flex items-center gap-3">
                          <div className="w-28 bg-slate-200 rounded-full h-2">
                            <div className="h-2 rounded-full bg-gradient-to-r from-blue-500 to-blue-600" style={{ width: `${activity.performance}%` }} />
                          </div>
                          <span className="font-semibold text-slate-900 text-xs min-w-[40px]">{activity.performance}%</span>
                        </div>
                      </td>
                      <td className="px-8 py-5 text-sm">
                        <span className={`px-3 py-1.5 rounded-lg text-xs font-bold ${getStatusColor(activity.status)}`}>{activity.status}</span>
                      </td>
                      <td className="px-8 py-5 text-sm">
                        <button onClick={() => handleViewDetails(activity)} className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition font-semibold text-xs border border-blue-200">
                          <Eye size={16} />
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-8 py-12 text-center text-slate-500">No activity records found for the selected filters</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {selectedActivity && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={closeDetailsModal}>
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-6 flex items-center justify-between border-b border-blue-500">
              <div>
                <h2 className="text-2xl font-bold text-white">{selectedActivity.showroomName}</h2>
                <p className="text-blue-100 text-sm mt-1">{new Date(selectedActivity.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
              </div>
              <button onClick={closeDetailsModal} className="p-2 hover:bg-blue-500 rounded-lg transition text-white">
                <X size={24} />
              </button>
            </div>

            <div className="p-8">
              <div className="grid grid-cols-3 gap-4 mb-8">
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <p className="text-xs text-blue-600 font-semibold mb-2">Total Visitors</p>
                  <p className="text-2xl font-bold text-blue-900">{selectedActivity.visitorCount}</p>
                </div>
                <div className="bg-emerald-50 rounded-lg p-4 border border-emerald-200">
                  <p className="text-xs text-emerald-600 font-semibold mb-2">Accuracy</p>
                  <p className={`text-2xl font-bold ${getAccuracyColor(selectedActivity.accuracy)}`}>{selectedActivity.accuracy}%</p>
                </div>
                <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                  <p className="text-xs text-purple-600 font-semibold mb-2">Performance</p>
                  <p className="text-2xl font-bold text-purple-900">{selectedActivity.performance}%</p>
                </div>
              </div>

              <h3 className="text-lg font-bold text-slate-900 mb-4">Customer List</h3>
              <div className="space-y-3">
                {selectedActivity.customers.map((customer) => (
                  <div key={customer.id} className="flex items-start justify-between p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition">
                    <div className="flex-1">
                      <p className="font-semibold text-slate-900">{customer.name}</p>
                      <p className="text-xs text-slate-500 mt-1">{customer.email}</p>
                      <p className="text-xs text-slate-500">{customer.phone}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-slate-900">{customer.visitTime}</p>
                      {customer.purchaseAmount && (
                        <p className="text-sm text-emerald-600 font-semibold mt-1">${customer.purchaseAmount}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <Toast message={toastMessage} show={showToast} onClose={() => setShowToast(false)} duration={3000} />
    </div>
  );
}
