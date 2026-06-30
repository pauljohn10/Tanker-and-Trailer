/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  Plus, 
  Edit2, 
  Trash2, 
  Eye, 
  Share2, 
  FileSpreadsheet, 
  FileText, 
  ChevronLeft, 
  ChevronRight, 
  X,
  CheckCircle,
  AlertCircle,
  Copy,
  Info,
  ShieldAlert,
  Printer,
  Upload,
  AlertTriangle
} from 'lucide-react';
import { api } from '../lib/api';
import { TankerRecord, User } from '../types';
import { exportTankersPDF } from '../lib/pdfHelper';
import { useTranslation } from '../lib/LanguageContext';

interface RecordsManagementProps {
  user: User;
}

export default function RecordsManagement({ user }: RecordsManagementProps) {
  const { t, language, isRtl } = useTranslation();
  // Records state
  const [records, setRecords] = useState<TankerRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  // Filter/Search states
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filterClass, setFilterClass] = useState('');
  const [filterProduct, setFilterProduct] = useState('');
  const [filterRegion, setFilterRegion] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // Dropdown options lists
  const products = ['PETROL', 'DIESEL', 'WATER', 'MIXED', 'FUEL OIL', 'NEW TANKER'];
  const regions = ['DAMMAM', 'NAJRAN', 'MAKKAH', 'JEDDAH', 'DAMMAM - WORKSHOP', 'NAJRAN - WORKSHOP', 'NEW TANKER'];
  const statuses = ['OPERATIONAL', 'WORKING FOR COMPANY', 'STANDBY DUE SEVERE DAMAGE', 'STANDBY USED FOR WATER IN WORKSHOP', 'STANDBY AT GUNAN PARKING AREA', 'STANDBY IN WORKSHOP DISCONNECTED', 'UNDER MAINTENANCE (SANAIYAH MAKKAH)', 'UNDER PROCESS', 'WAITING FOR ARRIVAL', 'STANDBY', 'STANDBY IN GUNAN DISCONNECTED'];

  // Modals state
  const [isAddEditOpen, setIsAddEditOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  
  // Excel states
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [dragActive, setDragActive] = useState(false);
  
  // Selection states
  const [selectedSns, setSelectedSns] = useState<number[]>([]);
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  
  const [selectedRecord, setSelectedRecord] = useState<TankerRecord | null>(null);
  const [formData, setFormData] = useState<Partial<TankerRecord>>({
    aramcoTankNumber: '',
    newTankNumber: '',
    classification: 'STEEL',
    model: '',
    product: 'PETROL',
    quantity: 36000,
    authorizedVehicle: '',
    region: 'NAJRAN',
    status: 'OPERATIONAL'
  });

  // Notification state
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Form Validation State
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1); // Reset page on search
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch records
  const fetchRecords = async () => {
    setLoading(true);
    try {
      const data = await api.getRecords({
        q: debouncedSearch,
        classification: filterClass,
        product: filterProduct,
        region: filterRegion,
        status: filterStatus,
        page,
        limit: 15
      });
      setRecords(data.records);
      setTotal(data.total);
      setTotalPages(data.totalPages);
      setSelectedSns([]);
    } catch (err: any) {
      showNotification('error', err.message || 'Failed to fetch records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, [debouncedSearch, filterClass, filterProduct, filterRegion, filterStatus, page]);

  // Notifications helper
  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => {
      setNotification(null);
    }, 4000);
  };

  // Export to CSV
  const handleExportCSV = async () => {
    try {
      // Fetch ALL matching records without pagination for complete CSV export
      const data = await api.getRecords({
        q: debouncedSearch,
        classification: filterClass,
        product: filterProduct,
        region: filterRegion,
        status: filterStatus,
        page: 1,
        limit: 1000 // Large limit to get everything
      });

      const csvHeaders = 'Sn,Aramco Tank Number,New Tank Number,Classification,Model,Product,Quantity,Authorized Vehicle,Region,Status\n';
      const csvRows = data.records.map(r => 
        `"${r.sn}","${r.aramcoTankNumber}","${r.newTankNumber}","${r.classification}","${r.model}","${r.product}","${r.quantity}","${r.authorizedVehicle}","${r.region}","${r.status}"`
      ).join('\n');

      const blob = new Blob([csvHeaders + csvRows], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `Al_Noor_Tanker_Records_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      showNotification('success', 'Exported successfully to Excel/CSV format!');
    } catch (err: any) {
      showNotification('error', 'CSV Export failed: ' + err.message);
    }
  };

  // Export live Master Excel (Admin only)
  const handleExportExcel = async () => {
    try {
      showNotification('success', 'Preparing live master Excel file for download...');
      const blob = await api.exportExcel();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `Al_Noor_Master_Tankers_${new Date().toISOString().slice(0, 10)}.xlsx`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showNotification('success', 'Master Excel spreadsheet downloaded successfully!');
    } catch (err: any) {
      showNotification('error', 'Excel download failed: ' + err.message);
    }
  };

  // Drag and drop handlers for Excel upload
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (ext === 'xlsx' || ext === 'xls') {
        setSelectedFile(file);
        setImportErrors([]);
      } else {
        setImportErrors(['Invalid file type. Please upload only .xlsx or .xls Excel spreadsheets.']);
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setImportErrors([]);
    }
  };

  const handleImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    setImporting(true);
    setImportErrors([]);
    try {
      const res = await api.importExcel(selectedFile);
      if (res.success) {
        showNotification('success', res.message || `Successfully synchronized system database with Excel. Loaded ${res.count} records.`);
        setIsImportOpen(false);
        setSelectedFile(null);
        fetchRecords();
      }
    } catch (err: any) {
      console.error('Failed to import Excel:', err);
      if (err.details && Array.isArray(err.details)) {
        setImportErrors(err.details);
      } else {
        setImportErrors([err.message || 'An error occurred while importing the Excel file.']);
      }
    } finally {
      setImporting(false);
    }
  };

  const [pdfLoading, setPdfLoading] = useState(false);

  // Print PDF styled document
  const handlePrintPDF = async () => {
    if (pdfLoading) return;
    setPdfLoading(true);
    showNotification('success', 'Compiling and rendering enterprise-grade PDF report...');
    try {
      const data = await api.getRecords({
        q: debouncedSearch,
        classification: filterClass,
        product: filterProduct,
        region: filterRegion,
        status: filterStatus,
        page: 1,
        limit: 1000 // Grab all matching records matching current query & filters
      });

      const activeFilters = {
        search: debouncedSearch,
        classification: filterClass,
        product: filterProduct,
        region: filterRegion,
        status: filterStatus
      };

      await exportTankersPDF(data.records, activeFilters, user, { language });
      showNotification('success', 'PDF report downloaded successfully.');
    } catch (err: any) {
      console.error('Failed to export PDF:', err);
      showNotification('error', err.message || 'Failed to generate PDF report.');
    } finally {
      setPdfLoading(false);
    }
  };

  // Form Validation
  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!formData.newTankNumber) {
      errors.newTankNumber = 'New Tank Number is required.';
    } else if (!/^TN-2-\d+$/.test(formData.newTankNumber)) {
      errors.newTankNumber = 'Format must be TN-2-[Number] (e.g., TN-2-105)';
    }

    if (!formData.aramcoTankNumber) {
      errors.aramcoTankNumber = 'Aramco Tank Number is required.';
    }

    if (!formData.quantity || isNaN(Number(formData.quantity)) || Number(formData.quantity) <= 0) {
      errors.quantity = 'Quantity must be a valid positive volume capacity.';
    }

    if (!formData.authorizedVehicle) {
      errors.authorizedVehicle = 'Authorized Vehicle plate is required (use **** if pending).';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Save/Update Record
  const handleSaveRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      if (selectedRecord) {
        // Edit mode
        await api.updateRecord(selectedRecord.sn, formData);
        showNotification('success', `Record ${formData.newTankNumber} updated successfully.`);
      } else {
        // Create mode
        await api.createRecord(formData);
        showNotification('success', `New tanker record ${formData.newTankNumber} added successfully.`);
      }
      setIsAddEditOpen(false);
      fetchRecords();
    } catch (err: any) {
      showNotification('error', err.message || 'Operation failed.');
    }
  };

  // Trigger Add Modal
  const handleAddClick = () => {
    setSelectedRecord(null);
    setFormData({
      aramcoTankNumber: '',
      newTankNumber: '',
      classification: 'STEEL',
      model: new Date().getFullYear().toString(),
      product: 'PETROL',
      quantity: 36000,
      authorizedVehicle: '',
      region: 'NAJRAN',
      status: 'OPERATIONAL'
    });
    setFormErrors({});
    setIsAddEditOpen(true);
  };

  // Trigger Edit Modal
  const handleEditClick = (record: TankerRecord) => {
    setSelectedRecord(record);
    setFormData({ ...record });
    setFormErrors({});
    setIsAddEditOpen(true);
  };

  // Trigger Delete Modal
  const handleDeleteClick = (record: TankerRecord) => {
    setSelectedRecord(record);
    setIsDeleteOpen(true);
  };

  // Confirm Delete
  const handleConfirmDelete = async () => {
    if (!selectedRecord) return;
    try {
      await api.deleteRecord(selectedRecord.sn);
      showNotification('success', `Record ${selectedRecord.newTankNumber} deleted from database.`);
      setIsDeleteOpen(false);
      setSelectedRecord(null);
      fetchRecords();
    } catch (err: any) {
      showNotification('error', err.message || 'Failed to delete record.');
    }
  };

  // Trigger Bulk Delete Modal
  const handleBulkDeleteClick = () => {
    if (selectedSns.length === 0) return;
    setIsBulkDeleteOpen(true);
  };

  // Confirm Bulk Delete
  const handleConfirmBulkDelete = async () => {
    if (selectedSns.length === 0) return;
    setBulkDeleting(true);
    try {
      await api.bulkDeleteRecords(selectedSns);
      showNotification('success', `Successfully deleted ${selectedSns.length} records and synchronized the Excel file.`);
      setIsBulkDeleteOpen(false);
      setSelectedSns([]);
      fetchRecords();
    } catch (err: any) {
      showNotification('error', err.message || 'Failed to perform bulk delete.');
    } finally {
      setBulkDeleting(false);
    }
  };

  // Trigger Detail View
  const handleDetailClick = (record: TankerRecord) => {
    setSelectedRecord(record);
    setIsDetailOpen(true);
  };

  // Trigger Share Link Modal
  const handleShareClick = (record: TankerRecord) => {
    setSelectedRecord(record);
    setIsShareOpen(true);
  };

  const getShareableUrl = (newTankNumber: string) => {
    return `${window.location.origin}/share/${newTankNumber}`;
  };

  const copyShareableLink = (url: string) => {
    navigator.clipboard.writeText(url);
    showNotification('success', 'Public share link copied to clipboard!');
  };

  // Reset Filters
  const handleResetFilters = () => {
    setSearch('');
    setFilterClass('');
    setFilterProduct('');
    setFilterRegion('');
    setFilterStatus('');
    setPage(1);
  };

  return (
    <div className="flex-1 p-6 md:p-8 space-y-6 bg-slate-950 text-slate-100 font-sans min-h-screen">
      
      {/* Notifications floating block */}
      {notification && (
        <div className={`fixed bottom-6 right-6 z-50 p-4 rounded-xl shadow-2xl border flex items-center gap-3 animate-slide-in 
          ${notification.type === 'success' 
            ? 'bg-slate-900 border-emerald-500/30 text-emerald-300' 
            : 'bg-slate-900 border-rose-500/30 text-rose-300'}`}>
          {notification.type === 'success' ? <CheckCircle className="w-5 h-5 text-emerald-400" /> : <AlertCircle className="w-5 h-5 text-rose-400" />}
          <span className="text-sm font-medium">{notification.message}</span>
        </div>
      )}

      {/* Screen Title & Action Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 id="records-header" className="text-2xl font-extrabold tracking-tight text-slate-50 flex items-center gap-2">
            {t('rec.records')}
          </h1>
          <p className="text-sm text-slate-400">
            {isRtl 
              ? 'سجل ناقلات النقل المصرح لها من أرامكو. إضافة وبحث وتصفية وتدقيق شهادات وثائق الناقلات.' 
              : 'Database of authorized Aramco transport tankers. Add, search, filter, and audit tanker document certificates.'}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {user.role !== 'viewer' && (
            <button
              id="add-record-btn"
              onClick={handleAddClick}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-xl text-xs font-bold text-white transition-all shadow-lg shadow-blue-950/10 active:scale-98 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{t('rec.addRecord')}</span>
            </button>
          )}

          {user.role === 'admin' && selectedSns.length > 0 && (
            <button
              id="bulk-delete-btn"
              onClick={handleBulkDeleteClick}
              className="flex items-center gap-2 px-3.5 py-2.5 bg-rose-600/15 border border-rose-500/30 hover:bg-rose-600/25 text-rose-300 rounded-xl text-xs font-bold transition-all cursor-pointer animate-pulse"
              title={`Delete ${selectedSns.length} selected tanker records`}
            >
              <Trash2 className="w-4 h-4 text-rose-400" />
              <span>{isRtl ? `حذف المحدد (${selectedSns.length})` : `Delete Selected (${selectedSns.length})`}</span>
            </button>
          )}

          {user.role === 'admin' && (
            <>
              <button
                id="import-excel-btn"
                onClick={() => {
                  setSelectedFile(null);
                  setImportErrors([]);
                  setIsImportOpen(true);
                }}
                className="flex items-center gap-2 px-3.5 py-2.5 bg-slate-900 border border-slate-800 hover:border-slate-700 hover:text-white rounded-xl text-xs font-bold text-amber-400 transition-all cursor-pointer"
                title="Upload Excel master spreadsheet"
              >
                <Upload className="w-4 h-4 text-amber-400" />
                <span>{t('rec.importExcel')}</span>
              </button>

              <button
                id="export-excel-btn"
                onClick={handleExportExcel}
                className="flex items-center gap-2 px-3.5 py-2.5 bg-slate-900 border border-slate-800 hover:border-slate-700 hover:text-white rounded-xl text-xs font-bold text-emerald-400 transition-all cursor-pointer"
                title="Download updated master Excel sheet"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                <span>{t('rec.exportExcel')}</span>
              </button>
            </>
          )}

          <button
            id="export-csv-btn"
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-3.5 py-2.5 bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl text-xs font-medium text-slate-300 transition-colors cursor-pointer"
            title="Export full spreadsheet to CSV/Excel"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>{isRtl ? 'تصدير CSV' : 'Export CSV'}</span>
          </button>

          <button
            id="export-pdf-btn"
            onClick={handlePrintPDF}
            disabled={pdfLoading}
            className="flex items-center gap-2 px-3.5 py-2.5 bg-slate-900 border border-slate-800 hover:border-slate-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-xs font-medium text-slate-300 transition-colors cursor-pointer"
            title="Export Al Noor official enterprise PDF report"
          >
            {pdfLoading ? (
              <span className="w-4 h-4 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
            ) : (
              <FileText className="w-4 h-4 text-blue-500" />
            )}
            <span>{pdfLoading ? (isRtl ? 'جاري التصدير...' : 'Exporting PDF...') : (isRtl ? 'تصدير PDF' : 'Export PDF')}</span>
          </button>
        </div>
      </div>

      {/* Search & Complex Filters Bento Block */}
      <div className="p-5 bg-slate-900/40 border border-slate-800/80 rounded-2xl space-y-4 shadow-lg">
        <div className="flex flex-col lg:flex-row gap-3">
          
          {/* Main search bar */}
          <div className="relative flex-1">
            <span className={`absolute inset-y-0 ${isRtl ? 'right-0 pr-3' : 'left-0 pl-3'} flex items-center text-slate-500`}>
              <Search className="w-4 h-4" />
            </span>
            <input
              id="search-input"
              type="text"
              placeholder={isRtl ? "البحث عن طريق رقم الخزان، رقم أرامكو، لوحة المركبة أو الحالة..." : "Search by Tank No, Aramco No, vehicle plate, or status..."}
              className={`w-full ${isRtl ? 'pr-9 pl-4 text-right' : 'pl-9 pr-4 text-left'} py-2.5 bg-slate-900/40 backdrop-blur-md border border-slate-700/50 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-all font-sans`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 lg:w-auto">
            
            {/* Classification */}
            <select
              id="filter-class"
              className="bg-slate-900/40 backdrop-blur-md border border-slate-700/50 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-blue-500 transition-all font-sans cursor-pointer"
              value={filterClass}
              onChange={(e) => setFilterClass(e.target.value)}
            >
              <option value="">{isRtl ? 'جميع التصنيفات' : 'All Classifications'}</option>
              <option value="STEEL">{isRtl ? 'حديد (STEEL)' : 'STEEL'}</option>
              <option value="ALUMINUM">{isRtl ? 'ألومنيوم (ALUMINUM)' : 'ALUMINUM'}</option>
            </select>

            {/* Product */}
            <select
              id="filter-product"
              className="bg-slate-900/40 backdrop-blur-md border border-slate-700/50 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-blue-500 transition-all font-sans cursor-pointer"
              value={filterProduct}
              onChange={(e) => setFilterProduct(e.target.value)}
            >
              <option value="">{isRtl ? 'جميع المنتجات' : 'All Products'}</option>
              {products.map(p => {
                let pLabel = p;
                if (isRtl) {
                  if (p === 'PETROL') pLabel = 'بنزين (PETROL)';
                  else if (p === 'DIESEL') pLabel = 'ديزل (DIESEL)';
                  else if (p === 'WATER') pLabel = 'مياه (WATER)';
                  else if (p === 'MIXED') pLabel = 'مختلط (MIXED)';
                  else if (p === 'FUEL OIL') pLabel = 'زيت الوقود (FUEL OIL)';
                  else if (p === 'NEW TANKER') pLabel = 'ناقلة جديدة (NEW TANKER)';
                }
                return <option key={p} value={p}>{pLabel}</option>;
              })}
            </select>

            {/* Region */}
            <select
              id="filter-region"
              className="bg-slate-900/40 backdrop-blur-md border border-slate-700/50 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-blue-500 transition-all font-sans cursor-pointer"
              value={filterRegion}
              onChange={(e) => setFilterRegion(e.target.value)}
            >
              <option value="">{isRtl ? 'جميع المناطق' : 'All Regions'}</option>
              {regions.map(r => {
                let rLabel = r;
                if (isRtl) {
                  if (r === 'DAMMAM') rLabel = 'الدمام (DAMMAM)';
                  else if (r === 'NAJRAN') rLabel = 'نجران (NAJRAN)';
                  else if (r === 'MAKKAH') rLabel = 'مكة (MAKKAH)';
                  else if (r === 'JEDDAH') rLabel = 'جدة (JEDDAH)';
                  else if (r === 'DAMMAM - WORKSHOP') rLabel = 'ورشة الدمام';
                  else if (r === 'NAJRAN - WORKSHOP') rLabel = 'ورشة نجران';
                  else if (r === 'NEW TANKER') rLabel = 'ناقلة جديدة';
                }
                return <option key={r} value={r}>{rLabel}</option>;
              })}
            </select>

            {/* Status */}
            <select
              id="filter-status"
              className="bg-slate-900/40 backdrop-blur-md border border-slate-700/50 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-blue-500 transition-all font-sans cursor-pointer"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="">{isRtl ? 'جميع الحالات' : 'All Statuses'}</option>
              {statuses.map(s => {
                let sLabel = s;
                if (isRtl) {
                  if (s === 'OPERATIONAL') sLabel = 'تشغيلية (OPERATIONAL)';
                  else if (s === 'WORKING FOR COMPANY') sLabel = 'تعمل للشركة';
                  else if (s === 'STANDBY DUE SEVERE DAMAGE') sLabel = 'احتياط بسبب ضرر جسيم';
                  else if (s === 'STANDBY USED FOR WATER IN WORKSHOP') sLabel = 'احتياط للمياه في الورشة';
                  else if (s === 'STANDBY AT GUNAN PARKING AREA') sLabel = 'احتياط في مواقف قونان';
                  else if (s === 'STANDBY IN WORKSHOP DISCONNECTED') sLabel = 'احتياط في الورشة مفصول';
                  else if (s === 'UNDER MAINTENANCE (SANAIYAH MAKKAH)') sLabel = 'تحت الصيانة بمكة';
                  else if (s === 'UNDER PROCESS') sLabel = 'تحت الإجراء';
                  else if (s === 'WAITING FOR ARRIVAL') sLabel = 'بانتظار الوصول';
                  else if (s === 'STANDBY') sLabel = 'احتياط (STANDBY)';
                  else if (s === 'STANDBY IN GUNAN DISCONNECTED') sLabel = 'احتياط في قونان مفصول';
                }
                return <option key={s} value={s}>{sLabel}</option>;
              })}
            </select>

          </div>
        </div>

        {/* Filters Info state */}
        {(debouncedSearch || filterClass || filterProduct || filterRegion || filterStatus) && (
          <div className="flex items-center justify-between pt-1 border-t border-slate-800/40 text-xs text-slate-400">
            <span className="flex items-center gap-1">
              <Filter className="w-3.5 h-3.5 text-blue-500" />
              {isRtl ? (
                <span>المطابقات المصفاة: <strong className="text-slate-50 font-mono">{total}</strong> ناقلة.</span>
              ) : (
                <span>Filtered matches: <strong className="text-slate-50 font-mono">{total}</strong> tankers.</span>
              )}
            </span>
            <button
              id="reset-filters-btn"
              onClick={handleResetFilters}
              className="text-blue-500 hover:text-blue-400 transition-colors font-medium text-2xs uppercase tracking-wider cursor-pointer"
            >
              {isRtl ? 'مسح الفلاتر' : 'Clear Filters'}
            </button>
          </div>
        )}
      </div>

      {/* Tankers Table Grid */}
      <div className="bg-slate-900/30 border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table id="records-table" className="w-full text-left border-collapse font-sans text-xs">
            <thead>
              <tr className="glass-panel text-slate-300 border-b border-slate-800 text-2xs uppercase tracking-wider font-mono">
                {user.role === 'admin' && (
                  <th className="py-4 px-4 text-center w-10">
                    <input
                      type="checkbox"
                      id="select-all-checkbox"
                      className="rounded border-slate-800 bg-slate-950 text-blue-500 focus:ring-blue-500/20 w-4 h-4 cursor-pointer"
                      checked={records.length > 0 && selectedSns.length === records.length}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedSns(records.map(r => r.sn));
                        } else {
                          setSelectedSns([]);
                        }
                      }}
                      title="Select/Deselect all records on this page"
                    />
                  </th>
                )}
                <th className="py-4 px-4 font-semibold text-center w-12">Sn</th>
                <th className="py-4 px-4 font-semibold">New Tank Number</th>
                <th className="py-4 px-4 font-semibold">Aramco Tank Number</th>
                <th className="py-4 px-4 font-semibold">Classification</th>
                <th className="py-4 px-4 font-semibold">Model</th>
                <th className="py-4 px-4 font-semibold">Product</th>
                <th className="py-4 px-4 font-semibold text-right">Quantity</th>
                <th className="py-4 px-4 font-semibold">Authorized Vehicle</th>
                <th className="py-4 px-4 font-semibold">Region</th>
                <th className="py-4 px-4 font-semibold text-center">Status</th>
                <th className="py-4 px-4 font-semibold text-center w-28">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {records.map((r) => {
                // Color mapping for Status
                const isOp = r.status.includes('OPERATIONAL') || r.status.includes('WORKING');
                const isWorkshop = r.status.includes('WORKSHOP') || r.status.includes('DAMAGE') || r.status.includes('ACCIDENT') || r.status.includes('MAINTENANCE');
                const isWaiting = r.status.includes('WAITING') || r.status.includes('PROCESS');
                
                let statusBadge = 'bg-slate-500/10 text-slate-400 border-slate-500/20';
                if (isOp) statusBadge = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
                else if (isWorkshop) statusBadge = 'bg-rose-500/10 text-rose-400 border-rose-500/20';
                else if (isWaiting) statusBadge = 'bg-amber-500/10 text-amber-400 border-amber-500/20';

                return (
                  <tr key={r.sn} className={`hover:bg-slate-900/40 transition-colors ${selectedSns.includes(r.sn) ? 'bg-blue-950/20' : ''}`}>
                    {user.role === 'admin' && (
                      <td className="py-3 px-4 text-center">
                        <input
                          type="checkbox"
                          className="record-select-checkbox rounded border-slate-800 bg-slate-950 text-blue-500 focus:ring-blue-500/20 w-4 h-4 cursor-pointer"
                          checked={selectedSns.includes(r.sn)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedSns(prev => [...prev, r.sn]);
                            } else {
                              setSelectedSns(prev => prev.filter(sn => sn !== r.sn));
                            }
                          }}
                        />
                      </td>
                    )}
                    <td className="py-3 px-4 text-center font-mono font-semibold text-slate-400">{r.sn}</td>
                    <td className="py-3 px-4 font-mono font-bold text-slate-100 whitespace-nowrap">{r.newTankNumber}</td>
                    <td className="py-3 px-4 font-mono text-slate-300">{r.aramcoTankNumber}</td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded text-4xs font-bold font-mono border 
                        ${r.classification === 'STEEL' ? 'bg-slate-800 text-slate-300 border-slate-700' : 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'}`}>
                        {r.classification}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-400">{r.model}</td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded text-4xs font-bold font-mono border 
                        ${r.product === 'PETROL' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                          r.product === 'DIESEL' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                          r.product === 'WATER' ? 'bg-sky-500/10 text-sky-400 border-sky-500/20' :
                          r.product === 'FUEL OIL' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                          'bg-slate-500/10 text-slate-400 border-slate-500/20'}`}>
                        {r.product}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-right font-semibold text-slate-100 whitespace-nowrap">{r.quantity.toLocaleString()} L</td>
                    <td className="py-3 px-4 font-mono text-slate-300 max-w-xs truncate" title={r.authorizedVehicle}>{r.authorizedVehicle}</td>
                    <td className="py-3 px-4 font-semibold text-slate-300">{r.region}</td>
                    <td className="py-3 px-4 text-center">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-4xs font-semibold border ${statusBadge} max-w-[150px] truncate`} title={r.status}>
                        {r.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleDetailClick(r)}
                          className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
                          title="View document certificate details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        
                        {user.role !== 'viewer' && (
                          <button
                            onClick={() => handleEditClick(r)}
                            className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-blue-500 transition-colors cursor-pointer"
                            title="Edit tanker details"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        )}

                        <button
                          onClick={() => handleShareClick(r)}
                          className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-blue-500 transition-colors cursor-pointer"
                          title="Generate shareable public document link"
                        >
                          <Share2 className="w-4 h-4" />
                        </button>

                        {user.role === 'admin' && (
                          <button
                            onClick={() => handleDeleteClick(r)}
                            className="p-1.5 hover:bg-rose-950/40 rounded-lg text-slate-500 hover:text-rose-400 transition-colors cursor-pointer"
                            title="Delete critical database record"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}

              {records.length === 0 && (
                <tr>
                  <td colSpan={user.role === 'admin' ? 12 : 11} className="py-12 text-center text-slate-500 font-mono italic">
                    {loading ? 'Consulting Al Noor Document databases...' : 'No tanker records found matching your filters.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination bar */}
        <div className="p-4 bg-slate-900/40 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-1">
            Showing <strong className="text-slate-50 font-mono">{records.length}</strong> of{' '}
            <strong className="text-slate-50 font-mono">{total}</strong> tankers.
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-1.5 bg-slate-950/60 border border-slate-800 rounded-lg hover:border-slate-700 disabled:opacity-30 disabled:hover:border-slate-800 text-slate-300 transition-all cursor-pointer"
            >
              <ChevronLeft className="w-4.5 h-4.5" />
            </button>
            <span className="font-mono text-2xs">
              Page <strong className="text-slate-50">{page}</strong> of <strong className="text-slate-50">{totalPages}</strong>
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-1.5 bg-slate-950/60 border border-slate-800 rounded-lg hover:border-slate-700 disabled:opacity-30 disabled:hover:border-slate-800 text-slate-300 transition-all cursor-pointer"
            >
              <ChevronRight className="w-4.5 h-4.5" />
            </button>
          </div>
        </div>
      </div>

      {/* PRINT-ONLY STYLE SHEET CONTAINER (Hidden from screen view, loaded in print) */}
      <div id="print-area" className="hidden print:block text-black bg-white p-8 font-serif leading-relaxed text-xs">
        <div className="text-center space-y-2 mb-6 pb-4 border-b-2 border-black">
          <h1 className="text-xl font-bold tracking-tight uppercase">Al Noor United Transportation Est.</h1>
          <p className="text-xs">Head Office - 3293 King Fahd Road, Najran 66231, Kingdom of Saudi Arabia</p>
          <p className="text-sm font-bold tracking-wide mt-2">ARAMCO TANKER NUMBER SERIES OF {new Date().toLocaleDateString()}</p>
        </div>

        <table className="w-full text-left text-2xs border-collapse">
          <thead>
            <tr className="border-b-2 border-black font-semibold text-center">
              <th className="py-1 px-1 border border-black">Sn</th>
              <th className="py-1 px-1 border border-black">New Tank Number</th>
              <th className="py-1 px-1 border border-black">Aramco Tank Number</th>
              <th className="py-1 px-1 border border-black">Classification</th>
              <th className="py-1 px-1 border border-black">Model</th>
              <th className="py-1 px-1 border border-black">Product</th>
              <th className="py-1 px-1 border border-black text-right">Quantity (L)</th>
              <th className="py-1 px-1 border border-black">Authorized Vehicle</th>
              <th className="py-1 px-1 border border-black">Region</th>
              <th className="py-1 px-1 border border-black">Status</th>
            </tr>
          </thead>
          <tbody>
            {records.map((r) => (
              <tr key={r.sn} className="border-b border-gray-400">
                <td className="py-1 px-1 border border-black text-center">{r.sn}</td>
                <td className="py-1 px-1 border border-black font-bold">{r.newTankNumber}</td>
                <td className="py-1 px-1 border border-black">{r.aramcoTankNumber}</td>
                <td className="py-1 px-1 border border-black text-center">{r.classification}</td>
                <td className="py-1 px-1 border border-black text-center">{r.model}</td>
                <td className="py-1 px-1 border border-black text-center">{r.product}</td>
                <td className="py-1 px-1 border border-black text-right">{r.quantity.toLocaleString()}</td>
                <td className="py-1 px-1 border border-black text-3xs">{r.authorizedVehicle}</td>
                <td className="py-1 px-1 border border-black">{r.region}</td>
                <td className="py-1 px-1 border border-black text-center text-3xs">{r.status}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Print signature lines replication of PDF Page 2 */}
        <div className="mt-12 grid grid-cols-3 gap-8 text-center text-3xs">
          <div>
            <p className="font-semibold border-b border-black pb-1 mb-1">Prepared by:</p>
            <p className="font-bold">Gyno Tayobong</p>
            <p className="text-gray-600">Executive Assistant</p>
          </div>
          <div>
            <p className="font-semibold border-b border-black pb-1 mb-1">Acknowledge by:</p>
            <p className="font-bold">Mohammed Al Shazli / Eng. Rakan Adnan</p>
            <p className="text-gray-600">Head of Maintenance / Workshop Manager</p>
          </div>
          <div>
            <p className="font-semibold border-b border-black pb-1 mb-1">Higher Management Approval:</p>
            <p className="font-bold">Mr. Mana Ahmed</p>
            <p className="text-gray-600">Chief Executive Officer (CEO)</p>
          </div>
        </div>
      </div>

      {/* 1. Modal: ADD / EDIT Tanker Record */}
      {isAddEditOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 relative font-sans text-slate-100 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <button
              onClick={() => setIsAddEditOpen(false)}
              className="absolute right-4 top-4 p-1.5 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 id="modal-title" className="text-lg font-bold text-slate-50 mb-1">
              {selectedRecord ? 'Edit Tanker Record' : 'Add New Tanker Record'}
            </h3>
            <p className="text-xs text-slate-400 mb-6">
              {selectedRecord 
                ? `Modifying certificate metrics for serial index ${selectedRecord.sn} (${selectedRecord.newTankNumber})` 
                : 'Create a new authorized tanker document entry in the transportation database.'}
            </p>

            <form onSubmit={handleSaveRecord} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* New Tank Number */}
                <div>
                  <label className="block text-2xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5" htmlFor="form-newTank">
                    New Tank Number *
                  </label>
                  <input
                    id="form-newTank"
                    type="text"
                    className={`w-full px-3 py-2 bg-slate-950 border rounded-xl text-xs text-slate-100 focus:outline-none focus:border-blue-500 transition-all font-mono 
                      ${formErrors.newTankNumber ? 'border-rose-500 focus:ring-1 focus:ring-rose-500/30' : 'border-slate-700'}`}
                    placeholder="TN-2-105"
                    value={formData.newTankNumber}
                    onChange={(e) => setFormData({ ...formData, newTankNumber: e.target.value })}
                  />
                  {formErrors.newTankNumber && <p className="text-rose-400 text-3xs mt-1">{formErrors.newTankNumber}</p>}
                </div>

                {/* Aramco Tank Number */}
                <div>
                  <label className="block text-2xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5" htmlFor="form-aramco">
                    Aramco Tank Number *
                  </label>
                  <input
                    id="form-aramco"
                    type="text"
                    className={`w-full px-3 py-2 bg-slate-950 border rounded-xl text-xs text-slate-100 focus:outline-none focus:border-blue-500 transition-all font-mono 
                      ${formErrors.aramcoTankNumber ? 'border-rose-500 focus:ring-1 focus:ring-rose-500/30' : 'border-slate-700'}`}
                    placeholder="e.g. 259038 or Dammam for Company"
                    value={formData.aramcoTankNumber}
                    onChange={(e) => setFormData({ ...formData, aramcoTankNumber: e.target.value })}
                  />
                  {formErrors.aramcoTankNumber && <p className="text-rose-400 text-3xs mt-1">{formErrors.aramcoTankNumber}</p>}
                </div>

                {/* Classification */}
                <div>
                  <label className="block text-2xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5" htmlFor="form-class">
                    Classification *
                  </label>
                  <select
                    id="form-class"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-blue-500 cursor-pointer"
                    value={formData.classification}
                    onChange={(e) => setFormData({ ...formData, classification: e.target.value as 'STEEL' | 'ALUMINUM' })}
                  >
                    <option value="STEEL">STEEL</option>
                    <option value="ALUMINUM">ALUMINUM</option>
                  </select>
                </div>

                {/* Model / Year */}
                <div>
                  <label className="block text-2xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5" htmlFor="form-model">
                    Model (Manufacture Year)
                  </label>
                  <input
                    id="form-model"
                    type="text"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-blue-500 font-mono"
                    placeholder="2022 or ****"
                    value={formData.model}
                    onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                  />
                </div>

                {/* Product */}
                <div>
                  <label className="block text-2xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5" htmlFor="form-product">
                    Product Cargo *
                  </label>
                  <select
                    id="form-product"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-blue-500 cursor-pointer"
                    value={formData.product}
                    onChange={(e) => setFormData({ ...formData, product: e.target.value })}
                  >
                    {products.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>

                {/* Quantity */}
                <div>
                  <label className="block text-2xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5" htmlFor="form-qty">
                    Quantity (Capacity L) *
                  </label>
                  <input
                    id="form-qty"
                    type="number"
                    className={`w-full px-3 py-2 bg-slate-950 border rounded-xl text-xs text-slate-100 focus:outline-none focus:border-blue-500 transition-all font-mono 
                      ${formErrors.quantity ? 'border-rose-500 focus:ring-1 focus:ring-rose-500/30' : 'border-slate-700'}`}
                    placeholder="36000"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: Number(e.target.value) })}
                  />
                  {formErrors.quantity && <p className="text-rose-400 text-3xs mt-1">{formErrors.quantity}</p>}
                </div>

                {/* Authorized Vehicle */}
                <div className="sm:col-span-2">
                  <label className="block text-2xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5" htmlFor="form-auth">
                    Authorized Vehicle (License Plate / Name) *
                  </label>
                  <input
                    id="form-auth"
                    type="text"
                    className={`w-full px-3 py-2 bg-slate-950 border rounded-xl text-xs text-slate-100 focus:outline-none focus:border-blue-500 transition-all font-mono 
                      ${formErrors.authorizedVehicle ? 'border-rose-500 focus:ring-1 focus:ring-rose-500/30' : 'border-slate-700'}`}
                    placeholder="e.g. T-R-1-118 / JSA - 9079 - ح س أ"
                    value={formData.authorizedVehicle}
                    onChange={(e) => setFormData({ ...formData, authorizedVehicle: e.target.value })}
                  />
                  {formErrors.authorizedVehicle && <p className="text-rose-400 text-3xs mt-1">{formErrors.authorizedVehicle}</p>}
                </div>

                {/* Region */}
                <div>
                  <label className="block text-2xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5" htmlFor="form-region">
                    Logistical Region *
                  </label>
                  <select
                    id="form-region"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-blue-500 cursor-pointer"
                    value={formData.region}
                    onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                  >
                    {regions.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>

                {/* Status */}
                <div>
                  <label className="block text-2xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5" htmlFor="form-status">
                    Active Status *
                  </label>
                  <select
                    id="form-status"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-blue-500 cursor-pointer"
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  >
                    {statuses.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>

              </div>

              <div className="pt-4 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsAddEditOpen(false)}
                  className="px-4 py-2 bg-slate-950 border border-slate-800 hover:border-slate-700 text-xs font-semibold rounded-xl text-slate-300 cursor-pointer transition-all"
                >
                  Cancel
                </button>
                <button
                  id="save-form-btn"
                  type="submit"
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 font-bold rounded-xl text-xs text-white shadow-lg cursor-pointer transition-all"
                >
                  {selectedRecord ? 'Save Changes' : 'Confirm & Add'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Modal: DETAIL View */}
      {isDetailOpen && selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 relative font-sans text-slate-100">
            <button
              onClick={() => setIsDetailOpen(false)}
              className="absolute right-4 top-4 p-1.5 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-blue-500/10 border border-blue-500/20 text-blue-500 rounded-xl">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-mono font-bold text-blue-500 uppercase tracking-widest block">Document Certificate</span>
                <h3 className="text-lg font-bold text-slate-50 leading-tight">{selectedRecord.newTankNumber}</h3>
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-slate-950/50 border border-slate-800/80 font-mono text-xs">
                <div>
                  <span className="text-slate-500 block mb-0.5 uppercase tracking-wide">Serial Sn</span>
                  <span className="text-slate-100 font-semibold">{selectedRecord.sn}</span>
                </div>
                <div>
                  <span className="text-slate-500 block mb-0.5 uppercase tracking-wide">Classification</span>
                  <span className="text-slate-100 font-semibold">{selectedRecord.classification}</span>
                </div>
                <div>
                  <span className="text-slate-500 block mb-0.5 uppercase tracking-wide">Aramco Tank No</span>
                  <span className="text-slate-100 font-semibold">{selectedRecord.aramcoTankNumber}</span>
                </div>
                <div>
                  <span className="text-slate-500 block mb-0.5 uppercase tracking-wide">Model Year</span>
                  <span className="text-slate-100 font-semibold">{selectedRecord.model}</span>
                </div>
                <div>
                  <span className="text-slate-500 block mb-0.5 uppercase tracking-wide">Product Type</span>
                  <span className="text-slate-100 font-semibold">{selectedRecord.product}</span>
                </div>
                <div>
                  <span className="text-slate-500 block mb-0.5 uppercase tracking-wide">Capacity Volume</span>
                  <span className="text-slate-100 font-semibold">{selectedRecord.quantity.toLocaleString()} L</span>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-500 block mb-0.5 uppercase tracking-wide">Authorized Vehicle Plate</span>
                  <span className="text-slate-100 font-semibold block break-all">{selectedRecord.authorizedVehicle}</span>
                </div>
                <div>
                  <span className="text-slate-500 block mb-0.5 uppercase tracking-wide">Deploy Region</span>
                  <span className="text-slate-100 font-semibold">{selectedRecord.region}</span>
                </div>
                <div>
                  <span className="text-slate-500 block mb-0.5 uppercase tracking-wide">Active Status</span>
                  <span className="text-amber-400 font-semibold">{selectedRecord.status}</span>
                </div>
              </div>

              {/* Informative advice */}
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-3xs text-slate-400 flex items-start gap-2">
                <Info className="w-4 h-4 flex-shrink-0 text-blue-500 mt-0.5" />
                <span>
                  This document metadata is synced with Al Noor United Eastern Division logistics servers. Any modifications will instantly update the fleet statistics.
                </span>
              </div>
            </div>

            <div className="pt-5 mt-5 border-t border-slate-800 flex items-center justify-end">
              <button
                onClick={() => setIsDetailOpen(false)}
                className="px-4 py-2 bg-slate-950 border border-slate-800 hover:border-slate-700 text-xs font-semibold rounded-xl text-slate-300 cursor-pointer transition-all"
              >
                Close Certificate
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Modal: CONFIRM DELETE */}
      {isDeleteOpen && selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 relative font-sans text-slate-100">
            <button
              onClick={() => setIsDeleteOpen(false)}
              className="absolute right-4 top-4 p-1.5 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 text-rose-400 mb-4">
              <ShieldAlert className="w-6 h-6" />
              <h3 className="text-base font-bold text-slate-50">Delete Critical Data?</h3>
            </div>

            <p className="text-xs text-slate-300 mb-4 leading-relaxed">
              Are you absolutely sure you want to delete tanker <strong className="text-slate-50 font-mono">{selectedRecord.newTankNumber}</strong> (Aramco: {selectedRecord.aramcoTankNumber})? This will permanently remove this document from the transportation system database and trigger a critical security audit record.
            </p>

            <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded-xl text-3xs font-mono mb-6 leading-normal">
              WARNING: Role-based delete actions are irreversible. Higher administration approval logs will store this action.
            </div>

            <div className="flex items-center justify-end gap-2.5">
              <button
                onClick={() => setIsDeleteOpen(false)}
                className="px-4 py-2 bg-slate-950 border border-slate-800 hover:border-slate-700 text-xs font-semibold rounded-xl text-slate-300 cursor-pointer transition-all"
              >
                Cancel
              </button>
              <button
                id="confirm-delete-btn"
                onClick={handleConfirmDelete}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 active:bg-rose-700 rounded-xl text-xs font-bold text-white shadow-lg cursor-pointer transition-all"
              >
                Yes, Delete Record
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: CONFIRM BULK DELETE */}
      {isBulkDeleteOpen && selectedSns.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 relative font-sans text-slate-100">
            <button
              onClick={() => setIsBulkDeleteOpen(false)}
              className="absolute right-4 top-4 p-1.5 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 text-rose-400 mb-4">
              <ShieldAlert className="w-6 h-6" />
              <h3 className="text-base font-bold text-slate-50">Bulk Delete Records?</h3>
            </div>

            <p className="text-xs text-slate-300 mb-4 leading-relaxed">
              Are you absolutely sure you want to delete <strong className="text-slate-50">{selectedSns.length} selected tanker record(s)</strong>? This will permanently remove these documents from the transportation system database and trigger a critical security audit record.
            </p>

            <div className="max-h-24 overflow-y-auto mb-4 bg-slate-950/50 p-2.5 rounded-lg border border-slate-800/80 font-mono text-2xs text-slate-400">
              Selected SNs: {selectedSns.join(', ')}
            </div>

            <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded-xl text-3xs font-mono mb-6 leading-normal">
              WARNING: Role-based delete actions are irreversible. Higher administration approval logs will store this action.
            </div>

            <div className="flex items-center justify-end gap-2.5">
              <button
                onClick={() => setIsBulkDeleteOpen(false)}
                className="px-4 py-2 bg-slate-950 border border-slate-800 hover:border-slate-700 text-xs font-semibold rounded-xl text-slate-300 cursor-pointer transition-all"
                disabled={bulkDeleting}
              >
                Cancel
              </button>
              <button
                id="confirm-bulk-delete-btn"
                onClick={handleConfirmBulkDelete}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 active:bg-rose-700 rounded-xl text-xs font-bold text-white shadow-lg cursor-pointer transition-all flex items-center gap-2"
                disabled={bulkDeleting}
              >
                {bulkDeleting ? 'Deleting...' : 'Yes, Delete Selected'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Modal: GENERATE SHAREABLE LINK */}
      {isShareOpen && selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 relative font-sans text-slate-100">
            <button
              onClick={() => setIsShareOpen(false)}
              className="absolute right-4 top-4 p-1.5 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-slate-50 mb-2 flex items-center gap-2">
              <Share2 className="w-5 h-5 text-blue-500" />
              Generate Shareable Link
            </h3>
            <p className="text-xs text-slate-400 mb-6">
              Create a public access token so external inspectors can view the latest certificates for <strong className="text-slate-50 font-mono">{selectedRecord.newTankNumber}</strong> without logging in.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-2xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Public Shareable URL
                </label>
                <div className="relative">
                  <input
                    type="text"
                    readOnly
                    className="w-full pl-3 pr-24 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-2xs text-slate-300 font-mono select-all focus:outline-none"
                    value={getShareableUrl(selectedRecord.newTankNumber)}
                  />
                  <button
                    onClick={() => copyShareableLink(getShareableUrl(selectedRecord.newTankNumber))}
                    className="absolute right-1.5 top-1.5 px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-4xs uppercase font-bold tracking-wider transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <Copy className="w-3 h-3" />
                    <span>Copy Link</span>
                  </button>
                </div>
              </div>

              {/* Public sharing notice */}
              <div className="p-3.5 bg-indigo-500/10 border border-indigo-500/25 rounded-xl text-3xs text-indigo-300 leading-normal flex items-start gap-2.5">
                <Info className="w-4 h-4 flex-shrink-0 text-indigo-400 mt-0.5" />
                <span>
                  This link bypasses authentication. External logistics partners, ARAMCO safety officers, or truck operators can scan or load this URL to verify transport authorization instantly.
                </span>
              </div>
            </div>

            <div className="pt-6 mt-6 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setIsShareOpen(false)}
                className="px-4 py-2 bg-slate-950 border border-slate-800 hover:border-slate-700 text-xs font-semibold rounded-xl text-slate-300 cursor-pointer transition-all"
              >
                Close Share Options
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Modal: IMPORT EXCEL MASTER SOURCE */}
      {isImportOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 relative font-sans text-slate-100 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <button
              onClick={() => {
                if (!importing) {
                  setIsImportOpen(false);
                  setSelectedFile(null);
                  setImportErrors([]);
                }
              }}
              disabled={importing}
              className="absolute right-4 top-4 p-1.5 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white transition-colors cursor-pointer disabled:opacity-30"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-xl">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-mono font-bold text-amber-500 uppercase tracking-widest block">System Synchronizer</span>
                <h3 className="text-lg font-bold text-slate-50 leading-tight">Import Excel Master Source</h3>
              </div>
            </div>

            <p className="text-xs text-slate-400 mb-6 leading-relaxed">
              Upload an Excel spreadsheet (<span className="font-mono text-amber-400 font-semibold">.xlsx</span> or <span className="font-mono text-amber-400 font-semibold">.xls</span>) to act as the primary master data source. Once processed, the internal system database will synchronize with the uploaded spreadsheet in real time.
            </p>

            <form onSubmit={handleImportSubmit} className="space-y-6">
              {/* Drag and Drop Zone */}
              <div 
                className={`relative border-2 border-dashed rounded-2xl p-8 text-center transition-all ${
                  dragActive 
                    ? 'border-amber-500 bg-amber-500/5' 
                    : selectedFile 
                      ? 'border-emerald-500/30 bg-emerald-500/5' 
                      : 'border-slate-800 hover:border-slate-700 bg-slate-950/40'
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <input 
                  type="file"
                  id="excel-file-upload"
                  className="hidden"
                  accept=".xlsx, .xls"
                  onChange={handleFileChange}
                  disabled={importing}
                />

                {!selectedFile ? (
                  <label htmlFor="excel-file-upload" className="cursor-pointer flex flex-col items-center justify-center space-y-3 group">
                    <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl group-hover:border-slate-700 group-hover:text-amber-400 text-slate-400 transition-colors">
                      <Upload className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-200">
                        Drag and drop your Excel file here, or <span className="text-amber-400 hover:text-amber-300 transition-colors">browse files</span>
                      </p>
                      <p className="text-3xs text-slate-500 mt-1 uppercase tracking-wider font-mono">
                        Accepts .xlsx, .xls sheets up to 50MB
                      </p>
                    </div>
                  </label>
                ) : (
                  <div className="flex items-center justify-between p-3.5 bg-slate-950 border border-slate-800 rounded-xl">
                    <div className="flex items-center gap-3 text-left">
                      <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg font-mono text-xs">
                        XLSX
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-100 max-w-[280px] truncate" title={selectedFile.name}>
                          {selectedFile.name}
                        </p>
                        <p className="text-3xs text-slate-500 font-mono">
                          {(selectedFile.size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedFile(null)}
                      disabled={importing}
                      className="p-1.5 hover:bg-slate-900 text-slate-500 hover:text-slate-300 rounded-lg cursor-pointer disabled:opacity-30"
                      title="Clear selected file"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* Server-Side Validation Errors list */}
              {importErrors.length > 0 && (
                <div className="p-4 bg-rose-500/10 border border-rose-500/25 rounded-2xl space-y-2.5">
                  <div className="flex items-center gap-2 text-rose-400 font-bold text-xs font-mono">
                    <AlertTriangle className="w-4 h-4 text-rose-400" />
                    <span>Spreadsheet Validation Blocked</span>
                  </div>
                  <p className="text-3xs text-slate-400">
                    The uploaded sheet contains invalid or duplicate records. Correct these items and retry:
                  </p>
                  <ul className="space-y-1.5 text-3xs font-mono text-rose-300 overflow-y-auto max-h-40 custom-scrollbar pl-1 list-none">
                    {importErrors.map((err, idx) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <span className="text-rose-500 mt-0.5">•</span>
                        <span className="flex-1 leading-normal">{err}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Informative tips */}
              <div className="p-3.5 bg-slate-950/60 border border-slate-850 rounded-xl space-y-1 text-3xs text-slate-400">
                <p className="font-bold text-slate-300 flex items-center gap-1">
                  <Info className="w-3.5 h-3.5 text-amber-500" />
                  Mapping and Integrity Guidelines:
                </p>
                <p>
                  1. The sheet is parsed dynamically; column matching ignores casing and order (e.g. "newTankNumber", "Aramco No").
                </p>
                <p>
                  2. All rows must have unique, non-empty <span className="font-mono text-amber-400">newTankNumber</span> keys matching the <span className="font-mono text-slate-300">TN-2-[Number]</span> structure.
                </p>
                <p>
                  3. If any row is missing classification, product, or capacity, validation will block to prevent system corruption.
                </p>
              </div>

              {/* Action triggers */}
              <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setIsImportOpen(false);
                    setSelectedFile(null);
                    setImportErrors([]);
                  }}
                  disabled={importing}
                  className="px-4 py-2 bg-slate-950 border border-slate-800 hover:border-slate-700 text-xs font-semibold rounded-xl text-slate-300 cursor-pointer transition-all disabled:opacity-40"
                >
                  Cancel
                </button>
                <button
                  id="confirm-import-btn"
                  type="submit"
                  disabled={!selectedFile || importing}
                  className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 disabled:opacity-40 disabled:pointer-events-none font-bold rounded-xl text-xs text-slate-950 shadow-lg cursor-pointer transition-all flex items-center gap-2"
                >
                  {importing ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></div>
                      <span>Synchronizing...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      <span>Synchronize Database</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
