'use client';

import { useState, useMemo, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Download, Calendar, Plus, X, Edit2, Trash2 } from 'lucide-react';
import Toast from '@/components/Toast';

interface ReportItem {
  id: number;
  showroom: string;
  category: string;
  customerCount: number;
  feedbackCount: number;
  prevMonthPerformance: number;
  date: Date;
}

interface TableRow {
  showroom: string;
  customerCount: number;
  feedbackCount: number;
  performancePercentages: number[];
  avgPerformance: number;
}

interface ChartDatum {
  name: string;
  value: number;
  [key: string]: string | number;
}

const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
console.log('Frontend configured with API URL:', baseUrl);

interface AdminShowroomItem { id: string; name: string }

const generateColors = (count: number): string[] => {
  const colors: string[] = [];
  const baseColors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#14B8A6'];
  if (count <= baseColors.length) return baseColors.slice(0, count);
  colors.push(...baseColors);
  const additionalColors = count - baseColors.length;
  for (let i = 0; i < additionalColors; i++) {
    const hue = (i * 137.5) % 360;
    const saturation = 65 + (i % 3) * 10;
    const lightness = 50 + (i % 2) * 5;
    colors.push(`hsl(${hue}, ${saturation}%, ${lightness}%)`);
  }
  return colors;
};

export default function ReportsClient() {
  const [allData, setAllData] = useState<ReportItem[]>([]);
  const [dateRange, setDateRange] = useState<'last30' | 'thisMonth' | 'lastMonth'>('last30');
  const [selectedShowroom, setSelectedShowroom] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingOriginalName, setEditingOriginalName] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [formData, setFormData] = useState({ name: '', customerCount: '', feedbackCount: '', performancePercentage: '' });
  const [categories, setCategories] = useState<string[]>([]);
  const [showrooms, setShowrooms] = useState<string[]>([]);
  const [adminShowrooms, setAdminShowrooms] = useState<AdminShowroomItem[]>([]);

  const handleGenerateReport = async () => {
    setIsGenerating(true);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      console.log('Auth state:', { hasToken: !!token });
      if (!token) throw new Error('Not authenticated');
      const now = new Date();
      let from: Date; let to: Date = new Date();
      if (dateRange === 'last30') {
        from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      } else if (dateRange === 'thisMonth') {
        from = new Date(now.getFullYear(), now.getMonth(), 1);
      } else {
        from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        to = new Date(now.getFullYear(), now.getMonth(), 0);
      }
      const params = new URLSearchParams();
      params.set('from', from.toISOString().split('T')[0]);
      const endExclusive = new Date(to);
      endExclusive.setDate(endExclusive.getDate() + 1);
      params.set('to', endExclusive.toISOString().split('T')[0]);
      if (selectedShowroom !== 'all') params.set('showroom', selectedShowroom);
      if (selectedCategory !== 'all') params.set('category', selectedCategory);
      params.set('ts', String(Date.now()));
      console.log('Sending request:', {
        url: `${baseUrl}/api/user/analytics/showroom-report?${params.toString()}`,
        headers: { Authorization: 'Bearer [REDACTED]' }
      });
      const res = await fetch(`${baseUrl}/api/user/analytics/showroom-report?` + params.toString(), {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      });
      if (!res.ok) {
        const errorText = await res.text();
        console.error('API Error:', {
          status: res.status,
          statusText: res.statusText,
          body: errorText
        });
        throw new Error(`Failed to generate report: ${res.status} ${res.statusText}`);
      }
      const data = await res.json();
      console.log('API Response:', { data });
      if (!data || !Array.isArray(data.rows)) {
        console.error('Unexpected API response format:', data);
        throw new Error('Invalid data format received from server');
      }
      const rows: any[] = data.rows;
      const nowDate = new Date();
      console.log('Received rows:', rows); 
      const mappedAll: ReportItem[] = rows.map((r, idx) => ({
        id: idx + 1,
        showroom: r.showroom || 'Unknown',
        category: (r.category ?? '').toString() || (selectedCategory !== 'all' ? selectedCategory : 'Uncategorized'),
        customerCount: Number(r.customers || 0),
        feedbackCount: Number(r.feedbacks || 0),
        prevMonthPerformance: Number(r.customers || 0) > 0 ? Math.round((Number(r.feedbacks || 0) / Number(r.customers || 1)) * 100) : 0,
        date: nowDate,
      }));

      let currentNames = showrooms;
      try {
        const tsS = Date.now();
        const pub = await fetch(`${baseUrl}/api/user/showrooms-public?ts=${tsS}`, { cache: 'no-store' });
        if (pub.ok) {
          const pubJs = await pub.json();
          currentNames = (pubJs.showrooms || []).map((s: any) => s.name || String(s));
          setShowrooms(currentNames);
        }
      } catch { }
      const currentSet = new Set(currentNames.map(s => s.trim().toLowerCase()));
      const filtered = mappedAll.filter(it => currentSet.has((it.showroom || '').trim().toLowerCase()));
      setAllData(filtered);
      setToastMessage('Report generated successfully!');
      setShowToast(true);
    } catch (error: any) {
      setToastMessage(error?.message || 'Failed to generate report');
      setShowToast(true);
    } finally {
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const ts = Date.now();
        const res = await fetch(`${baseUrl}/api/user/categories-public?ts=${ts}`, { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json();
        const names: string[] = (data.categories || []).map((c: any) => c.name || c);
        setCategories(names);
      } catch { }
    };
    const loadShowrooms = async () => {
      try {
        const ts = Date.now();
        const res = await fetch(`${baseUrl}/api/user/showrooms-public?ts=${ts}`, { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json();
        const names: string[] = (data.showrooms || []).map((s: any) => s.name || s);
        setShowrooms(names);
      } catch { }
    };
    const loadAdminShowrooms = async () => {
      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        if (!token) return;
        const ts = Date.now();
        const res = await fetch(`${baseUrl}/api/user/showrooms?ts=${ts}`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json();
        const items: AdminShowroomItem[] = (data.showrooms || []).map((s: any) => ({ id: String(s.id || s._id), name: s.name || String(s) }));
        setAdminShowrooms(items);
      } catch { }
    };
    loadCategories();
    loadShowrooms();
    loadAdminShowrooms();
  }, []);

  useEffect(() => {
    const initializeData = async () => {
      try {

        const token = localStorage.getItem('token');
        if (!token) {
          setToastMessage('Please log in again');
          setShowToast(true);
          return;
        }

        console.log('API URL:', baseUrl);

        setIsGenerating(true);

        await handleGenerateReport();

      } catch (error: any) {
        console.error('Failed to initialize reports:', error);
        setToastMessage(error?.message || 'Failed to load initial report data');
        setShowToast(true);
      } finally {
        setIsGenerating(false);
      }
    };
    initializeData();
  }, []);

  useEffect(() => {
    if (dateRange || selectedShowroom || selectedCategory) {
      handleGenerateReport();
    }
  }, [dateRange, selectedShowroom, selectedCategory]);

  const filteredData = useMemo<ReportItem[]>(() => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    return allData.filter((item: ReportItem) => {
      let dateMatch = true;
      if (dateRange === 'last30') {
        dateMatch = item.date >= thirtyDaysAgo;
      } else if (dateRange === 'thisMonth') {
        dateMatch = item.date.getMonth() === now.getMonth() && item.date.getFullYear() === now.getFullYear();
      } else if (dateRange === 'lastMonth') {
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
        dateMatch = item.date >= lastMonth && item.date <= lastMonthEnd;
      }
      const showroomMatch = selectedShowroom === 'all' || (item.showroom || '').trim().toLowerCase() === (selectedShowroom || '').trim().toLowerCase();
      const categoryMatch = selectedCategory === 'all' || (item.category || '').trim().toLowerCase() === (selectedCategory || '').trim().toLowerCase();
      return dateMatch && showroomMatch && categoryMatch;
    });
  }, [allData, dateRange, selectedShowroom, selectedCategory]);

  const adminShowroomIdByName = useMemo<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    adminShowrooms.forEach((s) => { map[s.name.trim().toLowerCase()] = s.id; });
    return map;
  }, [adminShowrooms]);

  const tableData = useMemo<TableRow[]>(() => {

    const nameMap: Record<string, string> = {};
    adminShowrooms.forEach((s) => { nameMap[s.name.trim().toLowerCase()] = s.name; });

    const aggregated: Record<string, Omit<TableRow, 'avgPerformance'>> = {};
    adminShowrooms.forEach((item) => {
      const key = item.name.trim().toLowerCase();
      const display = nameMap[key] || item.name;
      aggregated[key] = { showroom: display, customerCount: 0, feedbackCount: 0, performancePercentages: [] };
    });

    filteredData.forEach((item) => {
      const key = (item.showroom || '').trim().toLowerCase();
      const target = aggregated[key];
      if (!target) return; 
      target.customerCount += item.customerCount;
      target.feedbackCount += item.feedbackCount;
      target.performancePercentages.push(item.prevMonthPerformance);
    });

    return Object.values(aggregated).map((item) => ({
      showroom: item.showroom,
      customerCount: item.customerCount,
      feedbackCount: item.feedbackCount,
      performancePercentages: item.performancePercentages,
      avgPerformance: Math.round((item.performancePercentages.length ? item.performancePercentages.reduce((a: number, b: number) => a + b, 0) / item.performancePercentages.length : 0)),
    }));
  }, [filteredData, adminShowrooms]);

  const chartData = useMemo<ChartDatum[]>(() => {

    const catDisplayByKey: Record<string, string> = {};
    categories.forEach((c) => { catDisplayByKey[c.trim().toLowerCase()] = c; });

    const categoryTotals: Record<string, number> = {};
    filteredData.forEach((item) => {
      const key = (item.category || '').trim().toLowerCase();

      if (!catDisplayByKey[key]) return;
      const display = catDisplayByKey[key];
      if (!categoryTotals[display]) categoryTotals[display] = 0;
      categoryTotals[display] += item.customerCount;
    });

    return Object.entries(categoryTotals).map(([name, value]) => ({ name, value }));
  }, [filteredData, categories]);

  const pieColors = useMemo(() => generateColors(chartData.length), [chartData.length]);

  const showroomMap = useMemo(() => {
    const map: Record<string, ReportItem> = {};
    filteredData.forEach(item => { if (!map[item.showroom]) map[item.showroom] = item; });
    return map;
  }, [filteredData]);

  const handleDeleteShowroom = async (name: string) => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      if (!token) throw new Error('Not authenticated');
      const showroomKey = name.trim().toLowerCase();
      const fallback = adminShowrooms.find(s => s.name.trim().toLowerCase() === showroomKey)?.id || '';
      const showroomId = adminShowroomIdByName[showroomKey] || fallback;
      if (!showroomId) {
        setToastMessage('This showroom is not in the managed Showrooms list, so it cannot be deleted.');
        setShowToast(true);
        return;
      }
      const res = await fetch(`${baseUrl}/api/user/showrooms/${showroomId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to delete showroom');
      setDeleteConfirmId(null);

      try {
        const pub = await fetch(`${baseUrl}/api/user/showrooms-public`);
        if (pub.ok) {
          const data = await pub.json();
          const names: string[] = (data.showrooms || []).map((s: any) => s.name || s);
          setShowrooms(names);
        }
      } catch { }
      try {
        const res2 = await fetch(`${baseUrl}/api/user/showrooms`, { headers: { Authorization: `Bearer ${token}` } });
        if (res2.ok) {
          const data2 = await res2.json();
          const items: AdminShowroomItem[] = (data2.showrooms || []).map((s: any) => ({ id: String(s.id || s._id), name: s.name || String(s) }));
          setAdminShowrooms(items);
        }
      } catch { }
      await handleGenerateReport();
      setToastMessage('Showroom deleted successfully!');
      setShowToast(true);
    } catch (err: any) {
      setToastMessage(err?.message || 'Failed to delete showroom');
      setShowToast(true);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target; setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleExcelExport = () => {
    const worksheetData = tableData.map((item) => ({ 'Showroom Name': item.showroom, 'Customer Count': item.customerCount, 'Feedback Count': item.feedbackCount, 'Performance %': item.avgPerformance }));
    import('xlsx').then((XLSX) => {
      const worksheet = XLSX.utils.json_to_sheet(worksheetData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Reports');
      (worksheet as any)['!cols'] = [{ wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 15 }];
      XLSX.writeFile(workbook as any, 'reports.xlsx');
    }).catch(() => {  });
  };

  const handlePdfExport = () => {
    Promise.all([import('jspdf'), import('jspdf-autotable')]).then(([jsPDFmod, autoTableMod]) => {
      const jsPDF = (jsPDFmod as any).default || (jsPDFmod as any).jsPDF || jsPDFmod;
      const autoTable = (autoTableMod as any).default || (autoTableMod as any);
      const pdf = new jsPDF();
      pdf.setFontSize(16); pdf.text('Report Summary', 14, 15);
      pdf.setFontSize(10); pdf.text(`Filters: Date Range - ${dateRange}, Showroom - ${selectedShowroom}, Category - ${selectedCategory}`, 14, 25);
      const tableColumn = ['Showroom Name', 'Customer Count', 'Feedback Count', 'Performance %'];
      const tableRows = tableData.map((item) => [item.showroom, item.customerCount, item.feedbackCount, `${item.avgPerformance}%`]);
      autoTable(pdf, { head: [tableColumn], body: tableRows, startY: 35, headStyles: { fillColor: [59, 130, 246], textColor: 255 }, bodyStyles: { textColor: 50 }, margin: { left: 14, right: 14 } });
      pdf.save('reports.pdf');
    }).catch(() => {  });
  };

  return (
    <div className="min-h-screen p-8 bg-white" >
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Reports</h1>
            <p className="text-gray-600">View and analyze showroom performance data</p>
          </div>
          <button onClick={() => { setEditingId(null); setEditingOriginalName(null); setFormData({ name: '', customerCount: '', feedbackCount: '', performancePercentage: '' }); setIsModalOpen(true); }} className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors font-medium">
            <Plus className="w-5 h-5" />
            Add Showroom
          </button>
        </div>

        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2"><Calendar size={16} className="inline mr-2" />Date Range</label>
              <select value={dateRange} onChange={(e) => setDateRange(e.target.value as 'last30' | 'thisMonth' | 'lastMonth')} className="w-full px-3 py-2 text-black border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="last30">Last 30 Days</option>
                <option value="thisMonth">This Month</option>
                <option value="lastMonth">Last Month</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Showroom</label>
              <select value={selectedShowroom} onChange={(e) => setSelectedShowroom(e.target.value)} className="w-full px-3 py-2 border text-black border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="all">All Showrooms</option>
                {showrooms.map((s) => (<option key={s} value={s}>{s}</option>))}
              </select>
            </div>
            <div>
              <label className="block text-sm  font-medium text-gray-700 mb-2">Category</label>
              <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} className="w-full px-3 py-2 border text-black border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="all">All Categories</option>
                {categories.map((c) => (<option key={c} value={c}>{c}</option>))}
              </select>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="p-6 border-b border-gray-200  flex justify-between items-center">
                <h2 className="hidden md:block text-xl  font-bold text-gray-900">Showroom Performance</h2>
                <div className="flex gap-3">
                  <button onClick={handleExcelExport} className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition"><Download size={18} />Excel</button>
                  <button onClick={handlePdfExport} className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition"><Download size={18} />PDF</button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Showroom Name</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Customer Count</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Feedback Count</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Performance %</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tableData.length > 0 ? (
                      tableData.map((item, idx) => (
                        <tr key={idx} className="border-b border-gray-200 hover:bg-gray-50 transition">
                          <td className="px-6 py-4 text-sm text-gray-900">{item.showroom}</td>
                          <td className="px-6 py-4 text-sm text-gray-600">{item.customerCount}</td>
                          <td className="px-6 py-4 text-sm text-gray-600">{item.feedbackCount}</td>
                          <td className="px-6 py-4 text-sm"><span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 rounded-full font-medium">{item.avgPerformance}%</span></td>
                          <td className="px-6 py-4 text-sm">
                            {(() => {
                              const key = item.showroom.trim().toLowerCase();
                              const fallback = adminShowrooms.find(s => s.name.trim().toLowerCase() === key)?.id || null;
                              const id = adminShowroomIdByName[key] || fallback;
                              const isManaged = !!id;
                              return (
                                <div className="flex gap-2 items-center">
                                  {isManaged ? (
                                    <>
                                      <button onClick={() => { setEditingId(id); setEditingOriginalName(item.showroom); setFormData({ name: item.showroom, customerCount: String(item.customerCount), feedbackCount: String(item.feedbackCount), performancePercentage: String(item.avgPerformance) }); setIsModalOpen(true); }} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition" title="Edit showroom"><Edit2 size={18} /></button>
                                      <div className="relative">
                                        <button onClick={() => setDeleteConfirmId(deleteConfirmId === item.showroom ? null : item.showroom)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition" title="Delete showroom"><Trash2 size={18} /></button>
                                        {deleteConfirmId === item.showroom && (
                                          <div className="absolute right-0 top-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg p-3 z-10 whitespace-nowrap">
                                            <p className="text-sm font-medium text-gray-900 mb-2">Delete this showroom?</p>
                                            <div className="flex gap-2">
                                              <button onClick={() => handleDeleteShowroom(item.showroom)} className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition">Delete</button>
                                              <button onClick={() => setDeleteConfirmId(null)} className="px-3 py-1 bg-gray-200 text-gray-700 text-sm rounded hover:bg-gray-300 transition">Cancel</button>
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    </>
                                  ) : (
                                    <>
                                      <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700">Unmanaged</span>
                                      <button onClick={() => { setEditingId(null); setEditingOriginalName(null); setFormData({ name: item.showroom, customerCount: String(item.customerCount), feedbackCount: String(item.feedbackCount), performancePercentage: String(item.avgPerformance) }); setIsModalOpen(true); }} className="px-2 py-1 text-xs bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition" title="Add to managed showrooms">Add</button>
                                    </>
                                  )}
                                </div>
                              );
                            })()}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500">No data available for the selected filters</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <h2 className="text-xl z-20 font-bold text-gray-900 mb-6">Category Interest Ratio</h2>
            {chartData.length > 0 ? (
              <div className="w-full z-20 h-96 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      labelLine={true}
                      label={({ name, percent }) => `${name} ${(((percent as unknown as number) || 0) * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {chartData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={pieColors[index]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => `${value} customers`} />
                    <Legend wrapperStyle={{ paddingTop: '20px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-96 flex items-center justify-center text-gray-500">No data available for the selected filters</div>
            )}
          </div>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center " onClick={() => setIsModalOpen(false)}>
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md mx-4 p-6" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setIsModalOpen(false)} className="absolute top-4 right-4 p-1 hover:bg-gray-100 rounded-lg transition-colors" aria-label="Close modal"><X className="w-5 h-5 text-gray-500" /></button>
            <h2 className="text-2xl font-bold text-gray-900 mb-1">{editingId !== null ? 'Edit Showroom' : 'Add New Showroom'}</h2>
            <p className="text-gray-600 text-sm mb-6">{editingId !== null ? 'Update the showroom details below' : 'Fill in the showroom details below'}</p>
            <form onSubmit={async (e) => {
              e.preventDefault();
              if (!formData.name) { setToastMessage('Please enter showroom name'); setShowToast(true); return; }
              try {
                const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
                if (!token) throw new Error('Not authenticated');
                let targetId = editingId;

                if (!targetId && editingOriginalName) {
                  const key = editingOriginalName.trim().toLowerCase();
                  const fallback = adminShowrooms.find(s => s.name.trim().toLowerCase() === key)?.id || null;
                  targetId = adminShowroomIdByName[key] || fallback || null;
                }
                if (!targetId) {

                  try {
                    const ts2 = Date.now();
                    const latestRes = await fetch(`${baseUrl}/api/user/showrooms?ts=${ts2}`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
                    if (latestRes.ok) {
                      const latest = await latestRes.json();
                      const items: AdminShowroomItem[] = (latest.showrooms || []).map((s: any) => ({ id: String(s.id || s._id), name: s.name || String(s) }));
                      setAdminShowrooms(items);
                      const key = (editingOriginalName || formData.name).trim().toLowerCase();
                      const fromMap = items.find(s => s.name.trim().toLowerCase() === key)?.id || null;
                      targetId = adminShowroomIdByName[key] || fromMap || null;
                    }
                  } catch { }
                }

                if (targetId) {
                  const res = await fetch(`${baseUrl}/api/user/showrooms/${targetId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ name: formData.name }) });
                  if (!res.ok) { const t = await res.text(); throw new Error(t || 'Failed to update showroom'); }
                } else {
                  const res = await fetch(`${baseUrl}/api/user/showrooms`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ name: formData.name }) });
                  if (!res.ok) { const t = await res.text(); throw new Error(t || 'Failed to add showroom'); }
                }
                try { const pub = await fetch(`${baseUrl}/api/user/showrooms-public`); if (pub.ok) { const data = await pub.json(); const names: string[] = (data.showrooms || []).map((s: any) => s.name || s); setShowrooms(names); } } catch { }
                try { const ts = Date.now(); const res2 = await fetch(`${baseUrl}/api/user/showrooms?ts=${ts}`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' }); if (res2.ok) { const data2 = await res2.json(); const items: AdminShowroomItem[] = (data2.showrooms || []).map((s: any) => ({ id: String(s.id || s._id), name: s.name || String(s) })); setAdminShowrooms(items); } } catch { }
                await handleGenerateReport();
                setToastMessage(targetId ? `Showroom "${formData.name}" updated successfully!` : `Showroom "${formData.name}" added successfully!`);
              } catch (err: any) { setToastMessage(err?.message || 'Failed to add showroom'); }
              finally {
                setFormData({ name: '', customerCount: '', feedbackCount: '', performancePercentage: '' }); setEditingId(null); setEditingOriginalName(null); setIsModalOpen(false); setShowToast(true);
              }
            }} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Showroom Name</label>
                <input type="text" name="name" value={formData.name} onChange={handleInputChange} placeholder="e.g., Downtown Showroom" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 transition" />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium">Cancel</button>
                <button type="submit" className="flex-1 px-4 py-2 bg-gray-900 text-black rounded-lg hover:bg-gray-800 transition-colors font-medium">{editingId !== null ? 'Update Showroom' : 'Add Showroom'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <Toast message={toastMessage} show={showToast} onClose={() => setShowToast(false)} duration={3000} />
    </div>
  );
}


