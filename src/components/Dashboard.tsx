/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Database, 
  Droplet, 
  Truck, 
  Wrench, 
  Activity, 
  ArrowRight,
  TrendingUp,
  MapPin,
  RefreshCw
} from 'lucide-react';
import { api } from '../lib/api';
import { User, AuditLog } from '../types';
import { useTranslation } from '../lib/LanguageContext';

interface DashboardProps {
  user: User;
  onNavigateToTab: (tabId: string) => void;
}

export default function Dashboard({ user, onNavigateToTab }: DashboardProps) {
  const { t, isRtl } = useTranslation();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<AuditLog[]>([]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const statsData = await api.getStatistics();
      setStats(statsData);
      
      if (user.role === 'admin') {
        const logData = await api.getLogs();
        setLogs(logData.slice(0, 5)); // show recent 5
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [user]);

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 bg-slate-950 text-slate-100 min-h-[80vh]">
        <div className="w-10 h-10 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mb-4" />
        <p className="text-sm font-mono text-slate-400">
          {isRtl ? 'جاري تجميع بيانات الأسطول الذكية...' : 'Compiling Fleet Intelligence...'}
        </p>
      </div>
    );
  }

  // Calculate some insights
  const totalFleet = stats?.totalRecords || 0;
  const totalVolumeLiters = stats?.totalVolume || 0;
  
  // Compute operational percentage
  const operationalCount = stats?.operationalCount !== undefined ? stats.operationalCount : 82;
  const operationalRate = totalFleet > 0 ? Math.round((operationalCount / totalFleet) * 100) : 0;
  const workshopCount = stats?.workshopCount !== undefined ? stats.workshopCount : (totalFleet - operationalCount);

  // Formatting helper
  const formatVolume = (liters: number) => {
    if (liters >= 1000000) return `${(liters / 1000000).toFixed(2)}${isRtl ? ' مليون لتر' : 'M L'}`;
    return `${liters.toLocaleString()} ${isRtl ? 'لتر' : 'L'}`;
  };

  return (
    <div className="flex-1 p-6 md:p-8 space-y-8 bg-slate-950 min-h-screen text-slate-100 font-sans">
      
      {/* Dashboard Top Row / Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 id="dashboard-header" className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-50 flex items-center gap-2">
            {isRtl ? 'بوابة النور الذكية لمؤشرات الأسطول' : 'Al Noor Fleet Intel'}
            <span className="text-xs font-mono font-normal uppercase px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/25">
              {isRtl ? 'أسطول نشط' : 'Live Fleet'}
            </span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            {isRtl 
              ? 'نظام الإدارة والتدقيق الفوري لمؤسسة النور المتحدة للنقل - سلسلة ناقلات أرامكو.' 
              : 'Real-time management system for the AL NOOR UNITED TRANSPORTATION EST. Aramco Tanker Series.'}
          </p>
        </div>
        <button
          id="refresh-btn"
          onClick={fetchDashboardData}
          className={`self-start md:self-auto flex items-center gap-2 px-4 py-2.5 bg-slate-900 border border-slate-800 hover:border-slate-700 active:scale-[0.98] rounded-xl text-xs font-medium text-slate-300 transition-all cursor-pointer`}
        >
          <RefreshCw className="w-4 h-4" />
          <span>{isRtl ? 'تحديث البيانات' : 'Refresh Data'}</span>
        </button>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        
        {/* Metric 1 */}
        <div id="metric-fleet" className="p-5 bg-slate-900/60 border border-slate-800/80 rounded-2xl flex items-start justify-between shadow-lg">
          <div className="space-y-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
              {isRtl ? 'حجم الأسطول الكلي' : 'Total Fleet size'}
            </span>
            <span className="text-3xl font-extrabold text-slate-50 block">{totalFleet}</span>
            <span className="text-2xs text-emerald-400 font-medium flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5" /> {isRtl ? '١٠٠٪ خاضع للرقابة' : '100% Accounted'}
            </span>
          </div>
          <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl text-blue-500">
            <Truck className="w-6 h-6" />
          </div>
        </div>

        {/* Metric 2 */}
        <div id="metric-capacity" className="p-5 bg-slate-900/60 border border-slate-800/80 rounded-2xl flex items-start justify-between shadow-lg">
          <div className="space-y-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
              {isRtl ? 'إجمالي السعة الاستيعابية' : 'Combined Capacity'}
            </span>
            <span className="text-3xl font-extrabold text-slate-50 block">{formatVolume(totalVolumeLiters)}</span>
            <span className="text-2xs text-slate-400 font-medium block">
              {isRtl ? 'مواصفات معتمدة من أرامكو' : 'Aramco approved spec'}
            </span>
          </div>
          <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl text-blue-400">
            <Droplet className="w-6 h-6" />
          </div>
        </div>

        {/* Metric 3 */}
        <div id="metric-operational" className="p-5 bg-slate-900/60 border border-slate-800/80 rounded-2xl flex items-start justify-between shadow-lg">
          <div className="space-y-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
              {isRtl ? 'الأسطول التشغيلي' : 'Operational Fleet'}
            </span>
            <span className="text-3xl font-extrabold text-slate-50 block">{operationalRate}%</span>
            <span className="text-2xs text-emerald-400 font-medium block">
              {isRtl ? `${operationalCount} ناقلة تعمل بكفاءة` : `${operationalCount} Tankers operational`}
            </span>
          </div>
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400">
            <Activity className="w-6 h-6" />
          </div>
        </div>

        {/* Metric 4 */}
        <div id="metric-workshops" className="p-5 bg-slate-900/60 border border-slate-800/80 rounded-2xl flex items-start justify-between shadow-lg">
          <div className="space-y-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
              {isRtl ? 'الصيانة / الاستعداد الطارئ' : 'Maintenance / Standby'}
            </span>
            <span className="text-3xl font-extrabold text-slate-50 block">{workshopCount}</span>
            <span className="text-2xs text-amber-400 font-medium block">
              {isRtl ? 'ورش الدمام ونجران' : 'Dammam & Najran workshops'}
            </span>
          </div>
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400">
            <Wrench className="w-6 h-6" />
          </div>
        </div>

      </div>

      {/* Main Grid: Data Distributions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Fuel Type Distribution Column */}
        <div className="p-6 bg-slate-900/40 border border-slate-800/80 rounded-2xl shadow-xl flex flex-col justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-50 mb-4 flex items-center gap-2">
              <Droplet className="w-5 h-5 text-blue-500" />
              {t('dash.fuelType')}
            </h2>
            <div className="space-y-4">
              {stats?.productDist && Object.entries(stats.productDist).map(([prod, count]: any) => {
                const percent = Math.round((count / totalFleet) * 100);
                const barColor = 
                  prod === 'PETROL' ? 'bg-blue-600' :
                  prod === 'DIESEL' ? 'bg-blue-500' :
                  prod === 'WATER' ? 'bg-sky-400' :
                  prod === 'MIXED' ? 'bg-amber-500' :
                  prod === 'FUEL OIL' ? 'bg-rose-500' : 'bg-slate-500';
                
                // Translate products for display
                let prodLabel = prod;
                if (isRtl) {
                  if (prod === 'PETROL') prodLabel = 'بنزين (PETROL)';
                  else if (prod === 'DIESEL') prodLabel = 'ديزل (DIESEL)';
                  else if (prod === 'WATER') prodLabel = 'مياه (WATER)';
                  else if (prod === 'MIXED') prodLabel = 'مختلط (MIXED)';
                  else if (prod === 'FUEL OIL') prodLabel = 'زيت الوقود (FUEL OIL)';
                }

                return (
                  <div key={prod} className="space-y-1.5">
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-slate-300 font-medium tracking-wide">{prodLabel}</span>
                      <span className="text-slate-400">
                        {count} {t('dash.tankers')} ({percent}%)
                      </span>
                    </div>
                    <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden">
                      <div className={`h-full ${barColor} rounded-full`} style={{ width: `${percent}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="mt-6 pt-4 border-t border-slate-800/60">
            <button
              onClick={() => onNavigateToTab('reports')}
              className="text-xs text-blue-400 hover:text-blue-300 font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <span>{isRtl ? 'عرض مقاييس الناقلات الكاملة' : 'View full tanker metrics'}</span>
              <ArrowRight className={`w-3.5 h-3.5 ${isRtl ? 'rotate-180' : ''}`} />
            </button>
          </div>
        </div>

        {/* Regional Distribution Column */}
        <div className="p-6 bg-slate-900/40 border border-slate-800/80 rounded-2xl shadow-xl flex flex-col justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-50 mb-4 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-blue-500" />
              {t('dash.regional')}
            </h2>
            <div className="space-y-4">
              {stats?.regionDist && Object.entries(stats.regionDist).map(([region, count]: any) => {
                const percent = Math.round((count / totalFleet) * 100);
                
                // Translate regions for display
                let regionLabel = region;
                if (isRtl) {
                  if (region === 'DAMMAM') regionLabel = 'الدمام (DAMMAM)';
                  else if (region === 'NAJRAN') regionLabel = 'نجران (NAJRAN)';
                  else if (region === 'MAKKAH') regionLabel = 'مكة (MAKKAH)';
                  else if (region === 'RIYADH') regionLabel = 'الرياض (RIYADH)';
                  else if (region === 'JEDDAH') regionLabel = 'جدة (JEDDAH)';
                }

                return (
                  <div key={region} className="space-y-1.5">
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-slate-300 font-medium tracking-wide truncate pr-2" title={region}>{regionLabel}</span>
                      <span className="text-slate-400 flex-shrink-0">
                        {count} {isRtl ? 'وحدة' : 'units'} ({percent}%)
                      </span>
                    </div>
                    <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-600 rounded-full" style={{ width: `${percent}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="mt-6 pt-4 border-t border-slate-800/60">
            <button
              onClick={() => onNavigateToTab('records')}
              className="text-xs text-blue-400 hover:text-blue-300 font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <span>{isRtl ? 'إدارة السجلات الإقليمية للأسطول' : 'Manage local regional records'}</span>
              <ArrowRight className={`w-3.5 h-3.5 ${isRtl ? 'rotate-180' : ''}`} />
            </button>
          </div>
        </div>

      </div>

      {/* Bottom Row: Recent System Activity Logs (Admin Only) */}
      {user.role === 'admin' && (
        <div className="p-6 bg-slate-900/40 border border-slate-800/80 rounded-2xl shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-50 flex items-center gap-2">
              <Database className="w-5 h-5 text-blue-500" />
              {isRtl ? 'دفتر التدقيق الأمني الأخير' : 'Recent Audit Log'}
            </h2>
            <button
              onClick={() => onNavigateToTab('settings')}
              className="text-xs text-blue-400 hover:text-blue-300 font-medium inline-flex items-center gap-1 cursor-pointer"
            >
              <span>{isRtl ? 'عرض سجل التدقيق الكامل' : 'View full audit trail'}</span>
              <ArrowRight className={`w-3.5 h-3.5 ${isRtl ? 'rotate-180' : ''}`} />
            </button>
          </div>

          <div className="divide-y divide-slate-800/60">
            {logs.map((log) => {
              // Localize log details if it's login/update
              let localizedDetails = log.details;
              if (isRtl) {
                if (log.details.includes('User logged in')) {
                  localizedDetails = 'سجل المستخدم الدخول بنجاح من المتصفح.';
                } else if (log.details.includes('Updated tanker record')) {
                  const recordId = log.details.split('record ')[1] || '';
                  localizedDetails = `تم تحديث سجل الناقلة بنجاح ${recordId}.`;
                } else if (log.details.includes('Created tanker record')) {
                  const recordId = log.details.split('record ')[1] || '';
                  localizedDetails = `تم إنشاء سجل ناقلة جديد بنجاح ${recordId}.`;
                } else if (log.details.includes('Deleted tanker record')) {
                  const recordId = log.details.split('record ')[1] || '';
                  localizedDetails = `تم حذف سجل الناقلة ${recordId} نهائياً من النظام.`;
                }
              }

              return (
                <div key={log.id} className="py-3.5 flex items-center justify-between text-xs font-mono">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={`px-2 py-0.5 rounded text-4xs font-bold font-mono border flex-shrink-0 
                      ${log.action === 'CREATE' ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400' :
                        log.action === 'UPDATE' ? 'bg-blue-500/10 border-blue-500/25 text-blue-400' :
                        log.action === 'DELETE' ? 'bg-rose-500/10 border-rose-500/25 text-rose-400' :
                        'bg-slate-500/10 border-slate-500/25 text-slate-400'}`}>
                      {log.action}
                    </span>
                    <span className="text-slate-300 truncate" title={localizedDetails}>
                      {localizedDetails}
                    </span>
                  </div>
                  <div className={`text-slate-500 text-2xs ${isRtl ? 'text-left pl-0 pr-4' : 'text-right pr-0 pl-4'} whitespace-nowrap flex-shrink-0`}>
                    <span className="font-semibold text-slate-400 block">{log.username}</span>
                    <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                  </div>
                </div>
              );
            })}
            {logs.length === 0 && (
              <p className="text-slate-500 py-4 text-center font-mono">
                {isRtl ? 'لا توجد سجلات تدقيق أمنية أخيرة.' : 'No recent system activity logs.'}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
