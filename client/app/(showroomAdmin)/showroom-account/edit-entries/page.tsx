'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Edit2, Trash2, X, Save, Calendar, Eye, EyeOff } from 'lucide-react';
import Toast from '@/components/Toast';

interface Customer {
  id: string;
  name: string;
  phone: string;
  category: string;
  visitDate: string;
  createdAt: string;
  feedbackStatus: 'Received' | 'Pending' | 'No Feedback';
  email?: string;
  division?: string;
  zila?: string;
  interestLevel?: number;
  customerType?: string;
  businessName?: string;
  quotation?: string;
  rememberNote?: string;
  rememberDate?: string;
  notes?: string;
  randomCustomer?: string;
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
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [detailsOpen, setDetailsOpen] = useState<Record<string, boolean>>({});
  const [noteCustomer, setNoteCustomer] = useState<Customer | null>(null);
  const [noteText, setNoteText] = useState<string>("");

  const show = (msg: string) => { setToastMessage(msg); setShowToast(true); };

  const normalizePhone = (p: string): string => {
    const digits = (p || '').replace(/\D+/g, '');
    if (digits.length >= 10) return digits.slice(-10);
    return digits;
  };

  const maskPhone = (p: string): string => {
    const digits = (p || '').replace(/\D+/g, '');
    if (!digits) return '••••••••••';
    const last2 = digits.slice(-2);
    return `••••••••••${last2}`;
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

  const fmtDate = (iso?: string): string => {
    if (!iso) return '';
    try { return new Date(iso).toISOString().slice(0, 10); } catch { return iso; }
  };

  const loadCustomers = async () => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      if (!token) return show('আপনি লগইন করেননি');
      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const dd = String(today.getDate()).padStart(2, '0');
      const ymd = `${yyyy}-${mm}-${dd}`; // local date
      const [custRes, fbRes] = await Promise.all([
        fetch(`${baseUrl}/api/user/showroom/customers?limit=500&date=${encodeURIComponent(ymd)}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${baseUrl}/api/user/feedbacks?page=1&limit=500`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      if (!custRes.ok) throw new Error('এন্ট্রি লোড করা যায়নি');
      if (fbRes.status === 401) {
        try { await fetch(`${baseUrl}/api/user/logout`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` } }); } catch { }
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
            email: c.email || '',
            division: c.division || '',
            zila: c.upazila || '',
            interestLevel: typeof c.interestLevel === 'number' ? c.interestLevel : undefined,
            customerType: c.customerType || '',
            businessName: c.businessName || '',
            quotation: c.quotation || '',
            rememberNote: c.rememberNote || '',
            rememberDate: c.rememberDate || '',
            notes: c.note || c.notes || '',
          };
        });
      setCustomers(mapped);
    } catch (e: any) {
      show(e?.message || 'এন্ট্রি লোড করতে সমস্যা হয়েছে');
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
      } catch { }
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

    if (!editingData.name.trim()) return show('কাস্টমারের নাম খালি রাখা যাবে না');
    if (!editingData.phone.trim()) return show('ফোন নম্বর খালি রাখা যাবে না');
    if (!editingData.category) return show('ক্যাটাগরি খালি রাখা যাবে না');

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      if (!token) return show('Not authenticated');
      const res = await fetch(`${baseUrl}/api/user/showroom/customers/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ customerName: editingData.name, phoneNumber: editingData.phone, category: editingData.category }),
      });
      if (!res.ok) throw new Error('আপডেট করা যায়নি');
      const data = await res.json();
      const u = data.customer;
      setCustomers(customers.map((c) => (c.id === id ? { ...c, name: u.customerName, phone: u.phoneNumber, category: u.category } : c)));
      setEditingId(null);
      setEditingData(null);
      show('কাস্টমারের তথ্য সফলভাবে আপডেট হয়েছে!');
    } catch (e: any) {
      show(e?.message || 'আপডেট ব্যর্থ হয়েছে');
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
      if (!res.ok) throw new Error('মুছে ফেলা যায়নি');
      const customer = customers.find((c) => c.id === id);
      setCustomers(customers.filter((c) => c.id !== id));
      setDeleteConfirmId(null);
      show(`${customer?.name || 'এন্ট্রি'} সফলভাবে মুছে ফেলা হয়েছে!`);
    } catch (e: any) {
      show(e?.message || 'মুছে ফেলা ব্যর্থ হয়েছে');
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
        { }
        <div className="mb-10">

          <h1 className="text-4xl font-bold text-slate-900 mb-2">আজকের এন্ট্রি সম্পাদনা</h1>
          <p className="text-slate-600 text-lg">আজকের ভিজিটগুলোর কাস্টমার তথ্য ম্যানেজ ও আপডেট করুন</p>
        </div>

        { }
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 mb-10">
          <div className="relative">
            <svg className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="নাম, ফোন বা ক্যাটাগরি দিয়ে খুঁজুন..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 transition text-slate-900 font-medium"
            />
          </div>
        </div>

        { }
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
          { }
          <div className="p-8 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <Calendar className="w-6 h-6 text-slate-900" />
              <div>
                <h2 className="text-xl font-bold text-slate-900">আজকের কাস্টমার এন্ট্রি</h2>
                <p className="text-sm text-slate-500 mt-1">মোট {filteredCustomers.length} জন কাস্টমার</p>
              </div>
            </div>
          </div>

          { }
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-8 py-4 text-left text-sm font-bold text-slate-900">কাস্টমারের নাম</th>
                  <th className="px-8 py-4 text-left text-sm font-bold text-slate-900">ফোন</th>
                  <th className="px-8 py-4 text-left text-sm font-bold text-slate-900">ক্যাটাগরি</th>
                  <th className="px-8 py-4 text-left text-sm font-bold text-slate-900">ভিজিটের সময়</th>
                  <th className="px-8 py-4 text-left text-sm font-bold text-slate-900">ফিডব্যাক স্ট্যাটাস</th>
                  <th className="px-8 py-4 text-center text-sm font-bold text-slate-900">অ্যাকশন</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.length > 0 ? (
                  filteredCustomers.map((customer, idx) => (
                    <React.Fragment key={customer.id}>
                      <tr
                        className={`border-b border-slate-100 hover:bg-slate-50 transition ${idx === filteredCustomers.length - 1 && !detailsOpen[customer.id] ? 'border-b-0' : ''
                          }`}
                      >
                        { }
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

                        { }
                        <td className="px-8 py-5 text-sm">
                          {editingId === customer.id && editingData ? (
                            <input
                              type="tel"
                              value={editingData.phone}
                              onChange={(e) => handleEditFieldChange('phone', e.target.value)}
                              className="w-full px-3 py-2 border border-blue-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 text-slate-900 font-medium"
                            />
                          ) : (
                            <div className="flex items-center gap-2 text-slate-600 font-medium">
                              <span className="font-mono tracking-wide">{revealed[customer.id] ? customer.phone : maskPhone(customer.phone)}</span>
                              <button
                                type="button"
                                onClick={() => setRevealed((prev) => ({ ...prev, [customer.id]: !prev[customer.id] }))}

                                className="p-1.5 rounded hover:bg-slate-100 border border-slate-200"
                                aria-label={revealed[customer.id] ? 'ফোন লুকান' : 'ফোন দেখুন'}
                                title={revealed[customer.id] ? 'ফোন লুকান' : 'ফোন দেখুন'}
                              >
                                {revealed[customer.id] ? <EyeOff size={16} className="text-slate-700" /> : <Eye size={16} className="text-slate-700" />}
                              </button>
                            </div>
                          )}
                        </td>

                        { }
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

                        { }
                        <td className="px-8 py-5 text-sm text-slate-600 font-medium">
                          {customer.visitDate}
                        </td>

                        { }
                        <td className="px-8 py-5 text-sm">
                          <span className={`px-3 py-1.5 rounded-lg text-xs font-bold ${getFeedbackStatusColor(customer.feedbackStatus)}`}>
                            {customer.feedbackStatus}
                          </span>
                        </td>

                        { }
                        <td className="px-8 py-5 text-sm">
                          <div className="flex items-center justify-center gap-2">
                            {editingId === customer.id ? (
                              <React.Fragment>
                                <button
                                  onClick={() => handleSaveEdit(customer.id)}
                                  className="p-2 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 rounded-lg transition"
                                  title="পরিবর্তন সংরক্ষণ করুন"
                                >
                                  <Save size={18} />
                                </button>
                                <button
                                  onClick={handleCancelEdit}
                                  className="p-2 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-lg transition"
                                  title="এডিট বাতিল করুন"
                                >
                                  <X size={18} />
                                </button>
                              </React.Fragment>
                            ) : (
                              <React.Fragment>
                                <button
                                  onClick={() => setDetailsOpen((prev) => ({ ...prev, [customer.id]: !prev[customer.id] }))}

                                  className="p-2 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg transition"
                                  title={detailsOpen[customer.id] ? 'বিস্তারিত লুকান' : 'বিস্তারিত দেখুন'}
                                >
                                  {detailsOpen[customer.id] ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                                <button
                                  onClick={() => handleEdit(customer)}
                                  className="p-2 bg-blue-100 text-blue-600 hover:bg-blue-200 rounded-lg transition"
                                  title="কাস্টমার এডিট করুন"
                                >
                                  <Edit2 size={18} />
                                </button>
                                <button
                                  onClick={() => { setNoteCustomer(customer); setNoteText(customer.notes || ""); }}
                                  className="p-2 bg-amber-100 text-amber-700 hover:bg-amber-200 rounded-lg transition"
                                  title="নোট দেখুন"
                                >
                                  <span className="text-xs font-bold">নোট</span>
                                </button>
                              </React.Fragment>
                            )}
                          </div>
                        </td>
                      </tr>
                      {detailsOpen[customer.id] && (
                        <tr className="bg-slate-50 border-b border-slate-100">
                          <td className="px-8 py-5 text-sm" colSpan={6}>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-slate-700">
                              <div>
                                <div className="text-xs font-bold text-slate-500">ইমেইল</div>
                                <div className="font-medium">{customer.email || '-'}</div>
                              </div>
                              <div>
                                <div className="text-xs font-bold text-s্লেট-500">বিভাগ</div>
                                <div className="font-medium">{customer.division || '-'}</div>
                              </div>
                              <div>
                                <div className="text-xs font-bold text-slate-500">জেলা</div>
                                <div className="font-medium">{customer.zila || '-'}</div>
                              </div>
                              <div>
                                <div className="text-xs font-bold text-slate-500">আগ্রহের মাত্রা</div>
                                <div className="font-medium">{typeof customer.interestLevel === 'number' ? `${customer.interestLevel} / 5` : '-'}</div>
                              </div>
                              <div>
                                <div className="text-xs font-bold text-slate-500">কাস্টমার টাইপ</div>
                                <div className="font-medium">{customer.customerType || '-'}</div>
                              </div>
                              <div>
                                <div className="text-xs font-bold text-slate-500">ব্যবসার নাম</div>
                                <div className="font-medium">{customer.businessName || '-'}</div>
                              </div>
                              <div>
                                <div className="text-xs font-bold text-slate-500">কোটেশন</div>
                                <div className="font-medium">{customer.quotation || '-'}</div>
                              </div>
                              <div>
                                <div className="text-xs font-bold text-slate-500">রিমাইন্ডারের তারিখ</div>
                                <div className="font-medium">{fmtDate(customer.rememberDate) || '-'}</div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-8 py-12 text-center text-slate-500">
                      <p className="text-lg font-semibold">কোনো কাস্টমার পাওয়া যায়নি</p>
                      <p className="text-sm mt-2">সার্চ পরিবর্তন করে দেখুন অথবা নতুন কাস্টমার যোগ করুন।</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          { }
          {filteredCustomers.length > 0 && (
            <div className="p-6 bg-slate-50 border-t border-slate-100 text-center">
              <p className="text-sm text-slate-600 font-medium">
                মোট <span className="font-bold text-slate-900">{customers.length}</span> কাস্টমারের মধ্যে দেখানো হচ্ছে <span className="font-bold text-slate-900">{filteredCustomers.length}</span>
              </p>
            </div>
          )}
        </div>

        { }
        <div className="mt-10 bg-blue-50 border border-blue-200 rounded-xl p-6">
          <h3 className="text-sm font-bold text-blue-900 mb-2">পরামর্শ</h3>
          <p className="text-sm text-blue-800">
            কাস্টমারের তথ্য পরিবর্তন করতে এডিট আইকনে ক্লিক করুন। পরিবর্তনগুলো সাথে সাথে সংরক্ষিত হবে। প্রয়োজন না হলে ডিলিট বাটনে ক্লিক করে এন্ট্রি মুছে ফেলতে পারেন।
          </p>
        </div>
      </div>

      { }
      <Toast
        message={toastMessage}
        show={showToast}
        onClose={() => setShowToast(false)}
        duration={3000}
      />

      {noteCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-900">কাস্টমার নোট</h3>
              <button
                onClick={() => setNoteCustomer(null)}
                className="p-2 rounded-lg hover:bg-slate-100"
                aria-label="বন্ধ করুন"
                title="বন্ধ করুন"
              >
                <X size={18} className="text-slate-700" />
              </button>
            </div>
            <div className="space-y-4 text-sm">
              <div>
                <div className="text-xs font-bold text-slate-500">সাধারণ নোট</div>
                <textarea
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  className="mt-2 w-full min-h-[100px] px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 text-slate-900"
                  placeholder="নোট লিখুন..."
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setNoteCustomer(null)}
                className="px-4 py-2 bg-slate-200 text-slate-800 rounded-lg hover:bg-slate-300 font-bold"
              >
                বন্ধ করুন
              </button>
              <button
                onClick={async () => {
                  try {
                    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
                    if (!token || !noteCustomer) return;
                    const res = await fetch(`${baseUrl}/api/user/showroom/customers/${noteCustomer.id}`, {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                      body: JSON.stringify({ note: noteText }),
                    });
                    if (!res.ok) throw new Error('নোট সংরক্ষণ করা যায়নি');
                    const data = await res.json();
                    const u = data.customer;
                    setCustomers(prev => prev.map(c => c.id === noteCustomer.id ? { ...c, notes: noteText } : c));
                    setToastMessage('নোট সংরক্ষিত হয়েছে');
                    setShowToast(true);
                    setNoteCustomer(null);
                  } catch (e: any) {
                    setToastMessage(e?.message || 'নোট সংরক্ষণ করা যায়নি');
                    setShowToast(true);
                  }
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold"
              >
                নোট সংরক্ষণ করুন
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

