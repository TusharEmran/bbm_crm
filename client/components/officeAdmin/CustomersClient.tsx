'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Users, Search, Save, X, FileText, Eye, EyeOff } from 'lucide-react';
import Toast from '@/components/Toast';

interface Customer {
  id: string;
  name: string;
  phone: string;
  interest: string;
  status: 'Interested' | 'Not Interested' | 'Follow-up';
  notes: string;
}

const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

const getStatusColor = (status: string): string => {
  switch (status) {
    case 'Interested':
      return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
    case 'Follow-up':
      return 'bg-amber-50 text-amber-700 border border-amber-200';
    case 'Not Interested':
      return 'bg-rose-50 text-rose-700 border border-rose-200';
    default:
      return 'bg-slate-100 border-slate-300 text-slate-900';
  }
};

export default function CustomersClient() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingNotes, setEditingNotes] = useState<{ [key: string]: string }>({});
  const [notesModalId, setNotesModalId] = useState<string | null>(null);
  const [notesModalContent, setNotesModalContent] = useState('');
  const [toastMessage, setToastMessage] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [sortBy, setSortBy] = useState<'name' | 'status'>('name');
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});

  const maskPhone = (p: string) => {
    const digits = (p || '').replace(/\D+/g, '');
    if (!digits) return '••••••••••';
    const last2 = digits.slice(-2);
    return `••••••••••${last2}`;
  };

  useEffect(() => {
    const load = async () => {
      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        if (!token) return;
        const url = new URL(`${baseUrl}/api/user/showroom/customers`);
        url.searchParams.set('limit', '1000');
        url.searchParams.set('ts', String(Date.now()));
        const res = await fetch(url.toString(), {
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store',
        });
        if (res.status === 401) {
          try { await fetch(`${baseUrl}/api/user/logout`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` } }); } catch {}
          if (typeof window !== 'undefined') localStorage.removeItem('token');
          return;
        }
        if (!res.ok) throw new Error('Failed to load customers');
        const data = await res.json();
        const mapped: Customer[] = (data.customers || []).map((c: any) => ({
          id: String(c.id || c._id),
          name: c.customerName,
          phone: c.phoneNumber,
          interest: c.category,
          status: (c.status as any) || 'Interested',
          notes: (c.notes as any) || '',
        }));
        setCustomers(mapped);
      } catch (e: any) {
        setToastMessage(e?.message || 'Failed to load');
        setShowToast(true);
      }
    };
    load();
  }, []);

  const filteredCustomers = useMemo(() => {
    let filtered = customers.filter((customer) => {
      const searchMatch =
        customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        customer.phone.includes(searchQuery) ||
        customer.interest.toLowerCase().includes(searchQuery.toLowerCase());

      const statusMatch = filterStatus === 'all' || customer.status === filterStatus;

      return searchMatch && statusMatch;
    });

    if (sortBy === 'status') {
      const statusOrder = { 'Follow-up': 0, 'Interested': 1, 'Not Interested': 2 };
      filtered.sort(
        (a, b) => statusOrder[a.status as keyof typeof statusOrder] - statusOrder[b.status as keyof typeof statusOrder]
      );
    } else {
      filtered.sort((a, b) => a.name.localeCompare(b.name));
    }

    return filtered;
  }, [customers, searchQuery, filterStatus, sortBy]);

  const stats = useMemo(() => {
    const interested = customers.filter((c) => c.status === 'Interested').length;
    const followUp = customers.filter((c) => c.status === 'Follow-up').length;
    const notInterested = customers.filter((c) => c.status === 'Not Interested').length;

    return { interested, followUp, notInterested, total: customers.length };
  }, [customers]);

  const handleStatusChange = async (id: string, newStatus: 'Interested' | 'Not Interested' | 'Follow-up') => {
    const prev = customers;
    const next = customers.map((c) => (c.id === id ? { ...c, status: newStatus } : c));
    setCustomers(next);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      if (!token) throw new Error('Not authenticated');
      const res = await fetch(`${baseUrl}/api/user/showroom/customers/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error('Failed to update status');
      setToastMessage('Status updated');
      setShowToast(true);
    } catch (e: any) {
      setCustomers(prev);
      setToastMessage(e?.message || 'Failed to update status');
      setShowToast(true);
    }
  };

  const handleNotesChange = (id: string, newNotes: string) => {
    setEditingNotes({ ...editingNotes, [id]: newNotes });
  };

  const handleSaveNotes = async (id: string, newNotes: string) => {
    const prev = customers;
    const next = customers.map((c) => (c.id === id ? { ...c, notes: newNotes } : c));
    setCustomers(next);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      if (!token) throw new Error('Not authenticated');
      const res = await fetch(`${baseUrl}/api/user/showroom/customers/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ notes: newNotes }),
      });
      if (!res.ok) throw new Error('Failed to save notes');
      const { [id]: _, ...rest } = editingNotes;
      setEditingNotes(rest);
      setToastMessage('Notes saved successfully!');
      setShowToast(true);
    } catch (e: any) {
      setCustomers(prev);
      setToastMessage(e?.message || 'Failed to save notes');
      setShowToast(true);
    }
  };

  const handleOpenNotesModal = async (customer: Customer) => {
    setNotesModalId(customer.id);

    setNotesModalContent(editingNotes[customer.id] !== undefined ? editingNotes[customer.id] : customer.notes);

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      if (!token) return;
      const ts = Date.now();
      const res = await fetch(`${baseUrl}/api/user/showroom/customers/${customer.id}?ts=${ts}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      });
      if (!res.ok) return;
      const data = await res.json();
      const freshNotes = (data?.customer?.notes as string) ?? '';
      setNotesModalContent(freshNotes);

      setCustomers((prev) => prev.map(c => c.id === customer.id ? { ...c, notes: freshNotes } : c));
    } catch {}
  };

  const handleSaveModalNotes = () => {
    if (notesModalId !== null) {
      handleSaveNotes(notesModalId, notesModalContent);
      setNotesModalId(null);
      setNotesModalContent('');
    }
  };

  return (
    <div className="min-h-screen p-8 bg-white">
      <div className="max-w-7xl mx-auto">
        <div className="mb-10">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Customer List</h1>
          <p className="text-slate-600 text-lg">Manage customer information and follow-up status</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-8 hover:shadow-md transition-shadow duration-300">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Total Customers</p>
                <p className="text-4xl font-bold text-slate-900">{stats.total}</p>
              </div>
              <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl">
                <Users className="w-8 h-8 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-8 hover:shadow-md transition-shadow duration-300">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Interested</p>
                <p className="text-4xl font-bold text-emerald-600">{stats.interested}</p>
                <p className="text-xs text-slate-400 mt-2">{((stats.interested / stats.total) * 100).toFixed(0)}% of total</p>
              </div>
              <div className="p-4 bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl">
                <Users className="w-8 h-8 text-emerald-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-8 hover:shadow-md transition-shadow duration-300">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Follow-up</p>
                <p className="text-4xl font-bold text-amber-600">{stats.followUp}</p>
                <p className="text-xs text-slate-400 mt-2">{((stats.followUp / stats.total) * 100).toFixed(0)}% of total</p>
              </div>
              <div className="p-4 bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl">
                <Users className="w-8 h-8 text-amber-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-8 hover:shadow-md transition-shadow duration-300">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Not Interested</p>
                <p className="text-4xl font-bold text-rose-600">{stats.notInterested}</p>
                <p className="text-xs text-slate-400 mt-2">{((stats.notInterested / stats.total) * 100).toFixed(0)}% of total</p>
              </div>
              <div className="p-4 bg-gradient-to-br from-rose-50 to-rose-100 rounded-xl">
                <Users className="w-8 h-8 text-rose-600" />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-8 mb-10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-bold text-slate-900 mb-3">Search</label>
              <div className="relative">
                <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Name, phone, or interest..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 transition text-slate-900 font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-900 mb-3">Filter by Status</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 transition bg-white text-slate-900 font-medium"
              >
                <option value="all">All Status</option>
                <option value="Interested">Interested</option>
                <option value="Follow-up">Follow-up</option>
                <option value="Not Interested">Not Interested</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-900 mb-3">Sort By</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'name' | 'status')}
                className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 transition bg-white text-slate-900 font-medium"
              >
                <option value="name">Name (A-Z)</option>
                <option value="status">Status (Priority)</option>
              </select>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-8 border-b border-slate-100">
            <h2 className="text-xl font-bold text-slate-900">Customers ({filteredCustomers.length})</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-8 py-4 text-left text-sm font-bold text-slate-900">Customer Name</th>
                  <th className="px-8 py-4 text-left text-sm font-bold text-slate-900">Phone</th>
                  <th className="px-8 py-4 text-left text-sm font-bold text-slate-900">Interest</th>
                  <th className="px-8 py-4 text-left text-sm font-bold text-slate-900">Status</th>
                  <th className="px-8 py-4 text-left text-sm font-bold text-slate-900">Notes</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.length > 0 ? (
                  filteredCustomers.map((customer, idx) => (
                    <tr
                      key={customer.id}
                      className={`border-b border-slate-100 hover:bg-slate-50 transition ${idx === filteredCustomers.length - 1 ? 'border-b-0' : ''}`}
                    >
                      <td className="px-8 py-5 text-sm font-semibold text-slate-900">{customer.name}</td>
                      <td className="px-8 py-5 text-sm text-slate-600 font-medium">
                        <div className="flex items-center gap-2">
                          <span className="font-mono tracking-wide">
                            {revealed[customer.id] ? customer.phone : maskPhone(customer.phone)}
                          </span>
                          <button
                            type="button"
                            onClick={() => setRevealed((prev) => ({ ...prev, [customer.id]: !prev[customer.id] }))}
                            className="p-1.5 rounded hover:bg-slate-100 border border-slate-200"
                            aria-label={revealed[customer.id] ? 'Hide phone' : 'Show phone'}
                            title={revealed[customer.id] ? 'Hide phone' : 'Show phone'}
                          >
                            {revealed[customer.id] ? <EyeOff size={16} className="text-slate-700" /> : <Eye size={16} className="text-slate-700" />}
                          </button>
                        </div>
                      </td>
                      <td className="px-8 py-5 text-sm">
                        <span className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-xs font-bold">{customer.interest}</span>
                      </td>
                      <td className="px-8 py-5 text-sm">
                        <select
                          value={customer.status}
                          onChange={(e) => handleStatusChange(customer.id, e.target.value as 'Interested' | 'Not Interested' | 'Follow-up')}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold border-2 focus:outline-none focus:ring-2 focus:ring-slate-900 transition cursor-pointer ${getStatusColor(customer.status)}`}
                        >
                          <option value="Interested">Interested</option>
                          <option value="Follow-up">Follow-up</option>
                          <option value="Not Interested">Not Interested</option>
                        </select>
                      </td>
                      <td className="px-8 py-5 text-sm">
                        <button
                          onClick={() => handleOpenNotesModal(customer)}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition font-semibold text-xs border border-slate-300"
                        >
                          <FileText size={16} />
                          Edit Notes
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-8 py-12 text-center text-slate-500">No customers found matching your search criteria</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {notesModalId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={() => setNotesModalId(null)}>
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-6 flex items-center justify-between border-b border-blue-500 rounded-t-xl">
              <div>
                <h2 className="text-xl font-bold text-white">Edit Notes</h2>
                <p className="text-blue-100 text-sm mt-1">{customers.find((c) => c.id === notesModalId)?.name}</p>
              </div>
              <button onClick={() => setNotesModalId(null)} className="p-2 hover:bg-blue-500 rounded-lg transition text-white">
                <X size={24} />
              </button>
            </div>

            <div className="p-8">
              <label className="block text-sm font-bold text-slate-900 mb-4">Notes</label>
              <textarea
                value={notesModalContent}
                onChange={(e) => setNotesModalContent(e.target.value)}
                placeholder="Add or edit customer notes..."
                rows={6}
                className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 transition resize-none text-slate-900 font-medium"
              />
              <p className="text-xs text-slate-400 mt-2">{notesModalContent.length} characters</p>

              <div className="flex gap-3 mt-6">
                <button onClick={() => setNotesModalId(null)} className="flex-1 px-4 py-3 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition font-bold">
                  Cancel
                </button>
                <button onClick={handleSaveModalNotes} className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition font-bold flex items-center justify-center gap-2">
                  <Save size={18} />
                  Save Notes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <Toast message={toastMessage} show={showToast} onClose={() => setShowToast(false)} duration={3000} />
    </div>
  );
}


