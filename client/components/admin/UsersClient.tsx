"use client";

import { useState, ChangeEvent, FormEvent, useEffect } from "react";
import { Edit2, Trash2, Plus, X } from "lucide-react";
import Toast from "@/components/Toast";

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  showroomName?: string;
}

interface FormData {
  name: string;
  email: string;
  password: string;
  role: string;
  status: string;
   showroomName: string;
}

interface UsersClientProps {
  initialUsers?: User[];
}

export default function UsersClient({ initialUsers = [] }: UsersClientProps) {
  const [allUsers, setAllUsers] = useState<User[]>(initialUsers);
  const [displayedUsers, setDisplayedUsers] = useState<User[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deleteConfirmUser, setDeleteConfirmUser] = useState<User | null>(null);
  const [formData, setFormData] = useState<FormData>({
    name: "",
    email: "",
    password: "",
    role: "Admin",
    status: "Active",
    showroomName: "",
  });

  const [showrooms, setShowrooms] = useState<{ id: string; name: string }[]>([]);

  const [toast, setToast] = useState<{
    show: boolean;
    message: string;
    type: "success" | "error";
  }>({ show: false, message: "", type: "success" });

  const roles = ["Admin", "Office Admin", "Showroom"];
  const statuses = ["Active", "Inactive", "Pending", "Suspend"];

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ show: true, message, type });
  };

  const fetchShowrooms = async () => {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const res = await fetch(`${baseUrl}/api/user/showrooms-public`, {
        cache: 'no-store',
      });
      if (!res.ok) return;
      const data = await res.json();
      const items = Array.isArray(data.showrooms) ? data.showrooms : [];
      setShowrooms(items.map((s: any) => ({ id: s.id, name: s.name })));
    } catch (e) {
      // ignore showroom load errors for now
    }
  };

  const closeToast = () => setToast((t) => ({ ...t, show: false }));

  const handleOpenModal = (user: User | null = null) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        name: user.name,
        email: user.email,
        password: "",
        role: user.role,
        status: user.status,
        showroomName: user.showroomName || "",
      });
    } else {
      setEditingUser(null);
      setFormData({
        name: "",
        email: "",
        password: "",
        role: "Admin",
        status: "Active",
        showroomName: "",
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingUser(null);
    setFormData({
      name: "",
      email: "",
      password: "",
      role: "Admin",
      status: "Active",
      showroomName: "",
    });
  };

  const handleInputChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const mapDisplayToBackendRole = (r: string) => {
    const map: Record<string, string> = { "Admin": "admin", "Office Admin": "officeAdmin", "Showroom": "showroom", };
    return map[r] || r;
  };

  const mapBackendToDisplayRole = (r: string) => {
    const map: Record<string, string> = { "admin": "Admin", "officeAdmin": "Office Admin", "showroom": "Showroom" };
    return map[r] || r;
  };

  const fetchUsers = async () => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      if (!token) return;
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const res = await fetch(`${baseUrl}/api/user/admins`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.status === 403) {
        throw new Error('এই ফিচার ব্যবহার করতে অ্যাডমিন ভূমিকা প্রয়োজন');
      } else if (!res.ok) {
        throw new Error('ইউজারের তালিকা লোড করতে ব্যর্থ হয়েছে');
      }
      const data = await res.json();
      const users: User[] = (data.users || []).map((u: any) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: mapBackendToDisplayRole(u.role),
        status: u.status || 'Active',
        showroomName: u.showroomName || "",
      }));
      setAllUsers(users);
      setDisplayedUsers(users.slice(0, 10));
    } catch (e: any) {
      showToast(e.message || 'ইউজার লোড করতে সমস্যা হয়েছে', 'error');
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchShowrooms();
  }, []);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      if (!token) return showToast('অনুগ্রহ করে লগইন করুন', 'error');
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

      if (editingUser) {
        const payload: any = {
          name: formData.name,
          email: formData.email,
          role: formData.role,
        };
        if (formData.password) payload.password = formData.password;

        payload.role = mapDisplayToBackendRole(payload.role);
        if (payload.role === 'showroom') {
          payload.showroomName = formData.showroomName || '';
        } else {
          payload.showroomName = '';
        }
        const res = await fetch(`${baseUrl}/api/user/admins/${editingUser.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error('ইউজার আপডেট করতে ব্যর্থ হয়েছে');
        showToast('ইউজার সফলভাবে আপডেট হয়েছে', 'success');
      } else {
        const payload = {
          name: formData.name,
          email: formData.email,
          password: formData.password,
          role: mapDisplayToBackendRole(formData.role),
          status: 'Active',
          showroomName: mapDisplayToBackendRole(formData.role) === 'showroom' ? (formData.showroomName || '') : '',
        };
        const res = await fetch(`${baseUrl}/api/user/admins`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error('নতুন ইউজার তৈরি করতে ব্যর্থ হয়েছে');
        showToast('নতুন ইউজার সফলভাবে তৈরি হয়েছে', 'success');
      }
      handleCloseModal();
      fetchUsers();
    } catch (e: any) {
      showToast(e.message || 'ইউজার সংরক্ষণ করতে সমস্যা হয়েছে', 'error');
    }
  };

  const handleDeleteClick = (user: User) => {
    setDeleteConfirmUser(user);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirmUser) return;

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      if (!token) return showToast('Not authenticated', 'error');
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const res = await fetch(`${baseUrl}/api/user/admins/${deleteConfirmUser.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('ইউজার মুছতে ব্যর্থ হয়েছে');
      showToast('ইউজার মুছে ফেলা হয়েছে', 'success');
      setAllUsers((prev) => prev.filter((u) => u.id !== deleteConfirmUser.id));
      setDisplayedUsers((prev) => prev.filter((u) => u.id !== deleteConfirmUser.id));
      setDeleteConfirmUser(null);
    } catch (e: any) {
      showToast(e.message || 'ইউজার মুছতে সমস্যা হয়েছে', 'error');
    }
  };

  const handleDeleteCancel = () => {
    setDeleteConfirmUser(null);
  };

  const handleLoadMore = () => {
    const newCount = displayedUsers.length + 10;
    setDisplayedUsers(allUsers.slice(0, newCount));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Active":
        return "bg-green-100 text-green-800";
      case "Inactive":
        return "bg-gray-100 text-gray-800";
      case "Pending":
        return "bg-yellow-100 text-yellow-800";
      case "Suspend":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="min-h-screen p-8 bg-white">
      <Toast
        show={toast.show}
        message={toast.message}
        type={toast.type}
        onClose={closeToast}
      />
      <div className="max-w-7xl mx-auto">

        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">ইউজার ম্যানেজমেন্ট</h1>
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 sm:px-4 sm:py-2 md:px-6 md:py-2 rounded-lg transition text-sm sm:text-base"
          >
            <Plus size={18} className="sm:!w-5 sm:!h-5" />
            নতুন ইউজার যোগ করুন
          </button>

        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">নাম</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">ইমেইল</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">ভূমিকা</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">শোরুম</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">স্ট্যাটাস</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">অ্যাকশন</th>
                </tr>
              </thead>
              <tbody>
                {displayedUsers.length > 0 ? (
                  displayedUsers.map((user) => (
                    <tr
                      key={user.id}
                      className="border-b border-gray-200 hover:bg-gray-50 transition"
                    >
                      <td className="px-6 py-4 text-sm text-gray-900">{user.name}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{user.email}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{user.role}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {user.role === 'Showroom' && user.showroomName
                          ? user.showroomName
                          : "-"}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span
                          className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(
                            user.status
                          )}`}
                        >
                          {user.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div className="flex gap-3">
                          <button
                            onClick={() => handleOpenModal(user)}
                            className="text-blue-600 hover:text-blue-800 transition"
                            title="Edit"
                          >
                            <Edit2 size={18} />
                          </button>
                          <button
                            onClick={() => handleDeleteClick(user)}
                            className="text-red-600 hover:text-red-800 transition"
                            title="Delete"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-6 py-8 text-center text-gray-500"
                    >
                      কোন ইউজার পাওয়া যায়নি
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {displayedUsers.length < allUsers.length && (
            <div className="p-4 border-t border-gray-200 text-center">
              <button
                onClick={handleLoadMore}
                className="px-6 py-2 bg-gray-200 hover:bg-gray-300 text-gray-900 rounded-lg transition font-medium"
              >
                আরো ইউজার দেখুন
              </button>
            </div>
          )}
        </div>

        {isModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full transform transition-all duration-300 scale-100">
              <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-gray-50 rounded-t-2xl">
                <h2 className="text-xl font-semibold text-gray-900">
                  {editingUser ? "ইউজার সম্পাদনা" : "নতুন ইউজার তৈরি"}
                </h2>
                <button
                  onClick={handleCloseModal}
                  className="text-gray-500 hover:text-gray-700 transition"
                >
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-5">

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    নাম
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-2 border text-black border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                    placeholder="নাম লিখুন"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ইমেইল
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-2 border text-black border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                    placeholder="ইমেইল লিখুন"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    পাসওয়ার্ড{" "}
                    {editingUser && (
                      <span className="text-xs text-gray-500">
                        (আগের পাসওয়ার্ড রাখতে ফাঁকা রাখুন)
                      </span>
                    )}
                  </label>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    required={!editingUser}
                    className="w-full px-4 py-2 border text-black border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                    placeholder="পাসওয়ার্ড লিখুন"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ভূমিকা
                  </label>
                  <select
                    name="role"
                    value={formData.role}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border text-black border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                  >
                    {roles.map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </select>
                </div>

                {formData.role === 'Showroom' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      শোরুমের নাম
                    </label>
                    <select
                      name="showroomName"
                      value={formData.showroomName}
                      onChange={handleInputChange}
                      required={formData.role === 'Showroom'}
                      className="w-full px-4 py-2 border text-black border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                    >
                      <option value="">একটি শোরুম নির্বাচন করুন</option>
                      {showrooms.map((s) => (
                        <option key={s.id} value={s.name}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-900 rounded-lg transition font-medium"
                  >
                    বাতিল
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition font-medium"
                  >
                    {editingUser ? "ইউজার আপডেট করুন" : "ইউজার তৈরি করুন"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {deleteConfirmUser && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full transform transition-all duration-300 scale-100">
              <div className="p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  ইউজার মুছুন
                </h2>
                <p className="text-gray-600 mb-6">
                  আপনি কি নিশ্চিতভাবে <span className="font-semibold text-gray-900">{deleteConfirmUser.name}</span> ইউজারকে মুছতে চান? এই কাজটি আর ফিরিয়ে আনা যাবে না।
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={handleDeleteCancel}
                    className="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-900 rounded-lg transition font-medium"
                  >
                    বাতিল
                  </button>
                  <button
                    onClick={handleDeleteConfirm}
                    className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition font-medium"
                  >
                    মুছুন
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


