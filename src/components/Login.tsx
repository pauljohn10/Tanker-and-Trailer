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
      <div className={`absolute top-6 ${isRtl ? 'left-6' : 'right-6'} z-50 flex items-center gap-3 animate-fade-in-up`}>
        {/* Language Switcher */}
        <button
          onClick={() => setLanguage(language === 'en' ? 'ar' : 'en')}
          className="flex items-center gap-2 px-4 py-2 glass-panel hover:bg-white/5 rounded-full text-xs font-bold text-slate-300 transition-all cursor-pointer"
        >
          <Globe className="w-4 h-4" />
          <span>{language === 'en' ? 'العربية' : 'English'}</span>
        </button>

        {/* Theme Switcher */}
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="p-2 glass-panel hover:bg-white/5 rounded-full text-slate-300 transition-all cursor-pointer"
          title={theme === 'dark' ? t('theme.light') : t('theme.dark')}
        >
          {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-blue-500" />}
        </button>
      </div>

      {/* Enterprise Premium Animated Ambient Background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden select-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] rounded-full bg-blue-600/20 blur-[120px] mix-blend-screen animate-blob" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-indigo-600/20 blur-[120px] mix-blend-screen animate-blob animation-delay-2000" />
        <div className="absolute top-[20%] left-[20%] w-[40%] h-[40%] rounded-full bg-violet-600/10 blur-[100px] mix-blend-screen animate-blob" style={{ animationDelay: '4s' }} />
        {/* Subtle grid pattern overlay */}
        <div className="absolute inset-0 opacity-[0.03] bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />
      </div>

      <div className="w-full max-w-md p-10 glass-panel rounded-3xl shadow-2xl z-10 animate-fade-in-up relative overflow-hidden">
        {/* Subtle top glare */}
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
        
        <div className="flex flex-col items-center mb-10">
          <div className="p-1 mb-6 relative group">
            <div className="absolute inset-0 bg-blue-500 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-500" />
            <img 
              src="/logo-transparent.png" 
              alt="Al Noor Logo" 
              className="w-16 h-16 rounded-2xl object-cover relative ring-1 ring-white/10 shadow-xl"
              referrerPolicy="no-referrer"
            />
          </div>
          <h1 id="login-title" className="text-3xl font-black tracking-tight text-slate-50 text-center leading-tight mb-2">
            Al Noor United
          </h1>
          <p className="text-xs text-blue-400 font-bold uppercase tracking-[0.2em] text-center">
            {isRtl ? 'نظام إدارة الوثائق والأساطيل' : 'Enterprise Fleet System'}
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/30 text-rose-200 rounded-xl text-sm flex items-start gap-3 animate-slide-in-right shadow-inner">
            <Info className="w-5 h-5 flex-shrink-0 mt-0.5 text-rose-400" />
            <span className="font-medium">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-widest" htmlFor="username">
              {t('login.username')}
            </label>
            <div className="relative group">
              <span className={`absolute inset-y-0 ${isRtl ? 'right-0 pr-4' : 'left-0 pl-4'} flex items-center text-slate-500 group-focus-within:text-blue-500 transition-colors`}>
                <User className="w-5 h-5" />
              </span>
              <input
                id="username"
                type="text"
                required
                className={`w-full ${isRtl ? 'pr-12 pl-4 text-right' : 'pl-12 pr-4 text-left'} py-3.5 bg-slate-950/50 border border-slate-700/50 rounded-xl text-slate-50 placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all font-sans shadow-inner`}
                placeholder={isRtl ? 'أدخل اسم المستخدم الخاص بك' : 'Enter your username'}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-widest" htmlFor="password">
              {t('login.password')}
            </label>
            <div className="relative group">
              <span className={`absolute inset-y-0 ${isRtl ? 'right-0 pr-4' : 'left-0 pl-4'} flex items-center text-slate-500 group-focus-within:text-blue-500 transition-colors`}>
                <Key className="w-5 h-5" />
              </span>
              <input
                id="password"
                type="password"
                required
                className={`w-full ${isRtl ? 'pr-12 pl-4 text-right' : 'pl-12 pr-4 text-left'} py-3.5 bg-slate-950/50 border border-slate-700/50 rounded-xl text-slate-50 placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all font-sans shadow-inner`}
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
            className="w-full py-3.5 btn-enterprise bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-xl shadow-[0_0_20px_rgba(37,99,235,0.3)] hover:shadow-[0_0_25px_rgba(37,99,235,0.5)] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:shadow-none relative overflow-hidden"
          >
            {loading ? (
              <span className="inline-block w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <span>{t('login.signIn')}</span>
                <Shield className="w-4 h-4 ml-1" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
