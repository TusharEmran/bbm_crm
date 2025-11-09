'use client';

import React, { useEffect, useState } from 'react';

import { MessageCircle, Send } from 'lucide-react';
import Toast from '@/components/Toast';

export default function FeedbackFormPage() {
  interface FormData {
    name: string;
    email: string;
    phone: string;
    message: string;
    category: string;
    showroom: string;
  }

  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    phone: '',
    message: '',
    category: '',
    showroom: '',
  });

  const [toastMessage, setToastMessage] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [showrooms, setShowrooms] = useState<string[]>([]);

  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`${baseUrl}/api/user/categories-public`);
        if (!res.ok) return;
        const data = await res.json();
        const cats = (data.categories || []).map((c: any) => ({ id: c.id || c._id || c.name, name: c.name }));
        setCategories(cats);
      } catch {}
    };
    load();
  }, []);

  useEffect(() => {
    const loadShowrooms = async () => {
      try {
        const res = await fetch(`${baseUrl}/api/user/showrooms-public`);
        if (!res.ok) return;
        const data = await res.json();
        const items = (data.showrooms || []).map((s: any) => s.name || s);
        setShowrooms(items);
      } catch {}
    };
    loadShowrooms();
  }, []);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    const field = name as keyof FormData;
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
    if (formErrors[field]) {
      setFormErrors((prev) => ({
        ...prev,
        [field]: '',
      }));
    }
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!formData.name.trim()) errors.name = 'Name is required';
    if (!formData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Please enter a valid email';
    }
    if (!formData.phone.trim()) errors.phone = 'Phone number is required';
    if (!formData.message.trim()) {
      errors.message = 'Please share your feedback';
    } else if (formData.message.trim().length < 10) {
      errors.message = 'Feedback must be at least 10 characters';
    }
    if (!formData.category.trim()) {
      errors.category = 'Please select a category';
    }
    if (!formData.showroom.trim()) {
      errors.showroom = 'Please select a showroom';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      setToastMessage('Please fill in all required fields correctly');
      setShowToast(true);
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`${baseUrl}/api/user/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          message: formData.message,
          category: formData.category,
          showroom: formData.showroom,
        }),
      });

      if (!res.ok) throw new Error('Failed to submit feedback');
      setToastMessage('Thank you! Your feedback has been submitted successfully.');
      setShowToast(true);
      setFormData({
        name: '',
        email: '',
        phone: '',
        message: '',
        category: '',
        showroom: '',
      });

      setFormErrors({});
    } catch {
      setToastMessage('Failed to submit feedback. Please try again.');
      setShowToast(true);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-4 md:p-8 bg-white">
      <div className="max-w-2xl mx-auto">

        <div className="bg-white rounded-2xl shadow-lg p-6 md:p-8">

          <div className="flex items-start gap-4 mb-6 md:mb-8">
            <div className="shrink-0 w-12 h-12 md:w-16 md:h-16 bg-blue-100 rounded-2xl flex items-center justify-center">
              <MessageCircle className="w-6 h-6 md:w-8 md:h-8 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
                We'd Love Your Feedback
              </h1>
              <p className="text-gray-600 text-sm md:text-base">
                Help us improve by sharing your thoughts, reporting issues, or suggesting new features.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5 md:space-y-6">

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
              <div>
                <label htmlFor="name" className="block text-sm md:text-base font-semibold text-gray-900 mb-2">
                  Name
                </label>
                <input
                  type="text"
                  name="name"
                  id="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Your name"
                  className={`w-full px-4 py-3 text-sm md:text-base border rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 transition ${
                    formErrors.name ? 'border-red-500 bg-red-50' : 'border-gray-300 bg-gray-100'
                  }`}
                />
                {formErrors.name && (
                  <p className="text-red-600 text-xs md:text-sm mt-1">{formErrors.name}</p>
                )}
              </div>

              <div>
                <label htmlFor="email" className="block text-sm md:text-base font-semibold text-gray-900 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  id="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="your.email@example.com"
                  className={`w-full px-4 py-3 text-sm md:text-base border rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 transition ${
                    formErrors.email ? 'border-red-500 bg-red-50' : 'border-gray-300 bg-gray-100'
                  }`}
                />
                {formErrors.email && (
                  <p className="text-red-600 text-xs md:text-sm mt-1">{formErrors.email}</p>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm md:text-base font-semibold text-gray-900 mb-2">
                Phone Number
              </label>
              <input
                type="tel"
                name="phone"
                id="phone"
                value={formData.phone}
                onChange={handleInputChange}
                placeholder="(123) 456-7890"
                className={`w-full px-4 py-3 text-sm md:text-base border rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 transition ${
                  formErrors.phone ? 'border-red-500 bg-red-50' : 'border-gray-300 bg-gray-100'
                }`}
              />
              {formErrors.phone && (
                <p className="text-red-600 text-xs md:text-sm mt-1">{formErrors.phone}</p>
              )}
            </div>

            <div>
              <label htmlFor="category" className="block text-sm md:text-base font-semibold text-gray-900 mb-2">
                Category
              </label>
              <select
                name="category"
                id="category"
                value={formData.category}
                onChange={handleInputChange}
                className={`w-full px-4 py-3 text-sm md:text-base border rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 transition ${
                  formErrors.category ? 'border-red-500 bg-red-50' : 'border-gray-300 bg-gray-100'
                }`}
              >
                <option value="">Select category</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
              {formErrors.category && (
                <p className="text-red-600 text-xs md:text-sm mt-1">{formErrors.category}</p>
              )}
            </div>

            <div>
              <label htmlFor="showroom" className="block text-sm md:text-base font-semibold text-gray-900 mb-2">
                Showroom
              </label>
              <select
                name="showroom"
                id="showroom"
                value={formData.showroom}
                onChange={handleInputChange}
                className={`w-full px-4 py-3 text-sm md:text-base border rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 transition ${
                  formErrors.showroom ? 'border-red-500 bg-red-50' : 'border-gray-300 bg-gray-100'
                }`}
              >
                <option value="">Select showroom</option>
                {showrooms.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              {formErrors.showroom && (
                <p className="text-red-600 text-xs md:text-sm mt-1">{formErrors.showroom}</p>
              )}
            </div>

            <div>
              <label htmlFor="message" className="block text-sm md:text-base font-semibold text-gray-900 mb-2">
                Your Message
              </label>
              <textarea
                name="message"
                id="message"
                value={formData.message}
                onChange={handleInputChange}
                placeholder="Please share your feedback..."
                rows={6}
                className={`w-full px-4 py-3 text-sm md:text-base border rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 transition resize-none ${
                  formErrors.message ? 'border-red-500 bg-red-50' : 'border-gray-300 bg-gray-100'
                }`}
              />
              {formErrors.message && (
                <p className="text-red-600 text-xs md:text-sm mt-1">{formErrors.message}</p>
              )}
              <p className="text-xs md:text-sm text-gray-500 mt-1">
                {formData.message.length} / 500 characters
              </p>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full px-5 py-2 md:py-4 bg-gray-900 hover:bg-gray-800 disabled:bg-gray-600 text-white text-base md:text-lg font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 mt-6 md:mt-8 shadow-lg"
            >
              {isLoading ? (
                <>
                  <svg
                    className="animate-spin h-5 w-5 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                    ></path>
                  </svg>
                  Submitting...
                </>
              ) : (
                <>
                  <Send size={15} />
                  Submit Feedback
                </>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-gray-600 text-xs md:text-sm mt-6 md:mt-8">
          Your feedback is valuable and helps us serve you better. We read every submission.
        </p>
      </div>

      <Toast message={toastMessage} show={showToast} onClose={() => setShowToast(false)} duration={3000} />
    </div>
  );
}


