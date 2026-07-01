/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  FilePieChart, 
  CheckSquare, 
  Printer, 
  TrendingUp, 
  Users, 
  MapPin, 
  ShieldCheck, 
  Signature,
  FileSpreadsheet,
  RefreshCw,
  Award,
  Pencil,
  Trash2,
  Plus,
  X,
  Check
} from 'lucide-react';
import { api } from '../lib/api';
import { User } from '../types';
import { exportTankersPDF } from '../lib/pdfHelper';
import { useTranslation } from '../lib/LanguageContext';

interface ReportsProps {
  user: User;
}

export default function Reports({ user }: ReportsProps) {
  const { t, language, isRtl } = useTranslation();
  const [pdfLoading, setPdfLoading] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // State for Special Standby / Exception Ledger
  const [exceptions, setExceptions] = useState<any[]>([]);
  const [editingLedgerId, setEditingLedgerId] = useState<number | null>(null);
  const [isAddingLedger, setIsAddingLedger] = useState(false);
  const [ledgerForm, setLedgerForm] = useState({ sn: '', product: 'PETROL', capacity: '36000', status: 'NOT USE' });

  // State for Capacity Categories
  const [categories, setCategories] = useState<any[]>([]);
  const [editingCategoryId, setEditingCategoryId] = useState<number | null>(null);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [categoryForm, setCategoryForm] = useState({ name: '', min_capacity: '', max_capacity: '', quantity: '' });

  // State for delete confirmations
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'category' | 'ledger'; id: number; label: string } | null>(null);

  const fetchStatsAndTables = async () => {
    setLoading(true);
    try {
      const statsData = await api.getStatistics();
      setStats(statsData);
      
      const cats = await api.getCapacityCategories();
      setCategories(cats);
      
      const ledger = await api.getSpecialStandbyLedger();
      setExceptions(ledger);
    } catch (err) {
      console.error('Error loading report stats & tables:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatsAndTables();
  }, []);

  const handleAddCategory = async () => {
    if (!categoryForm.name.trim() || !categoryForm.min_capacity || !categoryForm.max_capacity) return;
    try {
      const newCat = await api.addCapacityCategory({
        name: categoryForm.name.toUpperCase(),
        min_capacity: Number(categoryForm.min_capacity),
        max_capacity: Number(categoryForm.max_capacity),
        quantity: Number(categoryForm.quantity) || 0
      });
      setCategories(prev => [...prev, newCat]);
      setIsAddingCategory(false);
      // Refresh stats to update counts
      const statsData = await api.getStatistics();
      setStats(statsData);
    } catch (err) {
      console.error('Failed to add category:', err);
    }
  };

  const handleUpdateCategory = async () => {
    if (editingCategoryId === null || !categoryForm.name.trim() || !categoryForm.min_capacity || !categoryForm.max_capacity) return;
    try {
      const updated = await api.updateCapacityCategory(editingCategoryId, {
        name: categoryForm.name.toUpperCase(),
        min_capacity: Number(categoryForm.min_capacity),
        max_capacity: Number(categoryForm.max_capacity),
        quantity: Number(categoryForm.quantity) || 0
      });
      setCategories(prev => prev.map(c => c.id === editingCategoryId ? updated : c));
      setEditingCategoryId(null);
      // Refresh stats to update counts
      const statsData = await api.getStatistics();
      setStats(statsData);
    } catch (err) {
      console.error('Failed to update category:', err);
    }
  };

  const handleDeleteCategory = async (id: number) => {
    try {
      await api.deleteCapacityCategory(id);
      setCategories(prev => prev.filter(c => c.id !== id));
      // Refresh stats to update counts
      const statsData = await api.getStatistics();
      setStats(statsData);
    } catch (err) {
      console.error('Failed to delete category:', err);
    }
  };

  const handleAddLedger = async () => {
    if (!ledgerForm.sn.trim() || !ledgerForm.capacity) return;
    try {
      const newEntry = await api.addSpecialStandbyLedger({
        sn: ledgerForm.sn,
        product: ledgerForm.product.toUpperCase(),
        capacity: Number(ledgerForm.capacity),
        status: ledgerForm.status
      });
      setExceptions(prev => [...prev, newEntry]);
      setIsAddingLedger(false);
    } catch (err) {
      console.error('Failed to add ledger entry:', err);
    }
  };

  const handleUpdateLedger = async () => {
    if (editingLedgerId === null || !ledgerForm.sn.trim() || !ledgerForm.capacity) return;
    try {
      const updated = await api.updateSpecialStandbyLedger(editingLedgerId, {
        sn: ledgerForm.sn,
        product: ledgerForm.product.toUpperCase(),
        capacity: Number(ledgerForm.capacity),
        status: ledgerForm.status
      });
      setExceptions(prev => prev.map(e => e.id === editingLedgerId ? updated : e));
      setEditingLedgerId(null);
    } catch (err) {
      console.error('Failed to update ledger entry:', err);
    }
  };

  const handleDeleteLedger = async (id: number) => {
    try {
      await api.deleteSpecialStandbyLedger(id);
      setExceptions(prev => prev.filter(e => e.id !== id));
    } catch (err) {
      console.error('Failed to delete ledger entry:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 bg-slate-950 text-slate-100 min-h-[80vh]">
        <div className="w-10 h-10 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mb-4" />
        <p className="text-sm font-mono text-slate-400">Compiling Fleet Audits...</p>
      </div>
    );
  }

  const handlePrint = async () => {
    if (pdfLoading) return;
    setPdfLoading(true);
    try {
      const data = await api.getRecords({
        page: 1,
        limit: 1000 // Get all fleet tankers to export in the official report
      });
      await exportTankersPDF(data.records, {}, user, {
        exceptions: exceptions,
        language: language
      });
    } catch (err) {
      console.error('Failed to export PDF:', err);
    } finally {
      setPdfLoading(false);
    }
  };

  return (
    <div className={`flex-1 p-6 md:p-8 space-y-8 bg-slate-950 text-slate-100 font-sans min-h-screen ${isRtl ? 'rtl' : 'ltr'}`}>
      
      {/* Header */}
      <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 ${isRtl ? 'text-right' : 'text-left'}`}>
        <div>
          <h1 id="reports-header" className="text-2xl font-extrabold tracking-tight text-slate-50 flex items-center gap-2 justify-start">
            {isRtl ? 'التقارير وتدقيق الأسطول' : 'Reports & Fleet Audits'}
          </h1>
          <p className="text-sm text-slate-400">
            {isRtl ? 'الملخصات والمقاييس الرسمية لتقرير سلسلة أرامكو. تصدير مخرجات عالية الدقة بصيغة PDF.' : 'Official summary metrics of the Aramco Series report. Execute high-fidelity PDF outputs.'}
          </p>
        </div>

        <div className={`flex items-center gap-2 ${isRtl ? 'flex-row-reverse' : 'flex-row'}`}>
          <button
            onClick={fetchStatsAndTables}
            className="p-2 bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl text-slate-300 transition-colors cursor-pointer"
            title={isRtl ? 'إعادة تحميل البيانات' : 'Reload report data'}
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={handlePrint}
            disabled={pdfLoading}
            className="flex items-center gap-2 px-5 py-2.5 btn-enterprise bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none rounded-xl text-xs font-bold text-white transition-all shadow-[0_0_15px_rgba(37,99,235,0.3)] hover:shadow-[0_0_20px_rgba(37,99,235,0.5)] active:scale-95 cursor-pointer"
          >
            {pdfLoading ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Printer className="w-4 h-4" />
            )}
            <span>{pdfLoading ? (isRtl ? 'جاري إنشاء PDF...' : 'Generating PDF...') : (isRtl ? 'طباعة التقرير الرسمي' : 'Print Official Report')}</span>
          </button>
        </div>
      </div>

      {/* Corporate Summary Table - High fidelity layout resembling PDF Page 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Tanker Distribution Summary Grid */}
        <div className="p-6 glass-panel space-y-6">
          <h3 className={`text-sm font-bold text-slate-50 uppercase tracking-wider font-mono border-blue-500 ${isRtl ? 'border-r-2 pr-2.5 text-right' : 'border-l-2 pl-2.5 text-left'}`}>
            {isRtl ? '١. ملخصات الناقلات الاستراتيجية المعتمدة (صفحة ٢ من الـ PDF)' : '1. Core Tanker Summaries (PDF Page 2)'}
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* By Cargo Type Table */}
            <div className="border border-blue-500/30 rounded-xl overflow-hidden">
              <div className={`bg-blue-900/20 px-3 py-2 border-b border-blue-500/30 text-3xs font-bold uppercase font-mono tracking-wider text-blue-300 ${isRtl ? 'text-right' : 'text-left'}`}>
                {isRtl ? 'ملخص حسب المنتج (الشحنة)' : 'Summary by Product (Cargo)'}
              </div>
              <table className={`w-full ${isRtl ? 'text-right' : 'text-left'} font-mono text-xs`}>
                <tbody>
                  {stats?.productDist && Object.entries(stats.productDist).map(([prod, count]: any) => (
                    <tr key={prod} className="border-b border-slate-800 hover:bg-slate-900/40">
                      <td className={`px-3 py-1.5 text-slate-400 text-2xs uppercase ${isRtl ? 'pl-2' : 'pr-2'}`}>{isRtl ? (prod === 'PETROL' ? 'بنزين' : prod === 'DIESEL' ? 'ديزل' : prod === 'WATER' ? 'مياه' : prod === 'MIXED' ? 'مختلط' : prod === 'FUEL OIL' ? 'زيت الوقود' : prod) : prod}</td>
                      <td className={`px-3 py-1.5 font-bold text-slate-100 w-16 ${isRtl ? 'text-left' : 'text-right'}`}>{count}</td>
                    </tr>
                  ))}
                  <tr className="bg-slate-950 font-bold border-t border-blue-500/20 text-slate-100">
                    <td className="px-3 py-2 text-2xs uppercase">{isRtl ? 'إجمالي ناقلات الشحنة' : 'Total Cargo Units'}</td>
                    <td className={`px-3 py-2 w-16 ${isRtl ? 'text-left' : 'text-right'}`}>{stats?.totalRecords}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* By Regional Distribution Table */}
            <div className="border border-blue-500/30 rounded-xl overflow-hidden">
              <div className={`bg-blue-900/20 px-3 py-2 border-b border-blue-500/30 text-3xs font-bold uppercase font-mono tracking-wider text-blue-300 ${isRtl ? 'text-right' : 'text-left'}`}>
                {isRtl ? 'ملخص حسب المنطقة اللوجستية' : 'Summary by Logistics Region'}
              </div>
              <table className={`w-full ${isRtl ? 'text-right' : 'text-left'} font-mono text-xs`}>
                <tbody>
                  {stats?.regionDist && Object.entries(stats.regionDist).map(([reg, count]: any) => (
                    <tr key={reg} className="border-b border-slate-800 hover:bg-slate-900/40">
                      <td className="px-3 py-1.5 text-slate-400 text-2xs truncate max-w-[120px]" title={reg}>{isRtl ? (reg === 'DAMMAM' ? 'الدمام' : reg === 'NAJRAN' ? 'نجران' : reg === 'MAKKAH' ? 'مكة' : reg === 'JEDDAH' ? 'جدة' : reg === 'DAMMAM - WORKSHOP' ? 'ورشة الدمام' : reg === 'NAJRAN - WORKSHOP' ? 'ورشة نجران' : reg === 'NEW TANKER' ? 'ناقلة جديدة' : reg) : reg}</td>
                      <td className={`px-3 py-1.5 font-bold text-slate-100 w-16 ${isRtl ? 'text-left' : 'text-right'}`}>{count}</td>
                    </tr>
                  ))}
                  <tr className="bg-slate-950 font-bold border-t border-blue-500/20 text-slate-100">
                    <td className="px-3 py-2 text-2xs uppercase">{isRtl ? 'إجمالي أسطول المنطقة' : 'Total Region Fleet'}</td>
                    <td className={`px-3 py-2 w-16 ${isRtl ? 'text-left' : 'text-right'}`}>{stats?.totalRecords}</td>
                  </tr>
                </tbody>
              </table>
            </div>

          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* By Structural Classification */}
            <div className="border border-blue-500/30 rounded-xl overflow-hidden">
              <div className={`bg-blue-900/20 px-3 py-2 border-b border-blue-500/30 text-3xs font-bold uppercase font-mono tracking-wider text-blue-300 ${isRtl ? 'text-right' : 'text-left'}`}>
                {isRtl ? 'المواد الإنشائية لهيكل الخزان' : 'Structural Materials'}
              </div>
              <table className={`w-full ${isRtl ? 'text-right' : 'text-left'} font-mono text-xs`}>
                <tbody>
                  {stats?.classificationDist && Object.entries(stats.classificationDist).map(([cls, count]: any) => (
                    <tr key={cls} className="border-b border-slate-800 hover:bg-slate-900/40">
                      <td className="px-3 py-2 text-slate-300 font-semibold text-2xs">{isRtl ? (cls === 'STEEL' ? 'حديد (STEEL)' : cls === 'ALUMINUM' ? 'ألومنيوم (ALUMINUM)' : cls) : cls}</td>
                      <td className={`px-3 py-2 font-bold text-slate-100 w-16 ${isRtl ? 'text-left' : 'text-right'}`}>{count}</td>
                    </tr>
                  ))}
                  <tr className="bg-slate-950 font-bold border-t border-blue-500/20 text-slate-100">
                    <td className="px-3 py-2 text-2xs uppercase font-sans">{isRtl ? 'إجمالي هياكل الخزانات' : 'Total Materials'}</td>
                    <td className={`px-3 py-2 w-16 ${isRtl ? 'text-left' : 'text-right'}`}>{stats?.totalRecords}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Capacity Groups (Dynamic) */}
            <div className="border border-blue-500/30 rounded-xl overflow-hidden">
              <div className={`bg-blue-900/20 px-3 py-2 border-b border-blue-500/30 flex items-center justify-between text-3xs font-bold uppercase font-mono tracking-wider text-blue-300 ${isRtl ? 'flex-row-reverse' : 'flex-row'}`}>
                <span>{isRtl ? 'تصنيفات السعة اللترية الإجمالية' : 'Capacity Classification Categories'}</span>
                {user.role !== 'viewer' && user.role !== 'staff' && (
                  <button
                    onClick={() => {
                      setCategoryForm({ name: '', min_capacity: '', max_capacity: '', quantity: '' });
                      setIsAddingCategory(true);
                      setEditingCategoryId(null);
                    }}
                    className="flex items-center gap-1 px-1.5 py-0.5 text-4xs bg-blue-600 hover:bg-blue-500 text-white font-bold rounded uppercase tracking-wider font-mono transition-colors cursor-pointer"
                  >
                    <Plus className="w-2.5 h-2.5" />
                  </button>
                )}
              </div>
              <table className={`w-full ${isRtl ? 'text-right' : 'text-left'} font-mono text-xs`}>
                <tbody>
                  {categories.map((cat: any) => {
                    const count = stats?.capacityCategories?.[cat.name]?.count || 0;
                    return (
                      <tr key={cat.id} className="border-b border-slate-800 hover:bg-slate-900/40 group">
                        <td className="px-3 py-2 text-slate-300 text-2xs">
                          {cat.name} ({Number(cat.min_capacity).toLocaleString()}L - {Number(cat.max_capacity).toLocaleString()}L)
                        </td>
                        <td className={`px-3 py-2 font-bold text-slate-100 w-16 ${isRtl ? 'text-left' : 'text-right'}`}>
                          {cat.quantity || 0}
                        </td>
                        {user.role !== 'viewer' && user.role !== 'staff' && (
                          <td className="px-2 py-1 text-center w-16">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => {
                                  setEditingCategoryId(cat.id);
                                  setCategoryForm({
                                    name: cat.name,
                                    min_capacity: String(cat.min_capacity),
                                    max_capacity: String(cat.max_capacity),
                                    quantity: String(cat.quantity || 0)
                                  });
                                  setIsAddingCategory(false);
                                }}
                                className="p-1 hover:bg-slate-850 rounded text-slate-400 hover:text-blue-400 transition-colors cursor-pointer"
                                title={isRtl ? 'تعديل التصنيف' : 'Edit Category'}
                              >
                                <Pencil className="w-2.5 h-2.5" />
                              </button>
                              <button
                                onClick={() => setDeleteTarget({ type: 'category', id: cat.id, label: cat.name })}
                                className="p-1 hover:bg-slate-850 rounded text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                                title={isRtl ? 'حذف التصنيف' : 'Delete Category'}
                              >
                                <Trash2 className="w-2.5 h-2.5" />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                  <tr className="bg-slate-950 font-bold border-t border-blue-500/20 text-slate-100">
                    <td className="px-3 py-2 text-2xs uppercase font-sans">{isRtl ? 'إجمالي المجموعات اللترية' : 'Total Groupings'}</td>
                    <td className={`px-3 py-2 w-16 ${isRtl ? 'text-left' : 'text-right'}`} colSpan={user.role !== 'viewer' && user.role !== 'staff' ? 2 : 1}>
                      {categories.reduce((acc, cat) => acc + (Number(cat.quantity) || 0), 0)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

          </div>
        </div>

        {/* Dynamic Special Standby Ledger Column */}
        <div className="p-6 glass-panel flex flex-col justify-between">
          <div>
            <div className={`flex items-center justify-between mb-4 border-b border-white/5 pb-2 ${isRtl ? 'flex-row-reverse' : 'flex-row'}`}>
              <h3 className={`text-sm font-bold text-slate-50 uppercase tracking-wider font-mono border-blue-500 ${isRtl ? 'border-r-2 pr-2.5 text-right' : 'border-l-2 pl-2.5 text-left'}`}>
                {isRtl ? '٢. دفتر وحدات الاحتياط واستثناءات التشغيل الخاص' : '2. Special Standby / Exception Ledger'}
              </h3>
              {user.role !== 'viewer' && (
                <button
                  onClick={() => {
                    setLedgerForm({ sn: '', product: 'PETROL', capacity: '36000', status: 'NOT USE' });
                    setIsAddingLedger(true);
                    setEditingLedgerId(null);
                  }}
                  className="flex items-center gap-1 px-2.5 py-1 text-4xs bg-blue-600 hover:bg-blue-500 text-white font-bold rounded uppercase tracking-wider font-mono transition-colors cursor-pointer"
                >
                  <Plus className="w-3 h-3" /> {isRtl ? 'إضافة مدخل' : 'Add Entry'}
                </button>
              )}
            </div>
            <p className={`text-xs text-slate-400 mb-4 ${isRtl ? 'text-right' : 'text-left'}`}>
              {isRtl 
                ? 'سجل استثناءات الناقلات المعتمدة، الوحدات الاحتياطية، مركبات الصيانة ورخص الحفظ الآمن الرسمية المكتوبة بقاعدة البيانات مباشرة.' 
                : 'Registered exceptions, standbys, workshop units, and Saif Custody licenses loaded dynamically from Supabase.'}
            </p>

            <div className="border border-slate-800 rounded-xl overflow-hidden">
              <table className={`w-full ${isRtl ? 'text-right' : 'text-left'} font-sans text-xs`}>
                <thead>
                  <tr className="bg-slate-950 text-slate-400 border-b border-slate-800 text-3xs font-mono uppercase tracking-wider">
                    <th className="py-2.5 px-3">{isRtl ? 'رقم الناقلة' : 'Tanker No'}</th>
                    <th className="py-2.5 px-3">{isRtl ? 'نوع الشحنة' : 'Cargo Spec'}</th>
                    <th className={`py-2.5 px-3 ${isRtl ? 'text-left' : 'text-right'}`}>{isRtl ? 'السعة اللترية' : 'Capacity'}</th>
                    <th className="py-2.5 px-3 text-center">{isRtl ? 'حالة المستند' : 'Status Label'}</th>
                    {user.role !== 'viewer' && <th className="py-2.5 px-3 text-center w-20">{isRtl ? 'الإجراءات' : 'Actions'}</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono text-2xs">
                  {exceptions.map((anom) => (
                    <tr key={anom.id} className="hover:bg-slate-900/20 text-slate-300 group">
                      <td className="py-2 px-3 font-semibold text-slate-100">{anom.sn}</td>
                      <td className="py-2 px-3 text-3xs">{isRtl ? (anom.product === 'PETROL' ? 'بنزين' : anom.product === 'DIESEL' ? 'ديزل' : anom.product === 'WATER' ? 'مياه' : anom.product === 'MIXED' ? 'مختلط' : anom.product === 'FUEL OIL' ? 'زيت الوقود' : anom.product) : anom.product}</td>
                      <td className={`py-2 px-3 ${isRtl ? 'text-left' : 'text-right'}`}>{Number(anom.capacity).toLocaleString()} {isRtl ? 'لتر' : 'L'}</td>
                      <td className="py-2 px-3 text-center">
                        <span className={`inline-block px-1.5 py-0.2 rounded font-bold border text-4xs 
                          ${anom.status === 'NOT USE' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
                            anom.status === 'SAIF CUSTODY' ? 'bg-sky-500/10 text-sky-400 border-sky-500/20' :
                            'bg-amber-500/10 text-amber-400 border-amber-500/20'}`}>
                          {isRtl ? (anom.status === 'NOT USE' ? 'ليست للاستخدام' : anom.status === 'SAIF CUSTODY' ? 'حفظ آمن (سيف)' : anom.status) : anom.status}
                        </span>
                      </td>
                      {user.role !== 'viewer' && (
                        <td className="py-2 px-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => {
                                setEditingLedgerId(anom.id);
                                setLedgerForm({ ...anom, capacity: String(anom.capacity) });
                                setIsAddingLedger(false);
                              }}
                              className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-blue-400 transition-colors cursor-pointer"
                              title={isRtl ? 'تعديل المدخل' : 'Edit Entry'}
                            >
                              <Pencil className="w-3 h-3" />
                            </button>
                            {user.role !== 'staff' && (
                              <button
                                onClick={() => setDeleteTarget({ type: 'ledger', id: anom.id, label: `${anom.sn} (${anom.product})` })}
                                className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                                title={isRtl ? 'حذف المدخل' : 'Delete Entry'}
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className={`mt-4 pt-4 border-t border-slate-800/60 text-2xs text-slate-400 italic ${isRtl ? 'text-right' : 'text-left'}`}>
          </div>
        </div>

      </div>

      {/* Edit/Add Capacity Category Modal */}
      {(isAddingCategory || editingCategoryId !== null) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className={`flex items-center justify-between border-b border-slate-800 pb-3 ${isRtl ? 'flex-row-reverse' : 'flex-row'}`}>
              <h4 className="text-sm font-bold text-slate-50 uppercase tracking-wider font-mono">
                {isAddingCategory 
                  ? (isRtl ? 'إضافة تصنيف سعة لترية' : 'Add Capacity Category') 
                  : (isRtl ? 'تعديل تصنيف سعة لترية' : 'Edit Capacity Category')}
              </h4>
              <button
                onClick={() => {
                  setIsAddingCategory(false);
                  setEditingCategoryId(null);
                }}
                className="p-1 hover:bg-slate-850 rounded text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className={`space-y-4 ${isRtl ? 'text-right' : 'text-left'}`}>
              {/* Category Name */}
              <div className="space-y-1.5">
                <label className="text-3xs font-mono font-bold uppercase tracking-wider text-slate-400">
                  {isRtl ? 'اسم التصنيف' : 'Category Name'}
                </label>
                <input
                  type="text"
                  value={categoryForm.name}
                  onChange={e => setCategoryForm(prev => ({ ...prev, name: e.target.value.toUpperCase() }))}
                  placeholder="e.g. DAYNA"
                  className={`w-full px-3 py-2 bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-lg text-xs font-mono text-slate-100 focus:outline-none transition-colors ${isRtl ? 'text-right font-sans' : 'text-left'}`}
                />
              </div>

              {/* Min Capacity */}
              <div className="space-y-1.5">
                <label className="text-3xs font-mono font-bold uppercase tracking-wider text-slate-400">
                  {isRtl ? 'الحد الأدنى للسعة (لتر)' : 'Min Capacity (Liters)'}
                </label>
                <input
                  type="number"
                  value={categoryForm.min_capacity}
                  onChange={e => setCategoryForm(prev => ({ ...prev, min_capacity: e.target.value }))}
                  placeholder="e.g. 5000"
                  className={`w-full px-3 py-2 bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-lg text-xs font-mono text-slate-100 focus:outline-none transition-colors ${isRtl ? 'text-right font-sans' : 'text-left'}`}
                />
              </div>

              {/* Max Capacity */}
              <div className="space-y-1.5">
                <label className="text-3xs font-mono font-bold uppercase tracking-wider text-slate-400">
                  {isRtl ? 'الحد الأقصى للسعة (لتر)' : 'Max Capacity (Liters)'}
                </label>
                <input
                  type="number"
                  value={categoryForm.max_capacity}
                  onChange={e => setCategoryForm(prev => ({ ...prev, max_capacity: e.target.value }))}
                  placeholder="e.g. 12000"
                  className={`w-full px-3 py-2 bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-lg text-xs font-mono text-slate-100 focus:outline-none transition-colors ${isRtl ? 'text-right font-sans' : 'text-left'}`}
                />
              </div>

              {/* Quantity / Total Units */}
              <div className="space-y-1.5">
                <label className="text-3xs font-mono font-bold uppercase tracking-wider text-slate-400">
                  {isRtl ? 'الكمية / الوحدات' : 'Quantity / Total Units'}
                </label>
                <input
                  type="number"
                  value={categoryForm.quantity}
                  onChange={e => setCategoryForm(prev => ({ ...prev, quantity: e.target.value }))}
                  placeholder="e.g. 8"
                  className={`w-full px-3 py-2 bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-lg text-xs font-mono text-slate-100 focus:outline-none transition-colors ${isRtl ? 'text-right font-sans' : 'text-left'}`}
                />
              </div>
            </div>

            <div className={`flex items-center justify-end gap-2 border-t border-slate-800 pt-3 ${isRtl ? 'flex-row-reverse' : 'flex-row'}`}>
              <button
                onClick={() => {
                  setIsAddingCategory(false);
                  setEditingCategoryId(null);
                }}
                className="px-3 py-1.5 bg-slate-850 hover:bg-slate-800 text-slate-300 font-bold rounded-lg text-2xs uppercase tracking-wider font-mono transition-colors cursor-pointer"
              >
                {isRtl ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                onClick={isAddingCategory ? handleAddCategory : handleUpdateCategory}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-2xs uppercase tracking-wider font-mono transition-colors cursor-pointer"
              >
                {isAddingCategory 
                  ? (isRtl ? 'إضافة تصنيف' : 'Add Category') 
                  : (isRtl ? 'حفظ التغييرات' : 'Save Changes')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit/Add Standby/Exception Dialog Modal */}
      {(isAddingLedger || editingLedgerId !== null) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className={`flex items-center justify-between border-b border-slate-800 pb-3 ${isRtl ? 'flex-row-reverse' : 'flex-row'}`}>
              <h4 className="text-sm font-bold text-slate-50 uppercase tracking-wider font-mono">
                {isAddingLedger 
                  ? (isRtl ? 'إضافة استثناء / احتياط' : 'Add Standby/Exception') 
                  : (isRtl ? 'تعديل استثناء / احتياط' : 'Edit Standby/Exception')}
              </h4>
              <button
                onClick={() => {
                  setIsAddingLedger(false);
                  setEditingLedgerId(null);
                }}
                className="p-1 hover:bg-slate-850 rounded text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className={`space-y-4 ${isRtl ? 'text-right' : 'text-left'}`}>
              {/* Tanker No */}
              <div className="space-y-1.5">
                <label className="text-3xs font-mono font-bold uppercase tracking-wider text-slate-400">
                  {isRtl ? 'رقم الناقلة' : 'Tanker No'}
                </label>
                <input
                  type="text"
                  value={ledgerForm.sn}
                  onChange={e => setLedgerForm(prev => ({ ...prev, sn: e.target.value }))}
                  placeholder="e.g. 275747"
                  className={`w-full px-3 py-2 bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-lg text-xs font-mono text-slate-100 focus:outline-none transition-colors ${isRtl ? 'text-right font-sans' : 'text-left'}`}
                />
              </div>

              {/* Cargo Spec */}
              <div className="space-y-1.5">
                <label className="text-3xs font-mono font-bold uppercase tracking-wider text-slate-400">
                  {isRtl ? 'مواصفات المادة الشحنة' : 'Cargo Spec'}
                </label>
                <select
                  value={ledgerForm.product}
                  onChange={e => setLedgerForm(prev => ({ ...prev, product: e.target.value.toUpperCase() }))}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-lg text-xs font-mono text-slate-100 focus:outline-none transition-colors cursor-pointer"
                >
                  <option value="PETROL">{isRtl ? 'بنزين (PETROL)' : 'PETROL'}</option>
                  <option value="DIESEL">{isRtl ? 'ديزل (DIESEL)' : 'DIESEL'}</option>
                  <option value="FUEL OIL">{isRtl ? 'زيت وقود (FUEL OIL)' : 'FUEL OIL'}</option>
                  <option value="WATER">{isRtl ? 'مياه (WATER)' : 'WATER'}</option>
                  <option value="MIXED">{isRtl ? 'مختلط (MIXED)' : 'MIXED'}</option>
                </select>
              </div>

              {/* Capacity */}
              <div className="space-y-1.5">
                <label className="text-3xs font-mono font-bold uppercase tracking-wider text-slate-400">
                  {isRtl ? 'السعة الاستيعابية (لتر)' : 'Capacity (Liters)'}
                </label>
                <input
                  type="number"
                  value={ledgerForm.capacity}
                  onChange={e => setLedgerForm(prev => ({ ...prev, capacity: e.target.value }))}
                  placeholder="e.g. 36000"
                  className={`w-full px-3 py-2 bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-lg text-xs font-mono text-slate-100 focus:outline-none transition-colors ${isRtl ? 'text-right font-sans' : 'text-left'}`}
                />
              </div>

              {/* Status Label */}
              <div className="space-y-1.5">
                <label className="text-3xs font-mono font-bold uppercase tracking-wider text-slate-400">
                  {isRtl ? 'حالة مستند الاستثناء' : 'Status Label'}
                </label>
                <select
                  value={ledgerForm.status}
                  onChange={e => setLedgerForm(prev => ({ ...prev, status: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-lg text-xs font-mono text-slate-100 focus:outline-none transition-colors cursor-pointer"
                >
                  <option value="NOT USE">{isRtl ? 'ليست للاستخدام (NOT USE)' : 'NOT USE'}</option>
                  <option value="SAIF CUSTODY">{isRtl ? 'حفظ آمن سيف (SAIF CUSTODY)' : 'SAIF CUSTODY'}</option>
                  <option value="FOR UPDATES">{isRtl ? 'للتحديثات (FOR UPDATES)' : 'FOR UPDATES'}</option>
                  <option value="IN WORKSHOP">{isRtl ? 'في الورشة (IN WORKSHOP)' : 'IN WORKSHOP'}</option>
                </select>
              </div>
            </div>

            <div className={`flex items-center justify-end gap-2 border-t border-slate-800 pt-3 ${isRtl ? 'flex-row-reverse' : 'flex-row'}`}>
              <button
                onClick={() => {
                  setIsAddingLedger(false);
                  setEditingLedgerId(null);
                }}
                className="px-3 py-1.5 bg-slate-850 hover:bg-slate-800 text-slate-300 font-bold rounded-lg text-2xs uppercase tracking-wider font-mono transition-colors cursor-pointer"
              >
                {isRtl ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                onClick={isAddingLedger ? handleAddLedger : handleUpdateLedger}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-2xs uppercase tracking-wider font-mono transition-colors cursor-pointer"
              >
                {isAddingLedger 
                  ? (isRtl ? 'إضافة مدخل' : 'Add Entry') 
                  : (isRtl ? 'حفظ التغييرات' : 'Save Changes')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-500">
              <div className="p-2 bg-rose-500/10 rounded-xl">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-black tracking-tight text-white">
                {isRtl ? 'تأكيد الحذف' : 'Confirm Deletion'}
              </h3>
            </div>
            
            <p className="text-sm text-slate-300 leading-relaxed">
              {isRtl 
                ? `هل أنت متأكد من رغبتك في حذف "${deleteTarget.label}"؟ لا يمكن التراجع عن هذا الإجراء.` 
                : `Are you sure you want to delete "${deleteTarget.label}"? This action cannot be undone.`}
            </p>

            <div className={`flex items-center justify-end gap-3 pt-2 ${isRtl ? 'flex-row-reverse' : 'flex-row'}`}>
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 bg-slate-850 hover:bg-slate-800 text-slate-300 font-bold rounded-xl text-xs uppercase tracking-wider font-mono transition-colors cursor-pointer"
              >
                {isRtl ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                onClick={async () => {
                  const target = deleteTarget;
                  setDeleteTarget(null);
                  if (target.type === 'category') {
                    await handleDeleteCategory(target.id);
                  } else {
                    await handleDeleteLedger(target.id);
                  }
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-xs uppercase tracking-wider font-mono transition-colors cursor-pointer"
              >
                {isRtl ? 'حذف' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
