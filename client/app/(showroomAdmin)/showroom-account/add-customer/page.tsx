'use client';

import React, { useEffect, useState } from 'react';

import { User, Phone, Package, Calendar, Building2, Send, CheckCircle, X, Star } from 'lucide-react';
import Link from 'next/link';
import Toast from '@/components/Toast';

interface FormData {
  customerName: string;
  phoneNumber: string;
  email?: string;
  category: string;
  visitDate: string;
  showroomBranch: string;
  division: string;
  zila: string;
  interestLevel: number;
  notes?: string;
  randomCustomerNote?: string;
  quotationNote?: string;
  rememberNote?: string;
  quotationNumber?: string;
  quotationDate?: string;
  businessName?: string;
}

interface SubmitResponse {
  success: boolean;
  message: string;
}

interface CategoryOption { id: string; name: string }
const categoriesStatic: string[] = [];
const initialShowrooms: string[] = [];

const bangladeshDivisions: string[] = [
  'Dhaka',
  'Chattogram',
  'Rajshahi',
  'Khulna',
  'Barishal',
  'Sylhet',
  'Rangpur',
  'Mymensingh',
];

const zilasByDivision: Record<string, string[]> = {
  Dhaka: [
    'Dhaka',
    'Gazipur',
    'Kishoreganj',
    'Manikganj',
    'Munshiganj',
    'Narayanganj',
    'Narsingdi',
    'Tangail',
    'Faridpur',
    'Gopalganj',
    'Madaripur',
    'Rajbari',
    'Shariatpur',
  ],
  Chattogram: [
    'Bandarban',
    'Brahmanbaria',
    'Chandpur',
    'Chattogram',
    'Cumilla',
    'Cox’s Bazar',
    'Feni',
    'Khagrachhari',
    'Lakshmipur',
    'Noakhali',
    'Rangamati',
  ],
  Rajshahi: [
    'Bogura',
    'Joypurhat',
    'Naogaon',
    'Natore',
    'Chapainawabganj',
    'Pabna',
    'Rajshahi',
    'Sirajganj',
  ],
  Khulna: [
    'Bagerhat',
    'Chuadanga',
    'Jashore',
    'Jhenaidah',
    'Khulna',
    'Kushtia',
    'Magura',
    'Meherpur',
    'Narail',
    'Satkhira',
  ],
  Barishal: [
    'Barguna',
    'Barishal',
    'Bhola',
    'Jhalokathi',
    'Patuakhali',
    'Pirojpur',
  ],
  Sylhet: [
    'Habiganj',
    'Moulvibazar',
    'Sunamganj',
    'Sylhet',
  ],
  Rangpur: [
    'Dinajpur',
    'Gaibandha',
    'Kurigram',
    'Lalmonirhat',
    'Nilphamari',
    'Panchagarh',
    'Rangpur',
    'Thakurgaon',
  ],
  Mymensingh: [
    'Jamalpur',
    'Mymensingh',
    'Netrokona',
    'Sherpur',
  ],
};

const getTodayDate = (): string => {
  const today = new Date();
  return today.toISOString().split('T')[0];
};

export default function AddCustomerPage() {
  const [formData, setFormData] = useState<FormData>({
    customerName: '',
    phoneNumber: '',
    email: '',
    category: '',
    visitDate: getTodayDate(),
    showroomBranch: '',
    division: '',
    zila: '',
    interestLevel: 0,
    notes: '',
    randomCustomerNote: '',
    quotationNote: '',
    rememberNote: '',
    quotationNumber: '',
    quotationDate: '',
    businessName: '',
  });

  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [showrooms, setShowrooms] = useState<string[]>(initialShowrooms);
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
  const [hoverInterest, setHoverInterest] = useState<number>(0);
  const [openNotes, setOpenNotes] = useState<{ note: boolean; random: boolean; quotation: boolean; remember: boolean }>({ note: false, random: false, quotation: false, remember: false });
  const [selectedNoteType, setSelectedNoteType] = useState<string>('');
  const [selectedCommentType, setSelectedCommentType] = useState<string>('');
  const [customerType, setCustomerType] = useState<'individual' | 'business'>('individual');

  const [formErrors, setFormErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [toastMessage, setToastMessage] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [submittedData, setSubmittedData] = useState<FormData | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
      ...(name === 'division' ? { zila: '' } : {}),
    }));

    if (formErrors[name as keyof FormData]) {
      setFormErrors((prev) => ({
        ...prev,
        [name]: '',
      }));
    }
  };

  const validateForm = (): boolean => {
    const errors: Partial<Record<keyof FormData, string>> = {};

    if (!formData.customerName.trim()) {
      errors.customerName = 'কাস্টমারের নাম আবশ্যক';
    }

    if (!formData.phoneNumber.trim()) {
      errors.phoneNumber = 'ফোন নম্বর আবশ্যক';
    } else if (!/^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/.test(formData.phoneNumber.replace(/\s/g, ''))) {
      errors.phoneNumber = 'সঠিক ফোন নম্বর দিন';
    }

    if (formData.email && formData.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'সঠিক ইমেইল ঠিকানা দিন';
    }

    if (!formData.category) {
      errors.category = 'ক্যাটাগরি নির্বাচন করুন';
    }

    if (!formData.visitDate) {
      errors.visitDate = 'ভিজিটের তারিখ আবশ্যক';
    }

    if (!formData.showroomBranch) {
      errors.showroomBranch = 'শোরুম শাখা নির্বাচন করুন';
    }

    if (!formData.division) {
      errors.division = 'বিভাগ নির্বাচন করুন';
    }

    if (!formData.zila) {
      errors.zila = 'জেলা নির্বাচন করুন';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`${baseUrl}/api/user/categories-public`);
        if (!res.ok) return;
        const data = await res.json();
        const cats = (data.categories || []).map((c: any) => ({ id: c.id || c._id || c.name, name: c.name }));
        setCategories(cats);
      } catch { }
    };
    load();
  }, []);

  useEffect(() => {
    const loadShowrooms = async () => {
      try {
        const res = await fetch(`${baseUrl}/api/user/showrooms-public`);
        if (!res.ok) return;
        const data = await res.json();
        const items: string[] = (data.showrooms || []).map((s: any) => s.name || s);
        setShowrooms(items);
        setFormData((prev) => ({ ...prev, showroomBranch: prev.showroomBranch || items[0] || '' }));
      } catch { }
    };
    loadShowrooms();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      setToastMessage('সব আবশ্যক ঘর সঠিকভাবে পূরণ করুন');
      setShowToast(true);
      return;
    }

    setIsSubmitting(true);

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      if (!token) {
        setToastMessage('আপনি লগইন করেননি');
        setShowToast(true);
        setIsSubmitting(false);
        return;
      }

      const res = await fetch(`${baseUrl}/api/user/showroom/customers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          customerName: formData.customerName,
          phoneNumber: formData.phoneNumber,
          email: formData.email,
          category: formData.category,
          showroomBranch: formData.showroomBranch,
          division: formData.division,
          upazila: formData.zila,
          interestLevel: formData.interestLevel,
          note: formData.notes,
          randomCustomer: formData.randomCustomerNote,
          quotation: formData.quotationNumber || formData.quotationDate
            ? `${formData.quotationNumber || ''}${formData.quotationNumber && formData.quotationDate ? ' - ' : ''}${formData.quotationDate || ''}`
            : '',
          rememberNote: formData.rememberNote,
        }),
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || 'Failed to submit');
      }

      setSubmittedData(formData);
      setShowConfirmation(true);

      setFormData({
        customerName: '',
        phoneNumber: '',
        email: '',
        category: '',
        visitDate: getTodayDate(),
        showroomBranch: showrooms[0] || '',
        division: '',
        zila: '',
        interestLevel: 0,
        notes: '',
        randomCustomerNote: '',
        quotationNote: '',
        rememberNote: '',
        quotationNumber: '',
        quotationDate: '',
        businessName: '',
      });
      setFormErrors({});
      setSelectedNoteType('');
      setSelectedCommentType('');
      setCustomerType('individual');
    } catch (error: any) {
      setToastMessage(error?.message || 'কাস্টমার সাবমিট করা যায়নি। আবার চেষ্টা করুন।');
      setShowToast(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseConfirmation = () => {
    setShowConfirmation(false);
    setSubmittedData(null);
  };
  
  const currentNoteField = selectedNoteType === 'quotation' ? 'quotationNote' : '';
  const currentNoteValue: string = currentNoteField ? (formData as any)[currentNoteField] || '' : '';
  return (
    <div className="min-h-screen p-8 bg-white">
      <div className="max-w-5xl mx-auto">
        <div className="mb-10 flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-4xl font-bold text-slate-900 mb-2">নতুন কাস্টমার যোগ করুন</h1>
            <p className="text-slate-600 text-lg">নতুন এন্ট্রি তৈরির জন্য কাস্টমারের তথ্য দিন</p>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm font-bold text-slate-900">কাস্টমার ধরন</span>
            <label
              className={`${customerType === 'individual' ? 'bg-black text-white' : 'bg-white text-slate-800'} flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg border border-slate-300 cursor-pointer`}
            >
              <input
                type="radio"
                name="customerType"
                value="individual"
                checked={customerType === 'individual'}
                onChange={() => setCustomerType('individual')}
                className="accent-green-600"
              />
              ব্যক্তিগত
            </label>
            <label
              className={`${customerType === 'business' ? 'bg-black text-white' : 'bg-white text-slate-800'} flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg border border-slate-300 cursor-pointer`}
            >
              <input
                type="radio"
                name="customerType"
                value="business"
                checked={customerType === 'business'}
                onChange={() => setCustomerType('business')}
                className="accent-green-600"
              />
              ব্যবসায়িক
            </label>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-10">
          <form onSubmit={handleSubmit} className="space-y-7">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className=" text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                  <Phone size={18} className="text-emerald-600" />
                  ফোন নম্বর
                </label>
                <input
                  type="tel"
                  name="phoneNumber"
                  value={formData.phoneNumber}
                  onChange={handleInputChange}
                  placeholder="+880**********"
                  className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 transition text-black font-medium ${formErrors.phoneNumber
                    ? 'border-red-500 bg-red-50'
                    : 'border-slate-200 bg-white'
                    }`}
                />
                {formErrors.phoneNumber && (
                  <p className="text-red-600 text-xs mt-2 flex items-center gap-1">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    {formErrors.phoneNumber}
                  </p>
                )}
              </div>

              <div>
                <label className=" text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                  <User size={18} className="text-blue-600" />
                  কাস্টমারের নাম
                </label>
                <input
                  type="text"
                  name="customerName"
                  value={formData.customerName}
                  onChange={handleInputChange}
                  placeholder="কাস্টমারের পুরো নাম লিখুন"
                  className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 transition text-black font-medium ${formErrors.customerName
                    ? 'border-red-500 bg-red-50'
                    : 'border-slate-200 bg-white'
                    }`}
                />
                {formErrors.customerName && (
                  <p className="text-red-600 text-xs mt-2 flex items-center gap-1">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    {formErrors.customerName}
                  </p>
                )}
              </div>

              {customerType === 'business' && (
                <div>
                  <label className=" text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                    ব্যবসার নাম
                  </label>
                  <input
                    type="text"
                    name="businessName"
                    value={formData.businessName || ''}
                    onChange={handleInputChange}
                    placeholder="ব্যবসার নাম লিখুন"
                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 transition text-black font-medium border-slate-200 bg-white`}
                  />
                </div>
              )}

              <div>
                <label className=" text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                  বিভাগ (বাংলাদেশ)
                </label>
                <select
                  name="division"
                  value={formData.division}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 transition bg-white text-slate-900 font-medium ${formErrors.division
                    ? 'border-red-500 bg-red-50'
                    : 'border-slate-200'
                    }`}
                >
                  <option value="">বিভাগ নির্বাচন করুন</option>
                  {bangladeshDivisions.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
                {formErrors.division && (
                  <p className="text-red-600 text-xs mt-2 flex items-center gap-1">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    {formErrors.division}
                  </p>
                )}
              </div>

              <div>
                <label className=" text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                  জেলা
                </label>
                <select
                  name="zila"
                  value={formData.zila}
                  onChange={handleInputChange}
                  disabled={!formData.division}
                  className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 transition bg-white text-slate-900 font-medium ${!formData.division
                    ? 'border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed'
                    : formErrors.zila ? 'border-red-500 bg-red-50' : 'border-slate-200'
                    }`}
                >
                  <option value="">{formData.division ? 'জেলা নির্বাচন করুন' : 'আগে বিভাগ নির্বাচন করুন'}</option>
                  {(zilasByDivision[formData.division] || []).map((u: string) => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
                {formErrors.zila && (
                  <p className="text-red-600 text-xs mt-2 flex items-center gap-1">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    {formErrors.zila}
                  </p>
                )}
              </div>

              <div>
                <label className=" text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                  ইমেইল (ঐচ্ছিক)
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email || ''}
                  onChange={handleInputChange}
                  placeholder="name@example.com"
                  className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 transition text-black font-medium ${formErrors.email
                    ? 'border-red-500 bg-red-50'
                    : 'border-slate-200 bg-white'
                    }`}
                />
                {formErrors.email && (
                  <p className="text-red-600 text-xs mt-2 flex items-center gap-1">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    {formErrors.email}
                  </p>
                )}
              </div>

              <div>
                <label className=" text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                  <Package size={18} className="text-purple-600" />
                  ক্যাটাগরি / পণ্যের আগ্রহ
                </label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 transition bg-white text-slate-900 font-medium ${formErrors.category
                    ? 'border-red-500 bg-red-50'
                    : 'border-slate-200'
                    }`}
                >
                  <option value="">ক্যাটাগরি নির্বাচন করুন</option>
                  {(categories.length ? categories.map((c) => c.name) : categoriesStatic).map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
                {formErrors.category && (
                  <p className="text-red-600 text-xs mt-2 flex items-center gap-1">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    {formErrors.category}
                  </p>
                )}
              </div>

              <div>
                <label className=" text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                  কাস্টমারের আগ্রহের মাত্রা
                </label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((n) => {
                    const active = (hoverInterest || formData.interestLevel) >= n;
                    return (
                      <button
                        type="button"
                        key={n}
                        onMouseEnter={() => setHoverInterest(n)}
                        onMouseLeave={() => setHoverInterest(0)}
                        onClick={() => setFormData((p) => ({ ...p, interestLevel: n }))}
                        className="p-1"
                        aria-label={`আগ্রহের মাত্রা ${n} সেট করুন`}
                      >
                        <Star
                          className={active ? 'text-amber-500' : 'text-slate-300'}
                          fill={active ? 'currentColor' : 'none'}
                          size={22}
                        />
                      </button>
                    );
                  })}
                  <span className="text-xs text-slate-500 ml-2">{formData.interestLevel || 0}/5</span>
                </div>
              </div>

              <div>
                <label className=" text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                  <Calendar size={18} className="text-amber-600" />
                  ভিজিটের তারিখ
                </label>
                <input
                  type="date"
                  name="visitDate"
                  value={formData.visitDate}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 transition bg-white text-slate-900 font-medium ${formErrors.visitDate
                    ? 'border-red-500 bg-red-50'
                    : 'border-slate-200'
                    }`}
                />
                {formErrors.visitDate && (
                  <p className="text-red-600 text-xs mt-2 flex items-center gap-1">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    {formErrors.visitDate}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className=" text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                  নোটের ধরন
                </label>
                <select
                  name="noteType"
                  value={selectedNoteType}
                  onChange={(e) => { setSelectedNoteType(e.target.value); setSelectedCommentType(''); }}
                  className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 transition bg-white text-slate-900 font-medium ${''}`}
                >
                  <option value="">নোটের ধরন নির্বাচন করুন</option>
                  <option value="quotation">কোটেশন</option>
                  <option value="comments">মন্তব্য</option>
                </select>
              </div>

              <div>
                {selectedNoteType === 'comments' && !selectedCommentType && (
                  <div>
                    <label className="text-sm font-bold text-slate-900 mb-3 block">মন্তব্যের ধরন</label>
                    <select
                      name="commentType"
                      value={selectedCommentType}
                      onChange={(e) => setSelectedCommentType(e.target.value)}
                      className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 transition bg-white text-slate-900 font-medium ${''}`}
                    >
                      <option value="">মন্তব্যের ধরন নির্বাচন করুন</option>
                      <option value="call">কল নোট</option>
                      <option value="random">র‍্যান্ডম কাস্টমার</option>
                      <option value="remember">রিমাইন্ডার নোট</option>
                    </select>
                  </div>
                )}

                {selectedNoteType === 'quotation' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-bold text-slate-900 mb-3 block">কোটেশন নম্বর</label>
                      <input
                        type="text"
                        name="quotationNumber"
                        value={formData.quotationNumber || ''}
                        onChange={handleInputChange}
                        placeholder="কোটেশন নম্বর লিখুন"
                        className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 transition bg-white text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-bold text-slate-900 mb-3 block">কোটেশনের তারিখ</label>
                      <input
                        type="date"
                        name="quotationDate"
                        value={formData.quotationDate || ''}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 transition bg-white text-slate-900"
                      />
                    </div>
                  </div>
                )}

                {selectedNoteType === 'comments' && selectedCommentType && (
                  <div>
                    <label className="text-sm font-bold text-slate-900 mb-3 block">নির্বাচিত মন্তব্য</label>
                    <input
                      type="text"
                      readOnly
                      value={
                        selectedCommentType === 'call'
                          ? 'কল নোট'
                          : selectedCommentType === 'random'
                            ? 'র‍্যান্ডম কাস্টমার'
                            : 'রিমাইন্ডার নোট'
                      }
                      className="w-full px-4 py-3 border rounded-lg bg-slate-50 text-slate-700"
                    />
                    {selectedCommentType === 'remember' && (
                      <div className="mt-4">
                        <label className="text-sm font-bold text-slate-900 mb-3 block">রিমাইন্ডারের তারিখ</label>
                        <input
                          type="date"
                          name="rememberNote"
                          value={formData.rememberNote || ''}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 transition bg-white text-slate-900"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 w-full gap-6">
              <div>
                <label className=" text-sm font-bold text-slate-900 w-full mb-3 flex items-center gap-2">
                  <Building2 size={18} className="text-cyan-600" />
                  শোরুম শাখা
                </label>
                <select
                  name="showroomBranch"
                  value={formData.showroomBranch}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 transition bg-white text-slate-900 font-medium ${formErrors.showroomBranch
                    ? 'border-red-500 bg-red-50'
                    : 'border-slate-200'
                    }`}
                >
                  <option value="" disabled>একটি শোরুম নির্বাচন করুন</option>
                  {showrooms.map((showroom) => (
                    <option key={showroom} value={showroom}>
                      {showroom}
                    </option>
                  ))}
                </select>
                {formErrors.showroomBranch && (
                  <p className="text-red-600 text-xs mt-2 flex items-center gap-1">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    {formErrors.showroomBranch}
                  </p>
                )}
              </div>

              <div>
              </div>
            </div>

            <div className="border-t border-slate-200 pt-8"></div>

            <div className="flex items-center justify-center">
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-4 bg-black text-white rounded-xl font-bold flex items-center justify-center gap-2
             transition-all duration-200 shadow-lg hover:bg-neutral-900 hover:shadow-xl 
             disabled:bg-neutral-400 disabled:text-gray-200 disabled:cursor-not-allowed"
              >
                <Send size={20} />
                {isSubmitting ? 'সাবমিট করা হচ্ছে...' : 'সাবমিট ও এসএমএস পাঠান'}
              </button>
            </div>

            <p className="text-xs text-slate-500 text-center mt-4">
              সাবমিট করলে কাস্টমারকে তাদের এন্ট্রি কনফার্মেশনের একটি এসএমএস পাঠানো হবে।
            </p>
          </form>
        </div>
      </div>

      { }
      {showConfirmation && submittedData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center ">
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 animate-in fade-in zoom-in-95 duration-300">
            { }
            <button
              onClick={handleCloseConfirmation}
              className="absolute top-4 right-4 p-2 hover:bg-slate-100 rounded-lg transition"
            >
              <X size={24} className="text-slate-400" />
            </button>

            { }
            <div className="p-10 text-center">
              { }
              <div className="flex justify-center mb-6">
                <div className="relative">
                  <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center animate-pulse">
                    <CheckCircle size={40} className="text-emerald-600" />
                  </div>
                </div>
              </div>

              { }
              <h2 className="text-2xl font-bold text-slate-900 mb-2">কাস্টমার সফলভাবে যুক্ত হয়েছে!</h2>

              { }
              <p className="text-slate-600 mb-6">
                কাস্টমারের এন্ট্রি তৈরি হয়েছে এবং একটি কনফার্মেশন এসএমএস পাঠানো হয়েছে।
              </p>

              { }
              <div className="bg-slate-50 rounded-lg p-6 mb-8 text-left space-y-3">
                <div className="flex justify-between items-start">
                  <span className="text-sm font-semibold text-slate-600">নাম:</span>
                  <span className="text-sm font-bold text-slate-900">{submittedData.customerName}</span>
                </div>
                <div className="flex justify-between items-start">
                  <span className="text-sm font-semibold text-slate-600">ফোন:</span>
                  <span className="text-sm font-bold text-slate-900">{submittedData.phoneNumber}</span>
                </div>
                <div className="flex justify-between items-start">
                  <span className="text-sm font-semibold text-slate-600">ক্যাটাগরি:</span>
                  <span className="text-sm font-bold text-slate-900">{submittedData.category}</span>
                </div>
                <div className="flex justify-between items-start">
                  <span className="text-sm font-semibold text-slate-600">ভিজিটের তারিখ:</span>
                  <span className="text-sm font-bold text-slate-900">
                    {new Date(submittedData.visitDate).toLocaleDateString('bn-BD', {
                      weekday: 'short',
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                </div>
                <div className="flex justify-between items-start">
                  <span className="text-sm font-semibold text-slate-600">শোরুম:</span>
                  <span className="text-sm font-bold text-slate-900">{submittedData.showroomBranch}</span>
                </div>
              </div>

              <div className="flex gap-3">
                <Link
                  href="/showroom-account"
                  className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold transition"
                >
                  ড্যাশবোর্ডে ফিরে যান
                </Link>
                <button
                  onClick={() => {
                    handleCloseConfirmation();
                    setFormData({
                      customerName: '',
                      phoneNumber: '',
                      email: '',
                      category: '',
                      visitDate: getTodayDate(),
                      showroomBranch: showrooms[0] || '',
                      division: '',
                      zila: '',
                      interestLevel: 0,
                      notes: '',
                      randomCustomerNote: '',
                      quotationNote: '',
                      rememberNote: '',
                      quotationNumber: '',
                      quotationDate: '',
                      businessName: '',
                    });
                    setSelectedNoteType('');
                    setSelectedCommentType('');
                    setCustomerType('individual');
                  }}
                  className="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold transition"
                >
                  আরেকটি যোগ করুন
                </button>
              </div>
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
  );
}
