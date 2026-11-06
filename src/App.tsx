import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, Smartphone, Award, HelpCircle, ShieldCheck, Cpu, LogOut, CheckCircle, 
  AlertCircle, Sparkles, Coins, KeyRound, Globe, ArrowRight, Settings, Info 
} from 'lucide-react';
import Header from './components/Header';
import SearchSection from './components/SearchSection';
import SyncSection from './components/SyncSection';
import RewardsSection from './components/RewardsSection';
import AdminDashboard from './components/AdminDashboard';
import AuthModal from './components/AuthModal';
import AdBanner from './components/AdBanner';
import { User, Ad, Transaction, SystemSettings } from './types';
import { safeFetchJson } from './utils/apiHelper';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
}

const DEFAULT_SETTINGS: SystemSettings = {
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
  maxAccountsPerDevice: 1,
  multiAccountDetection: true,
  logActivity: true,
  adminPhone: '774919194'
};

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('search');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [adminToken, setAdminToken] = useState<string>(() => {
    return localStorage.getItem('maarouf_admin_token') || '';
  });
  
  const [adsList, setAdsList] = useState<Ad[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [systemSettings, setSystemSettings] = useState<SystemSettings>(DEFAULT_SETTINGS);
  
  // UI Controls
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [adminInput, setAdminInput] = useState('');
  const [homeSyncing, setHomeSyncing] = useState(false);
  const [syncedInSession, setSyncedInSession] = useState(false);

  // Toast Dispatcher Helper
  const showToast = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'success') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  // Fetch initial configuration & active user on mount
  useEffect(() => {
    const initApp = async () => {
      try {
        // Fetch Settings
        const settingsRes = await fetch('/api/settings');
        if (settingsRes.ok) {
          const sData = await settingsRes.json();
          setSystemSettings(sData);
        }

        // Fetch Ads
        const adsRes = await fetch('/api/ads');
        if (adsRes.ok) {
          const aData = await adsRes.json();
          setAdsList(aData);
        }

        // Try to auto-log in if device fingerprint exists
        const deviceFingerprint = localStorage.getItem('maarouf_device_fingerprint');
        const savedPhone = localStorage.getItem('maarouf_phone_session');

        if (savedPhone || deviceFingerprint) {
          let url = '/api/auth/me?';
          if (savedPhone) url += `phone=${savedPhone}`;
          else if (deviceFingerprint) url += `deviceId=${deviceFingerprint}`;

          const meRes = await fetch(url);
          if (meRes.ok) {
            const userData = await meRes.json();
            setCurrentUser(userData);
            localStorage.setItem('maarouf_phone_session', userData.phone);
            fetchUserTransactions(userData.phone);
          }
        }
      } catch (e) {
        console.warn('Error loading initial app config:', e);
      }
    };

    initApp();
  }, []);

  // Fetch transaction log for active user
  const fetchUserTransactions = async (phone: string) => {
    try {
      const txData = await safeFetchJson(`/api/transactions?phone=${phone}`);
      setTransactions(txData);
    } catch (err) {
      console.warn('Could not fetch ledger logs:', err);
    }
  };

  // Re-fetch user profile to sync credit/points updates
  const refreshUserProfile = async () => {
    if (!currentUser) return;
    try {
      const userData = await safeFetchJson(`/api/auth/me?phone=${currentUser.phone}`);
      setCurrentUser(userData);
      fetchUserTransactions(userData.phone);
    } catch (e) {
      console.warn('Profile refresh error:', e);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('maarouf_phone_session');
    setCurrentUser(null);
    setSyncedInSession(false);
    setTransactions([]);
    showToast('تم تسجيل الخروج بنجاح.', 'info');
    setActiveTab('search');
  };

  // Execute Search query lookup
  const handleSearchLookup = async (query: string, type: 'standard' | 'advanced') => {
    if (!currentUser) throw new Error('يرجى تسجيل الدخول أولاً للبحث.');

    const url = `/api/search${type === 'advanced' ? '/advanced' : ''}?query=${query}&phone=${currentUser.phone}`;
    const data = await safeFetchJson(url);

    // Refresh profile state for balance decrement
    refreshUserProfile();
    return data;
  };

  // Handle Contact sync upload for a known user.
  const syncContactsForUser = async (user: User, contacts: { name: string; phone: string }[]) => {
    const data = await safeFetchJson('/api/contacts/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone: user.phone,
        contacts
      })
    });

    // Update profile
    setCurrentUser(data.user);
    setSyncedInSession(true);
    fetchUserTransactions(data.user.phone);
    window.dispatchEvent(new CustomEvent('maarouf:metrics-updated'));
    return data;
  };

  // Handle Contact sync upload using the current session.
  const handleSyncContacts = async (contacts: { name: string; phone: string }[]) => {
    if (!currentUser) throw new Error('يرجى تسجيل الدخول أولاً لمزامنة الأرقام.');
    return syncContactsForUser(currentUser, contacts);
  };

  const syncContactsAfterLogin = async (user: User) => {
    if (!window.MaaroufAndroid?.readContacts) {
      showToast('تم تسجيل الدخول. المزامنة التلقائية متاحة من تطبيق Android فقط.', 'info');
      return;
    }

    try {
      setHomeSyncing(true);
      showToast('تم تسجيل الدخول. اختر السماح لمزامنة جهات الاتصال تلقائياً.', 'info');
      const nativeResult = await window.MaaroufAndroid.readContacts();
      const contacts = typeof nativeResult === 'string' ? JSON.parse(nativeResult) : nativeResult;
      if (!Array.isArray(contacts) || contacts.length === 0) {
        showToast('تم تسجيل الدخول، لكن لم يتم العثور على جهات اتصال بأرقام.', 'warning');
        return;
      }
      const result = await syncContactsForUser(user, contacts);
      showToast(`تم تسجيل الدخول ومزامنة ${result.importedCount} جهة اتصال بنجاح.`, 'success');
    } catch (error: any) {
      showToast(error?.message || 'تم تسجيل الدخول، لكن فشلت مزامنة جهات الاتصال. يمكنك المحاولة من زر المزامنة.', 'error');
    } finally {
      setHomeSyncing(false);
    }
  };

  const handleHomeContactsSync = async () => {
    if (!currentUser) {
      setAuthModalOpen(true);
      return;
    }

    if (!window.MaaroufAndroid?.readContacts) {
      showToast('افتح التطبيق من APK Android الرسمي لاستخدام المزامنة التلقائية.', 'info');
      return;
    }

    try {
      setHomeSyncing(true);
      const nativeResult = await window.MaaroufAndroid.readContacts();
      const contacts = typeof nativeResult === 'string' ? JSON.parse(nativeResult) : nativeResult;
      if (!Array.isArray(contacts) || contacts.length === 0) {
        showToast('لم يتم العثور على جهات اتصال تحتوي على أرقام.', 'warning');
        return;
      }
      const result = await handleSyncContacts(contacts);
      showToast(`تمت مزامنة ${result.importedCount} جهة اتصال بنجاح.`, 'success');
    } catch (error: any) {
      showToast(error?.message || 'فشلت المزامنة. تأكد من منح إذن قراءة جهات الاتصال ثم أعد المحاولة.', 'error');
    } finally {
      setHomeSyncing(false);
    }
  };

  // Play/Simulate Rewarded Ad
  const handlePlayAdReward = async (adId: string) => {
    if (!currentUser) throw new Error('مطلوب تسجيل الدخول للحصول على مكافأة الإعلان.');

    const data = await safeFetchJson('/api/ads/view', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        adId,
        phone: currentUser.phone
      })
    });

    setCurrentUser(data.user);
    fetchUserTransactions(data.user.phone);
    return {
      rewardText: data.rewardText,
      user: data.user
    };
  };

  // Administrative login (no longer required via input, auto-detects owner)
  const handleAdminLogout = () => {
    handleLogout();
  };

  // Update Settings via admin tab
  const handleUpdateSettings = async (newSettings: SystemSettings) => {
    const data = await safeFetchJson('/api/admin/settings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-token': adminToken
      },
      body: JSON.stringify(newSettings)
    });

    setSystemSettings(data.settings);
  };

  const isManagerPhone = (phone?: string, adminPhone?: string) => {
    if (!phone) return false;
    const p = phone.trim().replace(/\s+/g, '');
    const a = (adminPhone || '').trim().replace(/\s+/g, '');
    return p === a || 
           p === '774919194' || 
           p === '74919194' || 
           p.endsWith('74919194') || 
           p.endsWith('774919194') ||
           (a.length > 0 && (a.endsWith(p) || p.endsWith(a)));
  };

  const isOwner = !!(currentUser && isManagerPhone(currentUser.phone, systemSettings?.adminPhone));

  useEffect(() => {
    if (currentUser && isManagerPhone(currentUser.phone, systemSettings?.adminPhone)) {
      setAdminToken(`${currentUser.phone}774282944trtr`);
    } else {
      setAdminToken('');
    }
  }, [currentUser, systemSettings]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#020b24] via-[#051c52] to-[#01081a] text-slate-100 font-sans selection:bg-[#ffb300]/30 selection:text-white relative">
      {/* Visual background electric blue & golden wave glows derived from the logo */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-32 right-1/4 w-[550px] h-[550px] bg-[#0d52ff]/15 rounded-full blur-[140px]" />
        <div className="absolute top-1/4 -left-20 w-[450px] h-[450px] bg-[#ffb300]/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-10 right-10 w-[500px] h-[500px] bg-[#0a3ec9]/20 rounded-full blur-[150px]" />
      </div>

      {/* Header element */}
      <Header
        currentUser={currentUser}
        onLogout={handleLogout}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isAdmin={isOwner}
        onOpenAuth={() => setAuthModalOpen(true)}
        drawerOpen={drawerOpen}
        setDrawerOpen={setDrawerOpen}
      />

      {/* Main Content Stage */}
      <main className="relative z-10 px-4 py-6 md:py-10 max-w-6xl mx-auto min-h-[75vh]">
        
        {/* Dynamic Banner Ad (Google AdMob / AdSense or custom banner) */}
        {((systemSettings.admobEnabled && systemSettings.admobBanner) || systemSettings.googleAdSenseEnabled) && (
          <div className="mb-6 max-w-xl mx-auto">
            <AdBanner 
              ad={adsList.find(ad => ad.status && ad.type === 'banner') || null}
              onAdClick={(id) => {
                fetch('/api/ads/click', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ adId: id })
                });
              }}
              googleAdSenseEnabled={systemSettings.googleAdSenseEnabled}
              googleAdSenseClientId={systemSettings.googleAdSenseClientId}
              googleAdSenseSlotId={systemSettings.googleAdSenseSlotId}
            />
          </div>
        )}

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {/* SEARCH TAB */}
            {activeTab === 'search' && (
              <>
                {currentUser && !syncedInSession && (
                  <div className="max-w-xs mx-auto mb-4 text-center">
                    <button
                      type="button"
                      onClick={handleHomeContactsSync}
                      disabled={homeSyncing}
                      className="w-full py-2 px-3.5 rounded-lg bg-gradient-to-r from-[#e5c158] to-[#c5a059] hover:from-[#f3e5ab] hover:to-[#e5c158] text-black font-extrabold text-xs shadow-md shadow-[#c5a059]/15 flex items-center justify-center gap-1.5 transition-all disabled:opacity-60 active:scale-95"
                    >
                      <Smartphone className="w-4 h-4 shrink-0" />
                      <span>{homeSyncing ? 'جارٍ مزامنة جهات الاتصال...' : 'مزامنة جهات الاتصال الآن'}</span>
                    </button>
                    <p className="text-gray-500 text-[10px] text-center mt-1.5">زر واحد لجلب جهات اتصال الهاتف ومزامنتها تلقائياً</p>
                  </div>
                )}
                <SearchSection
                  currentUser={currentUser}
                  onSearch={handleSearchLookup}
                  setActiveTab={setActiveTab}
                  onOpenAuth={() => setAuthModalOpen(true)}
                  showToast={showToast}
                  onRefreshUser={refreshUserProfile}
                  adsList={adsList}
                />
              </>
            )}

            {/* SYNC CONTACTS TAB */}
            {activeTab === 'sync' && (
              <SyncSection
                currentUser={currentUser}
                isOwner={isOwner}
                onSyncContacts={handleSyncContacts}
                showToast={showToast}
                setActiveTab={setActiveTab}
              />
            )}

            {/* REWARDS & ADS TAB */}
            {activeTab === 'rewards' && (
              <RewardsSection
                currentUser={currentUser}
                adsList={adsList}
                onPlayAd={handlePlayAdReward}
                transactions={transactions}
                onOpenAuth={() => setAuthModalOpen(true)}
                showToast={showToast}
                onRefreshUser={refreshUserProfile}
              />
            )}

            {/* PROFILE VIEW (Follows layout mockup 3) */}
            {activeTab === 'profile' && currentUser && (
              <div className="max-w-xl mx-auto space-y-6 text-right">
                <div className="bg-gradient-to-br from-[#0c122b]/80 to-[#070b1a] border border-[#c5a059]/20 rounded-2xl p-6 shadow-md relative overflow-hidden">
                  <div className="absolute top-0 left-0 p-4">
                    <span className="px-2 py-1 rounded bg-[#c5a059]/10 border border-[#c5a059]/20 text-[10px] text-[#e5c158] font-bold">حساب موثق</span>
                  </div>

                  <div className="flex flex-col items-center text-center space-y-3">
                    <div className="w-16 h-16 rounded-full bg-[#1e295d] border border-[#c5a059]/30 flex items-center justify-center text-[#e5c158] text-xl font-bold">
                      {currentUser.phone.substring(0, 2)}
                    </div>
                    <div>
                      <h3 className="text-white font-extrabold text-base">مستخدم معروف اليمني</h3>
                      <p className="text-[#e5c158] font-mono text-sm mt-0.5" dir="ltr">{currentUser.phone}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 w-full pt-4 border-t border-white/5">
                      <div className="bg-black/30 p-2.5 rounded-lg border border-white/5">
                        <span className="text-gray-500 text-[10px] block font-bold">نقاط المحفظة</span>
                        <span className="text-[#e5c158] font-bold text-sm font-mono mt-0.5">{currentUser.points}</span>
                      </div>
                      <div className="bg-black/30 p-2.5 rounded-lg border border-white/5">
                        <span className="text-gray-500 text-[10px] block font-bold">رصيد عمليات البحث</span>
                        <span className="text-white font-bold text-sm font-mono mt-0.5">{currentUser.searchBalance} / 3</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Device parameters details */}
                <div className="bg-gradient-to-br from-[#0c122b]/80 to-[#070b1a] border border-white/5 rounded-2xl p-5 space-y-3">
                  <h4 className="text-white text-xs font-extrabold flex items-center gap-1.5 justify-end">
                    <span>خصائص الجهاز الحالي المرتبط</span>
                    <Cpu className="w-4 h-4 text-[#e5c158]" />
                  </h4>
                  
                  <div className="divide-y divide-white/5 text-xs text-gray-300">
                    <div className="py-2.5 flex justify-between items-center font-mono">
                      <span className="text-white text-[10px] truncate max-w-[150px]">{currentUser.deviceId}</span>
                      <span className="text-gray-500 font-sans">معرف الجهاز البيومتري</span>
                    </div>

                    <div className="py-2.5 flex justify-between items-center">
                      <span className="text-white font-bold">{currentUser.deviceType}</span>
                      <span className="text-gray-500">طراز الجوال والعتاد</span>
                    </div>

                    <div className="py-2.5 flex justify-between items-center">
                      <span className="text-white font-bold">{currentUser.browser}</span>
                      <span className="text-gray-500">المتصفح النشط</span>
                    </div>

                    <div className="py-2.5 flex justify-between items-center font-mono">
                      <span className="text-white text-xs">{new Date(currentUser.createdAt).toLocaleDateString('ar-YE')}</span>
                      <span className="text-gray-500 font-sans">تاريخ التسجيل</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleLogout}
                  className="w-full py-3 bg-red-950/20 border border-red-900/30 text-red-400 font-bold text-xs rounded-xl hover:bg-red-900/10 transition-all flex items-center justify-center gap-1.5"
                >
                  <LogOut className="w-4 h-4" />
                  <span>تسجيل الخروج من الحساب والرباط البيومتري</span>
                </button>
              </div>
            )}

            {/* SETTINGS & ADMINISTRATION ACCESS TAB */}
            {activeTab === 'settings' && (
              <div className="max-w-xl mx-auto space-y-6 text-right">
                
                {/* Platform info and FAQ */}
                <div className="bg-gradient-to-br from-[#0c122b]/80 to-[#070b1a] border border-white/5 rounded-2xl p-5 space-y-4">
                  <h3 className="text-white text-sm font-bold flex items-center gap-1.5 justify-end">
                    <span>الأسئلة الشائعة والمساعدة</span>
                    <HelpCircle className="w-4 h-4 text-[#e5c158]" />
                  </h3>

                  <div className="space-y-3.5 text-xs text-gray-300 leading-relaxed">
                    <div className="space-y-1">
                      <h4 className="text-[#e5c158] font-bold">لماذا يتطلب البحث مزامنة جهات الاتصال؟</h4>
                      <p className="text-gray-400">
                        تعتمد منصة "معروف" بالكامل على قاعدة بيانات مجتمعية تشاركية. عند قيام كل مستخدم برفع جهات الاتصال لديه، نتمكن من تشكيل دليل موحد ودقيق لمعرفة هوية المكالمات الواردة وحجب المحتالين والمزعجين باليمن.
                      </p>
                    </div>

                    <div className="space-y-1 pt-2 border-t border-white/5">
                      <h4 className="text-[#e5c158] font-bold">هل بيانات دفتري الشخصي آمنة؟</h4>
                      <p className="text-gray-400">
                        بكل تأكيد. نستخدم أنظمة حماية مشفرة لمنع تسريب أي جهات اتصال أو استخدامها في أغراض تجارية. منصة معروف توفر البحث العكسي فقط (إدخال رقم لمعرفة الاسم) وتمنع بشكل قطعي استعلام الأسماء (البحث بالاسم لمعرفة الأرقام) لحماية الخصوصية.
                      </p>
                    </div>
                  </div>
                </div>

                {isOwner && (
                  <div className="bg-gradient-to-br from-[#0c2b18]/60 to-[#071a0e] border border-green-500/30 rounded-2xl p-5 space-y-3">
                    <h3 className="text-white text-sm font-bold flex items-center gap-1.5 justify-end">
                      <span>الولوج التلقائي للمالك نشط</span>
                      <ShieldCheck className="w-4 h-4 text-green-400" />
                    </h3>
                    <p className="text-gray-300 text-xs leading-relaxed">
                      تم اكتشاف رقم هاتف المالك الموثق بنجاح. يمكنك الدخول مباشرة إلى لوحة التحكم من خلال زر "لوحة التحكم" في القائمة الرئيسية للتحكم بالكامل بخصائص النظام.
                    </p>
                    <button
                      onClick={() => setActiveTab('admin')}
                      className="w-full py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white text-xs font-bold rounded-xl shadow hover:brightness-110 transition-all"
                    >
                      الانتقال للوحة التحكم الإدارية
                    </button>
                  </div>
                )}

              </div>
            )}

            {/* ADMIN TAB */}
            {activeTab === 'admin' && isOwner && adminToken && (
              <AdminDashboard
                adminToken={adminToken}
                settings={systemSettings}
                onUpdateSettings={handleUpdateSettings}
                showToast={showToast}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Footer copyright */}
      <footer className="relative z-10 py-10 mt-10 border-t border-white/5 text-center text-xs text-gray-600">
        <p className="font-bold">جميع الحقوق محفوظة © منصة معروف لخدمات الأرقام اليمنية ٢٠٢٦</p>
        <p className="text-[10px] text-gray-700 mt-1">بني هذا النظام تلبية للمتطلبات الأمنية ومكافحة التلاعب الرقمي.</p>
      </footer>

      {/* Global Auth Trigger popup */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onRegisterSuccess={(user) => {
          setCurrentUser(user);
          localStorage.setItem('maarouf_phone_session', user.phone);
          setSyncedInSession(false);
          fetchUserTransactions(user.phone);
          showToast(`مرحباً بك! تم تسجيل الدخول بنجاح للرقم ${user.phone}`, 'success');
          window.dispatchEvent(new CustomEvent('maarouf:metrics-updated'));
          void syncContactsAfterLogin(user);
        }}
        showToast={showToast}
      />

      {/* CUSTOM PREMIUM LUXURY TOAST NOTIFICATION STACK */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 max-w-sm w-[90vw]" dir="rtl">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ x: 100, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 100, opacity: 0 }}
              className={`p-4 rounded-xl border text-right shadow-[0_4px_15px_rgba(0,0,0,0.5)] backdrop-blur-md flex items-start gap-3 ${toast.type === 'success' ? 'bg-[#152e1c]/95 border-green-500/30 text-white' : toast.type === 'error' ? 'bg-[#311116]/95 border-red-500/30 text-white' : toast.type === 'warning' ? 'bg-[#312511]/95 border-yellow-500/30 text-white' : 'bg-[#0d1430]/95 border-[#c5a059]/30 text-white'}`}
            >
              <div className="shrink-0 mt-0.5">
                {toast.type === 'success' && <CheckCircle className="w-5 h-5 text-green-400" />}
                {toast.type === 'error' && <AlertCircle className="w-5 h-5 text-red-400" />}
                {toast.type === 'warning' && <AlertCircle className="w-5 h-5 text-yellow-400" />}
                {toast.type === 'info' && <Info className="w-5 h-5 text-[#e5c158]" />}
              </div>
              <div className="flex-1 text-xs font-bold leading-relaxed">{toast.message}</div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

    </div>
  );
}
