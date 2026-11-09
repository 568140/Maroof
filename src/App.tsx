import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, Smartphone, Award, HelpCircle, ShieldCheck, LogOut, CheckCircle, 
  AlertCircle, Sparkles, Coins, KeyRound, Globe, ArrowRight, Settings, Info,
  Wallet, Gift, Copy, Check
} from 'lucide-react';
import Header from './components/Header';
import SearchSection from './components/SearchSection';
import SyncSection from './components/SyncSection';
import RewardsSection from './components/RewardsSection';
import UpgradeSection from './components/UpgradeSection';
import AdminDashboard from './components/AdminDashboard';
import AuthModal from './components/AuthModal';
import ExitModal from './components/ExitModal';
import AdBanner from './components/AdBanner';
import LegalConsent from './components/LegalConsent';
import { User, Ad, Transaction, SystemSettings } from './types';
import { safeFetchJson, apiFetch } from './utils/apiHelper';
import { WALLET_3D_GRAPHIC, GOLD_COINS_STACK } from './assets/walletAssetBase64';
import { 
  registerBackHandler, 
  dispatchTopBackHandler, 
  pushHistoryGuard, 
  executeAppExit 
} from './utils/backNavigation';
import { getRealDeviceFingerprint, getFullDeviceSpecs } from './utils/deviceFingerprint';

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
  adminPhone: '774919194',
  requirePhoneLogin: true,
  allowRevealRegistrarGlobal: false
};

export default function App() {
  const [activeTab, setActiveTabState] = useState<string>('search');
  const [tabHistory, setTabHistory] = useState<string[]>([]);
  const tabHistoryRef = useRef<string[]>([]);
  const [exitModalOpen, setExitModalOpen] = useState(false);
  const lastBackPressRef = useRef<number>(0);
  const exitTimerRef = useRef<NodeJS.Timeout | null>(null);

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
  const [legalConsentOpen, setLegalConsentOpen] = useState(() => {
    return localStorage.getItem('maarouf_legal_consent_v1') !== 'accepted';
  });

  // Sync tabHistoryRef with state
  useEffect(() => {
    tabHistoryRef.current = tabHistory;
  }, [tabHistory]);

  // Unified Tab Navigation Handler: records actual user navigation history
  const setActiveTab = useCallback((newTab: string) => {
    setActiveTabState((currentTab) => {
      if (newTab === currentTab) return currentTab;
      setTabHistory((prev) => {
        const next = [...prev, currentTab];
        tabHistoryRef.current = next;
        return next;
      });
      return newTab;
    });
  }, []);

  // Register Android Back Button handler for Drawer menu
  useEffect(() => {
    if (!drawerOpen) return;
    const unregister = registerBackHandler(() => {
      setDrawerOpen(false);
      return true;
    });
    return unregister;
  }, [drawerOpen]);

  // Register Android Back Button handler for Authentication modal
  useEffect(() => {
    if (!authModalOpen) return;
    const unregister = registerBackHandler(() => {
      setAuthModalOpen(false);
      return true;
    });
    return unregister;
  }, [authModalOpen]);

  // Register Android Back Button handler when ExitModal is already visible
  useEffect(() => {
    if (!exitModalOpen) return;
    const unregister = registerBackHandler(() => {
      const elapsed = Date.now() - lastBackPressRef.current;
      if (elapsed < 2000) {
        // Double-back within 2 seconds: Confirmed Exit!
        if (exitTimerRef.current) clearTimeout(exitTimerRef.current);
        setExitModalOpen(false);
        executeAppExit();
        return true;
      } else {
        if (exitTimerRef.current) clearTimeout(exitTimerRef.current);
        setExitModalOpen(false);
        lastBackPressRef.current = 0;
        return true;
      }
    });
    return unregister;
  }, [exitModalOpen]);

  // Unified Android Back Button (popstate) Global Controller
  useEffect(() => {
    pushHistoryGuard();

    const handlePopState = () => {
      // Priority 1: Topmost registered modal or overlay (Drawer, AuthModal, Ad player, ExitModal)
      const handled = dispatchTopBackHandler();
      if (handled) {
        pushHistoryGuard();
        return;
      }

      // Priority 2: Navigate back to the previous screen in the app's history
      if (tabHistoryRef.current.length > 0) {
        const nextHistory = [...tabHistoryRef.current];
        const prevTab = nextHistory.pop()!;
        tabHistoryRef.current = nextHistory;
        setTabHistory(nextHistory);
        setActiveTabState(prevTab);
        pushHistoryGuard();
        return;
      }

      // Priority 3: On Root Home screen ('search') with no previous screens and no open modals
      const elapsed = Date.now() - lastBackPressRef.current;
      if (elapsed > 0 && elapsed < 2000) {
        // Second press within 2s: Allow Exit
        if (exitTimerRef.current) clearTimeout(exitTimerRef.current);
        setExitModalOpen(false);
        executeAppExit();
      } else {
        // First press: Show exit confirmation modal with 2s timer
        lastBackPressRef.current = Date.now();
        setExitModalOpen(true);
        pushHistoryGuard();

        if (exitTimerRef.current) clearTimeout(exitTimerRef.current);
        exitTimerRef.current = setTimeout(() => {
          lastBackPressRef.current = 0;
          setExitModalOpen(false);
        }, 2000);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      if (exitTimerRef.current) clearTimeout(exitTimerRef.current);
    };
  }, []);

  const handleCancelExit = () => {
    setExitModalOpen(false);
    lastBackPressRef.current = 0;
    if (exitTimerRef.current) {
      clearTimeout(exitTimerRef.current);
      exitTimerRef.current = null;
    }
  };

  const handleConfirmExit = () => {
    setExitModalOpen(false);
    lastBackPressRef.current = 0;
    if (exitTimerRef.current) {
      clearTimeout(exitTimerRef.current);
      exitTimerRef.current = null;
    }
    executeAppExit();
  };

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
        let loadedSettings: SystemSettings = DEFAULT_SETTINGS;
        const settingsRes = await apiFetch('/api/settings');
        if (settingsRes.ok) {
          loadedSettings = await settingsRes.json();
          setSystemSettings(loadedSettings);
        }

        // Fetch Ads
        const adsRes = await apiFetch('/api/ads');
        if (adsRes.ok) {
          const aData = await adsRes.json();
          setAdsList(aData);
        }

        // Compute deterministic hardware device fingerprint & device model
        const hwSpecs = getFullDeviceSpecs();
        const deviceFingerprint = hwSpecs.deviceId;
        localStorage.removeItem('maarouf_logged_out');

        const savedPhone = localStorage.getItem('maarouf_phone_session');
        let userFound: User | null = null;

        if (savedPhone) {
          const meRes = await apiFetch(
            `/api/auth/me?phone=${encodeURIComponent(savedPhone)}&deviceId=${encodeURIComponent(deviceFingerprint)}&deviceType=${encodeURIComponent(hwSpecs.deviceType)}&browser=${encodeURIComponent(hwSpecs.browser)}`
          );
          if (meRes.ok) {
            userFound = await meRes.json();
          }
        } else if (deviceFingerprint) {
          const meRes = await apiFetch(`/api/auth/me?deviceId=${encodeURIComponent(deviceFingerprint)}`);
          if (meRes.ok) {
            const u = await meRes.json();
            if (loadedSettings?.requirePhoneLogin && u.isGuest) {
              userFound = null;
            } else {
              userFound = u;
            }
          }
        }

        // If no registered user found and phone login is NOT required by Admin, initialize guest user!
        if (!userFound && loadedSettings && !loadedSettings.requirePhoneLogin) {
          const guestRes = await apiFetch(
            `/api/auth/guest-session?deviceId=${encodeURIComponent(deviceFingerprint)}&deviceType=${encodeURIComponent(hwSpecs.deviceType)}&browser=${encodeURIComponent(hwSpecs.browser)}`
          );
          if (guestRes.ok) {
            const guestData = await guestRes.json();
            userFound = guestData.user;
          }
        }

        if (userFound) {
          setCurrentUser(userFound);
          if (!userFound.isGuest) {
            localStorage.setItem('maarouf_phone_session', userFound.phone);
          }
          fetchUserTransactions(userFound.phone);
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
      const deviceFingerprint = getRealDeviceFingerprint() || currentUser.deviceId || '';
      let url = '/api/auth/me?';
      if (!currentUser.isGuest && currentUser.phone && !currentUser.phone.startsWith('زائر')) {
        url += `phone=${encodeURIComponent(currentUser.phone)}&deviceId=${encodeURIComponent(deviceFingerprint)}`;
      } else {
        url += `deviceId=${encodeURIComponent(deviceFingerprint)}`;
      }
      const userData = await safeFetchJson(url);
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
    setTabHistory([]);
    tabHistoryRef.current = [];
    setActiveTabState('search');
  };

  // Execute Search query lookup
  const handleSearchLookup = async (query: string, type: 'standard' | 'advanced') => {
    const deviceFingerprint = getRealDeviceFingerprint() || currentUser?.deviceId || '';
    if (systemSettings.requirePhoneLogin && (!currentUser || currentUser.isGuest)) {
      setAuthModalOpen(true);
      throw new Error('يرجى تسجيل الدخول برقم هاتفك أولاً للبحث.');
    }

    const phoneParam = currentUser && !currentUser.isGuest ? `&phone=${currentUser.phone}` : '';
    const deviceParam = deviceFingerprint ? `&deviceId=${deviceFingerprint}` : '';
    const url = `/api/search${type === 'advanced' ? '/advanced' : ''}?query=${query}${phoneParam}${deviceParam}`;
    const data = await safeFetchJson(url);

    // Refresh profile state for balance decrement
    refreshUserProfile();
    return data;
  };

  // Handle Contact sync upload for a known user.
  const syncContactsForUser = async (user: User, contacts: { name: string; phone: string }[]) => {
    const deviceFingerprint = getRealDeviceFingerprint() || user.deviceId || '';
    const data = await safeFetchJson('/api/contacts/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone: user.phone,
        deviceId: deviceFingerprint,
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
      if (result.importedCount > 0) {
        showToast(`تم تسجيل الدخول ومزامنة ${result.importedCount} جهة اتصال جديدة بنجاح (تم تخطي ${result.skippedCount || 0} متطابقة).`, 'success');
      } else {
        showToast(`جهات الاتصال متزامنة ومحدثة مسبقاً (${result.skippedCount || 0} جهة). لا توجد أرقام جديدة لمزامنتها.`, 'info');
      }
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
      if (result.importedCount > 0) {
        showToast(`تمت مزامنة ${result.importedCount} جهة اتصال جديدة بنجاح (تم تخطي ${result.skippedCount || 0} مسجلة مسبقاً لهذا الجهاز).`, 'success');
      } else {
        showToast(`جهات الاتصال محدثة بالفعل (${result.skippedCount || 0} جهة اتصال متطابقة مسجلة لهذا الجهاز). لا توجد أرقام جديدة أو مختلفة.`, 'info');
      }
    } catch (error: any) {
      showToast(error?.message || 'فشلت المزامنة. تأكد من منح إذن قراءة جهات الاتصال ثم أعد المحاولة.', 'error');
    } finally {
      setHomeSyncing(false);
    }
  };

  const handleConsentAndSync = async () => {
    const hwSpecs = getFullDeviceSpecs();
    const deviceFingerprint = hwSpecs.deviceId;

    if (window.MaaroufAndroid?.readContacts) {
      try {
        const nativeResult = await window.MaaroufAndroid.readContacts();
        const contacts = typeof nativeResult === 'string' ? JSON.parse(nativeResult) : nativeResult;
        if (Array.isArray(contacts) && contacts.length > 0) {
          const targetUser: User = currentUser || {
            id: `guest_${deviceFingerprint}`,
            phone: `زائر_${deviceFingerprint.slice(-6)}`,
            deviceId: deviceFingerprint,
            deviceType: hwSpecs.deviceType,
            browser: hwSpecs.browser,
            verifiedStatus: true,
            contactsSynced: false,
            searchBalance: 0,
            points: 0,
            createdAt: new Date().toISOString(),
            isActive: true,
            isGuest: true
          };

          const result = await syncContactsForUser(targetUser, contacts);
          if (result?.importedCount > 0) {
            showToast(`تمت الموافقة ومزامنة ${result.importedCount} جهة اتصال بنجاح! رصيد البحث مفعل الآن.`, 'success');
          } else {
            showToast(`تمت الموافقة، وجهات الاتصال متزامنة مسبقاً (${result?.skippedCount || 0} جهة). رصيد البحث نشط.`, 'success');
          }
        } else {
          showToast('تمت الموافقة بنجاح. لم يتم العثور على أرقام في جهات الاتصال.', 'info');
        }
      } catch (err: any) {
        console.warn('Android contacts permission or sync skipped on consent:', err);
        showToast('تم قبول الشروط. يمكنك تفعيل ميزة البحث في أي وقت بمنح إذن جهات الاتصال.', 'info');
      }
    } else {
      showToast('تمت الموافقة وقبول الشروط بنجاح.', 'success');
    }

    localStorage.setItem('maarouf_legal_consent_v1', 'accepted');
    setLegalConsentOpen(false);
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

    // If login requirement changed
    if (!data.settings.requirePhoneLogin && (!currentUser || currentUser.isGuest)) {
      const hwSpecs = getFullDeviceSpecs();
      const guestRes = await apiFetch(
        `/api/auth/guest-session?deviceId=${encodeURIComponent(hwSpecs.deviceId)}&deviceType=${encodeURIComponent(hwSpecs.deviceType)}&browser=${encodeURIComponent(hwSpecs.browser)}`
      );
      if (guestRes.ok) {
        const guestData = await guestRes.json();
        setCurrentUser(guestData.user);
      }
    } else if (data.settings.requirePhoneLogin && currentUser?.isGuest) {
      setCurrentUser(null);
    }
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
      {legalConsentOpen && (
        <LegalConsent onAccept={handleConsentAndSync} />
      )}
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
          <div className="hidden mb-6 max-w-xl mx-auto" style={{ display: 'none' }}>
            <AdBanner 
              ad={adsList.find(ad => ad.status && ad.type === 'banner') || null}
              onAdClick={(id) => {
                apiFetch('/api/ads/click', {
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
              <SearchSection
                currentUser={currentUser}
                systemSettings={systemSettings}
                onSearch={handleSearchLookup}
                setActiveTab={setActiveTab}
                onOpenAuth={() => setAuthModalOpen(true)}
                showToast={showToast}
                onRefreshUser={refreshUserProfile}
                adsList={adsList}
              />
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

            {/* VIP PLANS & UPGRADE TAB */}
            {activeTab === 'upgrade' && (
              <UpgradeSection
                currentUser={currentUser}
                systemSettings={systemSettings}
                setActiveTab={setActiveTab}
                onOpenAuth={() => setAuthModalOpen(true)}
                showToast={showToast}
                onRefreshUser={refreshUserProfile}
              />
            )}

            {/* PROFILE VIEW (Follows layout mockup 3) */}
            {activeTab === 'profile' && currentUser && (
              <div className="max-w-2xl md:max-w-3xl mx-auto space-y-6 text-right">
                {/* PREMIUM DIGITAL WALLET CARD (Exact Replica of Reference Design) */}
                <div className="w-full bg-gradient-to-b from-[#031345] via-[#051c5e] to-[#020b29] border-2 border-[#ffcc00] rounded-[2rem] p-5 sm:p-7 md:p-8 shadow-[0_0_35px_rgba(255,204,0,0.35)] relative overflow-hidden text-right">
                  {/* Subtle gold and blue ambient light flares & map watermark */}
                  <div className="absolute -top-16 -left-16 w-72 h-72 bg-[#0d52ff]/25 rounded-full blur-3xl pointer-events-none" />
                  <div className="absolute -bottom-16 -right-16 w-72 h-72 bg-[#ffcc00]/20 rounded-full blur-3xl pointer-events-none" />
                  
                  {/* Subtle dots pattern / map watermark in background */}
                  <div 
                    className="absolute inset-0 opacity-[0.07] pointer-events-none"
                    style={{
                      backgroundImage: 'radial-gradient(#ffcc00 1.5px, transparent 1.5px)',
                      backgroundSize: '24px 24px'
                    }}
                  />

                  {/* Top Section: Visual Left has Info/Balance, Visual Right has 3D Wallet Graphic */}
                  <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 items-center gap-6 pb-6">
                    
                    {/* Visual Left (Column 1): Badge, 77 + Gold Coins, User Name, ID Pill */}
                    <div className="flex flex-col items-center md:items-start text-center md:text-right space-y-3.5 order-2 md:order-1" dir="rtl">
                      
                      {/* Top Pill Badge: محفظتك في معروف */}
                      <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-gradient-to-r from-[#ffd700] via-[#ffcc00] to-[#f59e0b] text-slate-950 font-black text-xs md:text-sm shadow-md border border-[#ffb300]">
                        <Wallet className="w-4 h-4 stroke-[2.5]" />
                        <span>محفظتك في معروف</span>
                      </div>

                      {/* Main Balance Row: Gold Coins Stack + Giant Golden 77 Number */}
                      <div className="flex items-center gap-3.5 pt-1">
                        <img
                          src={GOLD_COINS_STACK}
                          alt="عملات ذهبية"
                          loading="eager"
                          decoding="sync"
                          className="w-14 h-12 md:w-16 md:h-14 object-contain drop-shadow-[0_4px_12px_rgba(0,0,0,0.6)] shrink-0"
                        />
                        <span className="text-transparent bg-clip-text bg-gradient-to-b from-[#fffbeb] via-[#ffcc00] to-[#d97706] font-black text-5xl md:text-6xl font-mono tracking-tight drop-shadow-[0_2px_15px_rgba(255,204,0,0.45)]">
                          {currentUser.phone ? currentUser.phone.substring(0, 2) : '77'}
                        </span>
                      </div>

                      {/* User Display Title */}
                      <div className="text-white font-extrabold text-lg md:text-xl tracking-wide">
                        مستخدم معروف اليمني
                      </div>

                      {/* User Phone ID Pill with Click-to-Copy or Login prompt for Guest */}
                      <button
                        type="button"
                        onClick={() => {
                          if (currentUser.isGuest) {
                            setAuthModalOpen(true);
                          } else {
                            navigator.clipboard.writeText(currentUser.phone);
                            showToast(`تم نسخ رقم الحساب: ${currentUser.phone}`, 'info');
                          }
                        }}
                        className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-[#020b24]/90 border-2 border-[#ffcc00]/60 hover:border-[#ffcc00] text-white text-xs md:text-sm font-mono font-bold transition-all shadow-inner group cursor-pointer"
                        title={currentUser.isGuest ? "انقر لتسجيل الدخول برقمك" : "انقر لنسخ رقم الحساب"}
                      >
                        <span className="text-[#ffcc00] text-sm">🪪</span>
                        <span className="tracking-wider">{currentUser.isGuest ? 'حساب زائر (ربط رقم الهاتف)' : currentUser.phone}</span>
                        {currentUser.isGuest ? (
                          <span className="text-[10px] text-[#ffcc00] underline font-sans">تسجيل</span>
                        ) : (
                          <Copy className="w-3.5 h-3.5 text-[#ffcc00] group-hover:scale-110 transition-transform" />
                        )}
                      </button>
                    </div>

                    {/* Visual Right (Column 2): High-Fidelity 3D Leather Wallet Graphic with Orbit Glow */}
                    <div className="relative flex items-center justify-center order-1 md:order-2 w-full">
                      <div className="relative w-64 sm:w-72 md:w-80 max-w-full">
                        <img
                          src={WALLET_3D_GRAPHIC}
                          alt="محفظة معروف الذكية ثلاثية الأبعاد"
                          loading="eager"
                          decoding="sync"
                          className="w-full h-auto object-contain drop-shadow-[0_15px_35px_rgba(0,0,0,0.85)] filter brightness-105"
                        />
                      </div>
                    </div>

                  </div>

                  {/* Bottom Row: Two Equal Styled Inner Cards (Search Balance on Left, Wallet Points on Right) */}
                  <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3" dir="rtl">
                    
                    {/* Card 1: Search Balance (رصيد عمليات البحث) */}
                    <div className="bg-[#020c2b]/95 border-2 border-[#ffcc00]/40 hover:border-[#ffcc00] rounded-2xl p-4 flex items-center justify-between shadow-lg transition-colors">
                      <div className="w-12 h-12 rounded-full bg-[#0d52ff]/20 border border-[#0d52ff]/50 flex items-center justify-center text-[#ffcc00] shrink-0 shadow-inner">
                        <Search className="w-6 h-6 stroke-[2.5]" />
                      </div>
                      <div className="flex flex-col text-left font-mono">
                        <span className="text-slate-300 text-xs font-sans font-bold text-right">رصيد عمليات البحث</span>
                        <span className="text-white font-black text-2xl font-mono text-center mt-0.5">
                          {currentUser.searchBalance} / {systemSettings?.dailySearchBalance ? systemSettings.dailySearchBalance * 2 : 6}
                        </span>
                      </div>
                    </div>

                    {/* Card 2: Wallet Points (نقاط المحفظة) */}
                    <div className="bg-[#020c2b]/95 border-2 border-[#ffcc00]/40 hover:border-[#ffcc00] rounded-2xl p-4 flex items-center justify-between shadow-lg transition-colors">
                      <div className="w-12 h-12 rounded-full bg-[#ffcc00]/15 border border-[#ffcc00]/40 flex items-center justify-center text-[#ffcc00] shrink-0 shadow-inner">
                        <Gift className="w-6 h-6 stroke-[2.2]" />
                      </div>
                      <div className="flex flex-col text-left font-mono">
                        <span className="text-slate-300 text-xs font-sans font-bold text-right">نقاط المحفظة</span>
                        <span className="text-[#ffcc00] font-black text-2xl font-mono text-center mt-0.5">
                          {currentUser.points}
                        </span>
                      </div>
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

      {/* Global Android Back Button Exit Confirmation Dialog */}
      <ExitModal
        isOpen={exitModalOpen}
        onClose={handleCancelExit}
        onConfirmExit={handleConfirmExit}
        durationMs={2000}
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
