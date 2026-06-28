/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Shield, Key, User, Info, FileText, Globe, Sun, Moon } from 'lucide-react';
import { User as UserType } from '../types';
import { useTranslation } from '../lib/LanguageContext';

interface LoginProps {
  onLoginSuccess: (user: UserType) => void;
  onLogin: (username: string, password: string) => Promise<{ token: string; user: UserType }>;
}

export default function Login({ onLoginSuccess, onLogin }: LoginProps) {
  const { language, setLanguage, theme, setTheme, t, isRtl } = useTranslation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) return;

    setError('');
    setLoading(true);
    try {
      const data = await onLogin(username, password);
      onLoginSuccess(data.user);
    } catch (err: any) {
      const msg = err.message || '';
      // If it looks like a server/connection crash or 500 error, show the details. Otherwise, use localized credential error.
      if (msg.includes('500') || msg.toLowerCase().includes('internal') || msg.toLowerCase().includes('server error') || msg.toLowerCase().includes('database') || msg.toLowerCase().includes('unexpected')) {
        setError(`${t('login.error')} (${msg})`);
      } else {
        setError(msg || t('login.error'));
      }
    } finally {
      setLoading(false);
    }
  };

  const setCredentials = (user: string, pass: string) => {
    setUsername(user);
    setPassword(pass);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100 relative overflow-hidden font-sans">
      {/* Top Controls Bar */}
      <div className={`absolute top-4 ${isRtl ? 'left-4' : 'right-4'} z-20 flex items-center gap-2`}>
        {/* Language Switcher */}
        <button
          onClick={() => setLanguage(language === 'en' ? 'ar' : 'en')}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl text-xs font-semibold text-slate-300 transition-all cursor-pointer shadow-lg"
        >
          <Globe className="w-3.5 h-3.5" />
          <span>{language === 'en' ? 'العربية' : 'English'}</span>
        </button>

        {/* Theme Switcher */}
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="p-2 bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl text-slate-300 transition-all cursor-pointer shadow-lg"
          title={theme === 'dark' ? t('theme.light') : t('theme.dark')}
        >
          {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-blue-500" />}
        </button>
      </div>

      {/* Background Decorative Rings */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-blue-600 rounded-full mix-blend-multiply filter blur-3xl opacity-[0.03] animate-blob" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-600 rounded-full mix-blend-multiply filter blur-3xl opacity-[0.03] animate-blob animation-delay-2000" />

      <div className="w-full max-w-md p-8 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl z-10">
        <div className="flex flex-col items-center mb-8">
          <div className="p-1.5 bg-blue-500/10 border border-blue-500/20 rounded-2xl mb-4 shadow-inner">
            <img 
              src="https://cgsmiirbaqgetnsjbvgl.supabase.co/storage/v1/object/public/noor/WhatsApp%20Image%202025-09-22%20at%2009.17.59_98258cd7.jpg" 
              alt="Al Noor Logo" 
              className="w-12 h-12 rounded-xl object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
          <h1 id="login-title" className="text-2xl font-extrabold tracking-tight text-slate-50 text-center">Al Noor United Transport</h1>
          <p className="text-2xs text-slate-400 mt-1 uppercase tracking-widest font-mono text-center">
            {isRtl ? 'نظام إدارة الوثائق والأساطيل المعتمد' : 'Document & Fleet Management System'}
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/35 text-rose-200 rounded-xl text-sm flex items-start gap-2 animate-fade-in">
            <Info className="w-5 h-5 flex-shrink-0 mt-0.5 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2" htmlFor="username">
              {t('login.username')}
            </label>
            <div className="relative">
              <span className={`absolute inset-y-0 ${isRtl ? 'right-0 pr-3' : 'left-0 pl-3'} flex items-center text-slate-400`}>
                <User className="w-5 h-5" />
              </span>
              <input
                id="username"
                type="text"
                required
                className={`w-full ${isRtl ? 'pr-10 pl-4 text-right' : 'pl-10 pr-4 text-left'} py-3 bg-slate-950/40 border border-slate-800 rounded-xl text-slate-105 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-all font-sans`}
                placeholder={isRtl ? 'أدخل اسم المستخدم الخاص بك' : 'Enter your username'}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2" htmlFor="password">
              {t('login.password')}
            </label>
            <div className="relative">
              <span className={`absolute inset-y-0 ${isRtl ? 'right-0 pr-3' : 'left-0 pl-3'} flex items-center text-slate-400`}>
                <Key className="w-5 h-5" />
              </span>
              <input
                id="password"
                type="password"
                required
                className={`w-full ${isRtl ? 'pr-10 pl-4 text-right' : 'pl-10 pr-4 text-left'} py-3 bg-slate-950/40 border border-slate-800 rounded-xl text-slate-105 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-all font-sans`}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <button
            id="login-btn"
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-blue-600 hover:bg-blue-500 active:scale-[0.99] transition-all text-white font-medium rounded-xl shadow-lg shadow-blue-900/10 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 font-bold"
          >
            {loading ? (
              <span className="inline-block w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              t('login.signInBtn')
            )}
          </button>
        </form>

        {/* Roles Quick Seeder for Demonstrating RBAC */}
        <div className="mt-8 pt-6 border-t border-slate-800">
          <p className="text-xs font-mono text-slate-400 text-center mb-3">{t('user.rbacTitle')}</p>
          <div className="grid grid-cols-3 gap-2">
            <button
              id="quick-admin"
              onClick={() => setCredentials('admin', 'adminpassword')}
              className="py-1.5 px-2 bg-slate-950/40 border border-slate-800 hover:border-blue-500/30 rounded-lg text-2xs text-slate-300 font-medium transition-colors text-center truncate cursor-pointer"
              title="Admin: Mr. Mana Ahmed (CEO)"
            >
              👑 {t('nav.adminBadge')}
            </button>
            <button
              id="quick-staff"
              onClick={() => setCredentials('staff', 'staffpassword')}
              className="py-1.5 px-2 bg-slate-950/40 border border-slate-800 hover:border-blue-500/30 rounded-lg text-2xs text-slate-300 font-medium transition-colors text-center truncate cursor-pointer"
              title="Staff: Gyno Tayobong (Exec Assistant)"
            >
              🛠️ {t('nav.staffBadge')}
            </button>
            <button
              id="quick-viewer"
              onClick={() => setCredentials('viewer', 'viewerpassword')}
              className="py-1.5 px-2 bg-slate-950/40 border border-slate-800 hover:border-blue-500/30 rounded-lg text-2xs text-slate-300 font-medium transition-colors text-center truncate cursor-pointer"
              title="Viewer: Ahmed Rafat (Accountant)"
            >
              👁️ {t('nav.viewerBadge')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
