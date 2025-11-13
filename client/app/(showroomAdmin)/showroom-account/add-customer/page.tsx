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
      errors.customerName = 'Customer name is required';
    }

    if (!formData.phoneNumber.trim()) {
      errors.phoneNumber = 'Phone number is required';
    } else if (!/^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/.test(formData.phoneNumber.replace(/\s/g, ''))) {
      errors.phoneNumber = 'Please enter a valid phone number';
    }

    if (formData.email && formData.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Please enter a valid email address';
    }

    if (!formData.category) {
      errors.category = 'Please select a category';
    }

    if (!formData.visitDate) {
      errors.visitDate = 'Visit date is required';
    }

    if (!formData.showroomBranch) {
      errors.showroomBranch = 'Please select a showroom branch';
    }

    if (!formData.division) {
      errors.division = 'Please select a division';
    }

    if (!formData.zila) {
      errors.zila = 'Please select a zila';
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
      setToastMessage('Please fill in all required fields correctly');
      setShowToast(true);
      return;
    }

    setIsSubmitting(true);

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      if (!token) {
        setToastMessage('Not authenticated');
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
      setToastMessage(error?.message || 'Failed to submit customer. Please try again.');
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
            <h1 className="text-4xl font-bold text-slate-900 mb-2">Add New Customer</h1>
            <p className="text-slate-600 text-lg">Enter customer information to create a new entry</p>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm font-bold text-slate-900">Customer Type</span>
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
              Individual
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
              Business
            </label>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-10">
          <form onSubmit={handleSubmit} className="space-y-7">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className=" text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                  <Phone size={18} className="text-emerald-600" />
                  Phone Number
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
                  Customer Name
                </label>
                <input
                  type="text"
                  name="customerName"
                  value={formData.customerName}
                  onChange={handleInputChange}
                  placeholder="Enter customer's full name"
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
                    Business Name
                  </label>
                  <input
                    type="text"
                    name="businessName"
                    value={formData.businessName || ''}
                    onChange={handleInputChange}
                    placeholder="Enter business name"
                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 transition text-black font-medium border-slate-200 bg-white`}
                  />
                </div>
              )}

              <div>
                <label className=" text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                  Division (Bangladesh)
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
                  <option value="">Select Division</option>
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
                  Zila
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
                  <option value="">{formData.division ? 'Select zila' : 'Select Division first'}</option>
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
                  Email (optional)
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email || ''}
                  onChange={handleInputChange}
                  placeholder="example@email.com"
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
                  Category / Product Interest
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
                  <option value="">Select a category</option>
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
                  Customer Interest Level
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
                        aria-label={`Set interest level ${n}`}
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
                  Visit Date
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
                  Note Type
                </label>
                <select
                  name="noteType"
                  value={selectedNoteType}
                  onChange={(e) => { setSelectedNoteType(e.target.value); setSelectedCommentType(''); }}
                  className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 transition bg-white text-slate-900 font-medium ${''}`}
                >
                  <option value="">Select note type</option>
                  <option value="quotation">Quotation</option>
                  <option value="comments">Comments</option>
                </select>
              </div>

              <div>
                {selectedNoteType === 'comments' && !selectedCommentType && (
                  <div>
                    <label className="text-sm font-bold text-slate-900 mb-3 block">Comment Type</label>
                    <select
                      name="commentType"
                      value={selectedCommentType}
                      onChange={(e) => setSelectedCommentType(e.target.value)}
                      className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 transition bg-white text-slate-900 font-medium ${''}`}
                    >
                      <option value="">Select comment type</option>
                      <option value="call">Call Note</option>
                      <option value="random">Random Customer</option>
                      <option value="remember">Remember Note</option>
                    </select>
                  </div>
                )}

                {selectedNoteType === 'quotation' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-bold text-slate-900 mb-3 block">Quotation No</label>
                      <input
                        type="text"
                        name="quotationNumber"
                        value={formData.quotationNumber || ''}
                        onChange={handleInputChange}
                        placeholder="Enter quotation number"
                        className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 transition bg-white text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-bold text-slate-900 mb-3 block">Quotation Date</label>
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
                    <label className="text-sm font-bold text-slate-900 mb-3 block">Selected Comment</label>
                    <input
                      type="text"
                      readOnly
                      value={
                        selectedCommentType === 'call'
                          ? 'Call Note'
                          : selectedCommentType === 'random'
                            ? 'Random Customer'
                            : 'Remember Note'
                      }
                      className="w-full px-4 py-3 border rounded-lg bg-slate-50 text-slate-700"
                    />
                    {selectedCommentType === 'remember' && (
                      <div className="mt-4">
                        <label className="text-sm font-bold text-slate-900 mb-3 block">Remember Date</label>
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
                  Showroom Branch
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
                  <option value="" disabled>Select a showroom</option>
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
                {isSubmitting ? 'Submitting...' : 'Submit & Send SMS'}
              </button>
            </div>

            <p className="text-xs text-slate-500 text-center mt-4">
              By submitting, an SMS will be sent to the customer with their entry confirmation.
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
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Customer Added Successfully!</h2>

              { }
              <p className="text-slate-600 mb-6">
                The customer entry has been created and an SMS confirmation has been sent.
              </p>

              { }
              <div className="bg-slate-50 rounded-lg p-6 mb-8 text-left space-y-3">
                <div className="flex justify-between items-start">
                  <span className="text-sm font-semibold text-slate-600">Name:</span>
                  <span className="text-sm font-bold text-slate-900">{submittedData.customerName}</span>
                </div>
                <div className="flex justify-between items-start">
                  <span className="text-sm font-semibold text-slate-600">Phone:</span>
                  <span className="text-sm font-bold text-slate-900">{submittedData.phoneNumber}</span>
                </div>
                <div className="flex justify-between items-start">
                  <span className="text-sm font-semibold text-slate-600">Category:</span>
                  <span className="text-sm font-bold text-slate-900">{submittedData.category}</span>
                </div>
                <div className="flex justify-between items-start">
                  <span className="text-sm font-semibold text-slate-600">Visit Date:</span>
                  <span className="text-sm font-bold text-slate-900">
                    {new Date(submittedData.visitDate).toLocaleDateString('en-US', {
                      weekday: 'short',
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                </div>
                <div className="flex justify-between items-start">
                  <span className="text-sm font-semibold text-slate-600">Showroom:</span>
                  <span className="text-sm font-bold text-slate-900">{submittedData.showroomBranch}</span>
                </div>
              </div>

              <div className="flex gap-3">
                <Link
                  href="/showroom-account"
                  className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold transition"
                >
                  Back to Dashboard
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
                  Add Another
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
