'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Edit2, Trash2, X, Save, Calendar } from 'lucide-react';
import Toast from '@/components/Toast';

interface Customer {
  id: string;
  name: string;
  phone: string;
  category: string;
  visitDate: string;
  createdAt: string;
  feedbackStatus: 'Received' | 'Pending' | 'No Feedback';
}

interface EditingCustomer {
  id: string;
  name: string;
  phone: string;
  category: string;
}

const formatVisitTime = (iso: string): string => {
  try {
    const d = new Date(iso);
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
  } catch {
    return iso;
  }
};


const getFeedbackStatusColor = (status: string): string => {
  switch (status) {
    case 'Received':
      return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
    case 'Pending':
      return 'bg-amber-50 text-amber-700 border border-amber-200';
    case 'No Feedback':
      return 'bg-slate-50 text-slate-700 border border-slate-200';
    default:
      return 'bg-slate-50 text-slate-700 border border-slate-200';
  }
};

export default function EditEntriesPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingData, setEditingData] = useState<EditingCustomer | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
  const [categories, setCategories] = useState<string[]>([]);

  const show = (msg: string) => { setToastMessage(msg); setShowToast(true); };

  const normalizePhone = (p: string): string => {
    const digits = (p || '').replace(/\D+/g, '');
    if (digits.length >= 10) return digits.slice(-10);
    return digits;
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

  const loadCustomers = async () => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      if (!token) return show('Not authenticated');
      const [custRes, fbRes] = await Promise.all([
        fetch(`${baseUrl}/api/user/showroom/customers?limit=500`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${baseUrl}/api/user/feedbacks?page=1&limit=500`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      if (!custRes.ok) throw new Error('Failed to load entries');
      if (fbRes.status === 401) {
        try { await fetch(`${baseUrl}/api/user/logout`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` } }); } catch {}
        if (typeof window !== 'undefined') localStorage.removeItem('token');
        return;
      }
      const [custData, fbData] = await Promise.all([custRes.json(), fbRes.ok ? fbRes.json() : Promise.resolve({ feedbacks: [] })]);
      const fbPhones = new Set<string>((fbData.feedbacks || []).map((f: any) => normalizePhone(f.phone || '')));
      const mapped: Customer[] = (custData.customers || [])
        .map((c: any) => {
          const hasFeedback = fbPhones.has(normalizePhone(c.phoneNumber));
          const status: 'Received' | 'Pending' | 'No Feedback' = hasFeedback
            ? 'Received'
            : isWithinHours(c.createdAt, 6)
              ? 'Pending'
              : 'No Feedback';
          return {
            id: String(c.id || c._id),
            name: c.customerName,
            phone: c.phoneNumber,
            category: c.category,
            visitDate: formatVisitTime(c.createdAt),
            createdAt: c.createdAt,
            feedbackStatus: status,
          };
        })
        .filter((c: Customer) => isToday(c.createdAt));
      setCustomers(mapped);
    } catch (e: any) {
      show(e?.message || 'Error loading entries');
    }
  };

  useEffect(() => {
    loadCustomers();

  }, []);

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const res = await fetch(`${baseUrl}/api/user/categories-public`);
        if (!res.ok) return;
        const data = await res.json();
        const names: string[] = (data.categories || []).map((c: any) => c.name || c);
        setCategories(names);
      } catch {}
    };
    loadCategories();
  }, [baseUrl]);

  const filteredCustomers = useMemo(() => {
    return customers.filter((customer) =>
      customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.phone.includes(searchQuery) ||
      customer.category.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [customers, searchQuery]);

  const handleEdit = (customer: Customer) => {
    setEditingId(customer.id);
    setEditingData({
      id: customer.id,
      name: customer.name,
      phone: customer.phone,
      category: customer.category,
    });
  };

  const handleSaveEdit = async (id: string) => {
    if (!editingData) return;

    if (!editingData.name.trim()) return show('Customer name cannot be empty');
    if (!editingData.phone.trim()) return show('Phone number cannot be empty');
    if (!editingData.category) return show('Category cannot be empty');

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      if (!token) return show('Not authenticated');
      const res = await fetch(`${baseUrl}/api/user/showroom/customers/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ customerName: editingData.name, phoneNumber: editingData.phone, category: editingData.category }),
      });
      if (!res.ok) throw new Error('Failed to update');
      const data = await res.json();
      const u = data.customer;
      setCustomers(customers.map((c) => (c.id === id ? { ...c, name: u.customerName, phone: u.phoneNumber, category: u.category } : c)));
      setEditingId(null);
      setEditingData(null);
      show('Customer information updated successfully!');
    } catch (e: any) {
      show(e?.message || 'Update failed');
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingData(null);
  };

  const handleDeleteConfirm = async (id: string) => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      if (!token) return show('Not authenticated');
      const res = await fetch(`${baseUrl}/api/user/showroom/customers/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to delete');
      const customer = customers.find((c) => c.id === id);
      setCustomers(customers.filter((c) => c.id !== id));
      setDeleteConfirmId(null);
      show(`${customer?.name || 'Entry'} has been deleted successfully!`);
    } catch (e: any) {
      show(e?.message || 'Delete failed');
    }
  };

  const handleEditFieldChange = (field: keyof EditingCustomer, value: string) => {
    if (editingData) {
      setEditingData({ ...editingData, [field]: value });
    }
  };

  return (
    <div className="min-h-screen p-8 bg-white">
      <div className="max-w-7xl mx-auto">
        {}
        <div className="mb-10">
 
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Edit Today's Entries</h1>
          <p className="text-slate-600 text-lg">Manage and update customer information for today's visits</p>
        </div>

        {}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 mb-10">
          <div className="relative">
            <svg className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search by name, phone, or category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 transition text-slate-900 font-medium"
            />
          </div>
        </div>

        {}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
          {}
          <div className="p-8 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <Calendar className="w-6 h-6 text-slate-900" />
              <div>
                <h2 className="text-xl font-bold text-slate-900">Today's Customer Entries</h2>
                <p className="text-sm text-slate-500 mt-1">{filteredCustomers.length} customer{filteredCustomers.length !== 1 ? 's' : ''} in total</p>
              </div>
            </div>
          </div>

          {}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-8 py-4 text-left text-sm font-bold text-slate-900">Customer Name</th>
                  <th className="px-8 py-4 text-left text-sm font-bold text-slate-900">Phone</th>
                  <th className="px-8 py-4 text-left text-sm font-bold text-slate-900">Category</th>
                  <th className="px-8 py-4 text-left text-sm font-bold text-slate-900">Visit Time</th>
                  <th className="px-8 py-4 text-left text-sm font-bold text-slate-900">Feedback Status</th>
                  <th className="px-8 py-4 text-center text-sm font-bold text-slate-900">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.length > 0 ? (
                  filteredCustomers.map((customer, idx) => (
                    <tr
                      key={customer.id}
                      className={`border-b border-slate-100 hover:bg-slate-50 transition ${
                        idx === filteredCustomers.length - 1 ? 'border-b-0' : ''
                      }`}
                    >
                      {}
                      <td className="px-8 py-5 text-sm">
                        {editingId === customer.id && editingData ? (
                          <input
                            type="text"
                            value={editingData.name}
                            onChange={(e) => handleEditFieldChange('name', e.target.value)}
                            className="w-full px-3 py-2 border border-blue-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 text-slate-900 font-semibold"
                          />
                        ) : (
                          <span className="font-semibold text-slate-900">{customer.name}</span>
                        )}
                      </td>

                      {}
                      <td className="px-8 py-5 text-sm">
                        {editingId === customer.id && editingData ? (
                          <input
                            type="tel"
                            value={editingData.phone}
                            onChange={(e) => handleEditFieldChange('phone', e.target.value)}
                            className="w-full px-3 py-2 border border-blue-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 text-slate-900 font-medium"
                          />
                        ) : (
                          <span className="text-slate-600 font-medium">{customer.phone}</span>
                        )}
                      </td>

                      {}
                      <td className="px-8 py-5 text-sm">
                        {editingId === customer.id && editingData ? (
                          <select
                            value={editingData.category}
                            onChange={(e) => handleEditFieldChange('category', e.target.value)}
                            className="w-full px-3 py-2 border border-blue-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 bg-white text-slate-900 font-medium"
                          >
                            {categories.map((cat) => (
                              <option key={cat} value={cat}>
                                {cat}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-xs font-bold inline-block">
                            {customer.category}
                          </span>
                        )}
                      </td>

                      {}
                      <td className="px-8 py-5 text-sm text-slate-600 font-medium">
                        {customer.visitDate}
                      </td>

                      {}
                      <td className="px-8 py-5 text-sm">
                        <span className={`px-3 py-1.5 rounded-lg text-xs font-bold ${getFeedbackStatusColor(customer.feedbackStatus)}`}>
                          {customer.feedbackStatus}
                        </span>
                      </td>

                      {}
                      <td className="px-8 py-5 text-sm">
                        <div className="flex items-center justify-center gap-2">
                          {editingId === customer.id ? (
                            <>
                              <button
                                onClick={() => handleSaveEdit(customer.id)}
                                className="p-2 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 rounded-lg transition"
                                title="Save changes"
                              >
                                <Save size={18} />
                              </button>
                              <button
                                onClick={handleCancelEdit}
                                className="p-2 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-lg transition"
                                title="Cancel editing"
                              >
                                <X size={18} />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => handleEdit(customer)}
                                className="p-2 bg-blue-100 text-blue-600 hover:bg-blue-200 rounded-lg transition"
                                title="Edit customer"
                              >
                                <Edit2 size={18} />
                              </button>
                              <div className="relative">
                                <button
                                  onClick={() =>
                                    setDeleteConfirmId(deleteConfirmId === customer.id ? null : customer.id)
                                  }
                                  className="p-2 bg-red-100 text-red-600 hover:bg-red-200 rounded-lg transition"
                                  title="Delete customer"
                                >
                                  <Trash2 size={18} />
                                </button>

                                {}
                                {deleteConfirmId === customer.id && (
                                  <div className="absolute right-0 top-full mt-2 bg-white border border-slate-200 rounded-lg shadow-lg p-3 z-10 whitespace-nowrap">
                                    <p className="text-sm font-medium text-slate-900 mb-3">Delete this entry?</p>
                                    <div className="flex gap-2">
                                      <button
                                        onClick={() => handleDeleteConfirm(customer.id)}
                                        className="px-3 py-1.5 bg-red-600 text-white text-xs rounded hover:bg-red-700 transition font-bold"
                                      >
                                        Delete
                                      </button>
                                      <button
                                        onClick={() => setDeleteConfirmId(null)}
                                        className="px-3 py-1.5 bg-slate-200 text-slate-700 text-xs rounded hover:bg-slate-300 transition font-bold"
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-8 py-12 text-center text-slate-500">
                      <p className="text-lg font-semibold">No customers found</p>
                      <p className="text-sm mt-2">Try adjusting your search criteria or add new customers to get started.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {}
          {filteredCustomers.length > 0 && (
            <div className="p-6 bg-slate-50 border-t border-slate-100 text-center">
              <p className="text-sm text-slate-600 font-medium">
                Showing <span className="font-bold text-slate-900">{filteredCustomers.length}</span> of{' '}
                <span className="font-bold text-slate-900">{customers.length}</span> customers
              </p>
            </div>
          )}
        </div>

        {}
        <div className="mt-10 bg-blue-50 border border-blue-200 rounded-xl p-6">
          <h3 className="text-sm font-bold text-blue-900 mb-2">ðŸ’¡ Tips for Editing</h3>
          <p className="text-sm text-blue-800">
            Click the edit icon to modify customer information. Changes are saved immediately. Use the delete button to remove entries you no longer need.
          </p>
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

