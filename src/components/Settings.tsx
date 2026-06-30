/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  User as UserIcon, 
  Database, 
  FileText, 
  ToggleLeft, 
  ToggleRight, 
  CheckCircle, 
  AlertCircle,
  Clock,
  Shield,
  HelpCircle,
  Terminal,
  RefreshCw
} from 'lucide-react';
import { api } from '../lib/api';
import { User, SystemSettings, AuditLog } from '../types';
import { useTranslation } from '../lib/LanguageContext';

interface SettingsProps {
  user: User;
  onUserUpdate: (user: User) => void;
}

const PREDEFINED_AVATARS = [
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix&backgroundColor=b6e3f4',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka&backgroundColor=c0aede',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Jude&backgroundColor=ffdfbf',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Salem&backgroundColor=d1d4f9',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Max&backgroundColor=ffd5dc',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Daisy&backgroundColor=b6e3f4'
];

export default function SettingsView({ user, onUserUpdate }: SettingsProps) {
  const { t, isRtl } = useTranslation();
  const [settings, setSettings] = useState<SystemSettings>({
    allowPublicSharing: true,
    enableAuditTrails: true,
    defaultPaginationSize: 15,
    maintenanceMode: false
  });
  
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [savingAvatar, setSavingAvatar] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 800 * 1024) {
      showNotification('error', isRtl ? 'يجب أن يكون حجم الصورة أقل من 800 كيلوبايت.' : 'Image size must be less than 800KB.');
      return;
    }

    try {
      setSavingAvatar(true);
      const { avatarUrl } = await api.uploadAvatar(file);
      const updated = await api.updateProfile({ avatarUrl });
      onUserUpdate(updated);
      showNotification('success', isRtl ? 'تم تحديث الصورة الشخصية بنجاح.' : 'Profile picture updated successfully.');
    } catch (err: any) {
      showNotification('error', err.message || 'Failed to save avatar.');
    } finally {
      setSavingAvatar(false);
    }
  };

  const handleSelectPredefined = async (url: string) => {
    try {
      setSavingAvatar(true);
      const updated = await api.updateProfile({ avatarUrl: url });
      onUserUpdate(updated);
      showNotification('success', isRtl ? 'تم تحديث الصورة الشخصية بنجاح.' : 'Profile picture updated successfully.');
    } catch (err: any) {
      showNotification('error', err.message || 'Failed to save avatar.');
    } finally {
      setSavingAvatar(false);
    }
  };

  const handleRemoveAvatar = async () => {
    try {
      setSavingAvatar(true);
      const updated = await api.updateProfile({ avatarUrl: '' });
      onUserUpdate(updated);
      showNotification('success', isRtl ? 'تم إزالة الصورة الشخصية.' : 'Profile picture removed.');
    } catch (err: any) {
      showNotification('error', err.message || 'Failed to remove avatar.');
    } finally {
      setSavingAvatar(false);
    }
  };

  const fetchSettingsAndLogs = async () => {
    setLoading(true);
    try {
      const settingsData = await api.getSettings();
      setSettings(settingsData);
      
      if (user.role === 'admin') {
        const logsData = await api.getLogs();
        setLogs(logsData);
      }
    } catch (err) {
      console.error('Error fetching settings/logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettingsAndLogs();
  }, [user]);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => {
      setNotification(null);
    }, 4000);
  };

  const handleToggle = async (key: keyof SystemSettings) => {
    if (user.role !== 'admin') {
      showNotification('error', isRtl ? 'فقط مسؤولو النظام يمكنهم تعديل إعدادات النور.' : 'Only system Administrators can adjust Al Noor configurations.');
      return;
    }

    setSaving(true);
    const updatedSettings = {
      ...settings,
      [key]: !settings[key]
    };

    try {
      await api.updateSettings(updatedSettings);
      setSettings(updatedSettings);
      showNotification('success', isRtl ? 'تم تحديث إعدادات النظام بنجاح.' : 'System configuration updated successfully.');
    } catch (err: any) {
      showNotification('error', err.message || (isRtl ? 'فشل تحديث الإعدادات.' : 'Failed to update settings.'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 bg-slate-950 text-slate-100 min-h-[80vh]">
        <div className="w-10 h-10 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mb-4" />
        <p className="text-sm font-mono text-slate-400">
          {isRtl ? 'جاري تحميل سجل تهيئة إعدادات النظام...' : 'Loading System Configuration Ledger...'}
        </p>
      </div>
    );
  }

  return (
    <div className={`flex-1 p-6 md:p-8 space-y-8 bg-slate-950 text-slate-100 font-sans min-h-screen ${isRtl ? 'rtl text-right' : 'ltr text-left'}`}>
      
      {notification && (
        <div className={`fixed bottom-6 ${isRtl ? 'left-6' : 'right-6'} z-50 p-4 rounded-xl shadow-2xl border flex items-center gap-3 animate-slide-in 
          ${notification.type === 'success' ? 'bg-slate-900 border-emerald-500/30 text-emerald-300' : 'bg-slate-900 border-rose-500/30 text-rose-300'}`}>
          {notification.type === 'success' ? <CheckCircle className="w-5 h-5 text-emerald-400" /> : <AlertCircle className="w-5 h-5 text-rose-400" />}
          <span className="text-sm font-medium">{notification.message}</span>
        </div>
      )}

      {/* Title */}
      <div className={`flex items-center justify-between ${isRtl ? 'flex-row-reverse' : 'flex-row'}`}>
        <div className="w-full">
          <h1 id="settings-header" className="text-2xl font-extrabold tracking-tight text-slate-50 flex items-center gap-2 justify-start">
            {t('nav.settings')}
          </h1>
          <p className="text-sm text-slate-400">
            {isRtl 
              ? 'مراقبة تكامل النظام، تكوين الصلاحيات العامة، وفحص مسارات سجل التدقيق الأمني الكامل.' 
              : 'Monitor system integration nodes, configure public clearances, and inspect complete security audit trails.'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Profile & Configs */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* User Profile Info Bento Box */}
          <div className="p-6 bg-slate-900/40 border border-slate-800/80 rounded-2xl shadow-xl space-y-4">
            <h2 className={`text-sm font-bold text-slate-50 uppercase tracking-wider font-mono flex items-center gap-2 ${isRtl ? 'flex-row-reverse' : 'flex-row'}`}>
              <UserIcon className="w-4 h-4 text-blue-500" />
              <span>{isRtl ? '١. تصاريح حسابك الشخصي' : '1. Your Account Clearance'}</span>
            </h2>

            <div className={`flex flex-col sm:flex-row items-center gap-5 p-4 rounded-xl bg-slate-950/40 border border-slate-800/60 ${isRtl ? 'sm:flex-row-reverse text-right' : 'text-left'}`}>
              {user.avatarUrl ? (
                <img 
                  src={user.avatarUrl} 
                  alt={user.name} 
                  className="w-16 h-16 rounded-full border border-slate-700 object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center font-bold text-xl font-mono">
                  {user.name.charAt(0)}
                </div>
              )}
              <div className={`space-y-1 ${isRtl ? 'text-center sm:text-right' : 'text-center sm:text-left'}`}>
                <h3 className="text-base font-bold text-slate-50">{user.name}</h3>
                <p className="text-xs font-mono text-slate-400">
                  {isRtl ? 'اسم المستخدم في النظام: ' : 'System Username: '}
                  <strong className="text-slate-200">{user.username}</strong>
                </p>
                <div className={`pt-1 flex flex-wrap gap-2 justify-center ${isRtl ? 'sm:justify-end' : 'sm:justify-start'}`}>
                  <span className="inline-flex items-center text-4xs font-mono font-bold px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/25 uppercase">
                    {isRtl ? 'الترخيص: ' : 'Clearance: '}{isRtl ? (user.role === 'admin' ? 'مدير نظام' : user.role === 'staff' ? 'موظف' : 'مراقب') : user.role}
                  </span>
                  <span className="inline-flex items-center text-4xs font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 uppercase">
                    {isRtl ? 'الحالة: ' : 'Status: '}{isRtl ? (user.status === 'active' ? 'نشط' : user.status) : user.status}
                  </span>
                </div>
              </div>
            </div>

            {/* Choose Avatar Sub-Section */}
            <div className="pt-4 border-t border-slate-800/60 space-y-3">
              <label className="block text-2xs font-semibold text-slate-400 uppercase tracking-wider font-mono">
                {isRtl ? 'اختر صورتك الرمزية أو ارفع صورة شخصية' : 'Choose Your Avatar or Upload Picture'}
              </label>
              
              {/* Predefined Avatars Grid */}
              <div className="flex flex-wrap gap-3 items-center">
                {PREDEFINED_AVATARS.map((avatar, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectPredefined(avatar)}
                    disabled={savingAvatar}
                    className={`relative w-12 h-12 rounded-full overflow-hidden border-2 transition-all hover:scale-105 active:scale-95 cursor-pointer disabled:opacity-50 ${
                      user.avatarUrl === avatar ? 'border-blue-500 ring-2 ring-blue-500/30' : 'border-slate-800 hover:border-slate-600'
                    }`}
                  >
                    <img src={avatar} alt={`Avatar ${idx + 1}`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  </button>
                ))}
                
                {/* Upload Button */}
                <label className="relative w-12 h-12 rounded-full border-2 border-dashed border-slate-800 hover:border-blue-500 flex flex-col items-center justify-center cursor-pointer transition-colors hover:bg-slate-900/50 group">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    disabled={savingAvatar}
                    className="hidden"
                  />
                  <span className="text-3xs font-mono text-slate-400 group-hover:text-blue-400 font-bold text-center px-1">
                    {savingAvatar ? '...' : (isRtl ? 'تحميل' : 'UPLOAD')}
                  </span>
                </label>

                {/* Remove Button */}
                {user.avatarUrl && (
                  <button
                    type="button"
                    onClick={handleRemoveAvatar}
                    disabled={savingAvatar}
                    className="px-3 py-2 bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 text-rose-400 text-3xs font-mono font-bold rounded-lg uppercase tracking-wider cursor-pointer disabled:opacity-50"
                  >
                    {isRtl ? 'إزالة' : 'REMOVE'}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Configuration Toggles */}
          <div className="p-6 bg-slate-900/40 border border-slate-800/80 rounded-2xl shadow-xl space-y-6">
            <h2 className={`text-sm font-bold text-slate-50 uppercase tracking-wider font-mono flex items-center gap-2 ${isRtl ? 'flex-row-reverse' : 'flex-row'}`}>
              <Settings className="w-4 h-4 text-blue-500" />
              <span>{isRtl ? '٢. خيارات التحكم في النظام' : '2. System Control Toggles'}</span>
            </h2>

            <div className="divide-y divide-slate-800/60">
              
              {/* Toggle 1 */}
              <div className="py-4 flex items-center justify-between gap-4">
                <div className="space-y-1 pr-4">
                  <h4 className="text-xs font-bold text-slate-50 flex items-center gap-1.5 justify-start">
                    {isRtl ? 'السماح بروابط المشاركة العامة' : 'Allow Public Sharing Links'}
                  </h4>
                  <p className="text-2xs text-slate-400 leading-normal">
                    {isRtl 
                      ? 'عرض روابط عامة فريدة وآمنة لوثائق الناقلات الفردية للتحقق من شهادات خلو المسؤولية بدون بيانات دخول المستخدم.'
                      : 'Exposes unique, secure public URLs for individual tanker documents to verify clearance certificates without user credentials.'}
                  </p>
                </div>
                <button
                  id="toggle-share"
                  disabled={saving}
                  onClick={() => handleToggle('allowPublicSharing')}
                  className="text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  {settings.allowPublicSharing ? (
                    <ToggleRight className="w-10 h-10 text-blue-500" />
                  ) : (
                    <ToggleLeft className="w-10 h-10 text-slate-600" />
                  )}
                </button>
              </div>

              {/* Toggle 2 */}
              <div className="py-4 flex items-center justify-between gap-4">
                <div className="space-y-1 pr-4">
                  <h4 className="text-xs font-bold text-slate-50 flex items-center gap-1.5 justify-start">
                    {isRtl ? 'تفعيل سجلات تدقيق النظام' : 'Enable System Audit Logs'}
                  </h4>
                  <p className="text-2xs text-slate-400 leading-normal">
                    {isRtl
                      ? 'توجيه دفتر البيانات الخلفي لتسجيل العمليات (إضافة، تعديل، حذف، تسجيل دخول) بشكل مستمر في سجل التدقيق الأمني لقاعدة البيانات.'
                      : 'Instructs the backend ledger to continuously record actions (add, edit, delete, logins) into the database audit trail.'}
                  </p>
                </div>
                <button
                  id="toggle-audit"
                  disabled={saving}
                  onClick={() => handleToggle('enableAuditTrails')}
                  className="text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  {settings.enableAuditTrails ? (
                    <ToggleRight className="w-10 h-10 text-blue-500" />
                  ) : (
                    <ToggleLeft className="w-10 h-10 text-slate-600" />
                  )}
                </button>
              </div>

              {/* Toggle 3 */}
              <div className="py-4 flex items-center justify-between gap-4">
                <div className="space-y-1 pr-4">
                  <h4 className="text-xs font-bold text-slate-50 flex items-center gap-1.5 justify-start">
                    {isRtl ? 'الحماية الأمنية لصيانة النظام' : 'System Maintenance Safeguard'}
                  </h4>
                  <p className="text-2xs text-slate-400 leading-normal">
                    {isRtl
                      ? 'وضع قاعدة بيانات النقل في حالة الإغلاق للقراءة فقط، مما يعطل أي إضافات أو تعديلات جديدة للناقلات من قبل الموظفين.'
                      : 'Places the transport database into read-only lockdown, disabling any new record additions or modifications by staff.'}
                  </p>
                </div>
                <button
                  id="toggle-maintenance"
                  disabled={saving}
                  onClick={() => handleToggle('maintenanceMode')}
                  className="text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  {settings.maintenanceMode ? (
                    <ToggleRight className="w-10 h-10 text-rose-500" />
                  ) : (
                    <ToggleLeft className="w-10 h-10 text-slate-600" />
                  )}
                </button>
              </div>

            </div>
          </div>

        </div>

        {/* Right Column: Database Sync Panel */}
        <div className="space-y-6">
          
          {/* Supabase Connection Setup Box */}
          <div className="p-6 bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 rounded-2xl shadow-xl flex flex-col justify-between h-full relative overflow-hidden">
            {/* Background Accent */}
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full filter blur-xl pointer-events-none" />

            <div className="space-y-5">
              <h2 className={`text-sm font-bold text-slate-50 uppercase tracking-wider font-mono flex items-center gap-2 ${isRtl ? 'flex-row-reverse' : 'flex-row'}`}>
                <Database className="w-4 h-4 text-emerald-400" />
                <span>{isRtl ? 'عقدة دمج سوبابيس (Supabase)' : 'Supabase Integration Node'}</span>
              </h2>

              <div className={`p-3 bg-emerald-500/10 border border-emerald-500/25 rounded-xl flex items-center gap-2.5 ${isRtl ? 'flex-row-reverse' : 'flex-row'}`}>
                <span className="w-2.5 h-2.5 bg-emerald-400 rounded-full animate-ping" />
                <span className="text-2xs font-bold font-mono text-emerald-400 uppercase tracking-wider">
                  {isRtl ? 'نشط: وضع بيئة التجربة' : 'Operational: sandbox mode'}
                </span>
              </div>

              <div className="space-y-3.5 text-2xs text-slate-300 leading-relaxed font-sans">
                <p>
                  {isRtl 
                    ? 'للانتقال بهذا النظام إلى قاعدة بيانات سوبابيس (Supabase) المتكاملة للإنتاج الفعلي، اتبع الخطوات التالية:'
                    : 'To transition this system to your live, production-grade **Supabase Relational Database**, follow these steps:'}
                </p>
                
                <ol className={`list-decimal list-inside space-y-2 text-slate-400 pl-1 font-sans ${isRtl ? 'text-right' : 'text-left'}`}>
                  <li>{isRtl ? 'افتح علامة تبويب أسرار AI Studio في قائمة الإعدادات.' : 'Open the AI Studio Secrets tab in the settings menu.'}</li>
                  <li>{isRtl ? 'أعلن عن نقاط نهاية سوبابيس كأسرار أمنية للمشروع:' : 'Declare your Supabase endpoints as secrets:'}</li>
                  <div className="mt-1 p-2 bg-slate-950 border border-slate-800 rounded text-3xs font-mono text-slate-200 ltr text-left">
                    SUPABASE_URL="https://your-proj.supabase.co"<br/>
                    SUPABASE_ANON_KEY="your-anon-api-key"
                  </div>
                  <li>{isRtl ? 'انقر على حفظ. سيقوم النظام تلقائياً باكتشاف المتغيرات ومزامنة جداول قاعدة البيانات عند التحميل الساخن.' : 'Click Save. The system will automatically detect the variables and synchronize database tables on hot-reload.'}</li>
                </ol>

                <div className={`p-3 bg-slate-950/60 border border-slate-800 rounded-xl space-y-1 font-mono text-3xs text-slate-400 ${isRtl ? 'text-right' : 'text-left'}`}>
                  <span className="font-bold text-slate-300 block uppercase">{isRtl ? 'حالة قاعدة البيانات التجريبية:' : 'Sandbox Database Status:'}</span>
                  <span>
                    {isRtl ? 'المحرك النشط: ' : 'Active Engine: '}
                    <strong className={settings.activeEngine === 'Supabase' ? "text-emerald-400 font-bold" : "text-amber-400 font-bold"}>
                      {settings.activeEngine || 'JSON'}
                    </strong>
                  </span>
                  <br/>
                  <span>
                    {isRtl ? 'الناقلات المعبأة: ' : 'Records Seeded: '}
                    <strong>{settings.recordsCount !== undefined ? settings.recordsCount : 96}</strong>
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-800/80 text-center">
              <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest block">
                {isRtl ? 'عقدة تقنية النور المتحدة - الرياض' : 'Al Noor United Tech Node Riyadh'}
              </span>
            </div>
          </div>

        </div>

      </div>

      {/* Complete Audit Trail Logs List (Admin Only) */}
      {user.role === 'admin' && (
        <div className="p-6 bg-slate-900/40 border border-slate-800/80 rounded-2xl shadow-xl space-y-4">
          <div className={`flex items-center justify-between pb-2 border-b border-slate-800/80 ${isRtl ? 'flex-row-reverse' : 'flex-row'}`}>
            <h2 className={`text-base font-bold text-slate-50 flex items-center gap-2 ${isRtl ? 'flex-row-reverse' : 'flex-row'}`}>
              <Terminal className="w-5 h-5 text-blue-500" />
              <span>{isRtl ? 'سجل تدقيق الأمان الشامل لكامل النظام' : 'Full System Security Audit Trail Ledger'}</span>
            </h2>
            <button
              onClick={fetchSettingsAndLogs}
              className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
              title={isRtl ? 'تحديث السجلات' : 'Refresh ledger logs'}
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          <div className="max-h-[350px] overflow-y-auto custom-scrollbar divide-y divide-slate-800/60 font-mono text-2xs text-slate-300">
            {logs.map((log) => (
              <div key={log.id} className={`py-3 flex flex-col md:flex-row md:items-center justify-between gap-1.5 ${isRtl ? 'md:flex-row-reverse' : ''}`}>
                <div className={`flex items-start md:items-center gap-3 ${isRtl ? 'flex-row-reverse text-right' : 'text-left'}`}>
                  <span className="text-slate-500 flex-shrink-0 flex items-center gap-1 min-w-[70px]">
                    <Clock className="w-3.5 h-3.5" />
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>
                  <span className={`px-2 py-0.2 rounded text-4xs font-bold border flex-shrink-0 
                    ${log.action === 'CREATE' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                      log.action === 'UPDATE' ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' :
                      log.action === 'DELETE' ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' :
                      log.action === 'LOGIN' ? 'bg-sky-500/10 border-sky-500/20 text-sky-400' :
                      'bg-slate-500/10 border-slate-500/20 text-slate-400'}`}>
                    {log.action}
                  </span>
                  <span className="text-slate-300 font-mono select-all leading-normal">
                    {isRtl ? (
                      log.details.replace('Created tanker record', 'أنشأ سجل الناقلة')
                                 .replace('Updated tanker record', 'عدل سجل الناقلة')
                                 .replace('Deleted tanker record', 'حذف سجل الناقلة')
                                 .replace('User login successful', 'تسجيل دخول مستخدم ناجح')
                                 .replace('System configuration settings updated', 'تحديث إعدادات تهيئة النظام')
                    ) : log.details}
                  </span>
                </div>
                <div className={`text-slate-500 pl-4 whitespace-nowrap self-end md:self-auto flex items-center gap-1.5 ${isRtl ? 'text-left flex-row-reverse' : 'text-right'}`}>
                  <span className="font-semibold text-slate-400">{log.username}</span>
                  <span className="px-1.5 py-0.2 rounded uppercase text-4xs bg-slate-950 border border-slate-800 text-slate-400">
                    {isRtl ? (log.userRole === 'admin' ? 'مدير نظام' : log.userRole === 'staff' ? 'موظف' : 'مراقب') : log.userRole}
                  </span>
                </div>
              </div>
            ))}
            {logs.length === 0 && (
              <p className="text-slate-500 py-6 text-center italic">{isRtl ? 'دفتر سجل التدقيق فارغ حالياً.' : 'Audit trail ledger is currently empty.'}</p>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
