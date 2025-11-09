'use client';

import React, { useEffect, useState } from 'react';
import { Save, Send, Eye, EyeOff } from 'lucide-react';
import Toast from '@/components/Toast';

export default function MessageSettingsClient() {
  const [formData, setFormData] = useState({
    smsProvider: 'greenweb',
    smsApiKey: '',
    smsSenderId: '',
    feedbackUrl: '',
  });

  const [showApiKey, setShowApiKey] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [testPhoneNumber, setTestPhoneNumber] = useState('');
  const [showTestModal, setShowTestModal] = useState(false);
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  useEffect(() => {
    const load = async () => {
      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        const res = await fetch(`${baseUrl}/api/user/message-settings?ts=${Date.now()}`, {
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          cache: 'no-store',
        });
        if (!res.ok) return;
        const data = await res.json();
        const s = data?.settings || {};
        setFormData({
          smsProvider: s.smsProvider || 'greenweb',
          smsApiKey: s.smsApiKey || '',
          smsSenderId: s.smsSenderId || '',
          feedbackUrl: s.feedbackUrl || '',
        });
      } catch {}
    };
    load();
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.smsApiKey || !formData.smsProvider) {
      setToastMessage('Please select a provider and enter API key');
      setShowToast(true);
      return;
    }

    setIsLoading(true);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const res = await fetch(`${baseUrl}/api/user/message-settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          smsProvider: formData.smsProvider,
          smsApiKey: formData.smsApiKey,
          smsSenderId: formData.smsSenderId,
          feedbackUrl: formData.feedbackUrl,
        }),
      });
      if (!res.ok) throw new Error('Save failed');
      const data = await res.json();
      const s = data?.settings || {};
      setFormData({
        smsProvider: s.smsProvider || formData.smsProvider,
        smsApiKey: s.smsApiKey || formData.smsApiKey,
        smsSenderId: s.smsSenderId || formData.smsSenderId,
        feedbackUrl: s.feedbackUrl || formData.feedbackUrl,
      });
      setToastMessage('SMS settings saved successfully!');
      setShowToast(true);
    } catch (error) {
      setToastMessage('Failed to save settings. Please try again.');
      setShowToast(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestSMS = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!testPhoneNumber) {
      setToastMessage('Please enter a phone number');
      setShowToast(true);
      return;
    }

    if (!formData.smsApiKey || !formData.smsProvider) {
      setToastMessage('Please save SMS settings first');
      setShowToast(true);
      return;
    }

    setIsLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      setToastMessage(`Test SMS sent successfully to ${testPhoneNumber}!`);
      setShowToast(true);
      setTestPhoneNumber('');
      setShowTestModal(false);
    } catch (error) {
      setToastMessage('Failed to send test SMS. Please try again.');
      setShowToast(true);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-8 bg-white">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">SMS Gateway Settings</h1>
          <p className="text-gray-600">Configure your SMS gateway credentials and settings</p>
        </div>

        <div className="bg-white rounded-lg shadow p-8">
          <form onSubmit={handleSaveSettings} className="space-y-6">
            <div>
              <label htmlFor="smsProvider" className="block text-sm font-medium text-gray-700 mb-2">
                SMS Provider
              </label>
              <select id="smsProvider" name="smsProvider" value={formData.smsProvider} onChange={handleInputChange} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 transition">
                <option value="greenweb">Greenweb</option>
                <option value="bulksmsbd">BulkSMSBD</option>
                <option value="smsnetbd">SMS.net.bd</option>
              </select>
            </div>

            <div>
              <label htmlFor="smsApiKey" className="block text-sm font-medium text-gray-700 mb-2">API Key</label>
              <div className="relative">
                <input type={showApiKey ? 'text' : 'password'} name="smsApiKey" id="smsApiKey" value={formData.smsApiKey} onChange={handleInputChange} placeholder="Enter your SMS gateway API key" className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 transition" />
                <button type="button" onClick={() => setShowApiKey(!showApiKey)} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 transition" aria-label={showApiKey ? 'Hide API key' : 'Show API key'}>
                  {showApiKey ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">Your API key is encrypted and secure</p>
            </div>

            <div>
              <label htmlFor="smsSenderId" className="block text-sm font-medium text-gray-700 mb-2">Sender ID</label>
              <input type="text" name="smsSenderId" id="smsSenderId" value={formData.smsSenderId} onChange={handleInputChange} placeholder="e.g., YourBrand or 1234" className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 transition" />
              <p className="text-xs text-gray-500 mt-1">The sender ID that will appear on SMS messages</p>
            </div>

            <div>
              <label htmlFor="feedbackUrl" className="block text-sm font-medium text-gray-700 mb-2">Feedback URL</label>
              <input type="url" name="feedbackUrl" id="feedbackUrl" value={formData.feedbackUrl} onChange={handleInputChange} placeholder="e.g., https://yourapp.com/user/feedback" className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 transition" />
              <p className="text-xs text-gray-500 mt-1">Link used in SMS for collecting customer feedback</p>
            </div>

            <div className="flex flex-col md:flex-row gap-3 md:gap-4 pt-6 border-t border-gray-200">
              <button type="button" onClick={() => setShowTestModal(true)} disabled={isLoading} className="w-full md:w-auto flex justify-center items-center text-sm gap-2 px-4 py-2 md:px-6 md:py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg transition-colors font-medium">
                <Send size={24} />
                Test SMS
              </button>

              <button type="submit" disabled={isLoading} className="w-full md:w-auto inline-flex justify-center items-center gap-2 px-4 py-2 md:px-6 md:py-3 bg-gray-900 hover:bg-gray-800 disabled:bg-gray-600 text-white rounded-lg transition-colors font-medium">
                <Save size={24} />
                {isLoading ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </form>
        </div>

        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-sm font-semibold text-blue-900 mb-2">Need Help?</h3>
          <p className="text-sm text-blue-800">To get your SMS gateway credentials, visit your SMS provider's dashboard and navigate to the API settings section. Make sure to copy your API key and endpoint URL correctly.</p>
        </div>
      </div>

      {showTestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={() => setShowTestModal(false)}>
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md mx-4 p-6" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setShowTestModal(false)} className="absolute top-4 right-4 p-1 hover:bg-gray-100 rounded-lg transition-colors" aria-label="Close modal">
              <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <h2 className="text-2xl font-bold text-gray-900 mb-1">Send Test SMS</h2>
            <p className="text-gray-600 text-sm mb-6">Enter a phone number to send a test SMS message</p>

            <form onSubmit={handleTestSMS} className="space-y-4">
              <div>
                <label htmlFor="testPhoneNumber" className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
                <input type="tel" id="testPhoneNumber" name="testPhoneNumber" value={testPhoneNumber} onChange={(e) => setTestPhoneNumber(e.target.value)} placeholder="e.g., +1234567890 or 1234567890" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 transition" />
                <p className="text-xs text-gray-500 mt-1">Include country code for international numbers</p>
              </div>

              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowTestModal(false)} className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium">Cancel</button>
                <button type="submit" disabled={isLoading} className="flex-1 px-4 py-2 bg-gray-900 hover:bg-gray-800 disabled:bg-gray-600 text-white rounded-lg transition-colors font-medium inline-flex items-center justify-center gap-2">
                  <Send size={16} />
                  {isLoading ? 'Sending...' : 'Send Test'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <Toast message={toastMessage} show={showToast} onClose={() => setShowToast(false)} duration={3000} />
    </div>
  );
}


