/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { api } from './lib/api';
import { User } from './types';
import { useTranslation } from './lib/LanguageContext';

// Import Views
import Login from './components/Login';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import RecordsManagement from './components/RecordsManagement';
import UserManagement from './components/UserManagement';
import Reports from './components/Reports';
import SettingsView from './components/Settings';
import PublicShare from './components/PublicShare';
import SqlEditor from './components/SqlEditor';

export default function App() {
  const { t } = useTranslation();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Sharing routing detection state
  const [shareTankNumber, setShareTankNumber] = useState<string | null>(null);

  // Detect public share requests from paths, hashes, or queries on startup
  useEffect(() => {
    const path = window.location.pathname;
    const queryParams = new URLSearchParams(window.location.search);
    const hash = window.location.hash;

    // Check /share/TN-2-[num]
    if (path.startsWith('/share/')) {
      const tankNum = path.split('/share/')[1];
      if (tankNum) {
        setShareTankNumber(tankNum.trim());
      }
    } 
    // Check ?share=TN-2-[num]
    else if (queryParams.has('share')) {
      setShareTankNumber(queryParams.get('share'));
    }
    // Check #/share/TN-2-[num]
    else if (hash.startsWith('#/share/')) {
      const tankNum = hash.split('#/share/')[1];
      if (tankNum) {
        setShareTankNumber(tankNum.trim());
      }
    }
  }, []);

  // Verify auth on load
  useEffect(() => {
    // If we are viewing a public share link, don't force auth fetch on startup
    if (shareTankNumber) {
      setLoading(false);
      return;
    }

    const checkAuth = async () => {
      const token = sessionStorage.getItem('al_noor_token');
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const data = await api.getMe();
        setUser(data.user);
      } catch (err) {
        console.error('Session expired or invalid', err);
        api.logout();
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, [shareTankNumber]);

  const handleLoginSuccess = (loggedInUser: User) => {
    setUser(loggedInUser);
    setCurrentTab('dashboard');
  };

  const handleLogout = () => {
    api.logout();
    setUser(null);
  };

  // Render Public Share certificate view directly
  if (shareTankNumber) {
    return (
      <PublicShare 
        newTankNumber={shareTankNumber} 
        onBackToApp={() => {
          // Clear share state to return to normal login/app
          setShareTankNumber(null);
          // Clean browser URL bar
          window.history.pushState({}, document.title, '/');
        }}
      />
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 font-sans">
        <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mb-4" />
        <h2 className="text-sm font-semibold tracking-wide text-white uppercase font-mono">{t('login.title')}...</h2>
      </div>
    );
  }

  // Not logged in -> Show Login view
  if (!user) {
    return (
      <Login 
        onLoginSuccess={handleLoginSuccess} 
        onLogin={api.login}
      />
    );
  }

  // Tab switching router
  const renderTabContent = () => {
    switch (currentTab) {
      case 'dashboard':
        return <Dashboard user={user} onNavigateToTab={setCurrentTab} />;
      case 'records':
        return <RecordsManagement user={user} />;
      case 'users':
        return user.role === 'admin' ? <UserManagement currentUser={user} /> : <Dashboard user={user} onNavigateToTab={setCurrentTab} />;
      case 'sql-editor':
        return user.role === 'admin' ? <SqlEditor user={user} /> : <Dashboard user={user} onNavigateToTab={setCurrentTab} />;
      case 'reports':
        return <Reports user={user} />;
      case 'settings':
        return <SettingsView user={user} onUserUpdate={setUser} />;
      default:
        return <Dashboard user={user} onNavigateToTab={setCurrentTab} />;
    }
  };

  return (
    <div className="min-h-screen flex bg-slate-950 text-slate-100 font-sans relative overflow-hidden">
      
      {/* Enterprise Subtle Ambient Background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden select-none z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-900/20 blur-[120px] mix-blend-screen animate-blob" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-900/10 blur-[120px] mix-blend-screen animate-blob animation-delay-2000" />
      </div>

      {/* Sidebar navigation */}
      <div className="z-10 flex shrink-0">
        <Sidebar 
          currentTab={currentTab} 
          setCurrentTab={setCurrentTab} 
          user={user} 
          onLogout={handleLogout}
          isOpen={sidebarOpen}
          setIsOpen={setSidebarOpen}
        />
      </div>

      {/* Main scrollable view frame */}
      <main className="flex-1 min-w-0 overflow-y-auto max-h-screen z-10 custom-scrollbar scroll-smooth">
        <div key={currentTab} className="animate-fade-in-up min-h-full">
          {renderTabContent()}
        </div>
      </main>
    </div>
  );
}
