/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { ShieldCheck, Printer, Calendar, MapPin, Truck, Droplet, User, FileText, CheckCircle2 } from 'lucide-react';
import { api } from '../lib/api';
import { TankerRecord } from '../types';
import { useTranslation } from '../lib/LanguageContext';

interface PublicShareProps {
  newTankNumber: string;
  onBackToApp?: () => void;
}

export default function PublicShare({ newTankNumber, onBackToApp }: PublicShareProps) {
  const { t, isRtl } = useTranslation();
  const [record, setRecord] = useState<TankerRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchRecord = async () => {
      try {
        const data = await api.getShareRecord(newTankNumber);
        setRecord(data);
      } catch (err: any) {
        setError(err.message || 'The requested share certificate could not be retrieved.');
      } finally {
        setLoading(false);
      }
    };
    fetchRecord();
  }, [newTankNumber]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6">
        <div className="w-10 h-10 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mb-4" />
        <p className="text-sm font-mono text-slate-400">
          {isRtl ? 'جاري التحقق من صحة شهادة النور المشفرة...' : 'Verifying Al Noor Certificate Cryptography...'}
        </p>
      </div>
    );
  }

  if (error || !record) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6">
        <div className="w-16 h-16 bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-2xl flex items-center justify-center mb-6">
          <FileText className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold mb-2">{isRtl ? 'فشل التحقق من المستند' : 'Verification Failed'}</h2>
        <p className="text-xs text-slate-400 max-w-sm text-center leading-relaxed mb-6 font-semibold">
          {error || (isRtl ? 'رابط المشاركة هذا منتهي الصلاحية، أو تم تعطيله من قبل مدير النظام.' : 'This link has expired, or public sharing has been disabled by the system administrator.')}
        </p>
        {onBackToApp && (
          <button
            onClick={onBackToApp}
            className="px-5 py-2 bg-slate-905 border border-slate-800 hover:border-slate-700 rounded-xl text-xs font-semibold text-slate-300 transition-colors cursor-pointer"
          >
            {isRtl ? 'العودة إلى البوابة' : 'Back to Portal'}
          </button>
        )}
      </div>
    );
  }

  // Translate product and status
  let prodLabel = record.product;
  let statusLabel = record.status;
  let regionLabel = record.region;

  if (isRtl) {
    if (record.product === 'PETROL') prodLabel = 'بنزين (PETROL)';
    else if (record.product === 'DIESEL') prodLabel = 'ديزل (DIESEL)';
    else if (record.product === 'WATER') prodLabel = 'مياه (WATER)';
    else if (record.product === 'MIXED') prodLabel = 'مختلط (MIXED)';
    else if (record.product === 'FUEL OIL') prodLabel = 'زيت الوقود (FUEL OIL)';

    if (record.status === 'OPERATIONAL') statusLabel = 'تشغيلية (OPERATIONAL)';
    else if (record.status === 'WORKING FOR COMPANY') statusLabel = 'تعمل للشركة (WORKING FOR COMPANY)';
    else if (record.status === 'STANDBY') statusLabel = 'احتياط (STANDBY)';

    if (record.region === 'DAMMAM') regionLabel = 'الدمام (DAMMAM)';
    else if (record.region === 'NAJRAN') regionLabel = 'نجران (NAJRAN)';
    else if (record.region === 'MAKKAH') regionLabel = 'مكة (MAKKAH)';
    else if (record.region === 'JEDDAH') regionLabel = 'جدة (JEDDAH)';
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4 md:p-8 relative overflow-hidden font-sans">
      
      {/* Decorative gradients */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-blue-600 rounded-full mix-blend-multiply filter blur-3xl opacity-5 pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-600 rounded-full mix-blend-multiply filter blur-3xl opacity-5 pointer-events-none" />

      {/* Main layout */}
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800/80 rounded-2xl shadow-2xl relative overflow-hidden print:border-none print:bg-white print:text-black">
        
        {/* Verification Status Banner */}
        <div className="bg-emerald-500/10 border-b border-emerald-500/20 px-6 py-4 flex items-center justify-between gap-4 print:hidden">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 animate-pulse" />
            <div>
              <span className="text-[10px] font-mono font-bold text-emerald-400 uppercase tracking-widest block">
                {isRtl ? 'تصريح معتمد من أرامكو السعودية' : 'Saudi Aramco Authorization'}
              </span>
              <p className="text-xs text-slate-200 font-semibold">
                {isRtl ? 'تم التحقق من صحة شهادة المستند النشطة الرسمية' : 'Official Active Document Certificate Verified'}
              </p>
            </div>
          </div>
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-950/60 hover:bg-slate-950 border border-slate-850 rounded-lg text-[10px] font-bold uppercase text-slate-300 transition-colors cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>{isRtl ? 'طباعة الشهادة' : 'Print Cert'}</span>
          </button>
        </div>

        {/* Certificate Body */}
        <div className="p-6 md:p-8 space-y-6">
          
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800/60 print:border-black">
            <div className="flex items-center gap-3">
              <div className="p-1.5 bg-blue-600/10 border border-blue-500/20 rounded-xl">
                <img 
                  src="/logo-transparent.png" 
                  alt="Al Noor Logo" 
                  className="w-10 h-10 rounded-lg object-cover"
                  referrerPolicy="no-referrer" 
                />
              </div>
              <div>
                <h1 className="text-base font-extrabold tracking-tight text-white print:text-black">
                  {isRtl ? 'مؤسسة النور المتحدة للنقل' : 'AL NOOR UNITED TRANSPORTATION EST.'}
                </h1>
                <p className="text-[10px] text-slate-400 font-mono print:text-gray-600 uppercase tracking-widest mt-0.5">
                  {isRtl ? 'طريق الملك فهد، نجران ٦٦٢٣١' : 'EST. KING FAHD ROAD, NAJRAN 66231'}
                </p>
              </div>
            </div>
            <div className={`font-mono ${isRtl ? 'text-right md:text-left' : 'text-left md:text-right'}`}>
              <span className="text-[10px] text-slate-500 uppercase tracking-wider block">
                {isRtl ? 'وقت التحقق' : 'Verify Timestamp'}
              </span>
              <span className="text-xs text-slate-300 print:text-black font-semibold">{new Date().toLocaleString()}</span>
            </div>
          </div>

          {/* Certificate grid content */}
          <div className="space-y-4">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">
              {isRtl ? 'مقاييس تفويض المركبة المعتمدة:' : 'Vehicle Authorization Metrics:'}
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-slate-950/40 border border-slate-850/60 print:bg-white print:border-black print:text-black font-mono text-xs">
              
              <div className="space-y-1">
                <span className="text-slate-500 block text-3xs uppercase tracking-wide">
                  {isRtl ? 'رقم الخزان الجديد' : 'New Tank Number'}
                </span>
                <span className="text-white print:text-black font-bold text-sm block">{record.newTankNumber}</span>
              </div>

              <div className="space-y-1">
                <span className="text-slate-500 block text-3xs uppercase tracking-wide">
                  {isRtl ? 'رقم خزان أرامكو المسجل' : 'Aramco Registered Tank No'}
                </span>
                <span className="text-white print:text-black font-bold text-sm block">{record.aramcoTankNumber}</span>
              </div>

              <div className="space-y-1 pt-2">
                <span className="text-slate-500 block text-3xs uppercase tracking-wide">
                  {isRtl ? 'فئة المواد والهيكل' : 'Material Class'}
                </span>
                <span className="text-white print:text-black font-semibold block">
                  {record.classification === 'STEEL' ? (isRtl ? 'حديد (STEEL)' : 'STEEL') : (isRtl ? 'ألومنيوم (ALUMINUM)' : 'ALUMINUM')}
                </span>
              </div>

              <div className="space-y-1 pt-2">
                <span className="text-slate-500 block text-3xs uppercase tracking-wide">
                  {isRtl ? 'سنة الصنع / الموديل' : 'Model Year'}
                </span>
                <span className="text-white print:text-black font-semibold block">{record.model}</span>
              </div>

              <div className="space-y-1 pt-2">
                <span className="text-slate-500 block text-3xs uppercase tracking-wide">
                  {isRtl ? 'المادة المشحونة' : 'Cargo Substance'}
                </span>
                <span className="text-blue-400 print:text-black font-bold block">{prodLabel}</span>
              </div>

              <div className="space-y-1 pt-2">
                <span className="text-slate-500 block text-3xs uppercase tracking-wide">
                  {isRtl ? 'السعة اللترية الإجمالية' : 'Gallons/Liters capacity'}
                </span>
                <span className="text-white print:text-black font-bold block">{record.quantity.toLocaleString()} {isRtl ? 'لتر' : 'L'}</span>
              </div>

              <div className="sm:col-span-2 pt-2 border-t border-slate-800/40 print:border-black">
                <span className="text-slate-500 block text-3xs uppercase tracking-wide">
                  {isRtl ? 'المركبة المصرح لها (رقم اللوحة المعتمد)' : 'Authorized Vehicle (License Spec)'}
                </span>
                <span className="text-white print:text-black font-bold text-sm block tracking-wide break-all mt-0.5">{record.authorizedVehicle}</span>
              </div>

              <div className="pt-2">
                <span className="text-slate-500 block text-3xs uppercase tracking-wide">
                  {isRtl ? 'المنطقة والمسار اللوجستي' : 'Logistical Region'}
                </span>
                <span className="text-white print:text-black font-semibold block">{regionLabel}</span>
              </div>

              <div className="pt-2">
                <span className="text-slate-500 block text-3xs uppercase tracking-wide">
                  {isRtl ? 'حالة مستند الشهادة' : 'Certificate Status'}
                </span>
                <span className="text-emerald-400 print:text-black font-bold block">{statusLabel}</span>
              </div>

            </div>
          </div>

          {/* Verification Barcode Design Accent */}
          <div className="flex flex-col items-center justify-center p-4 border border-dashed border-slate-800 rounded-xl print:border-black">
            <div className="font-mono text-center space-y-1 text-3xs text-slate-500 print:text-black">
              <span className="block uppercase tracking-widest font-bold">SHA-256 SECURE DIGITAL CERTIFICATE ID</span>
              <span className="block text-[8px] tracking-wide select-all">ALNOOR-VERIFY-{record.newTankNumber}-{Date.now()}</span>
            </div>
          </div>

        </div>

        {/* Certificate Footer */}
        <div className="p-4 bg-slate-950/40 border-t border-slate-800/60 text-center text-3xs text-slate-500 print:hidden flex items-center justify-between">
          <span>AL NOOR DMS SECURITY NETWORK</span>
          {onBackToApp && (
            <button
              onClick={onBackToApp}
              className="text-xs text-blue-500 hover:text-blue-400 font-semibold cursor-pointer transition-colors"
            >
              {isRtl ? 'تسجيل الدخول إلى البوابة الرئيسية ←' : 'Sign In to Al Noor DMS →'}
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
