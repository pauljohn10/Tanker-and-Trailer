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
      <div className="md:hidden flex items-center justify-between bg-slate-900 border-b border-slate-800 text-slate-100 px-4 py-3 sticky top-0 z-40">
        <div className="flex items-center gap-2.5">
          <img 
            src="https://cgsmiirbaqgetnsjbvgl.supabase.co/storage/v1/object/public/noor/WhatsApp%20Image%202025-09-22%20at%2009.17.59_98258cd7.jpg" 
            alt="Al Noor Logo" 
            className="w-8 h-8 rounded object-cover"
            referrerPolicy="no-referrer" 
          />
          <div>
            <h1 className="text-sm font-bold tracking-wide text-slate-50">Al Noor United Transport</h1>
          </div>
        </div>
        <button 
          id="hamburger-btn"
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 hover:bg-slate-800 rounded-lg text-slate-300 transition-colors focus:outline-none"
        >
          {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Backdrop overlay for mobile sidebar */}
      {isOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-30 transition-opacity"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Main Sidebar Drawer */}
      <aside 
        className={`fixed top-0 bottom-0 z-30 w-64 md:sticky md:top-0 md:h-screen bg-slate-900 flex flex-col justify-between text-slate-300 font-sans transition-transform duration-300 transform 
          ${isRtl 
            ? `right-0 border-l border-slate-800 ${isOpen ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}` 
            : `left-0 border-r border-slate-800 ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`
          }`}
      >
        <div>
          {/* Al Noor Corporate Header */}
          <div className="p-6 border-b border-slate-800 flex items-center gap-3">
            <img 
              src="https://cgsmiirbaqgetnsjbvgl.supabase.co/storage/v1/object/public/noor/WhatsApp%20Image%202025-09-22%20at%2009.17.59_98258cd7.jpg" 
              alt="Al Noor Logo" 
              className="w-9 h-9 rounded object-cover"
              referrerPolicy="no-referrer" 
            />
            <div>
              <h2 className="text-sm font-bold tracking-tight text-slate-50 leading-tight">Al Noor United Transport</h2>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1.5">
            {menuItems.map((item) => {
              if (item.adminOnly && user.role !== 'admin') return null;
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  id={`nav-${item.id}`}
                  key={item.id}
                  onClick={() => handleNav(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-150 cursor-pointer 
                    ${isActive 
                      ? 'bg-slate-800 text-slate-50 border border-slate-700' 
                      : 'hover:bg-slate-800 border border-transparent hover:text-slate-100 text-slate-400'
                    }`}
                >
                  <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-blue-500' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* User Account Footer & LogOut & App Control Switchers */}
        <div className="p-4 border-t border-slate-800 space-y-4">
          {/* Theme & Language control strip */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setLanguage(language === 'en' ? 'ar' : 'en')}
              className="flex items-center justify-center gap-1.5 py-2 bg-slate-950/40 hover:bg-slate-950/80 border border-slate-800/80 rounded-xl text-2xs font-bold text-slate-300 transition-colors cursor-pointer"
            >
              <Globe className="w-3.5 h-3.5 text-blue-400" />
              <span>{language === 'en' ? 'العربية' : 'English'}</span>
            </button>

            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="flex items-center justify-center gap-1.5 py-2 bg-slate-950/40 hover:bg-slate-950/80 border border-slate-800/80 rounded-xl text-2xs font-bold text-slate-300 transition-colors cursor-pointer"
            >
              {theme === 'dark' ? (
                <>
                  <Sun className="w-3.5 h-3.5 text-amber-400" />
                  <span>{t('theme.light')}</span>
                </>
              ) : (
                <>
                  <Moon className="w-3.5 h-3.5 text-blue-500" />
                  <span>{t('theme.dark')}</span>
                </>
              )}
            </button>
          </div>

          <div className="flex items-center gap-3 p-2 rounded-xl bg-slate-950/40 border border-slate-800/60">
            {user.avatarUrl ? (
              <img 
                src={user.avatarUrl} 
                alt={user.name} 
                className="w-10 h-10 rounded-full border border-slate-700 object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 text-slate-300 flex items-center justify-center font-bold">
                <UserIcon className="w-5 h-5" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-slate-100 truncate leading-tight">{user.name}</p>
              <span className="inline-flex items-center mt-0.5 text-4xs font-mono font-bold px-1.5 py-0.5 rounded uppercase bg-slate-800 text-slate-300 border border-slate-700">
                {getRoleLabel(user.role)}
              </span>
            </div>
          </div>

          <button
            id="logout-btn"
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium hover:bg-rose-500/10 border border-transparent hover:text-rose-400 text-slate-400 transition-all duration-150 cursor-pointer"
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            <span>{t('nav.logout')}</span>
          </button>
        </div>
      </aside>
    </>
  );
}
