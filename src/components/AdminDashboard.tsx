import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShieldCheck, Users, Database, Eye, TrendingUp, DollarSign, Settings, Search, Trash2, 
  UserX, UserCheck, Plus, Upload, Check, ToggleLeft, ToggleRight, Sparkles, RefreshCw, AlertTriangle, ShieldAlert, Edit3, X,
  Download, FileSpreadsheet, Copy, ChevronLeft, ChevronRight, Filter, Key, Award, ExternalLink, Crown
} from 'lucide-react';
import { User, Contact, Ad, SystemSettings, AnalyticsStats, VipPlan, DeletedNameRecord } from '../types';
import { apiFetch } from '../utils/apiHelper';

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
  const [deletedNames, setDeletedNames] = useState<DeletedNameRecord[]>([]);
  
  // Dashboard states
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'database' | 'ads' | 'security' | 'parameters' | 'plans' | 'deleted_names'>('overview');

  // VIP Plans Management States
  const [vipPlans, setVipPlans] = useState<VipPlan[]>([]);
  const [editingPlan, setEditingPlan] = useState<VipPlan | null>(null);
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [planFormName, setPlanFormName] = useState('');
  const [planFormPriceYmr, setPlanFormPriceYmr] = useState<number>(2500);
  const [planFormPriceUsd, setPlanFormPriceUsd] = useState<number>(5);
  const [planFormReveals, setPlanFormReveals] = useState<number>(10);
  const [planFormNameDeletions, setPlanFormNameDeletions] = useState<number>(1);
  const [planFormType, setPlanFormType] = useState<'bundle' | 'reveal_only' | 'delete_only'>('bundle');
  const [planFormDuration, setPlanFormDuration] = useState<number>(30);
  const [planFormDescription, setPlanFormDescription] = useState('');
  const [planFormBadge, setPlanFormBadge] = useState('');
  const [planFormFeaturesText, setPlanFormFeaturesText] = useState('');
  const [savingVipPlan, setSavingVipPlan] = useState(false);
  const [restoringRecordId, setRestoringRecordId] = useState<string | null>(null);

  // Deleted Names Management States
  const [selectedDeletedIds, setSelectedDeletedIds] = useState<string[]>([]);
  const [deletedNamesSearch, setDeletedNamesSearch] = useState<string>('');
  const [deletedNamesStatusFilter, setDeletedNamesStatusFilter] = useState<'all' | 'hidden' | 'restored'>('all');
  const [bulkDeletedLoading, setBulkDeletedLoading] = useState<boolean>(false);
  
  // Selective Reset modal states
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [resetTarget, setResetTarget] = useState<'all' | 'earnings' | 'searches'>('earnings');
  const [resetting, setResetting] = useState(false);
  
  // Database sub-states
  const [dbSearch, setDbSearch] = useState('');
  const [userFilter, setUserFilter] = useState<string>('all');
  const [dbPage, setDbPage] = useState(1);
  const [dbPageSize, setDbPageSize] = useState<number>(25);
  const [dbLoading, setDbLoading] = useState(false);
  const [copiedContactPhone, setCopiedContactPhone] = useState<string | null>(null);
  const [newContactPhone, setNewContactPhone] = useState('');
  const [newContactName, setNewContactName] = useState('');
  const [bulkCsvText, setBulkCsvText] = useState('');

  // User Directory Search & Filter States
  const [userSearchQuery, setUserSearchQuery] = useState<string>('');
  const [userStatusFilter, setUserStatusFilter] = useState<'all' | 'vip' | 'active' | 'inactive'>('all');

  // User VIP / Registrar, Name Deletion & Profile Modal States
  const [editingPlanUser, setEditingPlanUser] = useState<User | null>(null);
  const [planCanReveal, setPlanCanReveal] = useState<boolean>(false);
  const [planLimit, setPlanLimit] = useState<number>(20);
  const [planUsed, setPlanUsed] = useState<number>(0);
  const [planCanDelete, setPlanCanDelete] = useState<boolean>(false);
  const [planDeleteLimit, setPlanDeleteLimit] = useState<number>(5);
  const [planDeleteUsed, setPlanDeleteUsed] = useState<number>(0);
  const [userEditPoints, setUserEditPoints] = useState<number>(0);
  const [userEditSearchBalance, setUserEditSearchBalance] = useState<number>(3);
  const [userEditIsActive, setUserEditIsActive] = useState<boolean>(true);
  const [userEditUnlockedUnlimited, setUserEditUnlockedUnlimited] = useState<boolean>(false);
  const [userEditContactsSynced, setUserEditContactsSynced] = useState<boolean>(false);
  const [savingPlan, setSavingPlan] = useState<boolean>(false);

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
    adminPhone: '774919194',
    requirePhoneLogin: true,
    allowRevealRegistrarGlobal: false,
    allowDeleteNamesGlobal: false
  });

  // Calculate unique contributors
  const uniqueContributors = useMemo(() => {
    const list = Array.from(new Set(contacts.map(c => c.addedByUser).filter(Boolean)));
    return list.sort();
  }, [contacts]);

  // Filtered users list for User Directory tab
  const filteredUsers = useMemo(() => {
    return (users || []).filter(u => {
      if (userStatusFilter === 'vip' && !u.canRevealRegistrar && !u.canDeleteNames) return false;
      if (userStatusFilter === 'active' && !u.isActive) return false;
      if (userStatusFilter === 'inactive' && u.isActive) return false;

      if (!userSearchQuery.trim()) return true;
      const q = userSearchQuery.trim().toLowerCase();
      return (
        (u.phone && u.phone.toLowerCase().includes(q)) ||
        (u.deviceId && u.deviceId.toLowerCase().includes(q)) ||
        (u.deviceType && u.deviceType.toLowerCase().includes(q)) ||
        (u.id && u.id.toLowerCase().includes(q))
      );
    });
  }, [users, userSearchQuery, userStatusFilter]);

  const handleOpenPlanModal = (user: User) => {
    setEditingPlanUser(user);
    setPlanCanReveal(Boolean(user.canRevealRegistrar));
    setPlanLimit(user.revealRegistrarLimit ?? 20);
    setPlanUsed(user.revealRegistrarUsed ?? 0);
    setPlanCanDelete(Boolean(user.canDeleteNames));
    setPlanDeleteLimit(user.nameDeletionsLimit ?? 3);
    setPlanDeleteUsed(user.nameDeletionsUsed ?? 0);
    setUserEditPoints(user.points ?? 0);
    setUserEditSearchBalance(user.searchBalance ?? 3);
    setUserEditIsActive(user.isActive !== false);
    setUserEditUnlockedUnlimited(Boolean(user.unlockedUnlimited));
    setUserEditContactsSynced(Boolean(user.contactsSynced));
  };

  const handleSaveUserPlan = async () => {
    if (!editingPlanUser) return;
    setSavingPlan(true);
    try {
      const res = await apiFetch('/api/admin/users/plan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-token': adminToken
        },
        body: JSON.stringify({
          userId: editingPlanUser.id,
          canRevealRegistrar: planCanReveal,
          revealRegistrarLimit: Number(planLimit),
          revealRegistrarUsed: Number(planUsed),
          canDeleteNames: planCanDelete,
          nameDeletionsLimit: Number(planDeleteLimit),
          nameDeletionsUsed: Number(planDeleteUsed),
          points: Number(userEditPoints),
          searchBalance: Number(userEditSearchBalance),
          isActive: userEditIsActive,
          unlockedUnlimited: userEditUnlockedUnlimited,
          contactsSynced: userEditContactsSynced
        })
      });
      const data = await res.json();
      if (res.ok) {
        showToast('تم حفظ وتحديث ملف وصلاحيات المستخدم بنجاح.', 'success');
        setEditingPlanUser(null);
        fetchAdminData();
      } else {
        showToast(data.error || 'فشل حفظ ملف المستخدم.', 'error');
      }
    } catch (e) {
      showToast('خطأ أثناء حفظ ملف المستخدم.', 'error');
    } finally {
      setSavingPlan(false);
    }
  };

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

      const [statsRes, usersRes, contactsRes, adsRes, plansRes, deletedRes] = await Promise.all([
        apiFetch('/api/admin/stats', { headers }).then(r => r.json()),
        apiFetch('/api/admin/users', { headers }).then(r => r.json()),
        apiFetch('/api/admin/contacts', { headers }).then(r => r.json()),
        apiFetch('/api/ads').then(r => r.json()), // ads can be public
        apiFetch('/api/vip-plans').then(r => r.json()).catch(() => []),
        apiFetch('/api/admin/deleted-names', { headers }).then(r => r.json()).catch(() => [])
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
      setVipPlans(Array.isArray(plansRes) ? plansRes : []);
      setDeletedNames(Array.isArray(deletedRes) ? deletedRes : []);
    } catch (err) {
      showToast('خطأ أثناء تحميل بيانات لوحة التحكم.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Filtered deleted names list
  const filteredDeletedNames = useMemo(() => {
    return (deletedNames || []).filter((rec) => {
      if (deletedNamesStatusFilter === 'hidden' && rec.restored) return false;
      if (deletedNamesStatusFilter === 'restored' && !rec.restored) return false;

      if (!deletedNamesSearch.trim()) return true;
      const q = deletedNamesSearch.trim().toLowerCase();
      return (
        (rec.phoneNumber && rec.phoneNumber.toLowerCase().includes(q)) ||
        (rec.contactName && rec.contactName.toLowerCase().includes(q)) ||
        (rec.deletedByPhone && rec.deletedByPhone.toLowerCase().includes(q))
      );
    });
  }, [deletedNames, deletedNamesSearch, deletedNamesStatusFilter]);

  const toggleSelectDeletedId = (id: string) => {
    setSelectedDeletedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAllDeleted = () => {
    const visibleIds = filteredDeletedNames.map((r) => r.id);
    if (visibleIds.length === 0) return;
    const allSelected = visibleIds.every((id) => selectedDeletedIds.includes(id));
    if (allSelected) {
      setSelectedDeletedIds((prev) => prev.filter((id) => !visibleIds.includes(id)));
    } else {
      setSelectedDeletedIds((prev) => Array.from(new Set([...prev, ...visibleIds])));
    }
  };

  const handleDeletedNamesAction = async (
    recordIds: string[],
    action: 'restore' | 'rehide' | 'delete_log'
  ) => {
    if (!recordIds || recordIds.length === 0) {
      showToast('يرجى تحديد اسم واحد على الأقل لتنفيذ الإجراء.', 'warning');
      return;
    }

    if (action === 'delete_log' && !confirm(`هل أنت متأكد من حذف (${recordIds.length}) سجل من قائمة المحذوفات نهائياً؟`)) {
      return;
    }

    try {
      if (recordIds.length === 1) {
        setRestoringRecordId(recordIds[0]);
      } else {
        setBulkDeletedLoading(true);
      }

      const res = await apiFetch('/api/admin/deleted-names/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-token': adminToken },
        body: JSON.stringify({ recordIds, action })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل تنفيذ الإجراء.');

      showToast(data.message || 'تم تنفيذ الإجراء بنجاح!', 'success');
      setSelectedDeletedIds((prev) => prev.filter((id) => !recordIds.includes(id)));
      fetchAdminData();
    } catch (err: any) {
      showToast(err.message || 'حدث خطأ أثناء تنفيذ الإجراء.', 'error');
    } finally {
      setRestoringRecordId(null);
      setBulkDeletedLoading(false);
    }
  };

  const handleRestoreDeletedName = async (recordId: string) => {
    await handleDeletedNamesAction([recordId], 'restore');
  };

  // VIP Plans Management Handlers
  const handleOpenNewPlanModal = () => {
    setEditingPlan(null);
    setPlanFormName('');
    setPlanFormPriceYmr(3000);
    setPlanFormPriceUsd(6);
    setPlanFormReveals(15);
    setPlanFormNameDeletions(2);
    setPlanFormType('bundle');
    setPlanFormDuration(30);
    setPlanFormDescription('كشف هوية ورقم مسجّل الاسم لـ 15 عملية + حذف اسمين من قاعدة البيانات');
    setPlanFormBadge('جديد');
    setPlanFormFeaturesText('15 عملية كشف هوية ورقم مسجّل الاسم\nحذف وإخفاء اسمين من نتائج البحث\nتاريخ وتوقيت حفظ جهة الاتصال\nدعم فني عبر واتساب الإدارة');
    setIsPlanModalOpen(true);
  };

  const handleOpenEditPlanModal = (plan: VipPlan) => {
    setEditingPlan(plan);
    setPlanFormName(plan.name);
    setPlanFormPriceYmr(plan.priceYmr);
    setPlanFormPriceUsd(plan.priceUsd || 0);
    setPlanFormReveals(plan.revealsCount ?? 0);
    setPlanFormNameDeletions(plan.nameDeletionsCount ?? 0);
    setPlanFormType(plan.planType || 'bundle');
    setPlanFormDuration(plan.durationDays || 0);
    setPlanFormDescription(plan.description);
    setPlanFormBadge(plan.badge || '');
    setPlanFormFeaturesText((plan.features || []).join('\n'));
    setIsPlanModalOpen(true);
  };

  const handleSaveVipPlanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!planFormName.trim()) {
      showToast('يرجى كتابة اسم الباقة.', 'warning');
      return;
    }
    try {
      setSavingVipPlan(true);
      const planPayload: VipPlan = {
        id: editingPlan?.id || `plan_${Date.now()}`,
        name: planFormName.trim(),
        priceYmr: Number(planFormPriceYmr) || 0,
        priceUsd: Number(planFormPriceUsd) || 0,
        revealsCount: planFormType === 'delete_only' ? 0 : (Number(planFormReveals) || 0),
        nameDeletionsCount: planFormType === 'reveal_only' ? 0 : (Number(planFormNameDeletions) || 0),
        planType: planFormType,
        durationDays: Number(planFormDuration) || 0,
        description: planFormDescription.trim(),
        badge: planFormBadge.trim(),
        features: planFormFeaturesText.split('\n').map(s => s.trim()).filter(Boolean),
        isActive: editingPlan ? editingPlan.isActive : true,
        order: editingPlan?.order || (vipPlans.length + 1)
      };

      const res = await apiFetch('/api/admin/vip-plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-token': adminToken },
        body: JSON.stringify(planPayload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل حفظ الباقة.');

      showToast('تم حفظ وتحديث بيانات الباقة بنجاح!', 'success');
      setIsPlanModalOpen(false);
      setEditingPlan(null);
      const updated = await apiFetch('/api/vip-plans').then(r => r.json());
      setVipPlans(Array.isArray(updated) ? updated : []);
    } catch (err: any) {
      showToast(err.message || 'حدث خطأ أثناء حفظ الباقة.', 'error');
    } finally {
      setSavingVipPlan(false);
    }
  };

  const handleDeleteVipPlan = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذه الباقة؟')) return;
    try {
      const res = await apiFetch(`/api/admin/vip-plans/${id}`, {
        method: 'DELETE',
        headers: { 'x-admin-token': adminToken }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل حذف الباقة.');

      showToast('تم حذف الباقة بنجاح.', 'success');
      setVipPlans(prev => prev.filter(p => p.id !== id));
    } catch (err: any) {
      showToast(err.message || 'حدث خطأ أثناء حذف الباقة.', 'error');
    }
  };

  const handleToggleVipPlanStatus = async (plan: VipPlan) => {
    try {
      const updatedPlan = { ...plan, isActive: !plan.isActive };
      const res = await apiFetch('/api/admin/vip-plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-token': adminToken },
        body: JSON.stringify(updatedPlan)
      });
      if (res.ok) {
        setVipPlans(prev => prev.map(p => p.id === plan.id ? updatedPlan : p));
        showToast(`تم ${updatedPlan.isActive ? 'تفعيل' : 'تعطيل'} الباقة بنجاح.`, 'success');
      }
    } catch {
      showToast('فشل تغيير حالة الباقة.', 'error');
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
      const res = await apiFetch('/api/admin/reset-stats', {
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
      const res = await apiFetch('/api/admin/users/toggle-status', {
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
      const res = await apiFetch('/api/admin/users/grant-points', {
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
      const res = await apiFetch(`/api/admin/users/${id}`, {
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
      const res = await apiFetch('/api/admin/contacts', {
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
      const res = await apiFetch(`/api/admin/contacts/${id}`, {
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
      const res = await apiFetch('/api/admin/contacts/edit', {
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
      const res = await apiFetch('/api/admin/contacts/bulk', {
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
      const res = await apiFetch('/api/admin/contacts', {
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
      const res = await apiFetch('/api/admin/ads', {
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
      const res = await apiFetch('/api/admin/ads/toggle', {
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
      const res = await apiFetch(`/api/admin/ads/${id}`, {
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
          { key: 'plans', label: 'إدارة باقات VIP 👑' },
          { key: 'deleted_names', label: `الأسماء المحذوفة 🛡️ (${deletedNames.filter(d => !d.restored).length})` },
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
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${activeTab === tab.key ? 'bg-gradient-to-r from-[#e5c158] to-[#c5a059] text-black shadow-md' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
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
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/5">
                <div className="flex items-center gap-2">
                  <span className="text-gray-400 text-xs">
                    إجمالي المستخدمين: <strong className="text-white font-mono">{users.length}</strong>
                  </span>
                  {userSearchQuery && (
                    <span className="text-[#e5c158] text-xs font-mono">
                      (نتائج البحث: {filteredUsers.length})
                    </span>
                  )}
                </div>
                <h3 className="text-white text-sm font-bold flex items-center gap-2 justify-end">
                  <span>دليل حسابات المستخدمين وإدارة ملفاتهم</span>
                  <Users className="w-4 h-4 text-[#e5c158]" />
                </h3>
              </div>

              {/* Search by Phone & Status Filter Bar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="relative flex-1 max-w-md">
                  <input
                    type="text"
                    value={userSearchQuery}
                    onChange={(e) => setUserSearchQuery(e.target.value)}
                    placeholder="ابحث عن مستخدم برقم الهاتف أو معرف الجهاز..."
                    className="w-full py-2.5 pl-8 pr-9 text-xs bg-black/50 border border-white/10 focus:border-[#e5c158] rounded-xl text-white outline-none font-mono"
                  />
                  <Search className="w-4 h-4 text-[#e5c158] absolute right-3 top-1/2 -translate-y-1/2" />
                  {userSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setUserSearchQuery('')}
                      className="text-gray-400 hover:text-white absolute left-2.5 top-1/2 -translate-y-1/2"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Quick Filter Pills */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {[
                    { key: 'all', label: `الكل (${users.length})` },
                    { key: 'vip', label: `مشتركو VIP (${users.filter(u => u.canRevealRegistrar || u.canDeleteNames).length})` },
                    { key: 'active', label: `نشط (${users.filter(u => u.isActive).length})` },
                    { key: 'inactive', label: `معطل (${users.filter(u => !u.isActive).length})` }
                  ].map((f: any) => (
                    <button
                      key={f.key}
                      type="button"
                      onClick={() => setUserStatusFilter(f.key)}
                      className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                        userStatusFilter === f.key
                          ? 'bg-[#e5c158] text-black shadow'
                          : 'bg-black/40 text-gray-400 hover:text-white border border-white/5'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              <p className="text-[11px] text-gray-400">
                💡 اضغط على أي مستخدم أو رقمه لفتح ملفه الكامل وتعديل رصيده ونقاطه وصلاحيات باقات الـ VIP أو استعراض جهات اتصاله.
              </p>

              <div className="overflow-x-auto rounded-xl border border-white/5">
                <table className="w-full text-right text-xs">
                  <thead className="bg-black/40">
                    <tr className="text-gray-400 border-b border-white/5">
                      <th className="p-3">رقم الهاتف (اضغط لفتح الملف)</th>
                      <th className="p-3">معرف الجهاز / الموديل</th>
                      <th className="p-3 text-center">النقاط</th>
                      <th className="p-3 text-center">رصيد اليوم</th>
                      <th className="p-3 text-center">باقات VIP (كشف / حذف)</th>
                      <th className="p-3 text-center">الحالة</th>
                      <th className="p-3 text-left">العمليات الإدارية</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-gray-500">
                          لا يوجد مستخدم مطابق لبحثك «{userSearchQuery}»
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map((user) => (
                        <tr
                          key={user.id}
                          onClick={() => handleOpenPlanModal(user)}
                          className="hover:bg-white/[0.04] transition-colors cursor-pointer group"
                          title="انقر لفتح ملف المستخدم الكامل والتحكم بصلاحياته"
                        >
                          <td className="p-3 font-bold font-mono text-white group-hover:text-[#ffcc00] transition-colors flex items-center gap-2">
                            <span className="underline decoration-dotted underline-offset-4">{user.phone}</span>
                            <Edit3 className="w-3 h-3 text-gray-500 group-hover:text-[#ffcc00] opacity-70" />
                          </td>
                          <td className="p-3 text-gray-400 font-mono text-[10px]">
                            <div>{user.deviceType || 'غير معروف'}</div>
                            <div className="text-gray-600 text-[9px]">{(user.deviceId || '').substring(0, 15)}...</div>
                          </td>
                          <td className="p-3 text-center text-[#e5c158] font-bold font-mono">{user.points}</td>
                          <td className="p-3 text-center font-mono">{user.searchBalance}</td>
                          <td className="p-3 text-center space-y-1">
                            {user.canRevealRegistrar || user.canDeleteNames ? (
                              <div className="flex flex-col items-center gap-1">
                                {user.canRevealRegistrar && (
                                  <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-purple-500/15 text-purple-300 border border-purple-500/30">
                                    <Award className="w-2.5 h-2.5 text-purple-400" />
                                    <span>كشف ({user.revealRegistrarUsed || 0}/{user.revealRegistrarLimit || 0})</span>
                                  </div>
                                )}
                                {user.canDeleteNames && (
                                  <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-rose-500/15 text-rose-300 border border-rose-500/30">
                                    <Trash2 className="w-2.5 h-2.5 text-rose-400" />
                                    <span>حذف ({user.nameDeletionsUsed || 0}/{user.nameDeletionsLimit || 0})</span>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-gray-500 text-[10px]">غير مفعل</span>
                            )}
                          </td>
                          <td className="p-3 text-center">
                            <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${user.isActive ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                              {user.isActive ? 'نشط' : 'معطل'}
                            </span>
                          </td>
                          <td className="p-3 text-left" onClick={(e) => e.stopPropagation()}>
                            <div className="inline-flex items-center gap-1.5" dir="ltr">
                              <button
                                onClick={() => {
                                  setUserFilter(user.phone);
                                  setActiveTab('database');
                                  fetchFullDatabase();
                                }}
                                className="px-2 py-1 text-[9px] font-bold bg-blue-500/15 text-blue-300 border border-blue-500/30 hover:bg-blue-500/25 rounded flex items-center gap-1 transition-all cursor-pointer"
                                title="عرض كافة جهات الاتصال التي زامنها هذا المستخدم"
                              >
                                <Database className="w-3 h-3" />
                                <span>جهات اتصاله</span>
                              </button>
                              <button
                                onClick={() => handleOpenPlanModal(user)}
                                className="px-2 py-1 text-[9px] font-bold bg-purple-500/15 text-purple-300 border border-purple-500/30 hover:bg-purple-500/25 rounded flex items-center gap-1 transition-all cursor-pointer"
                                title="فتح ملف المستخدم الكامل وصلاحيات VIP"
                              >
                                <Award className="w-3 h-3 text-purple-400" />
                                <span>ملف المستخدم / VIP</span>
                              </button>
                              <button
                                onClick={() => handleToggleUser(user.id)}
                                className={`p-1 rounded cursor-pointer ${user.isActive ? 'text-yellow-400 bg-yellow-500/10 hover:bg-yellow-500/20' : 'text-green-400 bg-green-500/10 hover:bg-green-500/20'}`}
                                title={user.isActive ? "تعطيل الحساب" : "تفعيل الحساب"}
                              >
                                {user.isActive ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                              </button>
                              <button
                                onClick={() => handleGrantPoints(user.id, 50)}
                                className="px-2 py-1 text-[9px] font-bold bg-[#c5a059]/10 text-[#e5c158] border border-[#c5a059]/20 hover:bg-[#c5a059]/20 rounded cursor-pointer"
                              >
                                +50نقطة
                              </button>
                              <button
                                onClick={() => handleDeleteUser(user.id)}
                                className="p-1 text-red-400 bg-red-500/10 hover:bg-red-500/20 rounded cursor-pointer"
                                title="حذف نهائي"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB: VIP PLANS & PRICING MANAGEMENT */}
          {activeTab === 'plans' && (
            <div className="space-y-6">
              {/* Header Bar */}
              <div className="bg-[#0c122b]/90 border border-purple-500/30 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1 text-right">
                  <div className="flex items-center gap-2">
                    <Crown className="w-5 h-5 text-yellow-400" />
                    <h3 className="text-white text-base md:text-lg font-bold">إدارة وتخصيص باقات كاشف المسجّل VIP</h3>
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40">
                      {vipPlans.length} باقة
                    </span>
                  </div>
                  <p className="text-gray-400 text-xs">
                    تعديل ما تقدمه كل باقة، وعدد عمليات الاستعلام، والأسعار بالريال اليمني والدولار، والتحكم بظهورها الفوري للمستخدمين.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleOpenNewPlanModal}
                  className="px-4 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg flex items-center gap-2 transition-all active:scale-95 shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  <span>إضافة باقة جديدة</span>
                </button>
              </div>

              {/* Plans Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {vipPlans.map((plan) => (
                  <div
                    key={plan.id}
                    className={`relative rounded-3xl p-5 border-2 transition-all space-y-4 flex flex-col justify-between ${
                      plan.isActive
                        ? 'bg-gradient-to-b from-[#150d30] to-[#090e24] border-purple-500/40 shadow-lg'
                        : 'bg-black/40 border-white/5 opacity-70'
                    }`}
                  >
                    {/* Badge */}
                    {plan.badge && (
                      <div className="absolute -top-3 right-6 bg-gradient-to-r from-yellow-500 to-amber-500 text-black text-[9px] font-black px-2.5 py-0.5 rounded-full shadow-md">
                        {plan.badge}
                      </div>
                    )}

                    <div className="space-y-3">
                      <div className="flex items-center justify-between pt-1">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${plan.isActive ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                          {plan.isActive ? 'مفعلة وتظهر للعملاء' : 'معطلة مخفية'}
                        </span>
                        <h4 className="text-white text-base font-black">{plan.name}</h4>
                      </div>

                      <p className="text-gray-300 text-xs leading-relaxed min-h-[32px]">
                        {plan.description}
                      </p>

                      <div className="p-3 rounded-xl bg-black/40 border border-white/5 space-y-1">
                        <div className="flex items-baseline justify-between">
                          <span className="text-gray-400 text-xs">سعر الباقة:</span>
                          <span className="text-yellow-400 font-mono font-black text-lg">
                            {plan.priceYmr.toLocaleString('ar-EG')} <span className="text-xs text-yellow-200">ريال يمني</span>
                          </span>
                        </div>
                        {plan.priceUsd > 0 && (
                          <div className="text-left text-[10px] text-gray-400 font-mono" dir="ltr">
                            ~ ${plan.priceUsd} USD
                          </div>
                        )}
                      </div>

                      <div className="space-y-1.5 py-1 border-b border-white/5 text-xs">
                        {plan.revealsCount > 0 && (
                          <div className="flex items-center justify-between">
                            <span className="text-gray-400">عمليات كشف المسجّل:</span>
                            <span className="text-purple-300 font-mono font-bold text-xs bg-purple-500/20 px-2 py-0.5 rounded border border-purple-500/30">
                              {plan.revealsCount} كشف
                            </span>
                          </div>
                        )}
                        {(plan.nameDeletionsCount || 0) > 0 && (
                          <div className="flex items-center justify-between">
                            <span className="text-gray-400">حذف وتعديل الأسماء:</span>
                            <span className="text-rose-300 font-mono font-bold text-xs bg-rose-500/20 px-2 py-0.5 rounded border border-rose-500/30">
                              {plan.nameDeletionsCount} أسماء 🛡️
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Features */}
                      <div className="space-y-1 text-xs">
                        <span className="text-gray-400 text-[10px] block">المزايا المضمنة:</span>
                        {(plan.features || []).map((feat, idx) => (
                          <div key={idx} className="flex items-center gap-1.5 text-gray-300 text-[11px]">
                            <Check className="w-3 h-3 text-green-400 shrink-0" />
                            <span>{feat}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="pt-3 border-t border-white/5 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => handleToggleVipPlanStatus(plan)}
                        className={`text-[10px] font-bold px-2.5 py-1.5 rounded-lg border transition-all cursor-pointer ${
                          plan.isActive
                            ? 'bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20'
                            : 'bg-green-500/10 text-green-400 border-green-500/20 hover:bg-green-500/20'
                        }`}
                      >
                        {plan.isActive ? 'تعطيل الباقة' : 'تفعيل الباقة'}
                      </button>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenEditPlanModal(plan)}
                          className="px-3 py-1.5 bg-purple-600/20 hover:bg-purple-600/30 text-purple-200 border border-purple-500/30 rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>تعديل</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteVipPlan(plan.id)}
                          className="p-1.5 text-red-400 bg-red-500/10 hover:bg-red-500/20 rounded-lg transition-all cursor-pointer"
                          title="حذف الباقة"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* DELETED NAMES QUICK BANNER IN PLANS TAB */}
              <div className="bg-[#0c122b]/90 border border-rose-500/30 rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
                <button
                  type="button"
                  onClick={() => setActiveTab('deleted_names')}
                  className="px-4 py-2.5 bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white font-bold text-xs rounded-xl shadow-lg flex items-center gap-2 transition-all cursor-pointer shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>فتح قسم إدارة الأسماء المحذوفة الكامل ({deletedNames.length})</span>
                </button>
                <div className="text-right space-y-1">
                  <div className="flex items-center gap-2 justify-end">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                      {deletedNames.filter(d => !d.restored).length} مخفي حالياً
                    </span>
                    <h4 className="text-white text-sm font-bold">إدارة الأسماء التي حذفها المشتركون واستعادتها</h4>
                  </div>
                  <p className="text-gray-400 text-xs">
                    يمكنك تصفح جميع الأسماء المحذوفة، أو تحديد الكل وتفعيلها دفعة واحدة من قسم «الأسماء المحذوفة 🛡️».
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB: DELETED NAMES MANAGEMENT (SINGLE & BULK ACTIONS) */}
          {activeTab === 'deleted_names' && (() => {
            const visibleIds = filteredDeletedNames.map((r) => r.id);
            const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedDeletedIds.includes(id));
            const hiddenCount = deletedNames.filter((d) => !d.restored).length;
            const restoredCount = deletedNames.filter((d) => d.restored).length;

            return (
              <div className="space-y-6">
                {/* Top Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-[#0c122b]/80 border border-white/10 rounded-2xl p-4 space-y-1">
                    <span className="text-gray-400 text-[11px] font-bold block">إجمالي عمليات حذف الأسماء</span>
                    <div className="text-white text-2xl font-black font-mono">{deletedNames.length}</div>
                    <span className="text-gray-500 text-[10px] block">جميع السجلات المقيدة في النظام</span>
                  </div>

                  <div className="bg-[#0c122b]/80 border border-rose-500/30 rounded-2xl p-4 space-y-1">
                    <span className="text-rose-300 text-[11px] font-bold block">أسماء مخفية ومحذوفة حالياً</span>
                    <div className="text-rose-400 text-2xl font-black font-mono">{hiddenCount}</div>
                    <span className="text-gray-400 text-[10px] block">محجوبة ولا تظهر للمستخدمين في البحث</span>
                  </div>

                  <div className="bg-[#0c122b]/80 border border-emerald-500/30 rounded-2xl p-4 space-y-1">
                    <span className="text-emerald-300 text-[11px] font-bold block">أسماء تمت استعادتها وتفعيلها</span>
                    <div className="text-emerald-400 text-2xl font-black font-mono">{restoredCount}</div>
                    <span className="text-gray-400 text-[10px] block">عادت للظهور بشكل طبيعي في نتائج البحث</span>
                  </div>
                </div>

                {/* Main Management Box */}
                <div className="bg-[#0c122b]/90 border border-rose-500/30 rounded-2xl p-5 space-y-5">
                  {/* Header & Quick "Apply to All" Actions */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/10">
                    <div className="space-y-1 text-right">
                      <div className="flex items-center gap-2">
                        <Trash2 className="w-5 h-5 text-rose-400" />
                        <h3 className="text-white text-base md:text-lg font-bold">إدارة الأسماء المحذوفة بواسطة المستخدمين</h3>
                      </div>
                      <p className="text-gray-400 text-xs">
                        تحكم كامل بالأسماء التي قام المشتركون بحذفها: يمكنك البحث، تحديد الكل، إعادة تفعيلها لتظهر في البحث مجدداً، أو إعادة إخفائها.
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {hiddenCount > 0 && (
                        <button
                          type="button"
                          disabled={bulkDeletedLoading}
                          onClick={() => {
                            const allHiddenIds = deletedNames.filter((d) => !d.restored).map((d) => d.id);
                            handleDeletedNamesAction(allHiddenIds, 'restore');
                          }}
                          className="px-3.5 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>تفعيل واستعادة كل المخفي ({hiddenCount}) ↩️</span>
                        </button>
                      )}
                      {restoredCount > 0 && (
                        <button
                          type="button"
                          disabled={bulkDeletedLoading}
                          onClick={() => {
                            const allRestoredIds = deletedNames.filter((d) => d.restored).map((d) => d.id);
                            handleDeletedNamesAction(allRestoredIds, 'rehide');
                          }}
                          className="px-3.5 py-2 bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/40 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>إعادة إخفاء كل المستعاد ({restoredCount}) 🚫</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Search & Filter Controls */}
                  <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                    <div className="relative flex-1">
                      <input
                        type="text"
                        value={deletedNamesSearch}
                        onChange={(e) => setDeletedNamesSearch(e.target.value)}
                        placeholder="ابحث بالرقم المستهدف، أو الاسم المحذوف، أو رقم المشترك الذي حذفه..."
                        className="w-full py-2.5 pl-8 pr-9 text-xs bg-black/50 border border-white/10 focus:border-rose-400 rounded-xl text-white outline-none transition-all"
                      />
                      <Search className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2" />
                      {deletedNamesSearch && (
                        <button
                          type="button"
                          onClick={() => setDeletedNamesSearch('')}
                          className="text-gray-400 hover:text-white absolute left-2.5 top-1/2 -translate-y-1/2 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      {[
                        { key: 'all', label: `الكل (${deletedNames.length})` },
                        { key: 'hidden', label: `مخفي حالياً (${hiddenCount})` },
                        { key: 'restored', label: `مُفعّل / مستعاد (${restoredCount})` },
                      ].map((f) => (
                        <button
                          key={f.key}
                          type="button"
                          onClick={() => setDeletedNamesStatusFilter(f.key as any)}
                          className={`px-3 py-2 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                            deletedNamesStatusFilter === f.key
                              ? 'bg-rose-500 text-white shadow-md'
                              : 'bg-black/40 text-gray-400 hover:text-white border border-white/5'
                          }`}
                        >
                          {f.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Select All & Bulk Action Bar */}
                  <div className="bg-black/50 border border-white/10 rounded-xl p-3 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={toggleSelectAllDeleted}
                        disabled={filteredDeletedNames.length === 0}
                        className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-bold flex items-center gap-2 transition-all cursor-pointer disabled:opacity-40"
                      >
                        <input
                          type="checkbox"
                          checked={allVisibleSelected}
                          onChange={() => {}}
                          className="w-4 h-4 accent-rose-500 rounded cursor-pointer pointer-events-none"
                        />
                        <span>
                          {allVisibleSelected
                            ? `إلغاء تحديد الكل (${filteredDeletedNames.length})`
                            : `تحديد الكل (${filteredDeletedNames.length})`}
                        </span>
                      </button>

                      {selectedDeletedIds.length > 0 && (
                        <span className="text-xs font-bold text-[#e5c158]">
                          تم تحديد <span className="font-mono underline">{selectedDeletedIds.length}</span> سجل
                        </span>
                      )}
                    </div>

                    {/* Bulk Action Buttons */}
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        disabled={selectedDeletedIds.length === 0 || bulkDeletedLoading}
                        onClick={() => handleDeletedNamesAction(selectedDeletedIds, 'restore')}
                        className="px-3.5 py-2 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white rounded-xl text-xs font-extrabold flex items-center gap-1.5 shadow-md transition-all cursor-pointer disabled:opacity-40"
                      >
                        {bulkDeletedLoading ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Check className="w-3.5 h-3.5" />
                        )}
                        <span>تفعيل واستعادة المحدد ({selectedDeletedIds.length}) ↩️</span>
                      </button>

                      <button
                        type="button"
                        disabled={selectedDeletedIds.length === 0 || bulkDeletedLoading}
                        onClick={() => handleDeletedNamesAction(selectedDeletedIds, 'rehide')}
                        className="px-3.5 py-2 bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/40 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-40"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>إعادة إخفاء المحدد ({selectedDeletedIds.length}) 🚫</span>
                      </button>

                      <button
                        type="button"
                        disabled={selectedDeletedIds.length === 0 || bulkDeletedLoading}
                        onClick={() => handleDeletedNamesAction(selectedDeletedIds, 'delete_log')}
                        className="px-3 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/30 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-40"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>حذف السجلات المحددة</span>
                      </button>
                    </div>
                  </div>

                  {/* Deleted Names Table */}
                  {filteredDeletedNames.length === 0 ? (
                    <div className="text-center py-12 bg-black/20 rounded-xl border border-white/5 space-y-2">
                      <Trash2 className="w-8 h-8 text-gray-600 mx-auto" />
                      <p className="text-gray-400 text-xs font-bold">
                        {deletedNames.length === 0
                          ? 'لم يقم أي مستخدم بحذف أسماء من قاعدة البيانات حتى الآن.'
                          : 'لا توجد سجلات مطابقة لبحثك أو الفلتر المحدد.'}
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-xl border border-white/10">
                      <table className="w-full text-right text-xs">
                        <thead className="bg-black/60 text-gray-400 border-b border-white/10">
                          <tr>
                            <th className="p-3 w-10 text-center">
                              <input
                                type="checkbox"
                                checked={allVisibleSelected}
                                onChange={toggleSelectAllDeleted}
                                className="w-4 h-4 accent-rose-500 rounded cursor-pointer"
                                title="تحديد / إلغاء تحديد الكل"
                              />
                            </th>
                            <th className="p-3">الرقم المستهدف</th>
                            <th className="p-3">الاسم المحذوف</th>
                            <th className="p-3">حُذف بواسطة المشترك</th>
                            <th className="p-3">تاريخ ووقت الحذف</th>
                            <th className="p-3 text-center">حالة الاسم بالبحث</th>
                            <th className="p-3 text-left">إجراءات التحكم</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {filteredDeletedNames.map((rec) => {
                            const isSelected = selectedDeletedIds.includes(rec.id);
                            const matchingUser = users.find((u) => u.phone === rec.deletedByPhone);

                            return (
                              <tr
                                key={rec.id}
                                onClick={() => toggleSelectDeletedId(rec.id)}
                                className={`transition-colors cursor-pointer ${
                                  isSelected ? 'bg-rose-500/10 hover:bg-rose-500/15' : 'hover:bg-white/[0.03]'
                                }`}
                              >
                                <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => toggleSelectDeletedId(rec.id)}
                                    className="w-4 h-4 accent-rose-500 rounded cursor-pointer"
                                  />
                                </td>

                                <td className="p-3 font-mono font-bold text-white" onClick={(e) => e.stopPropagation()}>
                                  <div className="flex items-center gap-1.5">
                                    <span>{rec.phoneNumber}</span>
                                    <button
                                      type="button"
                                      onClick={() => handleCopyContactPhone(rec.phoneNumber)}
                                      className="p-1 text-gray-500 hover:text-white rounded"
                                      title="نسخ الرقم"
                                    >
                                      <Copy className="w-3 h-3" />
                                    </button>
                                  </div>
                                </td>

                                <td className="p-3 font-bold text-yellow-300 text-sm">
                                  «{rec.contactName}»
                                </td>

                                <td className="p-3 font-mono text-gray-300" onClick={(e) => e.stopPropagation()}>
                                  {matchingUser ? (
                                    <button
                                      type="button"
                                      onClick={() => handleOpenPlanModal(matchingUser)}
                                      className="px-2.5 py-1 rounded-lg bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 border border-purple-500/30 text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                                      title="فتح ملف هذا المشترك"
                                    >
                                      <span>{rec.deletedByPhone}</span>
                                      <Crown className="w-3 h-3 text-yellow-400" />
                                    </button>
                                  ) : (
                                    <span>{rec.deletedByPhone || 'غير معروف'}</span>
                                  )}
                                </td>

                                <td className="p-3 font-mono text-[11px] text-gray-400">
                                  {rec.deletedAt ? rec.deletedAt.replace('T', ' ').substring(0, 16) : '-'}
                                </td>

                                <td className="p-3 text-center">
                                  {rec.restored ? (
                                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 inline-flex items-center gap-1">
                                      <Check className="w-3 h-3" />
                                      <span>مُفعّل ويظهر بالبحث</span>
                                    </span>
                                  ) : (
                                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30 inline-flex items-center gap-1">
                                      <X className="w-3 h-3" />
                                      <span>مخفي ومحذوف</span>
                                    </span>
                                  )}
                                </td>

                                <td className="p-3 text-left" onClick={(e) => e.stopPropagation()}>
                                  <div className="flex items-center justify-end gap-1.5">
                                    {rec.restored ? (
                                      <button
                                        type="button"
                                        onClick={() => handleDeletedNamesAction([rec.id], 'rehide')}
                                        disabled={restoringRecordId === rec.id || bulkDeletedLoading}
                                        className="px-3 py-1.5 bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/30 rounded-lg text-[10px] font-bold transition-all cursor-pointer disabled:opacity-50"
                                      >
                                        {restoringRecordId === rec.id ? 'جاري التنفيذ...' : 'إعادة إخفاء 🚫'}
                                      </button>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => handleDeletedNamesAction([rec.id], 'restore')}
                                        disabled={restoringRecordId === rec.id || bulkDeletedLoading}
                                        className="px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 rounded-lg text-[10px] font-bold transition-all cursor-pointer disabled:opacity-50"
                                      >
                                        {restoringRecordId === rec.id ? 'جاري الاستعادة...' : 'تفعيل واستعادة ↩️'}
                                      </button>
                                    )}

                                    <button
                                      type="button"
                                      onClick={() => handleDeletedNamesAction([rec.id], 'delete_log')}
                                      disabled={restoringRecordId === rec.id || bulkDeletedLoading}
                                      className="p-1.5 text-red-400 bg-red-500/10 hover:bg-red-500/20 rounded-lg transition-all cursor-pointer disabled:opacity-50"
                                      title="مسح السجل من القائمة"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

          {/* TAB 3: DATABASE CRUD MANAGER */}
          {activeTab === 'database' && (() => {
            const filteredContacts = (contacts || []).filter(c => {
              if (userFilter !== 'all' && c.addedByUser !== userFilter) return false;
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
                  {/* Search bar & Page-size selector & Contributor filter */}
                  <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 flex-1">
                      <div className="relative flex-1 max-w-md">
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

                      {/* Contributor filter dropdown */}
                      <div className="flex items-center gap-1.5 bg-black/40 border border-white/10 rounded-xl px-2.5 py-1.5 shrink-0">
                        <Filter className="w-3.5 h-3.5 text-[#e5c158]" />
                        <span className="text-[11px] text-gray-400 whitespace-nowrap">المستخدم:</span>
                        <select
                          value={userFilter}
                          onChange={(e) => {
                            setUserFilter(e.target.value);
                            setDbPage(1);
                          }}
                          className="bg-transparent text-white text-xs outline-none max-w-[150px] font-mono cursor-pointer"
                        >
                          <option value="all" className="bg-[#0c122b] text-white">الكل ({uniqueContributors.length})</option>
                          {uniqueContributors.map(u => (
                            <option key={u} value={u} className="bg-[#0c122b] text-white">{u}</option>
                          ))}
                        </select>
                        {userFilter !== 'all' && (
                          <button
                            onClick={() => {
                              setUserFilter('all');
                              setDbPage(1);
                            }}
                            className="text-[10px] text-yellow-400 hover:text-white underline font-bold px-1 whitespace-nowrap"
                            title="إلغاء تصفية المستخدم والعودة لعرض الكل"
                          >
                            عرض الكل
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 justify-between sm:justify-end text-xs shrink-0">
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
                                <td className="p-3 text-[11px] font-mono">
                                  {c.addedByUser ? (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setUserFilter(c.addedByUser);
                                        setDbPage(1);
                                      }}
                                      className={`px-2 py-0.5 rounded text-[10px] font-mono transition-all text-right inline-flex items-center gap-1 ${
                                        userFilter === c.addedByUser
                                          ? 'bg-[#e5c158]/20 text-[#e5c158] border border-[#e5c158]/40 font-bold'
                                          : 'bg-white/5 text-gray-300 hover:text-white hover:bg-white/10'
                                      }`}
                                      title="تصفية وعرض جميع جهات هذا المستخدم فقط"
                                    >
                                      <span>{c.addedByUser}</span>
                                      <Filter className="w-2.5 h-2.5 opacity-60" />
                                    </button>
                                  ) : (
                                    <span className="text-gray-500">مزامنة عامة</span>
                                  )}
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
              <div className="flex items-center justify-between pb-3 border-b border-white/5">
                <span className="text-gray-400 text-xs">تحكم بخصائص الحماية وإلزامية الحساب وعمليات النظام</span>
                <h3 className="text-white text-sm font-bold">تعديل قيم وإعدادات نظام "معروف"</h3>
              </div>

              {/* Login Requirement Control (Guest Mode vs Required Phone Login) */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-[#071948] to-[#0d2a7a] border-2 border-[#ffcc00]/40 space-y-3 shadow-lg">
                <div className="flex items-center justify-between gap-4">
                  <button
                    onClick={() => setLocalSettings({ ...localSettings, requirePhoneLogin: !localSettings.requirePhoneLogin })}
                    className="text-[#ffcc00] transition-transform active:scale-95 shrink-0"
                    title={localSettings.requirePhoneLogin ? 'انقر للتعطيل' : 'انقر للتفعيل'}
                  >
                    {localSettings.requirePhoneLogin ? <ToggleRight className="w-11 h-11 text-green-400" /> : <ToggleLeft className="w-11 h-11 text-gray-500" />}
                  </button>
                  <div className="text-right flex-1">
                    <div className="flex items-center gap-2 justify-end">
                      <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${localSettings.requirePhoneLogin ? 'bg-green-500/20 text-green-300 border border-green-500/30' : 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30'}`}>
                        {localSettings.requirePhoneLogin ? 'إلزامية الدخول: مفعلة' : 'وضع الزائر: متاح ومسموح'}
                      </span>
                      <span className="text-white text-sm font-extrabold block">إلزامية تسجيل الدخول برقم الهاتف</span>
                    </div>
                    <span className="text-gray-300 text-[11px] block mt-1.5 leading-relaxed">
                      {localSettings.requirePhoneLogin
                        ? 'مفعل: لا يمكن لأي مستخدم استخدام التطبيق أو البحث أو المزامنة إلا بعد تسجيل الدخول برقم هاتفه.'
                        : 'معطل: يمكن للمستخدمين الدخول كزوار واستخدام البحث مباشرة بعد مزامنة جهات اتصال هواتفهم دون الحاجة لرقم هاتف.'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Reveal Registrar Global Access Control */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-[#1c0e35] to-[#2a1352] border-2 border-purple-500/40 space-y-3 shadow-lg">
                <div className="flex items-center justify-between gap-4">
                  <button
                    onClick={() => setLocalSettings({ ...localSettings, allowRevealRegistrarGlobal: !localSettings.allowRevealRegistrarGlobal })}
                    className="text-purple-400 transition-transform active:scale-95 shrink-0"
                    title={localSettings.allowRevealRegistrarGlobal ? 'انقر للتعطيل' : 'انقر للتفعيل'}
                  >
                    {localSettings.allowRevealRegistrarGlobal ? <ToggleRight className="w-11 h-11 text-purple-400" /> : <ToggleLeft className="w-11 h-11 text-gray-500" />}
                  </button>
                  <div className="text-right flex-1">
                    <div className="flex items-center gap-2 justify-end">
                      <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${localSettings.allowRevealRegistrarGlobal ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' : 'bg-gray-500/20 text-gray-300 border border-gray-500/30'}`}>
                        {localSettings.allowRevealRegistrarGlobal ? 'متاح ومجاني للجميع' : 'ميزة مدفوعة للمشتركين فقط'}
                      </span>
                      <span className="text-white text-sm font-extrabold flex items-center gap-1.5">
                        <Award className="w-4 h-4 text-purple-400" />
                        <span>إتاحة كاشف مسجّل الأرقام لجميع المستخدمين</span>
                      </span>
                    </div>
                    <span className="text-gray-300 text-[11px] block mt-1.5 leading-relaxed">
                      {localSettings.allowRevealRegistrarGlobal
                        ? 'مفعل للجميع: يمكن لأي مستخدم في نتائج البحث الضغط على «من سجّل هذا الاسم؟» ومعرفة صاحب الحساب الذي زامن هذا الاسم مجاناً.'
                        : 'حصر بالمشتركين (VIP): تظل الميزة حصرية للمستخدمين المفعلة لهم خطة باقة كاشف المسجل من لوحة الإدارة، وتظهر نافذة ترقية مع زر تواصل واتساب للبقية.'}
                    </span>
                  </div>
                </div>
              </div>

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

      {/* USER PROFILE & FULL CONTROL MODAL */}
      <AnimatePresence>
        {editingPlanUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto" dir="rtl">
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              className="relative w-full max-w-2xl overflow-hidden rounded-2xl border border-purple-500/30 bg-[#0c122b] p-6 text-right shadow-[0_20px_60px_rgba(0,0,0,0.9)] space-y-5 my-8 max-h-[92vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <button
                  type="button"
                  onClick={() => setEditingPlanUser(null)}
                  className="text-gray-400 hover:text-white p-1.5 rounded-lg hover:bg-white/5 transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
                <div className="flex items-center gap-2">
                  <h3 className="text-white text-sm sm:text-base font-bold">ملف المستخدم الشامل وإدارة الحساب والباقات</h3>
                  <Crown className="w-5 h-5 text-yellow-400" />
                </div>
              </div>

              {/* User Header & Quick Actions */}
              <div className="bg-black/40 border border-white/10 rounded-xl p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const phone = editingPlanUser.phone;
                        setEditingPlanUser(null);
                        setUserFilter(phone);
                        setActiveTab('database');
                        fetchFullDatabase();
                      }}
                      className="px-3 py-1.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <Database className="w-3.5 h-3.5" />
                      <span>عرض جهات اتصاله المزامنة</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const id = editingPlanUser.id;
                        setEditingPlanUser(null);
                        handleDeleteUser(id);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-red-500/15 hover:bg-red-500/25 text-red-400 border border-red-500/30 text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>حذف المستخدم</span>
                    </button>
                  </div>

                  <div className="text-right">
                    <div className="text-[11px] text-gray-400">رقم الهاتف المسجل:</div>
                    <div className="text-white font-mono font-extrabold text-lg tracking-wider">{editingPlanUser.phone}</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2 border-t border-white/5 text-[11px]">
                  <div className="bg-white/[0.02] p-2 rounded-lg border border-white/5">
                    <span className="text-gray-500 block">نوع الجهاز:</span>
                    <span className="text-gray-200 font-bold">{editingPlanUser.deviceType || 'غير معروف'}</span>
                  </div>
                  <div className="bg-white/[0.02] p-2 rounded-lg border border-white/5">
                    <span className="text-gray-500 block">معرف الجهاز (Device ID):</span>
                    <span className="text-gray-300 font-mono text-[10px] break-all">{editingPlanUser.deviceId || editingPlanUser.id}</span>
                  </div>
                  <div className="bg-white/[0.02] p-2 rounded-lg border border-white/5 col-span-2 sm:col-span-1">
                    <span className="text-gray-500 block">تاريخ الانضمام:</span>
                    <span className="text-gray-300 font-mono text-[10px]">
                      {editingPlanUser.createdAt ? new Date(editingPlanUser.createdAt).toLocaleString('ar-YE') : 'غير متوفر'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Section 1: Account Balances & General Status Controls */}
              <div className="p-4 rounded-xl bg-blue-950/20 border border-blue-500/25 space-y-4">
                <div className="flex items-center justify-between border-b border-white/5 pb-2">
                  <span className="text-[10px] text-blue-300 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">إعدادات الحساب الأساسية</span>
                  <h4 className="text-white text-xs font-bold flex items-center gap-1.5">
                    <span>الأرصدة وحالة الحساب والبحث</span>
                    <Users className="w-4 h-4 text-blue-400" />
                  </h4>
                </div>

                {/* Points & Search Balance Inputs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5 text-right bg-black/30 p-3 rounded-xl border border-white/5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setUserEditPoints((prev) => prev + 50)}
                          className="px-2 py-0.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 rounded text-[10px] font-bold cursor-pointer"
                        >
                          +50
                        </button>
                        <button
                          type="button"
                          onClick={() => setUserEditPoints((prev) => prev + 100)}
                          className="px-2 py-0.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 rounded text-[10px] font-bold cursor-pointer"
                        >
                          +100
                        </button>
                      </div>
                      <label className="text-[11px] text-gray-300 font-bold">رصيد النقاط (Points)</label>
                    </div>
                    <input
                      type="number"
                      min="0"
                      value={userEditPoints}
                      onChange={(e) => setUserEditPoints(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full p-2 bg-black/50 border border-white/10 rounded-xl text-white font-mono text-xs focus:border-blue-400 outline-none text-center font-bold"
                    />
                  </div>

                  <div className="space-y-1.5 text-right bg-black/30 p-3 rounded-xl border border-white/5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setUserEditSearchBalance((prev) => prev + 20)}
                          className="px-2 py-0.5 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 rounded text-[10px] font-bold cursor-pointer"
                        >
                          +20
                        </button>
                        <button
                          type="button"
                          onClick={() => setUserEditSearchBalance((prev) => prev + 100)}
                          className="px-2 py-0.5 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 rounded text-[10px] font-bold cursor-pointer"
                        >
                          +100
                        </button>
                      </div>
                      <label className="text-[11px] text-gray-300 font-bold">رصيد عمليات البحث اليومي</label>
                    </div>
                    <input
                      type="number"
                      min="0"
                      value={userEditSearchBalance}
                      onChange={(e) => setUserEditSearchBalance(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full p-2 bg-black/50 border border-white/10 rounded-xl text-white font-mono text-xs focus:border-blue-400 outline-none text-center font-bold"
                    />
                  </div>
                </div>

                {/* Status Toggles */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                  <div className="flex items-center justify-between bg-black/30 p-2.5 rounded-xl border border-white/5">
                    <button
                      type="button"
                      onClick={() => setUserEditIsActive(!userEditIsActive)}
                      className="cursor-pointer"
                    >
                      {userEditIsActive ? <ToggleRight className="w-8 h-8 text-emerald-400" /> : <ToggleLeft className="w-8 h-8 text-red-400" />}
                    </button>
                    <div className="text-right">
                      <span className="text-white text-[11px] font-bold block">حالة الحساب</span>
                      <span className={`text-[10px] font-bold ${userEditIsActive ? 'text-emerald-400' : 'text-red-400'}`}>
                        {userEditIsActive ? 'نشط ومفعل' : 'محظور / معطل'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between bg-black/30 p-2.5 rounded-xl border border-white/5">
                    <button
                      type="button"
                      onClick={() => setUserEditUnlockedUnlimited(!userEditUnlockedUnlimited)}
                      className="cursor-pointer"
                    >
                      {userEditUnlockedUnlimited ? <ToggleRight className="w-8 h-8 text-amber-400" /> : <ToggleLeft className="w-8 h-8 text-gray-500" />}
                    </button>
                    <div className="text-right">
                      <span className="text-white text-[11px] font-bold block">البحث اللامحدود</span>
                      <span className={`text-[10px] font-bold ${userEditUnlockedUnlimited ? 'text-amber-400' : 'text-gray-400'}`}>
                        {userEditUnlockedUnlimited ? 'مفتوح بلا حدود' : 'مقيد بالرصيد'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between bg-black/30 p-2.5 rounded-xl border border-white/5">
                    <button
                      type="button"
                      onClick={() => setUserEditContactsSynced(!userEditContactsSynced)}
                      className="cursor-pointer"
                    >
                      {userEditContactsSynced ? <ToggleRight className="w-8 h-8 text-cyan-400" /> : <ToggleLeft className="w-8 h-8 text-gray-500" />}
                    </button>
                    <div className="text-right">
                      <span className="text-white text-[11px] font-bold block">مزامنة الأسماء</span>
                      <span className={`text-[10px] font-bold ${userEditContactsSynced ? 'text-cyan-400' : 'text-gray-400'}`}>
                        {userEditContactsSynced ? 'تمت المزامنة' : 'غير مزامن'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 2: VIP Features (Reveal Registrar & Delete Names) */}
              <div className="space-y-3">
                {/* Quick Preset Actions */}
                <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] bg-white/[0.02] p-2.5 rounded-xl border border-white/5">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setPlanCanReveal(true);
                        setPlanCanDelete(true);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-purple-600/30 to-rose-600/30 border border-purple-400/40 text-white font-bold hover:brightness-110 transition-all cursor-pointer"
                    >
                      تفعيل الميزتين معاً (شامل)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPlanCanReveal(true);
                        setPlanCanDelete(false);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-purple-600/20 border border-purple-500/30 text-purple-200 font-bold hover:bg-purple-600/30 transition-all cursor-pointer"
                    >
                      كاشف المسجل فقط
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPlanCanReveal(false);
                        setPlanCanDelete(true);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-rose-600/20 border border-rose-500/30 text-rose-200 font-bold hover:bg-rose-600/30 transition-all cursor-pointer"
                    >
                      حذف الأسماء فقط
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPlanCanReveal(false);
                        setPlanCanDelete(false);
                      }}
                      className="px-2 py-1 rounded-lg bg-white/5 border border-white/10 text-gray-400 hover:text-white transition-all cursor-pointer"
                    >
                      إيقاف VIP
                    </button>
                  </div>
                  <span className="text-yellow-400 font-bold flex items-center gap-1">
                    <span>باقات وصلاحيات VIP:</span>
                    <Crown className="w-3.5 h-3.5" />
                  </span>
                </div>

                {/* Feature 1: Reveal Registrar */}
                <div className="p-3.5 rounded-xl bg-purple-950/20 border border-purple-500/25 space-y-3">
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setPlanCanReveal(!planCanReveal)}
                      className="text-purple-400 transition-transform active:scale-95 cursor-pointer"
                    >
                      {planCanReveal ? <ToggleRight className="w-10 h-10 text-purple-400" /> : <ToggleLeft className="w-10 h-10 text-gray-500" />}
                    </button>
                    <div className="text-right">
                      <span className="text-white text-xs font-bold flex items-center gap-1.5 justify-end">
                        <span>ميزة كاشف مسجّل الأرقام والأسماء</span>
                        <Award className="w-3.5 h-3.5 text-purple-400" />
                      </span>
                      <span className="text-gray-400 text-[10px]">السماح بمعرفة أرقام وحسابات من قاموا بتسجيل وتزامن الأسماء</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div className="space-y-1 text-right">
                      <label className="text-[11px] text-gray-300 font-bold">الحد الأقصى للكشف</label>
                      <input
                        type="number"
                        min="0"
                        value={planLimit}
                        onChange={(e) => setPlanLimit(Math.max(0, parseInt(e.target.value) || 0))}
                        className="w-full p-2 bg-black/50 border border-white/10 rounded-xl text-white font-mono text-xs focus:border-purple-400 outline-none"
                      />
                    </div>

                    <div className="space-y-1 text-right">
                      <label className="text-[11px] text-gray-300 font-bold">المستهلك من الكشف</label>
                      <input
                        type="number"
                        min="0"
                        value={planUsed}
                        onChange={(e) => setPlanUsed(Math.max(0, parseInt(e.target.value) || 0))}
                        className="w-full p-2 bg-black/50 border border-white/10 rounded-xl text-white font-mono text-xs focus:border-purple-400 outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Feature 2: Delete Names */}
                <div className="p-3.5 rounded-xl bg-rose-950/20 border border-rose-500/25 space-y-3">
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setPlanCanDelete(!planCanDelete)}
                      className="text-rose-400 transition-transform active:scale-95 cursor-pointer"
                    >
                      {planCanDelete ? <ToggleRight className="w-10 h-10 text-rose-400" /> : <ToggleLeft className="w-10 h-10 text-gray-500" />}
                    </button>
                    <div className="text-right">
                      <span className="text-white text-xs font-bold flex items-center gap-1.5 justify-end">
                        <span>ميزة حذف وإخفاء الأسماء من قاعدة البيانات</span>
                        <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                      </span>
                      <span className="text-gray-400 text-[10px]">السماح بحذف الأسماء غير المرغوبة من نتائج البحث نهائياً</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div className="space-y-1 text-right">
                      <label className="text-[11px] text-gray-300 font-bold">الحد الأقصى لحذف الأسماء</label>
                      <input
                        type="number"
                        min="0"
                        value={planDeleteLimit}
                        onChange={(e) => setPlanDeleteLimit(Math.max(0, parseInt(e.target.value) || 0))}
                        className="w-full p-2 bg-black/50 border border-white/10 rounded-xl text-white font-mono text-xs focus:border-rose-400 outline-none"
                      />
                    </div>

                    <div className="space-y-1 text-right">
                      <label className="text-[11px] text-gray-300 font-bold">المستهلك من الحذف</label>
                      <input
                        type="number"
                        min="0"
                        value={planDeleteUsed}
                        onChange={(e) => setPlanDeleteUsed(Math.max(0, parseInt(e.target.value) || 0))}
                        className="w-full p-2 bg-black/50 border border-white/10 rounded-xl text-white font-mono text-xs focus:border-rose-400 outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleSaveUserPlan}
                  disabled={savingPlan}
                  className="flex-1 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-extrabold text-xs rounded-xl shadow-lg transition-all flex items-center justify-center gap-1.5 disabled:opacity-60 cursor-pointer active:scale-95"
                >
                  {savingPlan ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>جاري حفظ التعديلات...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>حفظ كافة التغييرات وتطبيقها فوراً</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setEditingPlanUser(null)}
                  disabled={savingPlan}
                  className="px-5 py-3 bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-bold rounded-xl border border-white/5 transition-all cursor-pointer"
                >
                  إلغاء
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* VIP PLAN ADD / EDIT MODAL */}
      <AnimatePresence>
        {isPlanModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm overflow-y-auto" dir="rtl">
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              className="relative w-full max-w-lg overflow-hidden rounded-3xl border-2 border-purple-500/40 bg-[#0c122b] p-6 text-right shadow-[0_20px_60px_rgba(0,0,0,0.9)] space-y-4 my-8"
            >
              <div className="flex items-center justify-between pb-3 border-b border-white/5">
                <button
                  type="button"
                  onClick={() => setIsPlanModalOpen(false)}
                  className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
                <div className="flex items-center gap-2">
                  <h3 className="text-white text-base font-black">
                    {editingPlan ? 'تعديل باقة VIP' : 'إضافة باقة VIP جديدة'}
                  </h3>
                  <Crown className="w-5 h-5 text-yellow-400" />
                </div>
              </div>

              <form onSubmit={handleSaveVipPlanSubmit} className="space-y-3.5">
                <div className="space-y-1 text-right">
                  <label className="text-[11px] text-gray-300 font-bold block">نوع الباقة ومحتواها</label>
                  <select
                    value={planFormType}
                    onChange={(e: any) => setPlanFormType(e.target.value)}
                    className="w-full p-2.5 bg-black/50 border border-white/10 focus:border-purple-400 rounded-xl text-white text-xs outline-none cursor-pointer"
                  >
                    <option value="bundle" className="bg-[#0c122b]">باقة شاملة تجمع الميزتين (كاشف المسجّل + حذف الأسماء)</option>
                    <option value="reveal_only" className="bg-[#0c122b]">باقة كاشف المسجّل فقط</option>
                    <option value="delete_only" className="bg-[#0c122b]">باقة حذف الأسماء فقط</option>
                  </select>
                </div>

                <div className="space-y-1 text-right">
                  <label className="text-[11px] text-gray-300 font-bold block">اسم الباقة</label>
                  <input
                    type="text"
                    required
                    value={planFormName}
                    onChange={(e) => setPlanFormName(e.target.value)}
                    placeholder="مثال: باقة المحترفين (Pro VIP)"
                    className="w-full p-2.5 bg-black/50 border border-white/10 focus:border-purple-400 rounded-xl text-white text-xs outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1 text-right">
                    <label className="text-[11px] text-gray-300 font-bold block">السعر (ريال يمني)</label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={planFormPriceYmr}
                      onChange={(e) => setPlanFormPriceYmr(Number(e.target.value))}
                      className="w-full p-2.5 bg-black/50 border border-white/10 focus:border-purple-400 rounded-xl text-white font-mono text-xs outline-none"
                    />
                  </div>

                  <div className="space-y-1 text-right">
                    <label className="text-[11px] text-gray-300 font-bold block">السعر المعادل ($ USD)</label>
                    <input
                      type="number"
                      min="0"
                      value={planFormPriceUsd}
                      onChange={(e) => setPlanFormPriceUsd(Number(e.target.value))}
                      className="w-full p-2.5 bg-black/50 border border-white/10 focus:border-purple-400 rounded-xl text-white font-mono text-xs outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {planFormType !== 'delete_only' && (
                    <div className="space-y-1 text-right">
                      <label className="text-[11px] text-purple-300 font-bold block">عدد عمليات كشف المسجّل</label>
                      <input
                        type="number"
                        min="0"
                        value={planFormReveals}
                        onChange={(e) => setPlanFormReveals(Number(e.target.value))}
                        className="w-full p-2.5 bg-black/50 border border-purple-500/30 focus:border-purple-400 rounded-xl text-white font-mono text-xs outline-none"
                      />
                    </div>
                  )}

                  {planFormType !== 'reveal_only' && (
                    <div className="space-y-1 text-right">
                      <label className="text-[11px] text-rose-300 font-bold block">عدد عمليات حذف الأسماء 🗑️</label>
                      <input
                        type="number"
                        min="0"
                        value={planFormNameDeletions}
                        onChange={(e) => setPlanFormNameDeletions(Number(e.target.value))}
                        className="w-full p-2.5 bg-black/50 border border-rose-500/30 focus:border-rose-400 rounded-xl text-white font-mono text-xs outline-none"
                      />
                    </div>
                  )}
                </div>

                <div className="space-y-1 text-right">
                  <label className="text-[11px] text-gray-300 font-bold block">شارة تميز (Badge)</label>
                  <input
                    type="text"
                    value={planFormBadge}
                    onChange={(e) => setPlanFormBadge(e.target.value)}
                    placeholder="مثال: الأكثر طلباً ⭐ أو أفضل قيمة 👑"
                    className="w-full p-2.5 bg-black/50 border border-white/10 focus:border-purple-400 rounded-xl text-white text-xs outline-none"
                  />
                </div>

                <div className="space-y-1 text-right">
                  <label className="text-[11px] text-gray-300 font-bold block">ما تقدمه الباقة (الوصف المختصر)</label>
                  <input
                    type="text"
                    required
                    value={planFormDescription}
                    onChange={(e) => setPlanFormDescription(e.target.value)}
                    placeholder="كشف هوية ورقم مسجّل الاسم لـ 35 عملية + حذف 3 أسماء"
                    className="w-full p-2.5 bg-black/50 border border-white/10 focus:border-purple-400 rounded-xl text-white text-xs outline-none"
                  />
                </div>

                <div className="space-y-1 text-right">
                  <label className="text-[11px] text-gray-300 font-bold block">المزايا المضمنة (اكتب كل ميزة في سطر)</label>
                  <textarea
                    rows={4}
                    value={planFormFeaturesText}
                    onChange={(e) => setPlanFormFeaturesText(e.target.value)}
                    placeholder="كشف هوية ورقم من قام بحفظ الاسم&#10;حذف وإخفاء الأسماء غير المرغوبة&#10;أولوية في معالجة الطلبات"
                    className="w-full p-2.5 bg-black/50 border border-white/10 focus:border-purple-400 rounded-xl text-white text-xs outline-none font-sans leading-relaxed"
                  />
                </div>

                <div className="flex items-center gap-3 pt-3">
                  <button
                    type="submit"
                    disabled={savingVipPlan}
                    className="flex-1 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-xs rounded-xl shadow-lg transition-all flex items-center justify-center gap-1.5 disabled:opacity-60 cursor-pointer active:scale-95"
                  >
                    {savingVipPlan ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>جاري حفظ الباقة...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        <span>{editingPlan ? 'حفظ تعديلات الباقة' : 'نشر وتفعيل الباقة فوراً'}</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsPlanModalOpen(false)}
                    disabled={savingVipPlan}
                    className="px-5 py-2.5 bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-bold rounded-xl border border-white/5 transition-all cursor-pointer"
                  >
                    إلغاء
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
