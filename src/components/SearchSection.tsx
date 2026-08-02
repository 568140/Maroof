import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Info, Users, Database, ShieldAlert, Coins, Copy, Check, RefreshCw, Star, AlertTriangle, ArrowRight, Eye, Play, Clock, Sparkles, X } from 'lucide-react';
import { User, Contact, Ad } from '../types';

interface SearchSectionProps {
  currentUser: User | null;
  onSearch: (query: string, type: 'standard' | 'advanced') => Promise<{ results: Contact[]; advanced?: boolean; outOfBalance?: boolean; insufficientPoints?: boolean }>;
  setActiveTab: (tab: string) => void;
  onOpenAuth: () => void;
  showToast: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
  onRefreshUser?: () => Promise<void>;
  adsList?: Ad[];
}

export default function SearchSection({
  currentUser,
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
      const res = await fetch('/api/user/convert-points', {
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

  const handleCompleteAdSeries = async () => {
    setIsWatchingSeries(false);
    if (!currentUser) return;

    try {
      // Trigger the backend ads/view endpoint for each of the 6 ads to record them
      // This increases their consecutive count and triggers the Server's automatic unlock!
      showToast('تهانينا! جارٍ معالجة تفعيل الهويات الشاملة لمشاهدتك 6 إعلانات متتالية...', 'info');
      
      for (let i = 0; i < 6; i++) {
        const adId = adsList.length > 0 ? adsList[i % adsList.length]?.id : `ad${(i % 4) + 1}`;
        await fetch('/api/ads/view', {
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

    if (!currentUser) {
      showToast('يرجى تسجيل الدخول أولاً للبحث.', 'warning');
      onOpenAuth();
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
      const response = await onSearch(cleanNum, type);
      setResults(mapRawResults(response.results));
      setSearchedNum(cleanNum);
      setHasSearched(true);
      saveToHistory(cleanNum);
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

  return (
    <div className="max-w-xl mx-auto space-y-6">
      {/* Visual Identity Title Section */}
      <div className="text-center space-y-2 py-4">
        <h1 className="text-white text-2xl md:text-3xl font-black leading-snug">
          اعرف هوية أي رقم يمني <br className="sm:hidden" /> خلال ثوانٍ
        </h1>
        <p className="text-gray-400 text-xs md:text-sm font-medium">
          قاعدة البيانات الكبرى والأكثر حماية وموثوقية في اليمن
        </p>
      </div>

      {/* Main Search Glassmorphism Card */}
      <div className="bg-gradient-to-br from-[#0c122b]/80 to-[#070b1a]/95 border border-[#c5a059]/20 rounded-2xl p-5 md:p-6 shadow-[0_10px_30px_rgba(0,0,0,0.5)] backdrop-blur-md">
        <form onSubmit={(e) => handleSearchSubmit(e, 'standard')} className="space-y-4">
          <div className="space-y-1.5 text-right">
            <label className="text-[11px] text-[#c5a059] font-bold tracking-wider uppercase">أدخل الرقم اليمني</label>
            <div className="relative">
              <input
                type="tel"
                value={phoneQuery}
                onChange={(e) => setPhoneQuery(e.target.value.replace(/[^\d]/g, '').substring(0, 9))}
                placeholder="771234567"
                className="w-full text-left font-mono font-bold text-lg tracking-widest pl-4 pr-11 py-3.5 rounded-xl bg-black/40 border border-[#c5a059]/15 text-white focus:border-[#e5c158] focus:ring-1 focus:ring-[#e5c158] transition-all outline-none"
                dir="ltr"
              />
              <div className="absolute top-1/2 -translate-y-1/2 right-3.5 text-[#c5a059]/60">
                <Search className="w-5 h-5" />
              </div>
            </div>
          </div>

          {errorState && (
            <div className="p-3 text-xs text-red-300 bg-red-950/20 border border-red-900/30 rounded-lg text-right flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
              <span>{errorState}</span>
            </div>
          )}

          {/* Glowing Search Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-gradient-to-r from-[#e5c158] to-[#c5a059] hover:from-[#f3e5ab] hover:to-[#e5c158] text-black font-extrabold text-sm rounded-xl shadow-[0_0_20px_rgba(212,175,55,0.25)] hover:shadow-[0_0_30px_rgba(212,175,55,0.4)] transition-all flex items-center justify-center gap-2"
          >
            {loading ? (
              <RefreshCw className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <Search className="w-5 h-5" />
                <span>بحث</span>
              </>
            )}
          </button>
        </form>

        {/* Sync Reminder & Activation Constraint */}
        {currentUser && !currentUser.contactsSynced && (
          <div className="mt-4 p-3 bg-red-950/20 border border-red-500/20 rounded-xl text-right flex items-start gap-2.5">
            <ShieldAlert className="w-4.5 h-4.5 text-red-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-red-300 text-xs font-bold">الحساب غير مفعل حالياً!</h4>
              <p className="text-gray-400 text-[10px] mt-0.5">
                طبقاً لسياسات المنصة، يجب عليك مزامنة جهات اتصالك أولاً لمنحك صلاحيات البحث والمساعدة في بناء الدليل المجتمعي.
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
              <span className="text-[#e5c158] text-sm">{currentUser.searchBalance}</span> / 3 عمليات بحث
            </span>
          </div>
        )}
      </div>

      {/* SEARCH RESULTS VIEW (Follows layout mockup 2) */}
      <AnimatePresence>
        {hasSearched && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="bg-gradient-to-br from-[#0c122b]/90 to-[#070b1a]/95 border border-[#c5a059]/20 rounded-2xl p-5 shadow-[0_15px_35px_rgba(0,0,0,0.6)] backdrop-blur-md text-right"
          >
            <div className="flex items-center justify-between pb-4 border-b border-white/5 mb-4">
              <button 
                onClick={handleCopyNum}
                className="flex items-center gap-1 text-xs text-[#c5a059] hover:text-white transition-colors"
              >
                {copiedNum ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span className="font-mono font-bold">{searchedNum}</span>
              </button>
              <h3 className="text-white text-sm font-bold">نتائج البحث عن الرقم</h3>
            </div>

            {results.length > 0 ? (
              <div className="space-y-3">
                <p className="text-gray-400 text-[10px] pb-1">الأسماء الأكثر شيوعاً المرتبطة بالرقم:</p>
                <div className="space-y-2">
                  {results.map((item, index) => (
                    <div
                      key={item.id || index}
                      className="group flex items-center justify-between p-3.5 rounded-xl bg-white/5 border border-white/5 hover:border-[#c5a059]/30 hover:bg-[#c5a059]/5 transition-all"
                    >
                      {/* Copy Action & Percentage */}
                      <div className="flex items-center gap-3">
                        <span className="text-[#e5c158] font-bold text-xs">{calculatePercentage(item.frequency)}%</span>
                        <button
                          onClick={() => handleCopyText(item.contactName, index)}
                          className="text-gray-400 hover:text-white p-1 rounded hover:bg-white/5 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
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
                  ))}
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

      {/* Platform Real-Time Metrics (Follows reference dashboard metric layout) */}
      <div className="grid grid-cols-3 gap-3 pt-4">
        <div className="bg-[#0c122b]/60 border border-[#c5a059]/10 rounded-xl p-3 text-center space-y-1">
          <div className="flex justify-center text-[#e5c158]">
            <Users className="w-4.5 h-4.5" />
          </div>
          <div className="text-white font-extrabold text-sm md:text-base font-mono">1,248,563</div>
          <div className="text-gray-400 text-[9px] font-medium leading-none">مستقبل مستخدم</div>
        </div>

        <div className="bg-[#0c122b]/60 border border-[#c5a059]/10 rounded-xl p-3 text-center space-y-1">
          <div className="flex justify-center text-[#e5c158]">
            <Search className="w-4.5 h-4.5" />
          </div>
          <div className="text-white font-extrabold text-sm md:text-base font-mono">12,458,963</div>
          <div className="text-gray-400 text-[9px] font-medium leading-none">عملية بحث ناجحة</div>
        </div>

        <div className="bg-[#0c122b]/60 border border-[#c5a059]/10 rounded-xl p-3 text-center space-y-1">
          <div className="flex justify-center text-[#e5c158]">
            <Database className="w-4.5 h-4.5" />
          </div>
          <div className="text-white font-extrabold text-sm md:text-base font-mono">45,231,789</div>
          <div className="text-gray-400 text-[9px] font-medium leading-none">رقم وهوية يمنية</div>
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
    </div>
  );
}
