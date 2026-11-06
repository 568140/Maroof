import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShieldCheck, Users, Database, Eye, TrendingUp, DollarSign, Settings, Search, Trash2, 
  UserX, UserCheck, Plus, Upload, Check, ToggleLeft, ToggleRight, Sparkles, RefreshCw, AlertTriangle, ShieldAlert, Edit3, X,
  Download, FileSpreadsheet, Copy, ChevronLeft, ChevronRight
} from 'lucide-react';
import { User, Contact, Ad, SystemSettings, AnalyticsStats } from '../types';

interface AdminDashboardProps {
  adminToken: string;
  settings: SystemSettings;
  onUpdateSettings: (newSettings: SystemSettings) => Promise<void>;
  showToast: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
}

export default function AdminDashboard({
  adminToken,
  settings,
  onUpdateSettings,
  showToast,
}: AdminDashboardProps) {
  const [stats, setStats] = useState<AnalyticsStats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [ads, setAds] = useState<Ad[]>([]);
  
  // Dashboard states
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'database' | 'ads' | 'security' | 'parameters'>('overview');
  
  // Selective Reset modal states
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [resetTarget, setResetTarget] = useState<'all' | 'earnings' | 'searches'>('earnings');
  const [resetting, setResetting] = useState(false);
  
  // Database sub-states
  const [dbSearch, setDbSearch] = useState('');
  const [dbPage, setDbPage] = useState(1);
  const [dbPageSize, setDbPageSize] = useState<number>(25);
  const [dbLoading, setDbLoading] = useState(false);
  const [copiedContactPhone, setCopiedContactPhone] = useState<string | null>(null);
  const [newContactPhone, setNewContactPhone] = useState('');
  const [newContactName, setNewContactName] = useState('');
  const [bulkCsvText, setBulkCsvText] = useState('');

  // Contact edit states
  const [editingContactId, setEditingContactId] = useState<string | null>(null);
  const [editingPhone, setEditingPhone] = useState('');
  const [editingName, setEditingName] = useState('');
  const [editingFrequency, setEditingFrequency] = useState(1);

  // Ads sub-states
  const [newAdTitle, setNewAdTitle] = useState('');
  const [newAdType, setNewAdType] = useState<'rewarded' | 'banner' | 'interstitial' | 'custom'>('custom');
  const [newAdSource, setNewAdSource] = useState<'admob' | 'private'>('private');
  const [newAdMediaUrl, setNewAdMediaUrl] = useState('');
  const [newAdLinkUrl, setNewAdLinkUrl] = useState('');
  const [newAdDuration, setNewAdDuration] = useState(15);
  const [newAdReward, setNewAdReward] = useState(10);

  // System parameters sub-states
  const [localSettings, setLocalSettings] = useState<SystemSettings>(settings || {
    dailySearchBalance: 3,
    resultsLimit: 15,
    pointsPerAd: 10,
    advancedSearchCost: 30,
    videoDuration: 15,
    advancedSearchEnabled: true,
    admobEnabled: true,
    admobRewarded: true,
    admobBanner: true,
    admobInterstitial: true,
    privateAdsEnabled: true,
    maxAccountsPerDevice: 5,
    multiAccountDetection: true,
    logActivity: true,
    adminPhone: '774919194'
  });

  useEffect(() => {
    if (settings) {
      setLocalSettings(settings);
    }
  }, [settings]);

  const fetchAdminData = async () => {
    if (!adminToken) return;
    setLoading(true);
    try {
      const headers = { 'x-admin-token': adminToken };

      const [statsRes, usersRes, contactsRes, adsRes] = await Promise.all([
        fetch('/api/admin/stats', { headers }).then(r => r.json()),
        fetch('/api/admin/users', { headers }).then(r => r.json()),
        fetch('/api/admin/contacts', { headers }).then(r => r.json()),
        fetch('/api/ads').then(r => r.json()), // ads can be public
      ]);

      if (statsRes && statsRes.error) {
        showToast(statsRes.error, 'error');
        return;
      }
      if (usersRes && usersRes.error) {
        showToast(usersRes.error, 'error');
        return;
      }
      if (contactsRes && contactsRes.error) {
        showToast(contactsRes.error, 'error');
        return;
      }
      if (adsRes && adsRes.error) {
        showToast(adsRes.error, 'error');
        return;
      }

      setStats(statsRes);
      setUsers(Array.isArray(usersRes) ? usersRes : []);
      setContacts(Array.isArray(contactsRes) ? contactsRes : []);
      setAds(Array.isArray(adsRes) ? adsRes : []);
    } catch (err) {
      showToast('خطأ أثناء تحميل بيانات لوحة التحكم.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (adminToken) {
      fetchAdminData();
    }
  }, [activeTab, adminToken]);

  // Open Selective Reset Modal
  const handleOpenResetModal = () => {
    setResetModalOpen(true);
  };

  // Execute Selective Reset in Firestore
  const handleExecuteReset = async () => {
    try {
      setResetting(true);
      const res = await fetch('/api/admin/reset-stats', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-token': adminToken
        },
        body: JSON.stringify({ target: resetTarget })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'فشل تصفير البيانات.');
      }

      showToast(data.message, 'success');
      setResetModalOpen(false);
      await fetchAdminData();
      window.dispatchEvent(new CustomEvent('maarouf:metrics-updated'));
    } catch (err: any) {
      showToast(err.message || 'حدث خطأ أثناء تصفير البيانات.', 'error');
    } finally {
      setResetting(false);
    }
  };

  // Handle User Toggle Status
  const handleToggleUser = async (userId: string) => {
    try {
      const res = await fetch('/api/admin/users/toggle-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-token': adminToken },
        body: JSON.stringify({ userId })
      }).then(r => r.json());

      if (res.error) {
        showToast(res.error, 'error');
        return;
      }

      showToast(res.message, 'success');
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, isActive: !u.isActive } : u));
    } catch (err) {
      showToast('فشل تغيير حالة المستخدم.', 'error');
    }
  };

  // Handle Grant Points manually
  const handleGrantPoints = async (userId: string, amount: number) => {
    try {
      const res = await fetch('/api/admin/users/grant-points', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-token': adminToken },
        body: JSON.stringify({ userId, amount })
      }).then(r => r.json());

      if (res.error) {
        showToast(res.error, 'error');
        return;
      }

      showToast(res.message, 'success');
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, points: u.points + amount } : u));
    } catch (err) {
      showToast('فشل منح النقاط.', 'error');
    }
  };

  // Handle Delete User
  const handleDeleteUser = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف حساب هذا المستخدم نهائياً؟')) return;
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: 'DELETE',
        headers: { 'x-admin-token': adminToken }
      }).then(r => r.json());

      if (res.error) {
        showToast(res.error, 'error');
        return;
      }

      showToast(res.message, 'success');
      setUsers(prev => prev.filter(u => u.id !== id));
    } catch (err) {
      showToast('فشل حذف حساب المستخدم.', 'error');
    }
  };

  // Database CRUD: Add contact
  const handleAddContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContactPhone || !newContactName) {
      showToast('يرجى ملء جميع حقول الرقم والاسم.', 'warning');
      return;
    }
    try {
      const res = await fetch('/api/admin/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-token': adminToken },
        body: JSON.stringify({ phoneNumber: newContactPhone, contactName: newContactName })
      }).then(r => r.json());

      if (res.error) {
        showToast(res.error, 'error');
        return;
      }

      showToast(res.message, 'success');
      setContacts(prev => [res.contact, ...prev]);
      setNewContactPhone('');
      setNewContactName('');
    } catch (err) {
      showToast('فشل إضافة الاسم يدوياً.', 'error');
    }
  };

  // Database CRUD: Delete Caller ID record
  const handleDeleteContact = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذه الهوية من قاعدة البيانات العامة؟')) return;
    try {
      const res = await fetch(`/api/admin/contacts/${id}`, {
        method: 'DELETE',
        headers: { 'x-admin-token': adminToken }
      }).then(r => r.json());

      if (res.error) {
        showToast(res.error, 'error');
        return;
      }

      showToast(res.message, 'success');
      setContacts(prev => prev.filter(c => c.id !== id));
    } catch (err) {
      showToast('فشل حذف سجل قاعدة البيانات.', 'error');
    }
  };

  const handleEditContactClick = (c: Contact) => {
    setEditingContactId(c.id);
    setEditingPhone(c.phoneNumber);
    setEditingName(c.contactName);
    setEditingFrequency(c.frequency || 1);
  };

  const handleEditContactSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingContactId || !editingPhone || !editingName) {
      showToast('يرجى ملء جميع حقول الرقم والاسم.', 'warning');
      return;
    }
    try {
      const res = await fetch('/api/admin/contacts/edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-token': adminToken },
        body: JSON.stringify({ 
          id: editingContactId, 
          phoneNumber: editingPhone.trim().replace(/\s+/g, ''), 
          contactName: editingName.trim(),
          frequency: editingFrequency
        })
      }).then(r => r.json());

      if (res.error) {
        showToast(res.error, 'error');
        return;
      }

      showToast(res.message, 'success');
      setContacts(prev => prev.map(c => c.id === editingContactId ? { 
        ...c, 
        phoneNumber: editingPhone.trim().replace(/\s+/g, ''), 
        contactName: editingName.trim(),
        frequency: editingFrequency
      } : c));
      setEditingContactId(null);
    } catch (err) {
      showToast('فشل تعديل بيانات الرقم.', 'error');
    }
  };

  // Database CRUD: Bulk CSV Upload
  const handleBulkImport = async () => {
    if (!bulkCsvText.trim()) {
      showToast('يرجى لصق بيانات CSV صالحة.', 'warning');
      return;
    }
    const lines = bulkCsvText.trim().split('\n');
    const parsed: { phoneNumber: string; contactName: string }[] = [];

    lines.forEach(line => {
      const parts = line.split(',');
      if (parts.length >= 2) {
        parsed.push({
          phoneNumber: parts[0].trim(),
          contactName: parts[1].trim()
        });
      }
    });

    if (parsed.length === 0) {
      showToast('تنسيق ملف CSV غير صالح. يجب أن يكون: الرقم,الاسم', 'error');
      return;
    }

    try {
      const res = await fetch('/api/admin/contacts/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-token': adminToken },
        body: JSON.stringify({ contacts: parsed })
      }).then(r => r.json());

      if (res.error) {
        showToast(res.error, 'error');
        return;
      }

      showToast(res.message, 'success');
      setBulkCsvText('');
      fetchAdminData();
    } catch (err) {
      showToast('فشل الاستيراد الجماعي للبيانات.', 'error');
    }
  };

  // Database Full Fetch: Dedicated handler to reload real complete database from Firestore
  const fetchFullDatabase = async () => {
    if (!adminToken) return;
    setDbLoading(true);
    try {
      const res = await fetch('/api/admin/contacts', {
        headers: { 'x-admin-token': adminToken }
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        setContacts(data);
        setDbPage(1);
        showToast(`تم جلب قاعدة البيانات الحقيقية بالكامل (${data.length} جهة اتصال مسجلة)`, 'success');
      } else if (data && data.error) {
        showToast(data.error, 'error');
      }
    } catch (err) {
      showToast('خطأ أثناء جلب قاعدة البيانات الحقيقية.', 'error');
    } finally {
      setDbLoading(false);
    }
  };

  // Database Export: CSV with UTF-8 BOM for perfect Excel Arabic display
  const handleExportCSV = () => {
    if (!contacts || contacts.length === 0) {
      showToast('لا توجد بيانات متاحة للتصدير حالياً.', 'warning');
      return;
    }
    try {
      const headers = ['المعرف', 'رقم الهاتف', 'الاسم المعتمد', 'عدد مرات التكرار/الثقة', 'أضيف بواسطة', 'تاريخ الإضافة'];
      const rows = contacts.map(c => [
        `"${(c.id || '').replace(/"/g, '""')}"`,
        `"${(c.phoneNumber || '').replace(/"/g, '""')}"`,
        `"${(c.contactName || '').replace(/"/g, '""')}"`,
        `"${c.frequency || 1}"`,
        `"${(c.addedByUser || '').replace(/"/g, '""')}"`,
        `"${(c.createdAt || '').replace(/"/g, '""')}"`
      ]);

      const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const dateStr = new Date().toISOString().split('T')[0];
      link.setAttribute('href', url);
      link.setAttribute('download', `maarouf_database_contacts_${dateStr}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      showToast(`تم تصدير قاعدة البيانات بنجاح (${contacts.length} جهة اتصال) بصيغة CSV`, 'success');
    } catch (err) {
      showToast('حدث خطأ أثناء تصدير ملف CSV.', 'error');
    }
  };

  // Database Export: JSON
  const handleExportJSON = () => {
    if (!contacts || contacts.length === 0) {
      showToast('لا توجد بيانات متاحة للتصدير حالياً.', 'warning');
      return;
    }
    try {
      const exportData = {
        exportedAt: new Date().toISOString(),
        totalRecords: contacts.length,
        contacts: contacts
      };
      const jsonContent = JSON.stringify(exportData, null, 2);
      const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const dateStr = new Date().toISOString().split('T')[0];
      link.setAttribute('href', url);
      link.setAttribute('download', `maarouf_database_contacts_${dateStr}.json`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      showToast(`تم تصدير قاعدة البيانات كملف JSON (${contacts.length} جهة اتصال)`, 'success');
    } catch (err) {
      showToast('حدث خطأ أثناء تصدير ملف JSON.', 'error');
    }
  };

  // Copy phone helper
  const handleCopyContactPhone = (phone: string) => {
    navigator.clipboard.writeText(phone);
    setCopiedContactPhone(phone);
    setTimeout(() => setCopiedContactPhone(null), 2000);
    showToast(`تم نسخ الرقم ${phone}`, 'info');
  };

  // Ads CRUD: Create Ad
  const handleCreateAd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdTitle) {
      showToast('يرجى كتابة عنوان الإعلان.', 'warning');
      return;
    }
    try {
      const res = await fetch('/api/admin/ads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-token': adminToken },
        body: JSON.stringify({
          title: newAdTitle,
          type: newAdType,
          source: newAdSource,
          mediaUrl: newAdMediaUrl,
          linkUrl: newAdLinkUrl,
          duration: newAdDuration,
          reward: newAdReward
        })
      }).then(r => r.json());

      if (res.error) {
        showToast(res.error, 'error');
        return;
      }

      showToast(res.message, 'success');
      setAds(prev => [res.ad, ...prev]);
      setNewAdTitle('');
      setNewAdMediaUrl('');
      setNewAdLinkUrl('');
    } catch (err) {
      showToast('فشل إنشاء الإعلان.', 'error');
    }
  };

  // Ads CRUD: Toggle Active status
  const handleToggleAd = async (adId: string) => {
    try {
      const res = await fetch('/api/admin/ads/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-token': adminToken },
        body: JSON.stringify({ adId })
      }).then(r => r.json());

      if (res.error) {
        showToast(res.error, 'error');
        return;
      }

      showToast(res.message, 'success');
      setAds(prev => prev.map(a => a.id === adId ? { ...a, status: !a.status } : a));
    } catch (err) {
      showToast('فشل تغيير حالة تفعيل الإعلان.', 'error');
    }
  };

  // Ads CRUD: Delete Ad
  const handleDeleteAd = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف الإعلان نهائياً؟')) return;
    try {
      const res = await fetch(`/api/admin/ads/${id}`, {
        method: 'DELETE',
        headers: { 'x-admin-token': adminToken }
      }).then(r => r.json());

      if (res.error) {
        showToast(res.error, 'error');
        return;
      }

      showToast(res.message, 'success');
      setAds(prev => prev.filter(a => a.id !== id));
    } catch (err) {
      showToast('فشل حذف الإعلان.', 'error');
    }
  };

  // System Parameters: Save settings to server without code restarts
  const handleSaveSettings = async () => {
    try {
      await onUpdateSettings(localSettings);
      showToast('تم حفظ الإعدادات الفاخرة المحدثة بنجاح!', 'success');
    } catch (err) {
      showToast('خطأ أثناء مزامنة إعدادات المدير مع السيرفر.', 'error');
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 text-right" dir="rtl">
      {/* Title */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-[#c5a059]/20">
        <div>
          <h2 className="text-white text-xl md:text-2xl font-black flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-[#e5c158]" />
            <span>لوحة تحكم إدارة "معروف"</span>
          </h2>
          <p className="text-gray-400 text-xs mt-1">التحكم الفوري بالإعلانات والأرباح والحماية من لوحة واحدة دون تجميد البرمجة</p>
        </div>

        <button 
          onClick={fetchAdminData}
          className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white text-xs font-bold rounded-lg transition-all border border-white/5 flex items-center gap-1.5"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>تحديث البيانات</span>
        </button>
      </div>

      {/* Admin Tab Buttons */}
      <div className="flex flex-wrap gap-1.5 p-1 bg-black/40 rounded-xl border border-white/5">
        {[
          { key: 'overview', label: 'الإحصائيات' },
          { key: 'users', label: 'المستخدمون' },
          { key: 'database', label: 'قاعدة البيانات' },
          { key: 'ads', label: 'الإعلانات والتحكم' },
          { key: 'security', label: 'الحماية والاحتيال' },
          { key: 'parameters', label: 'إعدادات النظام' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => {
              setActiveTab(tab.key as any);
              if (tab.key === 'database') {
                fetchFullDatabase();
              }
            }}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === tab.key ? 'bg-gradient-to-r from-[#e5c158] to-[#c5a059] text-black shadow-md' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* RENDER ACTIVE TAB */}
      {loading ? (
        <div className="text-center py-20 text-gray-400 text-sm">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-[#e5c158]" />
          <span>جاري جلب السجلات والبيانات الحية...</span>
        </div>
      ) : (
        <div className="space-y-6">
          
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && stats && (
            <div className="space-y-6">
              {/* Metric Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-[#0c122b]/60 border border-[#c5a059]/10 rounded-xl p-4 space-y-1.5">
                  <span className="text-gray-500 text-[10px] font-bold uppercase block">إجمالي المستخدمين</span>
                  <div className="text-white text-xl md:text-2xl font-black font-mono">{stats.totalUsers}</div>
                  <div className="text-green-400 text-[10px] font-bold">مستخدمون حقيقيون بالهاتف</div>
                </div>

                <div className="bg-[#0c122b]/60 border border-[#c5a059]/10 rounded-xl p-4 space-y-1.5">
                  <span className="text-gray-500 text-[10px] font-bold uppercase block">عمليات البحث الناجحة</span>
                  <div className="text-white text-xl md:text-2xl font-black font-mono">{stats.totalSearches}</div>
                  <div className="text-green-400 text-[10px] font-bold">عمليات بحث فعلية ومسجلة</div>
                </div>

                <div className="bg-[#0c122b]/60 border border-[#c5a059]/10 rounded-xl p-4 space-y-1.5">
                  <span className="text-gray-500 text-[10px] font-bold uppercase block">سجلات الهواتف</span>
                  <div className="text-white text-xl md:text-2xl font-black font-mono">{stats.totalContacts}</div>
                  <div className="text-[#e5c158] text-[10px] font-bold">دليل أسماء متزامن وحقيقي</div>
                </div>

                <div className="bg-[#0c122b]/60 border border-[#c5a059]/10 rounded-xl p-4 space-y-1.5">
                  <span className="text-gray-500 text-[10px] font-bold uppercase block">أرباح الإعلانات المحتسبة</span>
                  <div className="text-[#e5c158] text-xl md:text-2xl font-black font-mono">${stats.totalEarnings}</div>
                  <div className="text-gray-400 text-[10px] font-bold">احتساب تلقائي دقيق للأرباح</div>
                </div>
              </div>

              {/* Reset stats banner */}
              <div className="bg-[#10080a]/60 border border-red-500/10 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-right">
                  <h4 className="text-red-400 text-xs font-bold flex items-center gap-1.5 justify-end">
                    <span>إعادة ضبط البيانات التراكمية</span>
                    <AlertTriangle className="w-4 h-4 text-red-400" />
                  </h4>
                  <p className="text-[10px] text-gray-400 mt-1">تتيح لك هذه الميزة تصفير جميع إحصائيات الإعلانات (المشاهدات والنقرات) وسجلات نشاط البحث لتظهر الأرباح والإحصائيات الحقيقية بنسبة 100%.</p>
                </div>
                <button
                  onClick={handleOpenResetModal}
                  className="px-4 py-2 bg-red-950/40 hover:bg-red-900/40 text-red-400 border border-red-950/60 text-xs font-bold rounded-lg transition-all whitespace-nowrap active:scale-95 flex items-center gap-1.5"
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>تصفير إحصائيات الأرباح والبحث</span>
                </button>
              </div>

              {/* Custom SVG Analytics Chart */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 bg-gradient-to-br from-[#0c122b]/80 to-[#070b1a] border border-white/5 rounded-2xl p-5 space-y-4">
                  <h3 className="text-white text-sm font-bold">نشاط البحث الفعلي التراكمي</h3>
                  
                  {/* Dynamic chart using responsive pure SVG */}
                  {(() => {
                    const totalSearches = stats.totalSearches || 0;
                    const h1 = totalSearches > 0 ? Math.max(30, 140 - Math.min(100, totalSearches * 0.5)) : 140;
                    const h2 = totalSearches > 0 ? Math.max(20, 140 - Math.min(110, totalSearches * 1.2)) : 140;
                    const h3 = totalSearches > 0 ? Math.max(10, 140 - Math.min(130, totalSearches * 2.0)) : 140;
                    
                    return (
                      <div className="h-56 w-full bg-black/30 rounded-xl border border-white/5 flex items-end p-4 relative">
                        <div className="absolute top-4 left-4 text-[10px] text-gray-500 font-mono">العدد الإجمالي: {totalSearches} عملية بحث</div>
                        <svg viewBox="0 0 500 150" className="w-full h-40 text-yellow-500">
                          <defs>
                            <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#e5c158" stopOpacity="0.3"/>
                              <stop offset="100%" stopColor="#e5c158" stopOpacity="0.0"/>
                            </linearGradient>
                          </defs>
                          {/* Grid lines */}
                          <line x1="0" y1="30" x2="500" y2="30" stroke="#ffffff" strokeOpacity="0.05" strokeWidth="1" strokeDasharray="4"/>
                          <line x1="0" y1="75" x2="500" y2="75" stroke="#ffffff" strokeOpacity="0.05" strokeWidth="1" strokeDasharray="4"/>
                          <line x1="0" y1="120" x2="500" y2="120" stroke="#ffffff" strokeOpacity="0.05" strokeWidth="1" strokeDasharray="4"/>
                          
                          {/* Dynamic Smooth Area Path */}
                          <path
                            d={`M 10 140 Q 80 ${(140 + h1)/2} 150 ${h1} T 300 ${h2} T 490 ${h3} L 490 140 Z`}
                            fill="url(#chartGrad)"
                          />
                          {/* Dynamic Path Line */}
                          <path
                            d={`M 10 140 Q 80 ${(140 + h1)/2} 150 ${h1} T 300 ${h2} T 490 ${h3}`}
                            fill="none"
                            stroke="#e5c158"
                            strokeWidth="3.5"
                          />
                          {/* Dynamic Chart Dots */}
                          {totalSearches > 0 && (
                            <>
                              <circle cx="150" cy={h1} r="4.5" fill="#e5c158" stroke="#000" strokeWidth="1.5"/>
                              <circle cx="300" cy={h2} r="4.5" fill="#e5c158" stroke="#000" strokeWidth="1.5"/>
                              <circle cx="490" cy={h3} r="4.5" fill="#e5c158" stroke="#000" strokeWidth="1.5"/>
                            </>
                          )}
                        </svg>
                        
                        <div className="absolute bottom-1 w-full flex justify-between px-2 text-[9px] text-gray-500 font-mono">
                          <span>السبت</span>
                          <span>الأحد</span>
                          <span>الاثنين</span>
                          <span>الثلاثاء</span>
                          <span>الأربعاء</span>
                          <span>الخميس</span>
                          <span>الجمعة</span>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* Top Searched list */}
                <div className="bg-gradient-to-br from-[#0c122b]/80 to-[#070b1a] border border-white/5 rounded-2xl p-5 space-y-3">
                  <h3 className="text-white text-sm font-bold flex items-center justify-between">
                    <span className="text-[10px] text-gray-500">العدد</span>
                    <span>الأكثر بحثاً حالياً</span>
                  </h3>

                  <div className="divide-y divide-white/5 font-mono">
                    {(stats.topSearchedNumbers || []).map((entry, idx) => (
                      <div key={idx} className="py-2.5 flex items-center justify-between text-xs">
                        <span className="text-[#e5c158] font-bold font-sans">{entry.count} مرة</span>
                        <span className="text-gray-300 font-bold">{entry.number}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: USER DIRECTORY */}
          {activeTab === 'users' && (
            <div className="bg-[#0c122b]/80 border border-white/5 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-white/5">
                <span className="text-gray-400 text-xs">{users.length} مستخدم مسجل</span>
                <h3 className="text-white text-sm font-bold">دليل حسابات المستخدمين</h3>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead>
                    <tr className="text-gray-500 border-b border-white/5">
                      <th className="pb-2">رقم الهاتف</th>
                      <th className="pb-2">معرف الجهاز / الموديل</th>
                      <th className="pb-2 text-center">النقاط</th>
                      <th className="pb-2 text-center">رصيد اليوم</th>
                      <th className="pb-2 text-center">الحالة</th>
                      <th className="pb-2 text-left">العمليات الإدارية</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {users.map((user) => (
                      <tr key={user.id} className="hover:bg-white/5">
                        <td className="py-3 font-bold font-mono text-white">{user.phone}</td>
                        <td className="py-3 text-gray-400 font-mono text-[10px]">
                          <div>{user.deviceType || 'غير معروف'}</div>
                          <div className="text-gray-600 text-[9px]">{(user.deviceId || '').substring(0, 15)}...</div>
                        </td>
                        <td className="py-3 text-center text-[#e5c158] font-bold font-mono">{user.points}</td>
                        <td className="py-3 text-center font-mono">{user.searchBalance}</td>
                        <td className="py-3 text-center">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${user.isActive ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                            {user.isActive ? 'نشط' : 'معطل'}
                          </span>
                        </td>
                        <td className="py-3 text-left">
                          <div className="inline-flex gap-1.5" dir="ltr">
                            <button
                              onClick={() => handleToggleUser(user.id)}
                              className={`p-1 rounded ${user.isActive ? 'text-yellow-400 bg-yellow-500/10 hover:bg-yellow-500/20' : 'text-green-400 bg-green-500/10 hover:bg-green-500/20'}`}
                              title={user.isActive ? "تعطيل الحساب" : "تفعيل الحساب"}
                            >
                              {user.isActive ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                            </button>
                            <button
                              onClick={() => handleGrantPoints(user.id, 50)}
                              className="px-2 py-1 text-[9px] font-bold bg-[#c5a059]/10 text-[#e5c158] border border-[#c5a059]/20 hover:bg-[#c5a059]/20 rounded"
                            >
                              +50نقطة
                            </button>
                            <button
                              onClick={() => handleDeleteUser(user.id)}
                              className="p-1 text-red-400 bg-red-500/10 hover:bg-red-500/20 rounded"
                              title="حذف نهائي"
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
            </div>
          )}

          {/* TAB 3: DATABASE CRUD MANAGER */}
          {activeTab === 'database' && (() => {
            const filteredContacts = (contacts || []).filter(c => {
              if (!dbSearch.trim()) return true;
              const q = dbSearch.trim().toLowerCase();
              return (c.phoneNumber && c.phoneNumber.toLowerCase().includes(q)) || 
                     (c.contactName && c.contactName.toLowerCase().includes(q)) ||
                     (c.addedByUser && c.addedByUser.toLowerCase().includes(q));
            });

            const totalFiltered = filteredContacts.length;
            const pageSizeNum = dbPageSize === -1 ? (totalFiltered || 1) : dbPageSize;
            const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSizeNum));
            const currentPage = Math.min(dbPage, totalPages);
            const startIndex = (currentPage - 1) * pageSizeNum;
            const paginatedContacts = dbPageSize === -1 ? filteredContacts : filteredContacts.slice(startIndex, startIndex + pageSizeNum);

            return (
              <div className="space-y-6">
                
                {/* Database Top Bar: Actions & Live Counts */}
                <div className="bg-[#0c122b]/90 border border-[#c5a059]/20 rounded-2xl p-4 md:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Database className="w-5 h-5 text-[#e5c158]" />
                      <h3 className="text-white text-base md:text-lg font-bold">قاعدة بيانات الهويات والأرقام الحقيقية</h3>
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-[#e5c158]/10 text-[#e5c158] border border-[#e5c158]/30">
                        {contacts.length.toLocaleString('ar-EG')} جهة اتصال
                      </span>
                    </div>
                    <p className="text-gray-400 text-xs">
                      مزامنة مباشرة مع Firestore. تصفح كامل الأرقام، البحث اللحظي، والتصدير بضغطة زر.
                    </p>
                  </div>

                  {/* Actions: Refresh & Export CSV / JSON */}
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={fetchFullDatabase}
                      disabled={dbLoading}
                      className="px-3.5 py-2 bg-white/5 hover:bg-white/10 text-white text-xs font-bold rounded-lg border border-white/10 flex items-center gap-1.5 transition-all disabled:opacity-50"
                      title="إعادة جلب قاعدة البيانات من الخادم"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 text-[#e5c158] ${dbLoading ? 'animate-spin' : ''}`} />
                      <span>{dbLoading ? 'جاري الجلب...' : 'تحديث القاعدة بالكامل'}</span>
                    </button>

                    <button
                      onClick={handleExportCSV}
                      disabled={!contacts.length}
                      className="px-3.5 py-2 bg-gradient-to-r from-emerald-600 to-green-600 hover:brightness-110 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-md transition-all disabled:opacity-50"
                      title="تصدير كجدول إكسل متوافق مع اللغة العربية"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5" />
                      <span>تصدير CSV (Excel)</span>
                    </button>

                    <button
                      onClick={handleExportJSON}
                      disabled={!contacts.length}
                      className="px-3.5 py-2 bg-[#1a233b] hover:bg-[#232f4e] text-white text-xs font-bold rounded-lg border border-white/10 flex items-center gap-1.5 transition-all disabled:opacity-50"
                      title="تصدير كملف JSON لنسخ احتياطي برمجي"
                    >
                      <Download className="w-3.5 h-3.5 text-[#e5c158]" />
                      <span>تصدير JSON</span>
                    </button>
                  </div>
                </div>

                {/* Sub-tools Grid: Manual Entry & Bulk CSV Import */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Manual Caller ID / Edit */}
                  <div className="bg-[#0c122b]/70 border border-white/5 rounded-2xl p-4 space-y-3">
                    {editingContactId ? (
                      <>
                        <div className="flex justify-between items-center pb-2 border-b border-white/10">
                          <button onClick={() => setEditingContactId(null)} className="text-xs text-red-400 hover:underline">
                            إلغاء التعديل
                          </button>
                          <h4 className="text-white text-xs font-bold flex items-center gap-1.5">
                            <span>تعديل هوية الرقم</span>
                            <Edit3 className="w-3.5 h-3.5 text-[#e5c158]" />
                          </h4>
                        </div>
                        <form onSubmit={handleEditContactSave} className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          <input
                            type="text"
                            value={editingPhone}
                            onChange={(e) => setEditingPhone(e.target.value.replace(/[^\d]/g, '').substring(0, 9))}
                            placeholder="771234567"
                            className="p-2 text-xs bg-black/40 border border-[#c5a059]/30 rounded-lg text-white font-mono"
                          />
                          <input
                            type="text"
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            placeholder="الاسم المعتمد"
                            className="p-2 text-xs bg-black/40 border border-[#c5a059]/30 rounded-lg text-white"
                          />
                          <button
                            type="submit"
                            className="py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold text-xs rounded-lg hover:brightness-110 transition-all"
                          >
                            حفظ التعديل
                          </button>
                        </form>
                      </>
                    ) : (
                      <>
                        <h4 className="text-white text-xs font-bold flex items-center gap-1.5">
                          <Plus className="w-3.5 h-3.5 text-[#e5c158]" />
                          <span>تسجيل هوية رقم جديدة يدوياً</span>
                        </h4>
                        <form onSubmit={handleAddContact} className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          <input
                            type="text"
                            value={newContactPhone}
                            onChange={(e) => setNewContactPhone(e.target.value.replace(/[^\d]/g, '').substring(0, 9))}
                            placeholder="الرقم (مثال 771234567)"
                            className="p-2 text-xs bg-black/40 border border-white/10 rounded-lg text-white font-mono"
                          />
                          <input
                            type="text"
                            value={newContactName}
                            onChange={(e) => setNewContactName(e.target.value)}
                            placeholder="الاسم المعتمد للهوية"
                            className="p-2 text-xs bg-black/40 border border-white/10 rounded-lg text-white"
                          />
                          <button
                            type="submit"
                            className="py-2 bg-gradient-to-r from-[#e5c158] to-[#c5a059] text-black font-bold text-xs rounded-lg hover:brightness-110 transition-all"
                          >
                            إضافة إلى القاعدة
                          </button>
                        </form>
                      </>
                    )}
                  </div>

                  {/* Bulk CSV Upload */}
                  <div className="bg-[#0c122b]/70 border border-white/5 rounded-2xl p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-white text-xs font-bold flex items-center gap-1.5">
                        <Upload className="w-3.5 h-3.5 text-[#e5c158]" />
                        <span>استيراد جماعي فوري (CSV)</span>
                      </h4>
                      <span className="text-[10px] text-gray-500">التنسيق: الرقم,الاسم</span>
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={bulkCsvText}
                        onChange={(e) => setBulkCsvText(e.target.value)}
                        placeholder="771122334,مكتب القضاء / 733445566,شركة التميز"
                        className="flex-1 p-2 text-xs font-mono bg-black/40 border border-white/10 rounded-lg text-white"
                      />
                      <button
                        onClick={handleBulkImport}
                        className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white text-xs font-bold border border-white/10 rounded-lg whitespace-nowrap transition-all"
                      >
                        معالجة ورفع
                      </button>
                    </div>
                  </div>
                </div>

                {/* Main Full-Database Browser & Table */}
                <div className="bg-[#0c122b]/80 border border-white/5 rounded-2xl p-5 space-y-4">
                  {/* Search bar & Page-size selector */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="relative w-full sm:w-80">
                      <input
                        type="text"
                        value={dbSearch}
                        onChange={(e) => {
                          setDbSearch(e.target.value);
                          setDbPage(1);
                        }}
                        placeholder="ابحث بالرقم أو بالاسم أو بمصدر الإضافة..."
                        className="w-full py-2.5 pl-3 pr-9 text-xs bg-black/50 border border-white/10 focus:border-[#e5c158] rounded-xl text-white outline-none"
                      />
                      <Search className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2" />
                      {dbSearch && (
                        <button
                          onClick={() => {
                            setDbSearch('');
                            setDbPage(1);
                          }}
                          className="text-gray-400 hover:text-white absolute left-2.5 top-1/2 -translate-y-1/2 text-xs"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end text-xs">
                      <div className="text-gray-400 text-xs">
                        عرض: <span className="text-white font-mono font-bold">{paginatedContacts.length}</span> من أصل{' '}
                        <span className="text-[#e5c158] font-mono font-bold">{totalFiltered.toLocaleString('ar-EG')}</span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className="text-gray-400 text-[11px]">في الصفحة:</span>
                        <select
                          value={dbPageSize}
                          onChange={(e) => {
                            setDbPageSize(Number(e.target.value));
                            setDbPage(1);
                          }}
                          className="bg-black/60 border border-white/10 text-white text-xs rounded-lg px-2 py-1 outline-none"
                        >
                          <option value={25}>25</option>
                          <option value={50}>50</option>
                          <option value={100}>100</option>
                          <option value={-1}>عرض الكل</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Contacts Table */}
                  <div className="overflow-x-auto rounded-xl border border-white/5">
                    <table className="w-full text-right text-xs">
                      <thead className="bg-black/50 text-gray-400 font-bold border-b border-white/5">
                        <tr>
                          <th className="p-3">#</th>
                          <th className="p-3">رقم الهاتف</th>
                          <th className="p-3">الاسم المعتمد للهوية</th>
                          <th className="p-3 text-center">مرات التكرار / الثقة</th>
                          <th className="p-3">المصدر / أضيف بواسطة</th>
                          <th className="p-3">تاريخ الإضافة</th>
                          <th className="p-3 text-center">إجراءات</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {paginatedContacts.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="p-8 text-center text-gray-500">
                              {contacts.length === 0 ? 'قاعدة البيانات فارغة أو جاري تحميلها...' : 'لا توجد نتائج مطابقة لبحثك.'}
                            </td>
                          </tr>
                        ) : (
                          paginatedContacts.map((c, index) => {
                            const rowNumber = startIndex + index + 1;
                            return (
                              <tr key={c.id || index} className="hover:bg-white/[0.02] transition-colors">
                                <td className="p-3 text-gray-500 font-mono text-[11px]">{rowNumber}</td>
                                
                                {/* Phone Number with Quick Copy */}
                                <td className="p-3">
                                  <div className="flex items-center gap-1.5 font-mono font-bold text-white" dir="ltr">
                                    <span>{c.phoneNumber}</span>
                                    <button
                                      onClick={() => handleCopyContactPhone(c.phoneNumber)}
                                      className="p-1 rounded text-gray-500 hover:text-white hover:bg-white/5 transition-all"
                                      title="نسخ رقم الهاتف"
                                    >
                                      {copiedContactPhone === c.phoneNumber ? (
                                        <Check className="w-3.5 h-3.5 text-green-400" />
                                      ) : (
                                        <Copy className="w-3.5 h-3.5" />
                                      )}
                                    </button>
                                  </div>
                                </td>

                                {/* Name */}
                                <td className="p-3">
                                  <span className="text-white font-medium">{c.contactName}</span>
                                </td>

                                {/* Frequency / Trust */}
                                <td className="p-3 text-center">
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                                    (c.frequency || 1) > 2 ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-white/5 text-gray-400'
                                  }`}>
                                    {c.frequency || 1}x
                                  </span>
                                </td>

                                {/* Added by user */}
                                <td className="p-3 text-gray-400 text-[11px] font-mono">
                                  {c.addedByUser ? c.addedByUser : 'مزامنة عامة'}
                                </td>

                                {/* Created At */}
                                <td className="p-3 text-gray-500 text-[11px] font-mono">
                                  {c.createdAt ? c.createdAt.split('T')[0] : 'سابق'}
                                </td>

                                {/* Actions: Edit / Delete */}
                                <td className="p-3 text-center">
                                  <div className="flex items-center justify-center gap-1">
                                    <button
                                      onClick={() => handleEditContactClick(c)}
                                      className="p-1.5 rounded-lg text-gray-400 hover:text-[#e5c158] hover:bg-white/5 transition-all"
                                      title="تعديل هذا السجل"
                                    >
                                      <Edit3 className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteContact(c.id)}
                                      className="p-1.5 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
                                      title="حذف هذا السجل نهائياً"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination Controls */}
                  {dbPageSize !== -1 && totalPages > 1 && (
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-white/5">
                      <div className="text-gray-400 text-xs">
                        الصفحة <span className="text-white font-mono font-bold">{currentPage}</span> من{' '}
                        <span className="text-white font-mono font-bold">{totalPages}</span> (إجمالي{' '}
                        <span className="text-[#e5c158] font-mono font-bold">{totalFiltered}</span> سجل)
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setDbPage(p => Math.max(1, p - 1))}
                          disabled={currentPage === 1}
                          className="px-3 py-1.5 bg-white/5 hover:bg-white/10 disabled:opacity-40 text-white text-xs font-bold rounded-lg border border-white/5 flex items-center gap-1 transition-all"
                        >
                          <ChevronRight className="w-4 h-4" />
                          <span>السابق</span>
                        </button>

                        <div className="flex items-center gap-1">
                          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                            let pageNum = i + 1;
                            if (totalPages > 5) {
                              if (currentPage > 3 && currentPage < totalPages - 2) {
                                pageNum = currentPage - 2 + i;
                              } else if (currentPage >= totalPages - 2) {
                                pageNum = totalPages - 4 + i;
                              }
                            }
                            return (
                              <button
                                key={pageNum}
                                onClick={() => setDbPage(pageNum)}
                                className={`w-8 h-8 rounded-lg text-xs font-mono font-bold transition-all ${
                                  currentPage === pageNum
                                    ? 'bg-gradient-to-r from-[#e5c158] to-[#c5a059] text-black shadow-md'
                                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                                }`}
                              >
                                {pageNum}
                              </button>
                            );
                          })}
                        </div>

                        <button
                          onClick={() => setDbPage(p => Math.min(totalPages, p + 1))}
                          disabled={currentPage === totalPages}
                          className="px-3 py-1.5 bg-white/5 hover:bg-white/10 disabled:opacity-40 text-white text-xs font-bold rounded-lg border border-white/5 flex items-center gap-1 transition-all"
                        >
                          <span>التالي</span>
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>

              </div>
            );
          })()}

          {/* TAB 4: ADVERTISEMENT SCHEDULER */}
          {activeTab === 'ads' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Add New Ad campaign */}
              <div className="bg-[#0c122b]/80 border border-white/5 rounded-2xl p-5 space-y-3">
                <h3 className="text-white text-sm font-bold">إنشاء حملة إعلانية جديدة</h3>
                
                <form onSubmit={handleCreateAd} className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-[10px] text-gray-400">عنوان الحملة / المسمى الترويجي</label>
                    <input
                      type="text"
                      value={newAdTitle}
                      onChange={(e) => setNewAdTitle(e.target.value)}
                      placeholder="عسل السدر البلدي الممتاز"
                      className="w-full p-2.5 text-xs bg-black/40 border border-white/10 rounded-lg text-white"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[10px] text-gray-400">النوع</label>
                      <select
                        value={newAdType}
                        onChange={(e: any) => setNewAdType(e.target.value)}
                        className="w-full p-2.5 text-xs bg-black/40 border border-white/10 rounded-lg text-white"
                      >
                        <option value="custom">مخصص بنر</option>
                        <option value="rewarded">فيديو مكافأة</option>
                        <option value="interstitial">بيني</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] text-gray-400">المصدر</label>
                      <select
                        value={newAdSource}
                        onChange={(e: any) => setNewAdSource(e.target.value)}
                        className="w-full p-2.5 text-xs bg-black/40 border border-white/10 rounded-lg text-white"
                      >
                        <option value="private">إعلان خاص راعي</option>
                        <option value="admob">إعلانات جوجل AdMob</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-gray-400">رابط صورة/ميديا الإعلان (اختياري)</label>
                    <input
                      type="text"
                      value={newAdMediaUrl}
                      onChange={(e) => setNewAdMediaUrl(e.target.value)}
                      placeholder="https://..."
                      className="w-full p-2.5 text-xs bg-black/40 border border-white/10 rounded-lg text-white"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[10px] text-gray-400">المدة (بالثواني)</label>
                      <input
                        type="number"
                        value={newAdDuration}
                        onChange={(e) => setNewAdDuration(Number(e.target.value))}
                        className="w-full p-2.5 text-xs bg-black/40 border border-white/10 rounded-lg text-white font-mono"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] text-gray-400">قيمة المكافأة للعميل</label>
                      <input
                        type="number"
                        value={newAdReward}
                        onChange={(e) => setNewAdReward(Number(e.target.value))}
                        className="w-full p-2.5 text-xs bg-black/40 border border-white/10 rounded-lg text-white font-mono"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2 bg-[#e5c158] text-black font-extrabold text-xs rounded-lg transition-all hover:brightness-110"
                  >
                    حفظ وإطلاق الحملة فوراً
                  </button>
                </form>
              </div>

              {/* Manage active campaigns */}
              <div className="md:col-span-2 bg-[#0c122b]/80 border border-white/5 rounded-2xl p-5 space-y-4">
                <h3 className="text-white text-sm font-bold">حملات الإعلانات النشطة ومكاسب المشاهدة</h3>
                
                <div className="space-y-3.5">
                  {ads.map((ad) => (
                    <div key={ad.id} className="p-3 bg-black/40 rounded-xl border border-white/5 flex items-center justify-between text-xs">
                      
                      {/* Views / clicks */}
                      <div className="flex items-center gap-4 text-left" dir="ltr">
                        <div className="text-gray-500 text-[10px]">
                          <div>Imp: <span className="text-white font-bold">{ad.views}</span></div>
                          <div>Clicks: <span className="text-[#e5c158] font-bold">{ad.clicks}</span></div>
                        </div>
                        <button
                          onClick={() => handleDeleteAd(ad.id)}
                          className="p-1 text-red-400 hover:bg-red-500/10 rounded"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Info and toggle status */}
                      <div className="text-right space-y-1">
                        <div className="flex items-center gap-1.5 justify-end">
                          <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${ad.source === 'admob' ? 'bg-indigo-500/15 text-indigo-400' : 'bg-[#c5a059]/20 text-[#e5c158]'}`}>
                            {ad.source === 'admob' ? 'Google AdMob' : 'Sponsorship'}
                          </span>
                          <span className="text-white font-bold">{ad.title}</span>
                        </div>
                        <div className="text-[10px] text-gray-500">
                          المدة: {ad.duration} ثانية | العائد: {ad.reward} وحدة | الحالة: 
                          <button
                            onClick={() => handleToggleAd(ad.id)}
                            className={`mr-1 inline-flex font-bold hover:underline ${ad.status ? 'text-green-400' : 'text-red-400'}`}
                          >
                            {ad.status ? 'نشط (إيقاف مؤقت)' : 'متوقف (تفعيل)'}
                          </button>
                        </div>
                      </div>

                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

          {/* TAB 5: FRAUD AND ANTI-CHEAT SECURITY CONTROLS */}
          {activeTab === 'security' && (
            <div className="bg-[#0c122b]/80 border border-white/5 rounded-2xl p-5 space-y-6">
              <div className="space-y-1.5">
                <h3 className="text-white text-sm font-bold flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-red-400" />
                  <span>محرك مكافحة التلاعب وتعدد الحسابات (Anti-Fraud Guard)</span>
                </h3>
                <p className="text-gray-400 text-xs">
                  إعدادات منع إنشاء عدة أرقام من جهاز يمني واحد لتخطي قيود الدليل وتجنب حظر الأرقام.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Fraud toggles */}
                <div className="p-4 rounded-xl bg-black/40 border border-white/5 space-y-4">
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => setLocalSettings({ ...localSettings, multiAccountDetection: !localSettings.multiAccountDetection })}
                      className="text-[#e5c158]"
                    >
                      {localSettings.multiAccountDetection ? <ToggleRight className="w-10 h-10" /> : <ToggleLeft className="w-10 h-10 text-gray-600" />}
                    </button>
                    <div className="text-right">
                      <span className="text-white text-xs font-bold block">تفعيل جدار منع التكرار للـ Device ID</span>
                      <span className="text-gray-400 text-[10px]">يمنع الجوال من ربط أكثر من رقم واحد بالدليل.</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => setLocalSettings({ ...localSettings, logActivity: !localSettings.logActivity })}
                      className="text-[#e5c158]"
                    >
                      {localSettings.logActivity ? <ToggleRight className="w-10 h-10" /> : <ToggleLeft className="w-10 h-10 text-gray-600" />}
                    </button>
                    <div className="text-right">
                      <span className="text-white text-xs font-bold block">تسجيل حركات وتتبع عناوين المتصفح</span>
                      <span className="text-gray-400 text-[10px]">تسجيل كل عمليات الاستعلام لمكافحة زحف البيانات.</span>
                    </div>
                  </div>
                </div>

                {/* Fraud quantities */}
                <div className="p-4 rounded-xl bg-black/40 border border-white/5 space-y-3">
                  <div className="space-y-1 text-right">
                    <label className="text-xs text-gray-400 font-bold block">الحد الأقصى للحسابات لكل جهاز</label>
                    <input
                      type="number"
                      value={localSettings.maxAccountsPerDevice}
                      onChange={(e) => setLocalSettings({ ...localSettings, maxAccountsPerDevice: Number(e.target.value) })}
                      className="w-full p-2.5 bg-black/40 border border-white/10 rounded-lg text-white font-mono text-xs"
                    />
                  </div>

                  <p className="text-gray-500 text-[9px] leading-relaxed">
                    ملاحظة هامة: في حال محاولة مستخدم تزييف معرف الجهاز أو تخطي الحظر، يتم إغلاق الحساب مؤقتاً وعرض إشعار مخصص في واجهة محرك البحث الرئيسية مع تجميد رصيده.
                  </p>
                </div>

              </div>

              <button
                onClick={handleSaveSettings}
                className="w-full py-2.5 bg-[#e5c158] text-black font-extrabold text-xs rounded-xl shadow-md transition-all hover:brightness-110"
              >
                تطبيق تعديلات جدار الحماية فوراً
              </button>
            </div>
          )}

          {/* TAB 6: SYSTEM PARAMETERS AND LIMITS */}
          {activeTab === 'parameters' && (
            <div className="bg-[#0c122b]/80 border border-white/5 rounded-2xl p-5 space-y-6">
              <h3 className="text-white text-sm font-bold">تعديل قيم وعائدات نظام "معروف"</h3>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                
                <div className="space-y-1 text-right">
                  <label className="text-[10px] text-gray-400 font-bold">عمليات البحث المجانية/يوم</label>
                  <input
                    type="number"
                    value={localSettings.dailySearchBalance}
                    onChange={(e) => setLocalSettings({ ...localSettings, dailySearchBalance: Number(e.target.value) })}
                    className="w-full p-2 bg-black/40 border border-white/10 rounded-lg text-white font-mono text-xs"
                  />
                </div>

                <div className="space-y-1 text-right">
                  <label className="text-[10px] text-gray-400 font-bold">رقم هاتف المدير العام</label>
                  <input
                    type="text"
                    value={localSettings.adminPhone || ''}
                    onChange={(e) => setLocalSettings({ ...localSettings, adminPhone: e.target.value.trim() })}
                    className="w-full p-2 bg-black/40 border border-white/10 rounded-lg text-white font-mono text-xs"
                    placeholder="774919194"
                  />
                </div>

                <div className="space-y-1 text-right">
                  <label className="text-[10px] text-gray-400 font-bold">عدد الهويات الظاهرة في البحث</label>
                  <input
                    type="number"
                    value={localSettings.resultsLimit}
                    onChange={(e) => setLocalSettings({ ...localSettings, resultsLimit: Number(e.target.value) })}
                    className="w-full p-2 bg-black/40 border border-white/10 rounded-lg text-white font-mono text-xs"
                  />
                </div>

                <div className="space-y-1 text-right">
                  <label className="text-[10px] text-gray-400 font-bold">نقاط المكافأة لكل إعلان مخصص</label>
                  <input
                    type="number"
                    value={localSettings.pointsPerAd}
                    onChange={(e) => setLocalSettings({ ...localSettings, pointsPerAd: Number(e.target.value) })}
                    className="w-full p-2 bg-black/40 border border-white/10 rounded-lg text-white font-mono text-xs"
                  />
                </div>

                <div className="space-y-1 text-right">
                  <label className="text-[10px] text-gray-400 font-bold">تكلفة البحث المتقدم (نقاط)</label>
                  <input
                    type="number"
                    value={localSettings.advancedSearchCost}
                    onChange={(e) => setLocalSettings({ ...localSettings, advancedSearchCost: Number(e.target.value) })}
                    className="w-full p-2 bg-black/40 border border-white/10 rounded-lg text-white font-mono text-xs"
                  />
                </div>

              </div>

              {/* Toggles for external integrations */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-white/5 pt-4">
                
                <div className="p-3 rounded-xl bg-black/30 border border-white/5 space-y-3">
                  <span className="text-[#e5c158] text-xs font-bold block">إعلانات جوجل Google AdMob</span>
                  
                  <div className="flex justify-between items-center text-xs">
                    <button
                      onClick={() => setLocalSettings({ ...localSettings, admobRewarded: !localSettings.admobRewarded })}
                      className="text-xs font-bold text-gray-400 hover:text-white"
                    >
                      {localSettings.admobRewarded ? 'نشط (تعطيل)' : 'معطل (تفعيل)'}
                    </button>
                    <span className="text-white">فيديوهات Rewarded مكافأة بالرصيد</span>
                  </div>

                  <div className="flex justify-between items-center text-xs">
                    <button
                      onClick={() => setLocalSettings({ ...localSettings, admobBanner: !localSettings.admobBanner })}
                      className="text-xs font-bold text-gray-400 hover:text-white"
                    >
                      {localSettings.admobBanner ? 'نشط (تعطيل)' : 'معطل (تفعيل)'}
                    </button>
                    <span className="text-white">إعلانات Banner السفلية</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-black/30 border border-white/5 space-y-3">
                  <span className="text-[#e5c158] text-xs font-bold block">البحث المتقدم</span>
                  
                  <div className="flex justify-between items-center text-xs">
                    <button
                      onClick={() => setLocalSettings({ ...localSettings, advancedSearchEnabled: !localSettings.advancedSearchEnabled })}
                      className="text-xs font-bold text-gray-400 hover:text-white"
                    >
                      {localSettings.advancedSearchEnabled ? 'متاح (إيقاف ميزة)' : 'مغلق (إتاحة الميزة)'}
                    </button>
                    <span className="text-white">إتاحة البحث المتقدم للعملاء بالنقاط</span>
                  </div>
                </div>

                {/* Google AdSense Integration */}
                <div className="p-4 rounded-xl bg-black/30 border border-[#c5a059]/20 space-y-4 md:col-span-2">
                  <div className="flex justify-between items-center">
                    <button
                      onClick={() => setLocalSettings({ ...localSettings, googleAdSenseEnabled: !localSettings.googleAdSenseEnabled })}
                      className={`px-3 py-1 rounded text-[11px] font-bold transition-all ${localSettings.googleAdSenseEnabled ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}
                    >
                      {localSettings.googleAdSenseEnabled ? 'نشط ومفعل' : 'معطل ومغلق'}
                    </button>
                    <span className="text-[#e5c158] text-xs font-bold flex items-center gap-1.5">
                      <span>إعلانات جوجل AdSense / Web Ads</span>
                    </span>
                  </div>
                  
                  <p className="text-gray-400 text-[10px]">
                    قم بتنشيط هذا الخيار لعرض إعلانات جوجل الحقيقية ومضاعفة أرباحك من الزوار. سيقوم النظام بحقن كود Google Adsense في الصفحة تلقائياً.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    <div className="space-y-1 text-right">
                      <label className="text-[10px] text-gray-400 font-bold">معرف الناشر لـ AdSense (Client ID)</label>
                      <input
                        type="text"
                        value={localSettings.googleAdSenseClientId || ''}
                        onChange={(e) => setLocalSettings({ ...localSettings, googleAdSenseClientId: e.target.value.trim() })}
                        className="w-full p-2 bg-black/50 border border-white/10 rounded-lg text-white font-mono text-xs focus:border-[#e5c158] outline-none"
                        placeholder="ca-pub-XXXXXXXXXXXXXXXX"
                        dir="ltr"
                      />
                    </div>

                    <div className="space-y-1 text-right">
                      <label className="text-[10px] text-gray-400 font-bold">معرف الوحدة الإعلانية (Slot ID)</label>
                      <input
                        type="text"
                        value={localSettings.googleAdSenseSlotId || ''}
                        onChange={(e) => setLocalSettings({ ...localSettings, googleAdSenseSlotId: e.target.value.trim() })}
                        className="w-full p-2 bg-black/50 border border-white/10 rounded-lg text-white font-mono text-xs focus:border-[#e5c158] outline-none"
                        placeholder="YYYYYYYYYY"
                        dir="ltr"
                      />
                    </div>
                  </div>
                </div>

              </div>

              <button
                onClick={handleSaveSettings}
                className="w-full py-2.5 bg-gradient-to-r from-[#e5c158] to-[#c5a059] text-black font-extrabold text-xs rounded-xl shadow-lg transition-all hover:brightness-110"
              >
                حفظ وحقن الإعدادات في قاعدة البيانات
              </button>
            </div>
          )}

        </div>
      )}

      {/* SELECTIVE RESET MODAL OVERLAY */}
      <AnimatePresence>
        {resetModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" dir="rtl">
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-red-500/20 bg-[#0c122b] p-6 text-right shadow-[0_20px_60px_rgba(0,0,0,0.9)] space-y-5"
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-white/5">
                <button
                  type="button"
                  onClick={() => !resetting && setResetModalOpen(false)}
                  className="text-gray-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
                <div className="flex items-center gap-2">
                  <h3 className="text-white text-base font-black">إعادة ضبط وتصفير البيانات</h3>
                  <div className="w-8 h-8 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                </div>
              </div>

              <p className="text-gray-300 text-xs leading-relaxed">
                حدد البيانات التي ترغب في تصفيرها وإعادتها لنقطة الصفر في قاعدة بيانات Firestore الحقيقية:
              </p>

              {/* Options selection */}
              <div className="space-y-3">
                {/* Option 1: Earnings Only */}
                <div
                  onClick={() => setResetTarget('earnings')}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-start gap-3 ${
                    resetTarget === 'earnings'
                      ? 'bg-amber-500/10 border-[#e5c158] shadow-[0_0_15px_rgba(229,193,88,0.15)]'
                      : 'bg-black/30 border-white/5 hover:border-white/10'
                  }`}
                >
                  <input
                    type="radio"
                    name="resetTarget"
                    checked={resetTarget === 'earnings'}
                    onChange={() => setResetTarget('earnings')}
                    className="mt-1 accent-[#e5c158]"
                  />
                  <div className="flex-1 space-y-1 text-right">
                    <div className="flex items-center justify-between">
                      <span className="text-white text-xs font-bold flex items-center gap-1.5">
                        <DollarSign className="w-3.5 h-3.5 text-[#e5c158]" />
                        <span>تصفير أرباح وإحصائيات الإعلانات فقط</span>
                      </span>
                      <span className="text-[10px] text-gray-400 font-mono">${stats?.totalEarnings || '0.00'} ➔ $0.00</span>
                    </div>
                    <p className="text-gray-400 text-[10px] leading-normal">
                      يقوم بتصفير جميع مشاهدات ونقرات الإعلانات وإعادة الأرباح المحتسبة بالكامل إلى $0.00 دون المساس بسجلات البحث.
                    </p>
                  </div>
                </div>

                {/* Option 2: Searches Only */}
                <div
                  onClick={() => setResetTarget('searches')}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-start gap-3 ${
                    resetTarget === 'searches'
                      ? 'bg-blue-500/10 border-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.15)]'
                      : 'bg-black/30 border-white/5 hover:border-white/10'
                  }`}
                >
                  <input
                    type="radio"
                    name="resetTarget"
                    checked={resetTarget === 'searches'}
                    onChange={() => setResetTarget('searches')}
                    className="mt-1 accent-blue-400"
                  />
                  <div className="flex-1 space-y-1 text-right">
                    <div className="flex items-center justify-between">
                      <span className="text-white text-xs font-bold flex items-center gap-1.5">
                        <Search className="w-3.5 h-3.5 text-blue-400" />
                        <span>تصفير عمليات وسجلات البحث فقط</span>
                      </span>
                      <span className="text-[10px] text-gray-400 font-mono">{stats?.totalSearches || 0} ➔ 0</span>
                    </div>
                    <p className="text-gray-400 text-[10px] leading-normal">
                      يقوم بحذف سجلات البحث وتصفير عداد عمليات البحث التراكمية في قاعدة البيانات لتبدأ الإحصائية من الصفر.
                    </p>
                  </div>
                </div>

                {/* Option 3: All (Both Earnings & Searches) */}
                <div
                  onClick={() => setResetTarget('all')}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-start gap-3 ${
                    resetTarget === 'all'
                      ? 'bg-red-500/10 border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.15)]'
                      : 'bg-black/30 border-white/5 hover:border-white/10'
                  }`}
                >
                  <input
                    type="radio"
                    name="resetTarget"
                    checked={resetTarget === 'all'}
                    onChange={() => setResetTarget('all')}
                    className="mt-1 accent-red-500"
                  />
                  <div className="flex-1 space-y-1 text-right">
                    <div className="flex items-center justify-between">
                      <span className="text-white text-xs font-bold flex items-center gap-1.5 text-red-400">
                        <Trash2 className="w-3.5 h-3.5 text-red-400" />
                        <span>تصفير شامل للكل (الأرباح + عمليات البحث)</span>
                      </span>
                      <span className="text-[10px] text-red-400 font-mono">الكل ➔ 0</span>
                    </div>
                    <p className="text-gray-400 text-[10px] leading-normal">
                      تصفير كامل لكافة إحصائيات الإعلانات ونقراتها ومداخيلها بالإضافة إلى سجلات وعدادات البحث معاً.
                    </p>
                  </div>
                </div>
              </div>

              {/* Warning note */}
              <div className="p-3 bg-red-950/20 border border-red-900/30 rounded-xl text-right flex gap-2 items-center text-[10px] text-red-300">
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                <span>تحذير: التصفير يتم على قاعدة بيانات Firestore الحقيقية مباشرة ولا يمكن التراجع عنه.</span>
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleExecuteReset}
                  disabled={resetting}
                  className="flex-1 py-2.5 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-extrabold text-xs rounded-xl shadow-lg transition-all flex items-center justify-center gap-1.5 disabled:opacity-60 cursor-pointer active:scale-95"
                >
                  {resetting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>جاري التصفير الفعلي...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>
                        {resetTarget === 'earnings' && 'تأكيد تصفير الأرباح فقط'}
                        {resetTarget === 'searches' && 'تأكيد تصفير البحث فقط'}
                        {resetTarget === 'all' && 'تأكيد التصفير الشامل للكل'}
                      </span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setResetModalOpen(false)}
                  disabled={resetting}
                  className="px-5 py-2.5 bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-bold rounded-xl border border-white/5 transition-all cursor-pointer"
                >
                  إلغاء
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
