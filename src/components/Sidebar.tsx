/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  LayoutDashboard, 
  Database, 
  Users, 
  FilePieChart, 
  Settings, 
  LogOut, 
  Menu, 
  X,
  User as UserIcon,
  ShieldCheck,
  Globe,
  Sun,
  Moon,
  Terminal
} from 'lucide-react';
import { User } from '../types';
import { useTranslation } from '../lib/LanguageContext';

interface SidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  user: User;
  onLogout: () => void;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

export default function Sidebar({ 
  currentTab, 
  setCurrentTab, 
  user, 
  onLogout, 
  isOpen, 
  setIsOpen 
}: SidebarProps) {
  const { language, setLanguage, theme, setTheme, t, isRtl } = useTranslation();

  const menuItems = [
    { id: 'dashboard', label: t('nav.dashboard'), icon: LayoutDashboard },
    { id: 'records', label: t('nav.records'), icon: Database },
    { id: 'users', label: t('nav.users'), icon: Users, adminOnly: true },
    { id: 'sql-editor', label: t('nav.sqlEditor'), icon: Terminal, adminOnly: true },
    { id: 'reports', label: t('nav.reports'), icon: FilePieChart },
    { id: 'settings', label: t('nav.settings'), icon: Settings },
  ];

  const handleNav = (tabId: string) => {
    setCurrentTab(tabId);
    setIsOpen(false); // Close sidebar drawer on mobile nav
  };

  const getRoleLabel = (role: string) => {
    if (role === 'admin') return t('nav.adminBadge');
    if (role === 'staff') return t('nav.staffBadge');
    return t('nav.viewerBadge');
  };

  return (
    <>
      {/* Mobile top navigation bar */}
      <div className="md:hidden flex items-center justify-between glass-panel !rounded-none !border-t-0 !border-l-0 !border-r-0 !border-b-white/5 text-slate-100 px-4 py-3 sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <img 
            src="https://embymvlucoejmlofmeqg.supabase.co/storage/v1/object/public/LOGO/123.png" 
            alt="Al Noor Logo" 
            className="w-9 h-9 rounded-lg object-cover shadow-sm ring-1 ring-white/10"
            referrerPolicy="no-referrer" 
          />
          <div>
            <h1 className="text-sm font-bold tracking-tight text-slate-50">Al Noor United</h1>
          </div>
        </div>
        <button 
          id="hamburger-btn"
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 hover:bg-white/10 rounded-lg text-slate-300 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/50"
        >
          {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Backdrop overlay for mobile sidebar */}
      {isOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-slate-950/80 backdrop-blur-md z-30 transition-opacity animate-fade-in-up"
          style={{ animationDuration: '0.2s' }}
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Main Sidebar Drawer */}
      <aside 
        className={`fixed top-0 bottom-0 z-30 w-72 md:sticky md:top-0 md:h-screen glass-panel !border-l-0 !border-t-0 !border-b-0 !border-r-white/5 flex flex-col justify-between text-slate-300 font-sans transition-all duration-300 transform shadow-2xl
          ${isRtl 
            ? (isOpen ? 'translate-x-0 right-0' : 'translate-x-full right-0 md:translate-x-0') 
            : (isOpen ? 'translate-x-0 left-0' : '-translate-x-full left-0 md:translate-x-0')}
        `}
      >
        <div>
          {/* Al Noor Corporate Header */}
          <div className="p-6 pb-2">
            <div className="flex items-center gap-4 mb-8">
              <img 
                src="https://embymvlucoejmlofmeqg.supabase.co/storage/v1/object/public/LOGO/123.png" 
                alt="Al Noor Logo" 
                className="w-12 h-12 rounded-xl object-cover shadow-md ring-1 ring-white/10"
                referrerPolicy="no-referrer" 
              />
              <div className="flex-1 min-w-0">
                <h1 className="text-base font-extrabold tracking-tight text-slate-50 leading-tight">Al Noor United Transport</h1>
                <p className="text-[10px] uppercase font-bold tracking-widest text-blue-400 mt-1 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  {t('login.subtitle')}
                </p>
              </div>
            </div>

            {/* Navigation Links */}
            <nav className="space-y-1.5">
              {menuItems.map((item) => {
                if (item.adminOnly && user.role !== 'admin') return null;
                const Icon = item.icon;
                const isActive = currentTab === item.id;
                return (
                  <button
                    id={`nav-${item.id}`}
                    key={item.id}
                    onClick={() => handleNav(item.id)}
                    className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 cursor-pointer relative group overflow-hidden
                      ${isActive 
                        ? 'text-white bg-blue-600/20 shadow-inner' 
                        : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                      }`}
                  >
                    {isActive && (
                      <div className="absolute inset-y-0 left-0 w-1 bg-blue-500 rounded-r-full shadow-[0_0_10px_rgba(59,130,246,0.8)]" />
                    )}
                    {isActive && (
                      <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-transparent opacity-50" />
                    )}
                    <Icon className={`w-5 h-5 transition-transform duration-200 ${isActive ? 'text-blue-400 scale-110' : 'group-hover:scale-110 group-hover:text-slate-300'}`} />
                    <span className="relative z-10">{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* User Account Footer & LogOut & App Control Switchers */}
        <div className="p-5 border-t border-white/5 space-y-4">
          {/* Theme & Language control strip */}
          <div className="flex bg-slate-950/50 rounded-xl p-1 shadow-inner border border-white/5">
            <button
              onClick={() => setLanguage('en')}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                language === 'en' ? 'bg-slate-800 text-white shadow-sm ring-1 ring-white/10' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              EN
            </button>
            <button
              onClick={() => setLanguage('ar')}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                language === 'ar' ? 'bg-slate-800 text-white shadow-sm ring-1 ring-white/10' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              عربي
            </button>
          </div>
          
          <div className="flex bg-slate-950/50 rounded-xl p-1 shadow-inner border border-white/5">
            <button
              onClick={() => setTheme('dark')}
              className={`flex-1 py-1.5 flex justify-center text-xs font-bold rounded-lg transition-all ${
                theme === 'dark' ? 'bg-slate-800 text-white shadow-sm ring-1 ring-white/10' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              <Moon className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setTheme('light')}
              className={`flex-1 py-1.5 flex justify-center text-xs font-bold rounded-lg transition-all ${
                theme === 'light' ? 'bg-slate-800 text-white shadow-sm ring-1 ring-white/10' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              <Sun className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="pt-2">
            <div className="flex items-center gap-3 p-2 rounded-xl bg-slate-950/40 border border-slate-800/60 mb-4">
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg ring-2 ring-white/10 overflow-hidden">
                {user.avatar ? (
                  <img src={user.avatar} alt={user.username} className="w-full h-full object-cover" />
                ) : user.avatarUrl ? (
                  <img src={user.avatarUrl} alt={user.name || user.username} className="w-full h-full object-cover" />
                ) : (
                  <UserIcon className="w-5 h-5 text-white" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-slate-100 truncate leading-tight">{user.name || user.username.split('@')[0]}</p>
                <span className="inline-flex items-center mt-0.5 text-4xs font-mono font-bold px-1.5 py-0.5 rounded uppercase bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  {getRoleLabel(user.role)}
                </span>
              </div>
            </div>
            
            <button
              id="logout-btn"
              onClick={onLogout}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-all cursor-pointer ring-1 ring-rose-500/20"
            >
              <LogOut className="w-4 h-4 flex-shrink-0" />
              {t('nav.logout')}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
