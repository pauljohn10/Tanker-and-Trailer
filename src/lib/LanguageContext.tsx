/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect } from 'react';

export type Language = 'en' | 'ar';

export interface TranslationDict {
  [key: string]: {
    en: string;
    ar: string;
  };
}

const dictionary: TranslationDict = {
  // Navigation & General
  'nav.dashboard': { en: 'Dashboard', ar: 'لوحة القيادة' },
  'nav.records': { en: 'Records Management', ar: 'إدارة السجلات' },
  'nav.users': { en: 'User Management', ar: 'إدارة المستخدمين' },
  'nav.reports': { en: 'Official Reports', ar: 'التقارير الرسمية' },
  'nav.settings': { en: 'Settings & Audit', ar: 'الإعدادات والتدقيق' },
  'nav.sqlEditor': { en: 'SQL Console / Editor', ar: 'موجّه استعلامات SQL' },
  'nav.logout': { en: 'Logout', ar: 'تسجيل الخروج' },
  'nav.adminBadge': { en: 'Admin', ar: 'مسؤول' },
  'nav.staffBadge': { en: 'Staff', ar: 'موظف' },
  'nav.viewerBadge': { en: 'Viewer', ar: 'مراقب' },

  // Theme Switcher & Language Switcher
  'theme.light': { en: 'Light Mode', ar: 'الوضع المضيء' },
  'theme.dark': { en: 'Dark Mode', ar: 'الوضع المظلم' },
  'lang.en': { en: 'English', ar: 'الإنجليزية' },
  'lang.ar': { en: 'العربية', ar: 'العربية' },

  // Login View
  'login.title': { en: 'Secure Terminal Gateway', ar: 'بوابة المحطة الآمنة' },
  'login.subtitle': { en: 'Enter credentials to access Al Noor fleet systems.', ar: 'أدخل بيانات الاعتماد للوصول إلى أنظمة أسطول النور.' },
  'login.username': { en: 'Username', ar: 'اسم المستخدم' },
  'login.password': { en: 'Password', ar: 'كلمة المرور' },
  'login.role': { en: 'User Role', ar: 'دور المستخدم' },
  'login.selectRole': { en: 'Select role for session', ar: 'حدد الدور للجلسة' },
  'login.roleAdmin': { en: 'Admin Clearance', ar: 'صلاحية مدير' },
  'login.roleStaff': { en: 'Staff Operator', ar: 'موظف تشغيل' },
  'login.roleViewer': { en: 'Viewer Auditor', ar: 'مراقب مدقق' },
  'login.signInBtn': { en: 'Sign In to Terminal', ar: 'تسجيل الدخول إلى المحطة' },
  'login.demoAccounts': { en: 'Demo Accounts Info', ar: 'معلومات الحسابات التجريبية' },
  'login.demoAdmin': { en: 'Full write/delete capabilities', ar: 'صلاحيات كاملة للكتابة/الحذف' },
  'login.demoStaff': { en: 'Full write/edit, no user deletion', ar: 'صلاحيات كتابة وتعديل كاملة، لا حذف للمستخدمين' },
  'login.demoViewer': { en: 'Read-only audit access', ar: 'وصول للقراءة فقط للتدقيق' },
  'login.error': { en: 'Invalid username, password, or role selection', ar: 'اسم المستخدم أو كلمة المرور أو الدور غير صالح' },

  // Dashboard
  'dash.welcome': { en: 'Welcome Back', ar: 'مرحباً بعودتك' },
  'dash.subtitle': { en: 'Overview metrics of Al Noor logistics fleet database and audit telemetry.', ar: 'مقاييس عامة لقاعدة بيانات أسطول لوجستيات النور والتدقيق عن بعد.' },
  'dash.statCapacity': { en: 'Total Fleet Capacity', ar: 'إجمالي سعة الأسطول' },
  'dash.statActive': { en: 'Active Operators', ar: 'المشغلون النشطون' },
  'dash.statIntegrity': { en: 'System Integrity', ar: 'سلامة النظام' },
  'dash.statSecure': { en: 'SECURE', ar: 'آمن' },
  'dash.fuelType': { en: 'Fuel Type Distribution', ar: 'توزيع أنواع الوقود' },
  'dash.liters': { en: 'Liters', ar: 'لتر' },
  'dash.regional': { en: 'Regional Fleet Distribution', ar: 'توزيع الأسطول الإقليمي' },
  'dash.tankers': { en: 'Tankers', ar: 'ناقلات' },
  'dash.recentLogs': { en: 'Recent System Activity Logs (Admin Only)', ar: 'سجلات نشاط النظام الأخيرة (للمشرف فقط)' },
  'dash.logsSubtitle': { en: 'Encrypted audit trails tracking database mutations, logins, and settings updates.', ar: 'مسارات تدقيق مشفرة تتبع تعديلات قاعدة البيانات وعمليات تسجيل الدخول وتحديثات الإعدادات.' },
  'dash.viewLogs': { en: 'View All Logs', ar: 'عرض جميع السجلات' },
  'dash.noLogs': { en: 'No logs available', ar: 'لا توجد سجلات متاحة' },

  // Records Management
  'rec.title': { en: 'Fleet Database Management', ar: 'إدارة قاعدة بيانات الأسطول' },
  'rec.subtitle': { en: 'Full ledger of registered Aramco transport tankers. Maintain real-time authorization plates and statuses.', ar: 'دفتر الأستاذ الكامل لناقلات نقل أرامكو المسجلة. الحفاظ على لوحات الترخيص والحالات في الوقت الفعلي.' },
  'rec.addBtn': { en: 'Add Transport Tanker', ar: 'إضافة ناقلة نقل' },
  'rec.search': { en: 'Search Serial, Aramco No, Plate...', ar: 'البحث بالرقم التسلسلي، رقم أرامكو، اللوحة...' },
  'rec.filterRegion': { en: 'Filter Region', ar: 'تصفية حسب المنطقة' },
  'rec.filterProduct': { en: 'Filter Product', ar: 'تصفية حسب المنتج' },
  'rec.filterStatus': { en: 'Filter Status', ar: 'تصفية حسب الحالة' },
  'rec.reset': { en: 'Reset Filters', ar: 'إعادة تعيين التصفية' },
  'rec.thSerial': { en: 'Serial', ar: 'الرقم التسلسلي' },
  'rec.thAramco': { en: 'Aramco Tanker No', ar: 'رقم ناقلة أرامكو' },
  'rec.thNoor': { en: 'Al Noor Tanker No', ar: 'رقم ناقلة النور' },
  'rec.thSpecs': { en: 'Specs', ar: 'المواصفات' },
  'rec.thCapacity': { en: 'Capacity', ar: 'السعة' },
  'rec.thProduct': { en: 'Product', ar: 'المنتج' },
  'rec.thPlate': { en: 'Authorized Plate', ar: 'اللوحة المرخصة' },
  'rec.thRegion': { en: 'Region', ar: 'المنطقة' },
  'rec.thStatus': { en: 'Status', ar: 'الحالة' },
  'rec.thActions': { en: 'Actions', ar: 'الإجراءات' },
  'rec.showing': { en: 'Showing', ar: 'عرض' },
  'rec.to': { en: 'to', ar: 'إلى' },
  'rec.of': { en: 'of', ar: 'من' },
  'rec.records': { en: 'records', ar: 'سجلات' },
  'rec.noRecords': { en: 'No registered tankers match the current filters.', ar: 'لا توجد ناقلات مسجلة تطابق عوامل التصفية الحالية.' },
  'rec.addSuccess': { en: 'Successfully created tanker record', ar: 'تم إنشاء سجل الناقلة بنجاح' },
  'rec.updateSuccess': { en: 'Successfully updated tanker record', ar: 'تم تحديث سجل الناقلة بنجاح' },
  'rec.deleteSuccess': { en: 'Successfully deleted tanker record', ar: 'تم حذف سجل الناقلة بنجاح' },
  'rec.deleteConfirm': { en: 'Are you sure you want to permanently delete tanker {id}?', ar: 'هل أنت متأكد أنك تريد حذف سجل الناقلة {id} نهائياً؟' },

  // Records Dialog Form
  'form.addTitle': { en: 'Add Aramco Transport Tanker', ar: 'إضافة ناقلة نقل أرامكو' },
  'form.editTitle': { en: 'Edit Aramco Transport Tanker', ar: 'تعديل ناقلة نقل أرامكو' },
  'form.basicInfo': { en: 'Basic Specifications', ar: 'المواصفات الأساسية' },
  'form.aramcoNo': { en: 'Aramco Tanker No (Unique Registration)', ar: 'رقم ناقلة أرامكو (تسجيل فريد)' },
  'form.noorNo': { en: 'Al Noor Tanker No (Local Index)', ar: 'رقم ناقلة النور (الفهرس المحلي)' },
  'form.specs': { en: 'Technical Specifications', ar: 'المواصفات الفنية' },
  'form.classification': { en: 'Material Classification', ar: 'تصنيف المواد' },
  'form.steel': { en: 'STEEL', ar: 'صلب (STEEL)' },
  'form.aluminum': { en: 'ALUMINUM', ar: 'ألومنيوم (ALUMINUM)' },
  'form.model': { en: 'Manufacturing Year / Model', ar: 'سنة التصنيع / الموديل' },
  'form.product': { en: 'Cargo Cargo / Product Type', ar: 'حمولة الشحنة / نوع المنتج' },
  'form.capacity': { en: 'Storage Capacity (Liters)', ar: 'السعة التخزينية (لتر)' },
  'form.logistics': { en: 'Logistical Alignment', ar: 'المواءمة اللوجستية' },
  'form.plate': { en: 'Authorized Plate (English & Arabic)', ar: 'اللوحة المرخصة (الإنجليزية والعربية)' },
  'form.region': { en: 'Assigned Regional Zone', ar: 'المنطقة الإقليمية المخصصة' },
  'form.status': { en: 'Current Operational Status', ar: 'الحالة التشغيلية الحالية' },
  'form.cancel': { en: 'Cancel', ar: 'إلغاء' },
  'form.save': { en: 'Save Record', ar: 'حفظ السجل' },
  'form.add': { en: 'Add Record', ar: 'إضافة السجل' },

  // User Management
  'user.title': { en: 'Active Enclaves & Operator Clearance', ar: 'الجيوب النشطة وتصاريح المشغلين' },
  'user.subtitle': { en: 'Maintain corporate operator directory, security access clearings, and account actions.', ar: 'إدارة دليل المشغلين، وتصاريح الوصول الأمني، وإجراءات الحسابات.' },
  'user.addBtn': { en: 'Add Authorized Personnel', ar: 'إضافة موظف مخول' },
  'user.rbacTitle': { en: 'Role-Based Permission Rules (RBAC)', ar: 'قواعد الأذونات المستندة إلى الأدوار' },
  'user.rbacText': { en: 'Admins hold full database mutations and settings privileges. Staff can write and edit records. Viewers hold read-only clearance.', ar: 'يتمتع المسؤولون بصلاحيات كاملة لتعديل قاعدة البيانات والإعدادات. يمكن للموظفين كتابة السجلات وتعديلها. يتمتع المراقبون بصلاحية القراءة فقط.' },
  'user.thName': { en: 'Name', ar: 'الاسم' },
  'user.thUsername': { en: 'Username', ar: 'اسم المستخدم' },
  'user.thEmail': { en: 'Corporate Email', ar: 'البريد الإلكتروني للشركة' },
  'user.thRole': { en: 'Role', ar: 'الدور' },
  'user.thStatus': { en: 'Status', ar: 'الحالة' },
  'user.thCreated': { en: 'Created At', ar: 'تاريخ الإنشاء' },
  'user.thActions': { en: 'Actions', ar: 'الإجراءات' },
  'user.active': { en: 'Active', ar: 'نشط' },
  'user.suspended': { en: 'Suspended', ar: 'موقوف' },
  'user.addSuccess': { en: 'Successfully created user account', ar: 'تم إنشاء حساب المستخدم بنجاح' },
  'user.updateSuccess': { en: 'Successfully updated user account', ar: 'تم تحديث حساب المستخدم بنجاح' },
  'user.deleteSuccess': { en: 'Successfully deleted user account', ar: 'تم حذف حساب المستخدم بنجاح' },
  'user.deleteConfirmTitle': { en: 'De-authorize User?', ar: 'إلغاء تفويض المستخدم؟' },
  'user.deleteConfirmText': { en: 'Are you absolutely certain you want to delete user account {id}? They will immediately lose access.', ar: 'هل أنت متأكد تماماً من رغبتك في حذف حساب المستخدم {id}؟ سيفقد إمكانية الوصول فوراً.' },

  // User Dialog Form
  'userForm.addTitle': { en: 'Add Authorized Personnel', ar: 'إضافة موظف مخول' },
  'userForm.editTitle': { en: 'Edit Personnel Clearance', ar: 'تعديل تصريح الموظف' },
  'userForm.fullName': { en: 'Full Name', ar: 'الاسم الكامل' },
  'userForm.username': { en: 'Access Username', ar: 'اسم مستخدم الوصول' },
  'userForm.email': { en: 'Corporate Email Address', ar: 'البريد الإلكتروني للشركة' },
  'userForm.password': { en: 'Account Access Password', ar: 'كلمة مرور الوصول للحساب' },
  'userForm.passwordPlaceholder': { en: 'Leave blank to keep current password', ar: 'اتركه فارغاً للاحتفاظ بكلمة المرور الحالية' },
  'userForm.clearanceRole': { en: 'Clearance Role', ar: 'دور التصريح' },
  'userForm.operationalStatus': { en: 'Operational Status', ar: 'الحالة التشغيلية' },
  'userForm.saveBtn': { en: 'Save Clearance', ar: 'حفظ التصريح' },

  // Official Reports
  'rep.title': { en: 'Reports & Fleet Audits', ar: 'التقارير وتدقيق الأسطول' },
  'rep.subtitle': { en: 'Official summary metrics of the Aramco Series report. Execute high-fidelity PDF outputs.', ar: 'المقاييس الملخصة الرسمية لتقرير سلسلة أرامكو. تنفيذ مخرجات PDF عالية الدقة.' },
  'rep.printBtn': { en: 'Print Official Report', ar: 'طباعة التقرير الرسمي' },
  'rep.generating': { en: 'Generating PDF...', ar: 'جاري إنشاء ملف PDF...' },
  'rep.exceptionsTitle': { en: '2. Special Standby / Exception Ledger', ar: '٢. دفتر الطوارئ الخاص / الاستثناءات' },
  'rep.exceptionsSubtitle': { en: 'Registered exceptions, standbys, workshop units, and Saif Custody licenses (matching PDF Page 2 anomalies list).', ar: 'الاستثناءات المسجلة، الاستعدادات، وحدات الورشة، وتراخيص "سيف كاستودي" (المطابقة لقائمة استثناءات الصفحة ٢ من تقرير PDF).' },
  'rep.addEntryBtn': { en: 'Add Entry', ar: 'إضافة إدخال' },
  'rep.colTanker': { en: 'Tanker No', ar: 'رقم الناقلة' },
  'rep.colCargo': { en: 'Cargo Spec', ar: 'مواصفات الحمولة' },
  'rep.colCapacity': { en: 'Capacity', ar: 'السعة' },
  'rep.colStatus': { en: 'Status Label', ar: 'ملصق الحالة' },
  'rep.metricsFuel': { en: 'Fuel Type Metrics Summary', ar: 'ملخص مقاييس أنواع الوقود' },
  'rep.metricsRegion': { en: 'Region Distribution Metrics', ar: 'مقاييس التوزيع الإقليمي' },
  'rep.metricsStatus': { en: 'Status Classification Metrics', ar: 'مقاييس تصنيفات الحالات' },
  'rep.dialogAddTitle': { en: 'Add Standby/Exception', ar: 'إضافة طوارئ/استثناء' },
  'rep.dialogEditTitle': { en: 'Edit Standby/Exception', ar: 'تعديل طوارئ/استثناء' },
  'rep.dialogTankerNo': { en: 'Tanker No', ar: 'رقم الناقلة' },
  'rep.dialogCargo': { en: 'Cargo Spec', ar: 'مواصفات الحمولة' },
  'rep.dialogCapacity': { en: 'Capacity (Liters)', ar: 'السعة (لتر)' },
  'rep.dialogStatus': { en: 'Status Label', ar: 'ملصق الحالة' },
  'rep.dialogCancel': { en: 'Cancel', ar: 'إلغاء' },
  'rep.dialogSave': { en: 'Save Changes', ar: 'حفظ التغييرات' },
  'rep.dialogAdd': { en: 'Add Entry', ar: 'إضافة الإدخال' },
  'rep.confirmDelete': { en: 'Are you sure you want to delete tanker entry {id}?', ar: 'هل أنت متأكد من رغبتك في حذف إدخال الناقلة {id}؟' },

  // Settings & Audit
  'set.title': { en: 'Enterprise Settings & Security Audits', ar: 'إعدادات المؤسسة وتدقيق الأمان' },
  'set.subtitle': { en: 'Adjust system-wide parameters, general configurations, and view the ledger logs.', ar: 'ضبط معلمات النظام، والتكوينات العامة، وعرض سجلات دفتر التدقيق.' },
  'set.cardParams': { en: 'System-wide Security Parameters', ar: 'معلمات الأمان الخاصة بالنظام' },
  'set.allowSharing': { en: 'Allow Public Certification Sharing', ar: 'السماح بمشاركة الشهادات العامة' },
  'set.allowSharingDesc': { en: 'When enabled, allows staff to generate secure direct public links for Aramco audits.', ar: 'عند التفعيل، يسمح للموظفين بإنشاء روابط عامة ومباشرة وآمنة لعمليات تدقيق أرامكو.' },
  'set.enableAudit': { en: 'Enable Multi-Enclave Audit Logs', ar: 'تفعيل سجلات التدقيق متعددة الجيوب' },
  'set.enableAuditDesc': { en: 'Force cryptographic signing and logging for all mutations and logins.', ar: 'فرض التوقيع والتسجيل لجميع التعديلات وعمليات تسجيل الدخول.' },
  'set.pagination': { en: 'Default Pagination Size', ar: 'حجم التنقل الافتراضي للصفحات' },
  'set.maintenance': { en: 'Maintenance Mode (Emergency Lockdown)', ar: 'وضع الصيانة (الإغلاق في حالات الطوارئ)' },
  'set.maintenanceDesc': { en: 'Locks database writes for all non-admin operators in case of leak detection.', ar: 'يقفل عمليات الكتابة في قاعدة البيانات لجميع المشغلين غير المسؤولين في حالة اكتشاف تسرب.' },
  'set.saveBtn': { en: 'Save Configurations', ar: 'حفظ التكوينات' },
  'set.saveSuccess': { en: 'Successfully updated system configurations', ar: 'تم تحديث تكوينات النظام بنجاح' },
  'set.cardTelemetry': { en: 'Audit Telemetry & System logs', ar: 'قياسات التدقيق عن بعد وسجلات النظام' },
  'set.telemetryDesc': { en: 'Immutable cryptographic security audit log ledger.', ar: 'دفتر سجلات تدقيق أمان مشفر وثابت.' },
  'set.thLogId': { en: 'Log ID', ar: 'معرف السجل' },
  'set.thActor': { en: 'Actor', ar: 'الفاعل' },
  'set.thAction': { en: 'Action', ar: 'الإجراء' },
  'set.thDetails': { en: 'Details', ar: 'التفاصيل' },
  'set.thTime': { en: 'Timestamp', ar: 'طابع زمني' },

  // Public Share
  'share.certTitle': { en: 'OFFICIAL TRANSPORTATION CERTIFICATE', ar: 'شهادة النقل الرسمية المعتمدة' },
  'share.certSubtitle': { en: 'Saudi Aramco Safety & Compliance Clearance', ar: 'موافقة السلامة والامتثال من شركة أرامكو السعودية' },
  'share.secEnclave': { en: 'SECURE ENCLAVE IDENTIFIER', ar: 'معرف الجيب الأمني المشفر' },
  'share.backBtn': { en: 'Back to Application Gateway', ar: 'العودة إلى بوابة التطبيق' },
  'share.printCert': { en: 'Print Certificate', ar: 'طباعة الشهادة' },
  'share.verified': { en: 'VERIFIED COMPLIANT', ar: 'تم التحقق من المطابقة والامتثال' },
  'share.issueDate': { en: 'Issue Date', ar: 'تاريخ الإصدار' },
  'share.expDate': { en: 'Expiry Date', ar: 'تاريخ الانتهاء' },
  'share.lblAramcoNo': { en: 'ARAMCO TANKER NO', ar: 'رقم ناقلة أرامكو' },
  'share.lblNoorNo': { en: 'AL NOOR TANKER NO', ar: 'رقم ناقلة النور' },
  'share.lblClass': { en: 'MATERIAL CLASSIFICATION', ar: 'تصنيف المواد الفني' },
  'share.lblModel': { en: 'VEHICLE MODEL / YEAR', ar: 'موديل المركبة / السنة' },
  'share.lblCapacity': { en: 'TOTAL CAPACITY', ar: 'السعة الإجمالية للناقلة' },
  'share.lblPlate': { en: 'AUTHORIZED VEHICLE PLATE', ar: 'لوحة المركبة المرخصة والمصرحة' },
  'share.lblRegion': { en: 'LOGISTICS ZONE REGION', ar: 'منطقة المنطقة اللوجستية المخصصة' },
  'share.lblStatus': { en: 'SYSTEM STATUS', ar: 'حالة النظام اللوجستية' },
  'share.footerNotice': { en: 'This document represents an authenticated cryptographic record of Al Noor United Transportation Est., matching official Saudi Aramco safety ledgers. Scan QR code or search serial for confirmation.', ar: 'تمثل هذه الوثيقة سجلاً رقمياً معتمداً وموثقاً لمؤسسة النور المتحدة للنقل، ومطابقاً لدفاتر السلامة الرسمية لشركة أرامكو السعودية. امسح رمز الاستجابة السريعة أو ابحث بالرقم التسلسلي للتأكيد.' },
};

export interface LanguageContextProps {
  language: Language;
  setLanguage: (lang: Language) => void;
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
  t: (key: string, replacements?: Record<string, string>) => string;
  isRtl: boolean;
}

const LanguageContext = createContext<LanguageContextProps | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    return (sessionStorage.getItem('al_noor_language') as Language) || 'en';
  });

  const [theme, setThemeState] = useState<'light' | 'dark'>(() => {
    return (sessionStorage.getItem('al_noor_theme') as 'light' | 'dark') || 'dark';
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    sessionStorage.setItem('al_noor_language', lang);
  };

  const setTheme = (newTheme: 'light' | 'dark') => {
    setThemeState(newTheme);
    sessionStorage.setItem('al_noor_theme', newTheme);
  };

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'light') {
      root.classList.add('light');
    } else {
      root.classList.remove('light');
    }
  }, [theme]);

  useEffect(() => {
    const root = document.documentElement;
    if (language === 'ar') {
      root.dir = 'rtl';
      root.lang = 'ar';
    } else {
      root.dir = 'ltr';
      root.lang = 'en';
    }
  }, [language]);

  const t = (key: string, replacements?: Record<string, string>): string => {
    const entry = dictionary[key];
    if (!entry) {
      return key;
    }
    let val = entry[language];
    if (replacements) {
      Object.entries(replacements).forEach(([k, v]) => {
        val = val.replace(`{${k}}`, v);
      });
    }
    return val;
  };

  const isRtl = language === 'ar';

  return (
    <LanguageContext.Provider value={{ language, setLanguage, theme, setTheme, t, isRtl }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useTranslation() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useTranslation must be used within a LanguageProvider');
  }
  return context;
}
