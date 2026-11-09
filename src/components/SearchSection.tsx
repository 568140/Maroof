import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Info, Users, Database, ShieldAlert, Coins, Copy, Check, RefreshCw, Star, AlertTriangle, ArrowRight, Eye, Play, Clock, Sparkles, X, Activity, Award, MessageCircle, Lock, Crown, Trash2 } from 'lucide-react';
import { User, Contact, Ad, PlatformMetrics, SystemSettings, VipPlan } from '../types';
import { APP_LOGO } from '../assets/logoBase64';
import { registerBackHandler } from '../utils/backNavigation';
import { apiFetch } from '../utils/apiHelper';

interface SearchSectionProps {
  currentUser: User | null;
  systemSettings?: SystemSettings;
  onSearch: (query: string, type: 'standard' | 'advanced') => Promise<{ results: Contact[]; advanced?: boolean; outOfBalance?: boolean; insufficientPoints?: boolean }>;
  setActiveTab: (tab: string) => void;
  onOpenAuth: () => void;
  showToast: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
  onRefreshUser?: () => Promise<void>;
  adsList?: Ad[];
}

// Hook for smooth animated counter roll (gentle, steady, and readable pacing)
function useAnimatedCounter(targetValue: number, duration: number = 2400) {
  const [current, setCurrent] = useState(targetValue);
  const currentRef = useRef(current);
  currentRef.current = current;

  useEffect(() => {
    const startValue = currentRef.current;
    const diff = targetValue - startValue;
    if (diff === 0) return;

    const startTime = performance.now();
    let animId: number;

    const update = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Gentle ease-out curve for smooth and steady counting speed
      const ease = 1 - Math.pow(1 - progress, 2);
      const nextVal = Math.round(startValue + diff * ease);
      setCurrent(nextVal);

      if (progress < 1) {
        animId = requestAnimationFrame(update);
      }
    };

    animId = requestAnimationFrame(update);
    return () => cancelAnimationFrame(animId);
  }, [targetValue, duration]);

  return current;
}

export default function SearchSection({
  currentUser,
  systemSettings,
  onSearch,
  setActiveTab,
  onOpenAuth,
  showToast,
  onRefreshUser,
  adsList = [],
}: SearchSectionProps) {
  const [phoneQuery, setPhoneQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Contact[]>([]);
  const [searchedNum, setSearchedNum] = useState('');
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [copiedNum, setCopiedNum] = useState(false);
  const [searchHistory, setSearchHistory] = useState<string[]>(() => {
    const saved = localStorage.getItem('maarouf_search_history');
    return saved ? JSON.parse(saved) : [];
  });
  const [hasSearched, setHasSearched] = useState(false);
  const [errorState, setErrorState] = useState<string | null>(null);

  // Reveal Registrar (من سجّل هذا الاسم؟) State
  const [revealedRegistrars, setRevealedRegistrars] = useState<Record<string, { registrar: string; createdAt: string; remaining?: number; isGlobal?: boolean }>>({});
  const [revealingContactId, setRevealingContactId] = useState<string | null>(null);
  const [vipModalOpen, setVipModalOpen] = useState(false);
  const [targetContactForVip, setTargetContactForVip] = useState<Contact | null>(null);
  const [vipPlans, setVipPlans] = useState<VipPlan[]>([]);
  const [selectedModalPlanId, setSelectedModalPlanId] = useState<string>('plan_pro');
  const [vipActionType, setVipActionType] = useState<'reveal' | 'delete'>('reveal');
  const [deletingContact, setDeletingContact] = useState<Contact | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Dynamic Platform Real-Time Metrics State (Base + Real Firestore Data)
  const [platformMetrics, setPlatformMetrics] = useState<PlatformMetrics>({
    base: { users: 1248563, searches: 12458963, contacts: 45231789 },
    real: { users: 0, searches: 0, contacts: 0 },
    total: { users: 1248563, searches: 12458963, contacts: 45231789 }
  });
  const [pulseCard, setPulseCard] = useState<'users' | 'searches' | 'contacts' | null>(null);

  // Animated tickers for the numbers
  const animatedUsers = useAnimatedCounter(platformMetrics.total.users);
  const animatedSearches = useAnimatedCounter(platformMetrics.total.searches);
  const animatedContacts = useAnimatedCounter(platformMetrics.total.contacts);

  // Fetch live metrics from server
  const fetchLiveMetrics = useCallback(async () => {
    try {
      const res = await apiFetch('/api/metrics');
      if (res.ok) {
        const data: PlatformMetrics = await res.json();
        setPlatformMetrics(data);
      }
    } catch {
      // Non-blocking fallback
    }
  }, []);

  useEffect(() => {
    fetchLiveMetrics();
    // Poll every 15 seconds for calm and gentle dynamic updates
    const pollInterval = setInterval(fetchLiveMetrics, 15000);

    const onMetricsUpdated = () => {
      fetchLiveMetrics();
    };
    window.addEventListener('maarouf:metrics-updated', onMetricsUpdated);

    return () => {
      clearInterval(pollInterval);
      window.removeEventListener('maarouf:metrics-updated', onMetricsUpdated);
    };
  }, [fetchLiveMetrics]);

  // Fetch active VIP plans for package selection in modal
  useEffect(() => {
    apiFetch('/api/vip-plans')
      .then(r => r.json())
      .then((data: VipPlan[]) => {
        if (Array.isArray(data) && data.length > 0) {
          const activeOnly = data.filter(p => p.isActive);
          setVipPlans(activeOnly);
          const defaultPlan = activeOnly.find(p => p.id.includes('pro')) || activeOnly[0];
          if (defaultPlan) setSelectedModalPlanId(defaultPlan.id);
        }
      })
      .catch(() => {});
  }, []);

  // Helper to map and sanitize raw search results from backend structure
  const mapRawResults = (raw: any[]): Contact[] => {
    return (raw || []).map((item: any) => {
      if (!item) return { id: '', phoneNumber: '', contactName: 'اسم غير معروف', addedByUser: '', createdAt: '', frequency: 1 };
      
      // If item is wrapped in { contact, score }
      if (item.contact) {
        const freqVal = item.contact.frequency !== undefined && item.contact.frequency !== null
          ? Number(item.contact.frequency)
          : (item.score !== undefined ? Number(item.score) : 1);
        return {
          ...item.contact,
          contactName: item.contact.contactName || 'اسم غير معروف',
          frequency: isNaN(freqVal) ? 1 : freqVal
        };
      }
      
      // If item is already flat
      const freqVal = item.frequency !== undefined && item.frequency !== null
        ? Number(item.frequency)
        : (item.score !== undefined ? Number(item.score) : 1);
      return {
        ...item,
        contactName: item.contactName || 'اسم غير معروف',
        frequency: isNaN(freqVal) ? 1 : freqVal
      };
    });
  };

  // Ad Series States
  const [isWatchingSeries, setIsWatchingSeries] = useState(false);
  const [currentAdIndex, setCurrentAdIndex] = useState(0);
  const [seriesTimer, setSeriesTimer] = useState(0);

  // Convert points to search balance or unlock reveal_unlimited
  const handleConvertPoints = async (option: string) => {
    if (!currentUser) return;
    try {
      const res = await apiFetch('/api/user/convert-points', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: currentUser.phone, option })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشلت عملية التحويل');
      
      showToast(data.message, 'success');
      if (onRefreshUser) await onRefreshUser();

      // If unlocked unlimited, auto refresh current query
      if (option === 'reveal_unlimited' && searchedNum) {
        const response = await onSearch(searchedNum, 'standard');
        setResults(mapRawResults(response.results));
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // Launch simulated consecutive 6 ads watcher
  const handleWatch6Ads = () => {
    if (!currentUser) {
      showToast('يرجى تسجيل الدخول أولاً.', 'warning');
      onOpenAuth();
      return;
    }
    setIsWatchingSeries(true);
    setCurrentAdIndex(1);
    setSeriesTimer(3); // 3 seconds per ad for quick, beautiful simulation
  };

  // Effect to manage countdown of ad series
  React.useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isWatchingSeries && seriesTimer > 0) {
      interval = setInterval(() => {
        setSeriesTimer(prev => prev - 1);
      }, 1000);
    } else if (isWatchingSeries && seriesTimer === 0) {
      if (currentAdIndex < 6) {
        // Play next ad
        setCurrentAdIndex(prev => prev + 1);
        setSeriesTimer(3);
      } else {
        // Reached 6! Complete the challenge
        handleCompleteAdSeries();
      }
    }
    return () => clearInterval(interval);
  }, [isWatchingSeries, seriesTimer, currentAdIndex]);

  // Intercept Android Back Button to dismiss the video series challenge modal
  useEffect(() => {
    if (!isWatchingSeries) return;
    const unregister = registerBackHandler(() => {
      setIsWatchingSeries(false);
      showToast('تم إلغاء التحدي وإغلاق مشغل الإعلانات.', 'info');
      return true;
    });
    return unregister;
  }, [isWatchingSeries, showToast]);

  const handleCompleteAdSeries = async () => {
    setIsWatchingSeries(false);
    if (!currentUser) return;

    try {
      // Trigger the backend ads/view endpoint for each of the 6 ads to record them
      // This increases their consecutive count and triggers the Server's automatic unlock!
      showToast('تهانينا! جارٍ معالجة تفعيل الهويات الشاملة لمشاهدتك 6 إعلانات متتالية...', 'info');
      
      for (let i = 0; i < 6; i++) {
        const adId = adsList.length > 0 ? adsList[i % adsList.length]?.id : `ad${(i % 4) + 1}`;
        await apiFetch('/api/ads/view', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ adId, phone: currentUser.phone })
        });
      }

      if (onRefreshUser) await onRefreshUser();
      showToast('مبارك! تم تفعيل ميزة كشف جميع الأسماء وتجاوز حد الـ 15 اسماً بنجاح!', 'success');
      
      // Auto-refresh the search
      if (searchedNum) {
        const response = await onSearch(searchedNum, 'standard');
        setResults(mapRawResults(response.results));
      }
    } catch (e) {
      showToast('حدث خطأ أثناء الاتصال بالخادم لتسجيل نقاط الإعلانات.', 'error');
    }
  };

  const saveToHistory = (num: string) => {
    const nextHistory = [num, ...searchHistory.filter(h => h !== num)].slice(0, 5);
    setSearchHistory(nextHistory);
    localStorage.setItem('maarouf_search_history', JSON.stringify(nextHistory));
  };

  const handleSearchSubmit = async (e: React.FormEvent, type: 'standard' | 'advanced' = 'standard') => {
    e.preventDefault();
    setErrorState(null);

    const requirePhone = systemSettings?.requirePhoneLogin ?? true;
    if (requirePhone && (!currentUser || currentUser.isGuest)) {
      showToast('يرجى تسجيل الدخول برقم هاتفك أولاً للبحث.', 'warning');
      onOpenAuth();
      return;
    }

    if (currentUser && !currentUser.contactsSynced) {
      showToast('يجب عليك مزامنة جهات اتصال هاتفك أولاً لتفعيل محرك البحث.', 'warning');
      setActiveTab('sync');
      return;
    }

    const cleanNum = phoneQuery.trim().replace(/\s+/g, '');
    const phoneRegex = /^7\d{7,8}$/;
    if (!phoneRegex.test(cleanNum)) {
      setErrorState('يجب إدخال رقم يمني صحيح (8 أو 9 أرقام يبدأ بـ 7، مثال: 771234567 أو 74919194).');
      return;
    }

    setLoading(true);
    try {
      // Optimistically increment live search counter immediately
      setPlatformMetrics(prev => ({
        ...prev,
        real: { ...prev.real, searches: prev.real.searches + 1 },
        total: { ...prev.total, searches: prev.total.searches + 1 }
      }));
      setPulseCard('searches');
      setTimeout(() => setPulseCard(null), 1200);

      const response = await onSearch(cleanNum, type);
      setResults(mapRawResults(response.results));
      setSearchedNum(cleanNum);
      setHasSearched(true);
      saveToHistory(cleanNum);

      // Notify other parts of the app
      window.dispatchEvent(new CustomEvent('maarouf:metrics-updated'));
    } catch (err: any) {
      setErrorState(err.message || 'حدث خطأ أثناء البحث.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyText = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
    showToast('تم نسخ الاسم للحافظة.', 'success');
  };

  const handleCopyNum = () => {
    navigator.clipboard.writeText(searchedNum);
    setCopiedNum(true);
    setTimeout(() => setCopiedNum(false), 2000);
    showToast('تم نسخ الرقم للحافظة.', 'success');
  };

  // Convert contact frequency to a percentage relative to total entries
  const calculatePercentage = (frequency: number) => {
    const freq = typeof frequency === 'number' && !isNaN(frequency) ? frequency : 1;
    // If freq is very high (like corporate numbers), cap nicely, else scale
    if (freq >= 100) return 98;
    if (freq >= 50) return Math.min(95, 75 + Math.floor(freq / 3));
    return Math.min(70, 30 + freq * 2);
  };

  // Reveal Registrar Handler: checks global setting or user plan quota
  const handleRevealRegistrar = async (contact: Contact) => {
    setTargetContactForVip(contact);
    setVipActionType('reveal');

    const contactKey = contact.id || `${contact.phoneNumber}_${contact.contactName}`;

    if (revealedRegistrars[contactKey]) {
      showToast(`تم الكشف مسبقاً: سجّله الحساب ${revealedRegistrars[contactKey].registrar}`, 'info');
      return;
    }

    const isGlobal = Boolean(systemSettings?.allowRevealRegistrarGlobal);
    const hasActivePlan = Boolean(currentUser && currentUser.canRevealRegistrar && ((currentUser.revealRegistrarLimit || 0) > (currentUser.revealRegistrarUsed || 0)));

    // If neither global nor subscribed, open VIP Package modal immediately with 0 delay
    if (!isGlobal && !hasActivePlan) {
      setVipModalOpen(true);
      return;
    }

    try {
      setRevealingContactId(contactKey);
      const token = localStorage.getItem('maarouf_token') || '';
      const res = await apiFetch('/api/contacts/reveal-registrar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          contactId: contact.id,
          phoneNumber: searchedNum || contact.phoneNumber,
          contactName: contact.contactName,
          phone: currentUser?.phone,
          deviceId: currentUser?.deviceId
        })
      });

      const data = await res.json();
      if (res.status === 403 || data.error === 'subscription_required' || data.reason === 'subscription_required') {
        setVipModalOpen(true);
        return;
      }

      if (!res.ok) {
        throw new Error(data.error || 'فشل كشف مسجّل الاسم');
      }

      setRevealedRegistrars(prev => ({
        ...prev,
        [contactKey]: {
          registrar: data.registrar,
          createdAt: data.createdAt,
          remaining: data.remaining,
          isGlobal: data.isGlobal
        }
      }));

      if (data.isGlobal) {
        showToast(`تم الكشف: سجّله في هاتفه الحساب ${data.registrar} (متاح مجاناً للجميع)`, 'success');
      } else {
        showToast(`تم الكشف بنجاح! الرصيد المتبقي لباقة VIP: ${data.remaining} عملية`, 'success');
      }

      if (onRefreshUser) {
        await onRefreshUser();
      }
    } catch (err: any) {
      showToast(err.message || 'حدث خطأ أثناء كشف مسجّل الاسم', 'error');
    } finally {
      setRevealingContactId(null);
    }
  };

  // Delete Contact Name Handler: checks if user has active name deletion quota
  const handleDeleteContactClick = (contact: Contact) => {
    setTargetContactForVip(contact);
    setVipActionType('delete');

    const isGlobal = Boolean(systemSettings?.allowDeleteNamesGlobal);
    const hasActiveDeletePlan = Boolean(currentUser && currentUser.canDeleteNames && ((currentUser.nameDeletionsLimit || 0) > (currentUser.nameDeletionsUsed || 0)));

    if (!isGlobal && !hasActiveDeletePlan) {
      // Find a plan with nameDeletionsCount > 0 or default to plan_delete_shield / plan_pro
      const deletePlan = vipPlans.find(p => (p.nameDeletionsCount || 0) > 0) || vipPlans[0];
      if (deletePlan) {
        setSelectedModalPlanId(deletePlan.id);
      }
      setVipModalOpen(true);
      return;
    }

    // Has quota or is global: prompt confirmation dialog
    setDeletingContact(contact);
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deletingContact) return;

    try {
      setIsDeleting(true);
      const res = await apiFetch('/api/contacts/delete-name', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contactId: deletingContact.id,
          phoneNumber: searchedNum || deletingContact.phoneNumber,
          contactName: deletingContact.contactName,
          phone: currentUser?.phone,
          deviceId: currentUser?.deviceId
        })
      });

      const data = await res.json();
      if (!res.ok) {
        if (res.status === 403 || data.error === 'subscription_required') {
          setDeleteConfirmOpen(false);
          setVipModalOpen(true);
          return;
        }
        throw new Error(data.error || 'فشل حذف الاسم');
      }

      // Immediately filter out the deleted contact from results in local state
      setResults(prev => prev.filter(c => c.contactName !== deletingContact.contactName));
      setDeleteConfirmOpen(false);
      showToast(data.message || 'تم حذف الاسم نهائياً من قاعدة البيانات!', 'success');

      if (onRefreshUser) {
        await onRefreshUser();
      }
    } catch (err: any) {
      showToast(err.message || 'حدث خطأ أثناء محاولة حذف الاسم.', 'error');
    } finally {
      setIsDeleting(false);
      setDeletingContact(null);
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-6">
      {/* Visual Identity Title Section with Logo Showcase */}
      <div className="text-center space-y-3 py-2 flex flex-col items-center">
        <div className="relative group cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          <div className="absolute inset-0 bg-gradient-to-r from-[#0d52ff] to-[#ffcc00] rounded-3xl blur-lg opacity-40 group-hover:opacity-75 transition-opacity" />
          <img 
            src={APP_LOGO} 
            alt="معروف - كاشف الأرقام" 
            loading="eager"
            decoding="sync"
            fetchPriority="high"
            width="96"
            height="96"
            className="relative w-20 h-20 md:w-24 md:h-24 rounded-2xl object-cover shadow-[0_10px_25px_rgba(0,0,0,0.6)] border-2 border-[#ffcc00]/60 transform group-hover:scale-105 transition-transform shrink-0"
          />
        </div>

        <div className="space-y-1">
          <h1 className="text-white text-2xl md:text-3xl font-black leading-snug">
            اعرف هوية أي رقم يمني <br className="sm:hidden" /> خلال ثوانٍ
          </h1>
          <p className="hidden text-slate-300 text-xs md:text-sm font-medium" style={{ display: 'none' }}>
            الدليل اليمني الذكي والأكثر حماية ودقة للبحث عن الأرقام وتحديد الهويات
          </p>
        </div>
      </div>

      {/* Main Search Glassmorphism Card (Inspired by Logo's sleek phone bezel & golden waves) */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        className="bg-gradient-to-br from-[#071948]/95 via-[#0a2368]/95 to-[#041030]/95 border-2 border-[#0d52ff]/50 hover:border-[#ffcc00]/60 rounded-3xl p-5 md:p-6 shadow-[0_20px_50px_rgba(2,11,39,0.8)] backdrop-blur-xl relative overflow-hidden transition-all duration-300 group"
      >
        {/* Animated dynamic pulse waves echoing the logo's yellow signal arcs */}
        <div className="absolute -top-20 -right-20 w-44 h-44 bg-[#ffcc00]/15 rounded-full blur-3xl pointer-events-none animate-pulse" />
        <div className="absolute -bottom-20 -left-20 w-44 h-44 bg-[#0d52ff]/25 rounded-full blur-3xl pointer-events-none animate-pulse" style={{ animationDelay: '1s' }} />

        <form onSubmit={(e) => handleSearchSubmit(e, 'standard')} className="space-y-4 relative z-10">
          <div className="space-y-2 text-right">
            <div className="flex items-center justify-between">
              <label className="text-xs text-[#ffcc00] font-black tracking-wider uppercase flex items-center gap-1.5">
                <span className="inline-block w-2 h-2 rounded-full bg-[#ffcc00] shadow-[0_0_8px_#ffcc00]" />
                <span>أدخل الرقم اليمني (9 أرقام)</span>
              </label>
              <span className="text-[10px] text-slate-300 font-mono bg-black/40 px-2 py-0.5 rounded-md border border-[#0d52ff]/30">
                مثال: 771234567
              </span>
            </div>
            
            <div className="relative group/input p-[2.5px] rounded-2xl overflow-hidden shadow-lg transition-all">
              {/* Animated rotating border light stream matching the logo's electric blue and sun gold */}
              <div 
                className="absolute inset-[-100%] bg-[conic-gradient(from_0deg,#ffcc00_0%,#0d52ff_25%,#ffb300_50%,#062cb2_75%,#ffcc00_100%)] animate-[spin_4s_linear_infinite] opacity-75 group-focus-within/input:opacity-100 group-hover/input:opacity-95 blur-[1px] transition-opacity"
              />
              {/* Inner ambient soft glow */}
              <div 
                className="absolute inset-0 bg-[#020b24] rounded-2xl pointer-events-none"
              />

              <div className="relative">
                <input
                  type="tel"
                  value={phoneQuery}
                  onChange={(e) => setPhoneQuery(e.target.value.replace(/[^\d]/g, '').substring(0, 9))}
                  placeholder="771234567"
                  className="w-full text-left font-mono font-black text-xl tracking-widest pl-4 pr-12 py-4 rounded-2xl bg-[#020b24]/95 text-white placeholder-slate-600 focus:outline-none transition-all duration-200 shadow-inner relative z-10"
                  dir="ltr"
                />
                <motion.div 
                  animate={{ scale: phoneQuery.length > 0 ? [1, 1.15, 1] : 1 }}
                  transition={{ duration: 0.3 }}
                  className="absolute top-1/2 -translate-y-1/2 right-3.5 text-[#ffcc00] group-focus-within/input:scale-110 transition-transform pointer-events-none z-20"
                >
                  <Search className="w-6 h-6 stroke-[2.5]" />
                </motion.div>
              </div>
            </div>
          </div>

          {errorState && (
            <motion.div 
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3.5 text-xs text-red-200 bg-red-950/60 border border-red-500/50 rounded-2xl text-right flex items-start gap-2 shadow-md"
            >
              <AlertTriangle className="w-4.5 h-4.5 shrink-0 mt-0.5 text-red-400" />
              <span className="font-medium leading-relaxed">{errorState}</span>
            </motion.div>
          )}

          {/* Glowing Animated Search Button with tactile scale & wave glow */}
          <motion.button
            whileHover={{ scale: 1.015, boxShadow: '0 0 35px rgba(255, 204, 0, 0.55)' }}
            whileTap={{ scale: 0.985 }}
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-gradient-to-r from-[#ffcc00] via-[#ffb300] to-[#f59e0b] text-slate-950 font-black text-base rounded-2xl shadow-[0_0_25px_rgba(255,204,0,0.35)] transition-all flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed select-none"
          >
            {loading ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin text-slate-950" />
                <span>جارٍ فحص قاعدة البيانات والهوية...</span>
              </>
            ) : (
              <>
                <Search className="w-5 h-5 text-slate-950 stroke-[2.5]" />
                <span>بحث فوري عن الهوية</span>
              </>
            )}
          </motion.button>
        </form>

        {/* Sync Reminder & Activation Constraint */}
        {currentUser && !currentUser.contactsSynced && (
          <div className="mt-4 p-3 bg-red-950/20 border border-red-500/20 rounded-xl text-right flex items-start gap-2.5">
            <ShieldAlert className="w-4.5 h-4.5 text-red-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-red-300 text-xs font-bold">
                {currentUser.isGuest ? 'مطلوب مزامنة دفتر الهاتف للبدء بالبحث' : 'الحساب غير مفعل حالياً!'}
              </h4>
              <p className="text-gray-400 text-[10px] mt-0.5">
                {currentUser.isGuest
                  ? 'يمكنك البحث مجاناً بمجرد الضغط على مزامنة جهات اتصال هاتفك لمنع التكرار وتفعيل محرك البحث.'
                  : 'طبقاً لسياسات المنصة، يجب عليك مزامنة جهات اتصالك أولاً لمنحك صلاحيات البحث والمساعدة في بناء الدليل المجتمعي.'}
              </p>
              <button
                onClick={() => setActiveTab('sync')}
                className="mt-2 text-xs font-bold text-[#e5c158] hover:underline flex items-center gap-1"
              >
                <span>مزامنة وتفعيل الحساب الآن</span>
                <ArrowRight className="w-3 h-3 rotate-180" />
              </button>
            </div>
          </div>
        )}

        {/* Free Search Balance Indicator */}
        {currentUser && currentUser.contactsSynced && (
          <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between text-xs text-gray-400">
            <span>رصيد البحث اليومي المستمر</span>
            <span className="font-bold text-white flex items-center gap-1">
              <span className="text-[#ffcc00] text-sm font-black">{currentUser.searchBalance}</span> / 3 عمليات بحث
            </span>
          </div>
        )}
      </motion.div>

      {/* SEARCH RESULTS VIEW (Follows layout mockup 2) */}
      <AnimatePresence>
        {hasSearched && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="bg-gradient-to-br from-[#071a4d]/95 via-[#0b2875]/95 to-[#041238]/95 border-2 border-[#0d52ff]/40 rounded-3xl p-5 shadow-[0_20px_45px_rgba(2,11,39,0.8)] backdrop-blur-md text-right"
          >
            <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-4">
              <button 
                onClick={handleCopyNum}
                className="flex items-center gap-1.5 text-xs text-[#ffcc00] hover:text-white px-2.5 py-1 rounded-lg bg-black/40 border border-[#ffcc00]/30 transition-colors"
              >
                {copiedNum ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span className="font-mono font-bold">{searchedNum}</span>
              </button>
              <h3 className="text-white text-sm font-bold flex items-center gap-1.5">
                <Search className="w-4 h-4 text-[#ffcc00]" />
                <span>نتائج البحث عن الرقم</span>
              </h3>
            </div>

            {results.length > 0 ? (
              <div className="space-y-3">
                <p className="text-slate-300 text-xs pb-1">الأسماء الأكثر شيوعاً المرتبطة بالرقم:</p>
                <div className="space-y-2">
                  {results.map((item, index) => {
                    const itemKey = item.id || `${item.phoneNumber}_${item.contactName}`;
                    const isRevealed = !!revealedRegistrars[itemKey];
                    const revealedData = revealedRegistrars[itemKey];
                    const isRevealing = revealingContactId === itemKey;

                    return (
                      <div
                        key={item.id || index}
                        className="p-3.5 rounded-2xl bg-[#020b24]/80 border border-[#0d52ff]/30 hover:border-[#ffcc00]/60 transition-all shadow-sm space-y-2.5"
                      >
                        <div className="group flex items-center justify-between">
                          {/* Copy Action & Percentage */}
                          <div className="flex items-center gap-3">
                            <span className="text-[#ffcc00] font-black text-xs font-mono">{calculatePercentage(item.frequency)}%</span>
                            <button
                              onClick={() => handleCopyText(item.contactName, index)}
                              className="text-gray-400 hover:text-white p-1 rounded hover:bg-white/5 transition-colors"
                              title="نسخ الاسم"
                            >
                              {copiedIndex === index ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          </div>

                          {/* Name Details */}
                          <div className="flex items-center gap-3">
                            <span className="text-white font-bold text-sm">{item.contactName}</span>
                            <span className="w-6 h-6 rounded-full bg-[#1e295d] border border-[#c5a059]/20 flex items-center justify-center text-xs text-[#e5c158] font-mono">
                              {index + 1}
                            </span>
                          </div>
                        </div>

                        {/* Who Saved/Registered This Name & Delete Action */}
                        <div className="pt-2 border-t border-white/5 space-y-2">
                          {isRevealed && revealedData && (
                            <div className="bg-gradient-to-r from-purple-950/40 via-indigo-950/30 to-purple-950/40 border border-purple-500/30 rounded-xl p-2.5 flex flex-wrap items-center justify-between gap-2">
                              <div className="flex items-center gap-1.5 text-xs text-purple-200">
                                <Award className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                                <span>سجّله في هاتفه الحساب:</span>
                                <span className="font-mono font-bold text-white bg-black/60 px-2 py-0.5 rounded border border-purple-400/40" dir="ltr">
                                  {revealedData.registrar}
                                </span>
                              </div>
                              {revealedData.createdAt && (
                                <span className="text-[10px] text-gray-400 font-mono">
                                  بتاريخ: {revealedData.createdAt.split('T')[0]}
                                </span>
                              )}
                            </div>
                          )}

                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <button
                              type="button"
                              onClick={() => handleDeleteContactClick(item)}
                              className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-rose-950/40 hover:bg-rose-900/50 text-rose-300 border border-rose-800/40 hover:border-rose-600 flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow-sm"
                              title="حذف هذا الاسم نهائياً من قاعدة البيانات ومنع ظهوره في نتائج البحث"
                            >
                              <Trash2 className="w-3 h-3 text-rose-400" />
                              <span>حذف هذا الاسم 🗑️</span>
                            </button>

                            {!isRevealed && (
                              <button
                                type="button"
                                onClick={() => handleRevealRegistrar(item)}
                                disabled={isRevealing}
                                className="px-3 py-1 text-[11px] font-bold rounded-lg bg-gradient-to-r from-purple-600/30 to-indigo-600/30 hover:from-purple-600/50 hover:to-indigo-600/50 text-purple-200 border border-purple-500/40 hover:border-purple-400 flex items-center gap-1.5 transition-all active:scale-95 disabled:opacity-60 cursor-pointer shadow-sm"
                                title="معرفة رقم الحساب الذي قام بتسجيل وتزامن جهة الاتصال هذه"
                              >
                                {isRevealing ? (
                                  <RefreshCw className="w-3 h-3 animate-spin text-purple-300" />
                                ) : (
                                  <Award className="w-3 h-3 text-purple-400" />
                                )}
                                <span>من سجّل هذا الاسم؟ 🔍</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {results.length >= 3 && (
                  <div className="mt-4 p-3 bg-gradient-to-r from-[#1a1c2a] to-[#0c122b] rounded-xl border border-[#c5a059]/10 text-center">
                    <p className="text-gray-400 text-[10px]">عرض نتائج إضافية وتحليلات شبكة الاتصال المتقدمة</p>
                    <button
                      onClick={async () => {
                        try {
                          setLoading(true);
                          const response = await onSearch(searchedNum, 'advanced');
                          setResults(mapRawResults(response.results));
                          showToast('تم فتح البحث المتقدم الشامل بنجاح!', 'success');
                        } catch (err: any) {
                          if (err.message?.includes('نقاطك غير كافية')) {
                            showToast(err.message, 'error');
                          } else {
                            showToast('خطأ أثناء تشغيل البحث المتقدم.', 'error');
                          }
                        } finally {
                          setLoading(false);
                        }
                      }}
                      className="mt-2.5 inline-flex items-center gap-1.5 px-4 py-2 bg-[#c5a059]/10 hover:bg-[#c5a059]/20 text-[#e5c158] hover:text-white border border-[#c5a059]/20 text-xs font-bold rounded-lg transition-all"
                    >
                      <Star className="w-3.5 h-3.5" />
                      <span>فتح البحث المتقدم (30 نقطة)</span>
                    </button>
                  </div>
                )}

                {/* PREMIUM UPGRADE & PRODUCTIVITY SHIELD */}
                {currentUser && !currentUser.unlockedUnlimited && (
                  <div className="mt-5 p-4 rounded-2xl bg-gradient-to-br from-[#121c3e]/90 to-[#070c1a]/95 border border-[#c5a059]/30 text-right space-y-4">
                    <div className="flex items-center gap-2 justify-end">
                      <span className="text-white text-xs font-bold">بوابة الكشف الشامل والإنتاجية الذهبية</span>
                      <Sparkles className="w-4 h-4 text-[#e5c158] animate-pulse" />
                    </div>
                    <p className="text-gray-300 text-[10px] leading-relaxed">
                      الحد الافتراضي يظهر لك أول 15 هوية فقط تجنباً للضغط على النظام. يمكنك إلغاء الحد ورؤية جميع الأسماء المكتشفة بلا حدود لجميع عملياتك بأي من الخيارات التالية:
                    </p>

                    <div className="grid grid-cols-2 gap-2">
                      {/* Option 1: Watch 6 consecutive ads */}
                      <button
                        onClick={handleWatch6Ads}
                        className="p-3 rounded-xl bg-black/40 border border-[#c5a059]/10 hover:border-[#e5c158] text-center space-y-1.5 transition-all group"
                      >
                        <Eye className="w-4 h-4 text-[#e5c158] mx-auto group-hover:scale-110 transition-transform" />
                        <span className="text-white text-[10px] font-bold block">مشاهدة 6 إعلانات</span>
                        <span className="text-gray-500 text-[9px] block">مجاني وفوري</span>
                      </button>

                      {/* Option 2: Convert 80 points */}
                      <button
                        onClick={() => handleConvertPoints('reveal_unlimited')}
                        className="p-3 rounded-xl bg-black/40 border border-[#c5a059]/10 hover:border-[#e5c158] text-center space-y-1.5 transition-all group"
                      >
                        <Coins className="w-4 h-4 text-[#e5c158] mx-auto group-hover:scale-110 transition-transform" />
                        <span className="text-white text-[10px] font-bold block">تحويل 80 نقطة</span>
                        <span className="text-gray-500 text-[9px] block">خصم من الرصيد</span>
                      </button>
                    </div>

                    {/* Convert points for daily search limit productivity */}
                    <div className="pt-3 border-t border-white/5 space-y-2">
                      <span className="text-[#c5a059] text-[10px] font-bold block">شحن رصيد البحث بالنقاط (زيادة الإنتاجية اليومية)</span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleConvertPoints('5searches')}
                          className="flex-1 py-2 px-2.5 bg-[#c5a059]/5 hover:bg-[#c5a059]/15 border border-[#c5a059]/20 hover:border-[#e5c158] rounded-xl text-[10px] font-bold text-gray-200 transition-all text-center"
                        >
                          5 عمليات مقابل 50 نقطة
                        </button>
                        <button
                          onClick={() => handleConvertPoints('12searches')}
                          className="flex-1 py-2 px-2.5 bg-[#c5a059]/5 hover:bg-[#c5a059]/15 border border-[#c5a059]/20 hover:border-[#e5c158] rounded-xl text-[10px] font-bold text-gray-200 transition-all text-center"
                        >
                          12 عملية مقابل 100 نقطة
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-6 space-y-2">
                <p className="text-gray-400 text-xs">لم نجد أي أسماء مرتبطة بهذا الرقم حتى الآن في قاعدة معروف.</p>
                <p className="text-[#c5a059] text-[10px] font-medium">سيكون هذا الرقم معروفاً بمجرد قيام جهات اتصاله بالتسجيل والمزامنة!</p>
              </div>
            )}

            <button
              onClick={() => {
                setHasSearched(false);
                setPhoneQuery('');
              }}
              className="w-full mt-4 py-2.5 bg-white/5 border border-white/10 hover:bg-[#c5a059]/10 hover:border-[#c5a059]/20 text-white text-xs font-bold rounded-xl transition-all"
            >
              بحث جديد
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* OUT OF BALANCE ACTION TRIGGER */}
      {currentUser && currentUser.searchBalance <= 0 && currentUser.contactsSynced && (
        <div className="bg-[#120710] border border-red-500/20 rounded-2xl p-4 text-right space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-red-950/40 border border-red-500/20 flex items-center justify-center text-red-400 shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-white text-xs font-bold">نفذ رصيدك من عمليات البحث اليومية!</h4>
              <p className="text-gray-400 text-[10px] mt-0.5">
                يمكنك كسب عمليات بحث ونقاط إضافية مباشرة وفوراً من خلال تصفح أو مشاهدة الفيديوهات الترويجية.
              </p>
            </div>
          </div>
          <button
            onClick={() => setActiveTab('rewards')}
            className="w-full py-2 bg-[#e5c158]/10 hover:bg-[#e5c158]/25 text-[#e5c158] border border-[#e5c158]/25 hover:border-[#e5c158] text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5"
          >
            <Coins className="w-4 h-4" />
            <span>شاهد الإعلانات واكسب رصيد مجاني</span>
          </button>
        </div>
      )}

      {/* Recent History Quick Search Tags */}
      {searchHistory.length > 0 && (
        <div className="space-y-2 text-right">
          <span className="text-[10px] text-[#c5a059] font-bold tracking-wider uppercase">عمليات البحث الأخيرة</span>
          <div className="flex flex-wrap gap-2 justify-start" dir="rtl">
            {searchHistory.map((num, i) => (
              <button
                key={i}
                onClick={() => {
                  setPhoneQuery(num);
                }}
                className="px-3 py-1.5 rounded-lg bg-[#0e1634]/80 border border-[#c5a059]/10 text-gray-300 font-mono text-xs hover:border-[#e5c158] hover:text-[#e5c158] transition-all"
              >
                {num}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Platform Real-Time Metrics (Base + Real Firestore Data Dynamic Counter) */}
      <div className="hidden grid-cols-3 gap-3 pt-4" style={{ display: 'none' }}>
        {/* Card 1: Users (1,248,563 + Real Users) */}
        <div className={`bg-[#06184a]/80 border ${pulseCard === 'users' ? 'border-[#ffcc00] shadow-[0_0_20px_rgba(255,204,0,0.3)]' : 'border-[#0d52ff]/30'} rounded-2xl p-3.5 text-center space-y-1.5 transition-all duration-300 relative overflow-hidden group shadow-md`}>
          <div className="flex justify-center text-[#ffcc00]">
            <Users className="w-5 h-5" />
          </div>
          <div className="text-white font-extrabold text-sm md:text-base font-mono tracking-tight">
            {animatedUsers.toLocaleString('en-US')}
          </div>
          <div className="text-slate-300 text-[10px] font-medium leading-none">
            مستخدم مسجل {platformMetrics.real.users > 0 && <span className="text-[#ffcc00] font-mono font-bold">(+{platformMetrics.real.users})</span>}
          </div>
        </div>

        {/* Card 2: Searches (12,458,963 + Real Searches) */}
        <div className={`bg-[#06184a]/80 border ${pulseCard === 'searches' ? 'border-[#ffcc00] shadow-[0_0_20px_rgba(255,204,0,0.3)]' : 'border-[#0d52ff]/30'} rounded-2xl p-3.5 text-center space-y-1.5 transition-all duration-300 relative overflow-hidden group shadow-md`}>
          <div className="flex justify-center text-[#ffcc00]">
            <Search className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div className="text-white font-extrabold text-sm md:text-base font-mono tracking-tight">
            {animatedSearches.toLocaleString('en-US')}
          </div>
          <div className="text-slate-300 text-[10px] font-medium leading-none">
            عملية بحث ناجحة {platformMetrics.real.searches > 0 && <span className="text-[#ffcc00] font-mono font-bold">(+{platformMetrics.real.searches})</span>}
          </div>
        </div>

        {/* Card 3: Database Identities (45,231,789 + Real Contacts) */}
        <div className={`bg-[#06184a]/80 border ${pulseCard === 'contacts' ? 'border-[#ffcc00] shadow-[0_0_20px_rgba(255,204,0,0.3)]' : 'border-[#0d52ff]/30'} rounded-2xl p-3.5 text-center space-y-1.5 transition-all duration-300 relative overflow-hidden group shadow-md`}>
          <div className="flex justify-center text-[#ffcc00]">
            <Database className="w-5 h-5" />
          </div>
          <div className="text-white font-extrabold text-sm md:text-base font-mono tracking-tight">
            {animatedContacts.toLocaleString('en-US')}
          </div>
          <div className="text-slate-300 text-[10px] font-medium leading-none">
            هوية ورقم نشط {platformMetrics.real.contacts > 0 && <span className="text-[#ffcc00] font-mono font-bold">(+{platformMetrics.real.contacts})</span>}
          </div>
        </div>
      </div>

      {/* GORGEOUS SIMULATED CONSECUTIVE ADS MODAL OVERLAY */}
      <AnimatePresence>
        {isWatchingSeries && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4"
            dir="rtl"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-gradient-to-b from-[#11162d] to-[#080b18] border border-[#c5a059]/30 rounded-2xl max-w-md w-full p-6 text-center space-y-6 shadow-[0_10px_50px_rgba(212,175,55,0.2)]"
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-white/5">
                <span className="text-[10px] bg-[#e5c158]/10 text-[#e5c158] px-2.5 py-1 rounded-full font-bold">تحدي الـ 6 إعلانات المتتالية</span>
                <span className="text-white text-xs font-bold">مشغل الإعلانات المدمج</span>
              </div>

              {/* Progress counter */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-gray-400">
                  <span>تمت مشاهدة: {currentAdIndex - 1} من 6</span>
                  <span className="text-[#e5c158] font-bold">الإعلان الحالي: {currentAdIndex}/6</span>
                </div>
                <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-[#e5c158] to-[#c5a059] transition-all duration-1000"
                    style={{ width: `${((currentAdIndex - 1) / 6) * 100}%` }}
                  />
                </div>
              </div>

              {/* Simulated Ad Video/Banner Area */}
              <div className="relative aspect-video rounded-xl overflow-hidden bg-black flex flex-col items-center justify-center border border-white/5 shadow-inner">
                {/* Visual simulator */}
                <div className="absolute inset-0 bg-gradient-to-tr from-[#0f1c3f] to-black opacity-60" />
                
                {/* Moving elements inside the ad view */}
                <div className="relative z-10 text-center space-y-3 p-4">
                  <div className="w-12 h-12 rounded-full bg-[#c5a059]/10 border border-[#c5a059]/30 flex items-center justify-center mx-auto text-[#e5c158] animate-bounce">
                    <Play className="w-5 h-5 fill-current" />
                  </div>
                  <h4 className="text-white text-xs font-extrabold tracking-wide">
                    {currentAdIndex === 1 && "مجموعة هائل سعيد أنعم - شركاء البناء والتنمية"}
                    {currentAdIndex === 2 && "شركة سبأفون للاتصالات - ابقَ على اتصال مع من تحب"}
                    {currentAdIndex === 3 && "يمن موبايل - الشبكة الأولى والأوسع تغطية في اليمن"}
                    {currentAdIndex === 4 && "كاك بنك - الخدمات المصرفية الإلكترونية الأسهل والأسرع"}
                    {currentAdIndex === 5 && "مجموعة شركات شاهر - جودة تفوق التوقعات دائماً"}
                    {currentAdIndex === 6 && "برنامج معروف الذهبي - كشف الأسماء الشامل والآمن"}
                  </h4>
                  <p className="text-gray-400 text-[10px] leading-relaxed max-w-[280px] mx-auto">
                    رعاية حصرية لمنصة معروف لمكافحة الأرقام المجهولة والحد من الرسائل العشوائية والابتزاز.
                  </p>
                </div>

                {/* Corner countdown indicator */}
                <div className="absolute top-3 right-3 bg-black/80 backdrop-blur px-3 py-1 rounded-lg border border-white/10 text-[10px] text-white flex items-center gap-1.5 font-bold font-mono">
                  <Clock className="w-3.5 h-3.5 text-[#e5c158]" />
                  <span>تخطي بعد {seriesTimer}ث</span>
                </div>
              </div>

              {/* Safety warning */}
              <div className="p-3 bg-[#c5a059]/5 border border-[#c5a059]/15 rounded-xl flex items-center gap-2 justify-end">
                <p className="text-[10px] text-gray-300 leading-normal text-right">
                  يرجى عدم إغلاق المشغل أو الخروج حتى تكتمل العروض الـ 6 بالكامل ليتم كشف جميع الأسماء تلقائياً.
                </p>
                <Info className="w-4 h-4 text-[#e5c158] shrink-0" />
              </div>

              {/* Force Cancel Button */}
              <button
                onClick={() => {
                  setIsWatchingSeries(false);
                  showToast('تم إلغاء التحدي. يجب مشاهدة الـ 6 إعلانات متتالية بالكامل لتفعيل الميزة.', 'warning');
                }}
                className="w-full py-2 bg-red-950/30 hover:bg-red-900/30 text-red-400 text-xs font-bold rounded-lg border border-red-900/10 transition-all"
              >
                إلغاء والمغادرة
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* DELETE CONFIRMATION MODAL FOR SUBSCRIBED USERS */}
      <AnimatePresence>
        {deleteConfirmOpen && deletingContact && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 overflow-y-auto" dir="rtl">
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-md overflow-hidden rounded-3xl border-2 border-rose-500/50 bg-gradient-to-b from-[#2a0c16] via-[#15070d] to-[#070204] p-6 text-right shadow-[0_20px_70px_rgba(244,63,94,0.35)] space-y-4"
            >
              <div className="flex items-center justify-between pb-2 border-b border-rose-500/20">
                <button
                  type="button"
                  onClick={() => {
                    setDeleteConfirmOpen(false);
                    setDeletingContact(null);
                  }}
                  className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                    تأكيد حذف الاسم
                  </span>
                  <Trash2 className="w-5 h-5 text-rose-400" />
                </div>
              </div>

              <div className="text-center space-y-2">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-rose-600 to-red-600 border-2 border-rose-400/50 flex items-center justify-center mx-auto shadow-lg shadow-rose-600/30">
                  <Trash2 className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-white text-base md:text-lg font-black leading-snug">
                  هل أنت متأكد من رغبتك في حذف هذا الاسم؟
                </h3>
                <p className="text-rose-200/80 text-xs leading-relaxed">
                  سيتم حذف الاسم وإخفاؤه نهائياً من نتائج البحث وقاعدة البيانات للرقم المعني، وحظر إعادة مزامنته مستقبلاً.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-black/60 border border-rose-500/30 text-center space-y-1">
                <span className="text-[10px] text-gray-400 block">تفاصيل الاسم المستهدف للحذف:</span>
                <div className="text-yellow-300 font-black text-base">
                  «{deletingContact.contactName}»
                </div>
                <div className="text-gray-400 text-xs font-mono" dir="ltr">
                  رقم الهاتف: {searchedNum || deletingContact.phoneNumber}
                </div>
              </div>

              {currentUser && !systemSettings?.allowDeleteNamesGlobal && (
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-rose-950/40 border border-rose-500/20 text-xs text-rose-200">
                  <span>الرصيد المتاح لعمليات الحذف:</span>
                  <span className="font-mono font-bold text-yellow-300">
                    {Math.max(0, (currentUser.nameDeletionsLimit || 0) - (currentUser.nameDeletionsUsed || 0))} عملية متبقية
                  </span>
                </div>
              )}

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  disabled={isDeleting}
                  className="flex-1 py-3 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-black text-xs rounded-xl shadow-lg transition-all flex items-center justify-center gap-1.5 disabled:opacity-60 cursor-pointer active:scale-95"
                >
                  {isDeleting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>جارٍ الحذف والتطبيق...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      <span>نعم، حذف الاسم نهائياً</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDeleteConfirmOpen(false);
                    setDeletingContact(null);
                  }}
                  disabled={isDeleting}
                  className="px-5 py-3 bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-bold rounded-xl border border-white/5 transition-all cursor-pointer"
                >
                  إلغاء
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* VIP UPGRADE MODAL FOR REVEAL REGISTRAR & NAME DELETIONS WITH PACKAGE SELECTOR */}
      <AnimatePresence>
        {vipModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 overflow-y-auto" dir="rtl">
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-lg overflow-hidden rounded-3xl border-2 border-purple-500/40 bg-gradient-to-b from-[#160c33] via-[#0c122b] to-[#060a17] p-5 sm:p-6 text-right shadow-[0_20px_70px_rgba(147,51,234,0.35)] space-y-4 my-8"
            >
              {/* Glowing decorative backdrop */}
              <div className="absolute -top-20 -right-20 w-44 h-44 bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -bottom-20 -left-20 w-44 h-44 bg-[#e5c158]/15 rounded-full blur-3xl pointer-events-none" />

              {/* Close Button & Badge */}
              <div className="flex items-center justify-between pb-2 border-b border-purple-500/20">
                <button
                  type="button"
                  onClick={() => setVipModalOpen(false)}
                  className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    باقة كبار الشخصيات VIP
                  </span>
                  <Crown className="w-5 h-5 text-yellow-400" />
                </div>
              </div>

              {/* Icon & Title */}
              <div className="text-center space-y-1.5">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 border-2 border-purple-400/50 flex items-center justify-center mx-auto shadow-lg shadow-purple-600/30">
                  {vipActionType === 'delete' ? (
                    <Trash2 className="w-7 h-7 text-white" />
                  ) : (
                    <Award className="w-7 h-7 text-white" />
                  )}
                </div>
                <h3 className="text-white text-base md:text-lg font-black leading-snug">
                  {vipActionType === 'delete'
                    ? 'خدمة «حذف وإخفاء الأسماء من قاعدة البيانات» VIP 🛡️'
                    : 'خدمة «كاشف مسجّل الأرقام والأسماء» VIP 👑'}
                </h3>
                <p className="text-purple-200/80 text-xs">
                  {vipActionType === 'delete'
                    ? 'إزالة الأسماء غير المرغوبة نهائياً من نتائج البحث وقاعدة البيانات وحظر إعادة مزامنتها'
                    : 'معرفة صاحب الحساب ورقم الهاتف الذي قام بحفظ هذا الاسم في هاتفه ومزامنته في المنصة'}
                </p>
              </div>

              {/* Target info preview */}
              {targetContactForVip && (
                <div className="p-2.5 rounded-xl bg-black/40 border border-purple-500/30 text-center space-y-0.5">
                  <span className="text-[10px] text-gray-400 block">
                    {vipActionType === 'delete' ? 'الاسم المطلوب حذفه وإخفاؤه:' : 'الاسم المراد معرفة من سجّله:'}
                  </span>
                  <div className="flex items-center justify-center gap-2 font-bold text-sm">
                    <span className="text-yellow-300 font-bold">«{targetContactForVip.contactName}»</span>
                    <span className="text-gray-400 text-xs font-mono" dir="ltr">({searchedNum || targetContactForVip.phoneNumber})</span>
                  </div>
                </div>
              )}

              {/* Package Selection Area */}
              <div className="space-y-2">
                <span className="text-white text-xs font-bold block flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
                  <span>اختر الباقة المناسبة لك للاشتراك والتفعيل الفوري:</span>
                </span>

                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {(vipPlans.length > 0 ? vipPlans : [
                    {
                      id: 'plan_starter',
                      name: 'باقة البداية (Starter VIP)',
                      priceYmr: 2500,
                      priceUsd: 5,
                      revealsCount: 10,
                      nameDeletionsCount: 1,
                      description: '10 عمليات كشف مسجّل + حذف اسم واحد',
                      badge: 'بداية مثالية',
                      features: ['10 عمليات كشف مؤكدة', 'حذف اسم واحد'],
                      isActive: true
                    },
                    {
                      id: 'plan_pro',
                      name: 'باقة المحترفين (Pro VIP)',
                      priceYmr: 5000,
                      priceUsd: 10,
                      revealsCount: 35,
                      nameDeletionsCount: 3,
                      description: '35 عملية كشف مسجّل + حذف حتى 3 أسماء',
                      badge: 'الأكثر طلباً ⭐',
                      features: ['35 عملية كشف دقيقة', 'حذف 3 أسماء'],
                      isActive: true
                    },
                    {
                      id: 'plan_elite',
                      name: 'باقة النخبة الشاملة (Elite VIP)',
                      priceYmr: 12000,
                      priceUsd: 20,
                      revealsCount: 100,
                      nameDeletionsCount: 10,
                      description: '100 عملية كشف + حذف 10 أسماء مع دعم 24/7',
                      badge: 'أفضل قيمة 👑',
                      features: ['100 عملية كشف', 'حذف 10 أسماء'],
                      isActive: true
                    }
                  ]).map((p) => {
                    const isSelected = selectedModalPlanId === p.id;
                    return (
                      <div
                        key={p.id}
                        onClick={() => setSelectedModalPlanId(p.id)}
                        className={`p-3 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between gap-3 ${
                          isSelected
                            ? 'bg-purple-950/60 border-purple-400 shadow-[0_0_20px_rgba(168,85,247,0.3)]'
                            : 'bg-black/40 border-white/5 hover:border-white/20'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="radio"
                            name="vipPlanSelect"
                            checked={isSelected}
                            onChange={() => setSelectedModalPlanId(p.id)}
                            className="accent-purple-400 w-4 h-4"
                          />
                          <div className="space-y-0.5 text-right">
                            <div className="flex items-center gap-2">
                              <span className="text-white text-xs font-bold">{p.name}</span>
                              {p.badge && (
                                <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-300 border border-yellow-500/30">
                                  {p.badge}
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-gray-300 block">{p.description}</span>
                          </div>
                        </div>

                        <div className="text-left shrink-0">
                          <div className="text-yellow-400 font-mono font-black text-sm">
                            {p.priceYmr.toLocaleString('ar-EG')} <span className="text-[10px] text-yellow-200">ريال</span>
                          </div>
                          <div className="text-[9px] text-purple-300 font-mono space-y-0.5">
                            {p.revealsCount > 0 && <div>{p.revealsCount} كشف</div>}
                            {(p.nameDeletionsCount || 0) > 0 && <div className="text-rose-300 font-bold">{p.nameDeletionsCount} حذف اسم 🛡️</div>}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Selected Plan Summary & WhatsApp Call-To-Action */}
              {(() => {
                const activePlans = vipPlans.length > 0 ? vipPlans : [
                  { id: 'plan_starter', name: 'باقة البداية (Starter VIP)', priceYmr: 2500, priceUsd: 5, revealsCount: 10, nameDeletionsCount: 1, description: 'كشف هوية ورقم مسجّل الاسم لـ 10 عمليات + حذف اسم واحد' },
                  { id: 'plan_pro', name: 'باقة المحترفين (Pro VIP)', priceYmr: 5000, priceUsd: 10, revealsCount: 35, nameDeletionsCount: 3, description: 'كشف هوية ورقم مسجّل الاسم لـ 35 عملية + حذف 3 أسماء' },
                  { id: 'plan_elite', name: 'باقة النخبة الشاملة (Elite VIP)', priceYmr: 12000, priceUsd: 20, revealsCount: 100, nameDeletionsCount: 10, description: '100 عملية كشف + حذف 10 أسماء' }
                ];
                const activePlan = activePlans.find(p => p.id === selectedModalPlanId) || activePlans[0];
                const adminPhoneClean = (systemSettings?.adminPhone || '774919194').replace(/^0+/, '');

                const waMessage = vipActionType === 'delete'
                  ? `السلام عليكم ورحمة الله،
أود الاشتراك وتفعيل «${activePlan.name}» في منصة معروف لحذف اسم من قاعدة البيانات:
• رقم حسابي: ${currentUser?.phone || 'غير مسجل'}
• الباقة المختارة: ${activePlan.name}
• السعر: ${activePlan.priceYmr.toLocaleString('ar-EG')} ريال يمني
${targetContactForVip ? `• الاسم المطلوب حذفه وإخفاؤه: «${targetContactForVip.contactName}» للرقم (${searchedNum || targetContactForVip.phoneNumber})` : ''}
يرجى تأكيد التفعيل لحسابي في منصة معروف.`
                  : `السلام عليكم ورحمة الله،
أود الاشتراك وتفعيل «${activePlan.name}» في منصة معروف:
• رقم حسابي: ${currentUser?.phone || 'غير مسجل'}
• الباقة المختارة: ${activePlan.name}
• السعر: ${activePlan.priceYmr.toLocaleString('ar-EG')} ريال يمني
${targetContactForVip ? `• الاستعلام المطلوب كشف مسجّله: الرقم ${searchedNum || targetContactForVip.phoneNumber} (الاسم: ${targetContactForVip.contactName})` : ''}
يرجى تفعيل الباقة لحسابي في منصة معروف.`;

                return (
                  <div className="space-y-2 pt-1">
                    <a
                      href={`https://wa.me/967${adminPhoneClean}?text=${encodeURIComponent(waMessage)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-3 bg-gradient-to-r from-emerald-600 via-green-600 to-emerald-700 hover:brightness-110 text-white font-extrabold text-xs rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95"
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span>تأكيد واشتراك في «{activePlan.name}» عبر واتساب</span>
                    </a>

                    <div className="flex items-center justify-between text-xs pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setVipModalOpen(false);
                          setActiveTab('upgrade');
                        }}
                        className="text-purple-300 hover:text-white underline text-[11px] font-bold"
                      >
                        عرض صفحة باقات الترقية بالكامل ➔
                      </button>

                      <button
                        type="button"
                        onClick={() => setVipModalOpen(false)}
                        className="px-4 py-1.5 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white text-xs font-bold rounded-xl transition-all"
                      >
                        إغلاق
                      </button>
                    </div>
                  </div>
                );
              })()}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
