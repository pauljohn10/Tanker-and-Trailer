/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  UserPlus, 
  ShieldAlert, 
  CheckCircle, 
  Trash2, 
  Edit3, 
  X, 
  Info,
  Shield,
  UserCheck,
  UserX
} from 'lucide-react';
import { api } from '../lib/api';
import { User, UserRole } from '../types';
import { useTranslation } from '../lib/LanguageContext';

interface UserManagementProps {
  currentUser: User;
}

export default function UserManagement({ currentUser }: UserManagementProps) {
  const { t, isRtl } = useTranslation();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [isAddEditOpen, setIsAddEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    name: '',
    role: 'viewer' as UserRole,
    status: 'active' as 'active' | 'suspended'
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Notifications
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const data = await api.getUsers();
      setUsers(data);
    } catch (err: any) {
      showNotification('error', err.message || 'Failed to fetch users.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => {
      setNotification(null);
    }, 4000);
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!formData.username) errors.username = 'Username is required.';
    else if (formData.username.length < 3) errors.username = 'Username must be at least 3 characters.';

    if (!selectedUser && !formData.password) {
      errors.password = 'Password is required for new accounts.';
    } else if (formData.password && formData.password.length < 5) {
      errors.password = 'Password must be at least 5 characters.';
    }

    if (!formData.name) errors.name = 'Full Display Name is required.';

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      if (selectedUser) {
        // Edit User
        await api.updateUser(selectedUser.id, formData);
        showNotification('success', `User account '${formData.username}' updated.`);
      } else {
        // Create User
        await api.createUser(formData);
        showNotification('success', `New account '${formData.username}' created successfully.`);
      }
      setIsAddEditOpen(false);
      fetchUsers();
    } catch (err: any) {
      showNotification('error', err.message || 'Failed to save user.');
    }
  };

  const handleAddClick = () => {
    setSelectedUser(null);
    setFormData({
      username: '',
      password: '',
      name: '',
      role: 'viewer',
      status: 'active'
    });
    setFormErrors({});
    setIsAddEditOpen(true);
  };

  const handleEditClick = (user: User) => {
    setSelectedUser(user);
    // Fetch full data (can pass existing fields since password is empty by default unless edited)
    setFormData({
      username: user.username,
      password: '', // blank unless changing password
      name: user.name,
      role: user.role,
      status: user.status
    });
    setFormErrors({});
    setIsAddEditOpen(true);
  };

  const handleDeleteClick = (user: User) => {
    if (user.id === currentUser.id) {
      showNotification('error', 'Security violation: You cannot delete your own Administrator account.');
      return;
    }
    setSelectedUser(user);
    setIsDeleteOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedUser) return;
    try {
      await api.deleteUser(selectedUser.id);
      showNotification('success', `User account '${selectedUser.username}' removed from database.`);
      setIsDeleteOpen(false);
      setSelectedUser(null);
      fetchUsers();
    } catch (err: any) {
      showNotification('error', err.message || 'Failed to delete user.');
    }
  };

  if (loading && users.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 bg-slate-950 min-h-[80vh]">
        <div className="w-10 h-10 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mb-4" />
        <p className="text-sm font-mono text-slate-400">Syncing Al Noor Security Credentials...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 md:p-8 space-y-6 bg-slate-950 text-slate-100 font-sans min-h-screen">
      
      {notification && (
        <div className={`fixed bottom-6 right-6 z-50 p-4 rounded-xl shadow-2xl border flex items-center gap-3 animate-slide-in 
          ${notification.type === 'success' ? 'bg-slate-900 border-emerald-500/30 text-emerald-300' : 'bg-slate-900 border-rose-500/30 text-rose-300'}`}>
          {notification.type === 'success' ? <CheckCircle className="w-5 h-5 text-emerald-400" /> : <ShieldAlert className="w-5 h-5 text-rose-400" />}
          <span className="text-sm font-medium">{notification.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 id="users-header" className="text-2xl font-extrabold tracking-tight text-slate-50 flex items-center gap-2">
            {t('nav.users')}
          </h1>
          <p className="text-sm text-slate-400">
            {isRtl 
              ? 'التحكم في أدوار الصلاحيات (RBAC). إضافة الموظفين أو تعيين الصلاحيات التشغيلية أو إيقاف الحسابات.' 
              : 'Control Role-Based Access Controls (RBAC). Add personnel, assign operational privileges, or suspend accounts.'}
          </p>
        </div>

        <button
          id="add-user-btn"
          onClick={handleAddClick}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-xl text-xs font-bold text-white transition-all shadow-lg active:scale-98 cursor-pointer"
        >
          <UserPlus className="w-4 h-4" />
          <span>{isRtl ? 'إضافة حساب مستخدم جديد' : 'Add User Account'}</span>
        </button>
      </div>

      {/* Info Notice Card */}
      <div className="p-4 bg-slate-900/60 border border-slate-800/80 rounded-2xl text-xs text-slate-300 flex items-start gap-3">
        <div className="p-2 bg-blue-500/10 border border-blue-500/20 text-blue-500 rounded-lg">
          <Shield className="w-5 h-5" />
        </div>
        <div>
          <h4 className="font-bold text-slate-50 mb-0.5">{isRtl ? 'قواعد صلاحيات الموظفين (RBAC)' : 'Role-Based Permission Rules (RBAC)'}</h4>
          <p className="text-slate-400 leading-relaxed text-2xs">
            {isRtl ? (
              <span>
                <strong>المدير (Admin):</strong> لديه كامل الصلاحيات في التعديل والحذف وإدارة الحسابات.
                <strong> الموظف (Staff):</strong> يمكنه إضافة أو تعديل ناقلات النفط والشهادات، لكن لا يملك صلاحية إدارة المستخدمين أو الحذف.
                <strong> المشاهد (Viewer):</strong> تقتصر صلاحيته على القراءة وعرض الجداول والتقارير فقط.
              </span>
            ) : (
              <span>
                <strong>Admin</strong> has total database CRUD control and security tools. 
                <strong> Staff</strong> can add or edit tanker documents, but cannot manage personnel or delete any records. 
                <strong> Viewer</strong> has strict read-only clearance on all tables and reports.
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-slate-900/30 border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl">
        <table id="users-table" className={`w-full ${isRtl ? 'text-right' : 'text-left'} border-collapse font-sans text-xs`}>
          <thead>
            <tr className="bg-slate-900/80 text-slate-300 border-b border-slate-800 text-2xs uppercase tracking-wider font-mono">
              <th className="py-4 px-6 font-semibold">{isRtl ? 'تفاصيل المستخدم' : 'User details'}</th>
              <th className="py-4 px-4 font-semibold">{isRtl ? 'اسم المستخدم / البريد الإلكتروني' : 'Username / Email'}</th>
              <th className="py-4 px-4 font-semibold">{isRtl ? 'دور الصلاحية' : 'Clearance Role'}</th>
              <th className={`py-4 px-4 font-semibold text-center`}>{isRtl ? 'الحالة الأمنية' : 'Security Status'}</th>
              <th className="py-4 px-4 font-semibold">{isRtl ? 'تاريخ التسجيل' : 'Registration Date'}</th>
              <th className="py-4 px-6 font-semibold text-center w-28">{isRtl ? 'الإجراءات' : 'Actions'}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-slate-900/40 transition-colors">
                <td className="py-3 px-6">
                  <div className="flex items-center gap-3">
                    {u.avatarUrl ? (
                      <img 
                        src={u.avatarUrl} 
                        alt={u.name} 
                        className="w-8 h-8 rounded-full border border-slate-700 object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-slate-800 text-slate-300 flex items-center justify-center font-bold">
                        {u.name.charAt(0)}
                      </div>
                    )}
                    <div>
                      <span className="text-slate-100 font-semibold block">{u.name}</span>
                      {u.id === currentUser.id && (
                        <span className="inline-block mt-0.5 px-1 py-0.2 bg-blue-500/10 border border-blue-500/25 text-blue-500 text-4xs font-mono rounded">
                          {isRtl ? 'أنت (الحالي)' : 'You (Current)'}
                        </span>
                      )}
                    </div>
                  </div>
                </td>
                <td className="py-3 px-4 font-mono text-slate-300">{u.username}</td>
                <td className="py-3 px-4">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-4xs font-bold font-mono border uppercase 
                    ${u.role === 'admin' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                      u.role === 'staff' ? 'bg-sky-500/10 text-sky-400 border-sky-500/20' :
                      'bg-slate-500/10 text-slate-400 border-slate-500/20'}`}>
                    {u.role === 'admin' ? (isRtl ? 'مدير نظام' : 'admin') :
                     u.role === 'staff' ? (isRtl ? 'موظف' : 'staff') :
                     (isRtl ? 'مشاهد' : 'viewer')}
                  </span>
                </td>
                <td className="py-3 px-4 text-center">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-4xs font-semibold border 
                    ${u.status === 'active' 
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                      : 'bg-rose-500/10 text-rose-400 border-rose-500/20'}`}>
                    {u.status === 'active' ? <UserCheck className="w-3 h-3" /> : <UserX className="w-3 h-3" />}
                    <span>{u.status === 'active' ? (isRtl ? 'نشط' : 'active') : (isRtl ? 'موقوف' : 'suspended')}</span>
                  </span>
                </td>
                <td className="py-3 px-4 font-mono text-slate-400">
                  {new Date(u.createdAt).toLocaleDateString()}
                </td>
                <td className="py-3 px-6 text-center">
                  <div className="flex items-center justify-center gap-1.5">
                    <button
                      onClick={() => handleEditClick(u)}
                      className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-blue-500 transition-colors cursor-pointer"
                      title={isRtl ? 'تعديل الدور أو الحالة' : 'Edit role or status'}
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteClick(u)}
                      disabled={u.id === currentUser.id}
                      className="p-1.5 hover:bg-rose-950/40 rounded-lg text-slate-500 hover:text-rose-400 transition-colors disabled:opacity-20 cursor-pointer"
                      title="Remove user account"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal: ADD / EDIT User */}
      {isAddEditOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 relative font-sans text-slate-100">
            <button
              onClick={() => setIsAddEditOpen(false)}
              className={`absolute ${isRtl ? 'left-4' : 'right-4'} top-4 p-1.5 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white transition-colors cursor-pointer`}
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-slate-50 mb-1">
              {selectedUser 
                ? (isRtl ? 'تعديل بيانات المستخدم' : 'Edit User Credentials') 
                : (isRtl ? 'إضافة حساب مستخدم جديد' : 'Add User Account')}
            </h3>
            <p className="text-xs text-slate-400 mb-6">
              {selectedUser 
                ? (isRtl ? `تعديل دور صلاحية الحساب للمستخدم '${selectedUser.username}'` : `Modify account clearance role for '${selectedUser.username}'`)
                : (isRtl ? 'إنشاء وتهيئة حساب جديد مستند إلى الصلاحيات في سجل أمان النور.' : 'Provision a new role-based account inside the Al Noor security ledger.')}
            </p>

            <form onSubmit={handleSaveUser} className="space-y-4">
              {/* Display Name */}
              <div>
                <label className="block text-2xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5" htmlFor="user-name">
                  {isRtl ? 'الاسم الكامل *' : 'Full Name *'}
                </label>
                <input
                  id="user-name"
                  type="text"
                  className={`w-full px-3 py-2 bg-slate-950 border rounded-xl text-xs text-slate-100 focus:outline-none focus:border-blue-500 transition-all 
                    ${formErrors.name ? 'border-rose-500' : 'border-slate-700'} ${isRtl ? 'text-right' : 'text-left'}`}
                  placeholder={isRtl ? 'مثال: تادرس فرهود' : 'e.g. Tadroos Farhoud'}
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
                {formErrors.name && <p className="text-rose-400 text-3xs mt-1">{formErrors.name}</p>}
              </div>

              {/* Username */}
              <div>
                <label className="block text-2xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5" htmlFor="user-username">
                  {isRtl ? 'اسم المستخدم *' : 'Username *'}
                </label>
                <input
                  id="user-username"
                  type="text"
                  disabled={!!selectedUser}
                  className={`w-full px-3 py-2 bg-slate-950 border rounded-xl text-xs text-slate-100 focus:outline-none focus:border-blue-500 transition-all font-mono disabled:opacity-40 
                    ${formErrors.username ? 'border-rose-500' : 'border-slate-700'} ${isRtl ? 'text-right' : 'text-left'}`}
                  placeholder={isRtl ? 'مثال: tadroos' : 'e.g. tadroos'}
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                />
                {formErrors.username && <p className="text-rose-400 text-3xs mt-1">{formErrors.username}</p>}
              </div>

              {/* Password */}
              <div>
                <label className="block text-2xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5" htmlFor="user-password">
                  {isRtl 
                    ? `كلمة المرور ${selectedUser ? '(اتركها فارغة لإبقائها كما هي)' : '*'}` 
                    : `Password ${selectedUser ? '(Leave blank to keep same)' : ''} *`}
                </label>
                <input
                  id="user-password"
                  type="password"
                  className={`w-full px-3 py-2 bg-slate-950 border rounded-xl text-xs text-slate-100 focus:outline-none focus:border-blue-500 transition-all font-mono 
                    ${formErrors.password ? 'border-rose-500' : 'border-slate-700'} ${isRtl ? 'text-right font-sans' : 'text-left'}`}
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
                {formErrors.password && <p className="text-rose-400 text-3xs mt-1">{formErrors.password}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Role */}
                <div>
                  <label className="block text-2xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5" htmlFor="user-role">
                    {isRtl ? 'دور الصلاحية *' : 'Access Role *'}
                  </label>
                  <select
                    id="user-role"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-blue-500 cursor-pointer font-sans"
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                  >
                    <option value="viewer">{isRtl ? 'مشاهد (عرض فقط)' : 'Viewer (Read-Only)'}</option>
                    <option value="staff">{isRtl ? 'موظف (تعديل / إضافة)' : 'Staff (Edit / Add)'}</option>
                    <option value="admin">{isRtl ? 'مدير (كامل الصلاحيات)' : 'Admin (All Modules)'}</option>
                  </select>
                </div>

                {/* Status */}
                <div>
                  <label className="block text-2xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5" htmlFor="user-status">
                    {isRtl ? 'الحالة الأمنية *' : 'Security Status *'}
                  </label>
                  <select
                    id="user-status"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-blue-500 cursor-pointer font-sans"
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as 'active' | 'suspended' })}
                  >
                    <option value="active">{isRtl ? 'نشط' : 'Active'}</option>
                    <option value="suspended">{isRtl ? 'موقوف' : 'Suspended'}</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsAddEditOpen(false)}
                  className="px-4 py-2 bg-slate-950 border border-slate-800 hover:border-slate-700 text-xs font-semibold rounded-xl text-slate-300 cursor-pointer transition-colors"
                >
                  {isRtl ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  id="user-save-btn"
                  type="submit"
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 font-bold rounded-xl text-xs text-white shadow-lg cursor-pointer transition-all"
                >
                  {selectedUser 
                    ? (isRtl ? 'حفظ التغييرات' : 'Save Changes') 
                    : (isRtl ? 'تأكيد وإنشاء' : 'Confirm & Create')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Confirm Delete */}
      {isDeleteOpen && selectedUser && (
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
              <h3 className="text-base font-bold text-slate-50 font-sans">De-authorize User?</h3>
            </div>

            <p className="text-xs text-slate-300 mb-6 leading-relaxed">
              Are you absolutely certain you want to delete user account <strong className="text-slate-50 font-mono">{selectedUser.username}</strong> ({selectedUser.name})? They will immediately lose access to all modules, logs, and database queries.
            </p>

            <div className="flex items-center justify-end gap-2.5">
              <button
                onClick={() => setIsDeleteOpen(false)}
                className="px-4 py-2 bg-slate-950 border border-slate-800 hover:border-slate-700 text-xs font-semibold rounded-xl text-slate-300 cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                id="confirm-user-delete-btn"
                onClick={handleConfirmDelete}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 rounded-xl text-xs font-bold text-white shadow-lg cursor-pointer transition-all"
              >
                Yes, Delete Account
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
