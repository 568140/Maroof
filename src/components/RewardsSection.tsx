import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Gift, Coins, Eye, Play, Sparkles, X, Clock, HelpCircle, CheckCircle, Smartphone, Award, ArrowUpRight } from 'lucide-react';
import { User, Ad, Transaction } from '../types';

interface RewardsSectionProps {
  currentUser: User | null;
  adsList: Ad[];
  onPlayAd: (adId: string) => Promise<{ rewardText: string; user: User }>;
  transactions: Transaction[];
  onOpenAuth: () => void;
  showToast: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
  onRefreshUser?: () => Promise<void>;
}

export default function RewardsSection({
  currentUser,
  adsList,
  onPlayAd,
  transactions,
  onOpenAuth,
  showToast,
  onRefreshUser,
}: RewardsSectionProps) {
  const [activeAd, setActiveAd] = useState<Ad | null>(null);
  const [timer, setTimer] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [rewardMsg, setRewardMsg] = useState('');
  const [watchCountToday, setWatchCountToday] = useState(() => {
    return Number(localStorage.getItem('maarouf_ads_watched_today') || '0');
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleConvertPoints = async (option: string) => {
    if (!currentUser) {
      showToast('يرجى تسجيل الدخول أولاً لتتمكن من استبدال النقاط.', 'warning');
      onOpenAuth();
      return;
    }
    
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/user/convert-points', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: currentUser.phone, option })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشلت عملية التحويل');
      
      showToast(data.message, 'success');
      if (onRefreshUser) {
        await onRefreshUser();
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartAd = (ad: Ad) => {
    if (!currentUser) {
      showToast('يرجى تسجيل الدخول أولاً للمشاهدة كسب المكافآت.', 'warning');
      onOpenAuth();
      return;
    }
    setActiveAd(ad);
    setTimer(ad.duration);
    setIsPlaying(true);
    setCompleted(false);
    setRewardMsg('');
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying && timer > 0) {
      interval = setInterval(() => {
        setTimer(prev => prev - 1);
      }, 1000);
    } else if (isPlaying && timer === 0) {
      handleCompleteAd();
    }
    return () => clearInterval(interval);
  }, [isPlaying, timer]);

  const handleCompleteAd = async () => {
    if (!activeAd || !currentUser) return;
    setIsPlaying(false);

    try {
      const response = await onPlayAd(activeAd.id);
      setCompleted(true);
      setRewardMsg(response.rewardText);
      const nextCount = watchCountToday + 1;
      setWatchCountToday(nextCount);
      localStorage.setItem('maarouf_ads_watched_today', nextCount.toString());
      showToast('تمت مشاهدة الإعلان بالكامل واستلام المكافأة!', 'success');
    } catch (err: any) {
      showToast(err.message || 'فشلت معالجة المكافأة.', 'error');
      setActiveAd(null);
    }
  };

  const handleCloseAdPlayer = () => {
    if (isPlaying && timer > 0 && !completed) {
      if (confirm('تنبيه: إذا قمت بإغلاق الإعلان قبل انتهاء الوقت، فلن تحصل على المكافأة. هل أنت متأكد من الإغلاق؟')) {
        setIsPlaying(false);
        setActiveAd(null);
      }
    } else {
      setIsPlaying(false);
      setActiveAd(null);
      setCompleted(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-6">
      {/* Visual Header */}
      <div className="text-center space-y-2 py-2">
        <h2 className="text-white text-xl md:text-2xl font-extrabold text-gradient">المكافآت والربح من الإعلانات</h2>
        <p className="text-gray-400 text-xs max-w-sm mx-auto">
          شاهد العروض الترويجية والبنرات الممولة لدعم استمرارية المنصة وشحن رصيدك ونقاطك فوراً
        </p>
      </div>

      {/* Point portfolio dashboard */}
      <div className="bg-gradient-to-tr from-[#121c3e] to-[#0d1430] border border-[#c5a059]/30 rounded-2xl p-5 shadow-lg relative overflow-hidden text-right">
        <div className="absolute top-0 left-0 w-24 h-24 bg-[#c5a059]/5 rounded-full blur-2xl" />
        <div className="flex items-center justify-between">
          <div className="text-right">
            <span className="text-gray-400 text-xs">رصيدك الحالي</span>
            <div className="text-[#e5c158] font-black text-3xl mt-1 flex items-center justify-end gap-1 font-sans">
              <span>{currentUser ? currentUser.points : '100'}</span>
              <Coins className="w-6 h-6 inline" />
            </div>
            <span className="text-[10px] text-gray-500 block mt-1">
              {currentUser ? `عمليات البحث المتبقية اليوم: ${currentUser.searchBalance}` : 'سجل لتفعيل محفظة النقاط'}
            </span>
          </div>

          <div className="w-14 h-14 rounded-full bg-[#c5a059]/10 border border-[#c5a059]/30 flex items-center justify-center text-[#e5c158] shadow-[0_0_15px_rgba(212,175,55,0.1)]">
            <Gift className="w-7 h-7 animate-bounce" />
          </div>
        </div>
      </div>

      {/* Point Redemption Store */}
      <div className="bg-[#0c122b]/80 border border-[#c5a059]/15 rounded-2xl p-4 md:p-5 text-right space-y-4">
        <div>
          <h3 className="text-white text-sm font-bold flex items-center gap-1.5 justify-end">
            <span>متجر استبدال النقاط والجوائز</span>
            <Sparkles className="w-4 h-4 text-[#e5c158]" />
          </h3>
          <p className="text-gray-400 text-[11px] mt-0.5">استبدل نقاطك المتراكمة لتنشيط مزايا وخدمات استثنائية لمطبوعاتك وبحوثك:</p>
        </div>

        <div className="grid grid-cols-1 gap-3">
          {/* Option 1: 5 Searches */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-black/40 border border-white/5 text-xs gap-3">
            <button
              disabled={isSubmitting || !currentUser || currentUser.points < 50}
              onClick={() => handleConvertPoints('5searches')}
              className="px-3 py-1.5 bg-[#c5a059] hover:bg-[#e5c158] disabled:bg-gray-800 disabled:text-gray-500 text-black font-extrabold text-[11px] rounded-lg transition-all shrink-0"
            >
              استبدال بقيمة ٥٠ نقطة
            </button>
            <div className="text-right">
              <span className="text-white font-bold block">شحن رصيد بحث أساسي (+٥ عمليات)</span>
              <span className="text-gray-500 text-[10px]">استبدل ٥٠ نقطة للحصول على ٥ عمليات استعلام بحث مضافة لرصيدك اليوم.</span>
            </div>
          </div>

          {/* Option 2: 12 Searches */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-black/40 border border-white/5 text-xs gap-3">
            <button
              disabled={isSubmitting || !currentUser || currentUser.points < 100}
              onClick={() => handleConvertPoints('12searches')}
              className="px-3 py-1.5 bg-[#c5a059] hover:bg-[#e5c158] disabled:bg-gray-800 disabled:text-gray-500 text-black font-extrabold text-[11px] rounded-lg transition-all shrink-0"
            >
              استبدال بقيمة ١٠٠ نقطة
            </button>
            <div className="text-right">
              <span className="text-white font-bold block">شحن رصيد بحث مكثف (+١٢ عملية)</span>
              <span className="text-gray-500 text-[10px]">عرض ترويجي: استبدل ١٠٠ نقطة للحصول على ١٢ عملية استعلام إضافية فوراً.</span>
            </div>
          </div>

          {/* Option 3: Unlimited Reveal Names */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-l from-[#1e295d]/20 to-transparent border border-indigo-500/10 text-xs gap-3">
            {currentUser?.unlockedUnlimited ? (
              <span className="px-3 py-1.5 bg-green-500/15 text-green-400 font-bold rounded-lg text-[10px] shrink-0">
                مفتوح ونشط مدى الحياة!
              </span>
            ) : (
              <button
                disabled={isSubmitting || !currentUser || currentUser.points < 80}
                onClick={() => handleConvertPoints('reveal_unlimited')}
                className="px-3 py-1.5 bg-gradient-to-r from-indigo-500 to-purple-600 hover:brightness-110 disabled:from-gray-800 disabled:to-gray-800 disabled:text-gray-500 text-white font-extrabold text-[11px] rounded-lg transition-all shrink-0"
              >
                تفعيل بقيمة ٨٠ نقطة
              </button>
            )}
            <div className="text-right">
              <span className="text-indigo-300 font-bold block flex items-center justify-end gap-1">
                <span>تخطي قيود الـ ١٥ اسماً وكشف السجل بالكامل</span>
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              </span>
              <span className="text-gray-400 text-[10px]">تجاوز حد عرض الـ ١٥ اسماً للمتصل، واكشف كامل أرشيف الأسماء لأي رقم يمني تبحث عنه.</span>
            </div>
          </div>
        </div>
      </div>

      {/* Milestones and Reward systems (Section 12) */}
      <div className="bg-[#0c122b]/80 border border-[#c5a059]/15 rounded-2xl p-4 md:p-5 text-right space-y-4">
        <div>
          <h3 className="text-white text-sm font-bold flex items-center gap-1.5 justify-end">
            <span>مستويات الإنجاز وشحن الرصيد</span>
            <Award className="w-4 h-4 text-[#e5c158]" />
          </h3>
          <p className="text-gray-400 text-[11px] mt-0.5">شاهد الإعلانات يومياً وافتح المزايا الاحترافية الإضافية:</p>
        </div>

        <div className="space-y-2.5">
          {/* Milestone 1 */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-black/40 border border-white/5">
            <div className={`px-2.5 py-1 rounded text-[10px] font-bold ${watchCountToday >= 1 ? 'bg-green-500/20 text-green-400' : 'bg-gray-800 text-gray-400'}`}>
              {watchCountToday >= 1 ? 'تم تحقيقها' : `${watchCountToday} / 1 إعلان`}
            </div>
            <div className="text-right">
              <span className="text-white text-xs font-bold block">مستوى البحث الأساسي</span>
              <span className="text-gray-400 text-[10px]">شاهد إعلاناً واحداً للحصول على <span className="text-[#e5c158] font-bold">+1 عملية بحث</span></span>
            </div>
          </div>

          {/* Milestone 2 */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-black/40 border border-white/5">
            <div className={`px-2.5 py-1 rounded text-[10px] font-bold ${watchCountToday >= 3 ? 'bg-green-500/20 text-green-400' : 'bg-gray-800 text-gray-400'}`}>
              {watchCountToday >= 3 ? 'تم تحقيقها' : `${watchCountToday} / 3 إعلانات`}
            </div>
            <div className="text-right">
              <span className="text-white text-xs font-bold block">مستوى البحث الإضافي</span>
              <span className="text-gray-400 text-[10px]">شاهد ٣ إعلانات للحصول على <span className="text-[#e5c158] font-bold">+3 عمليات بحث</span></span>
            </div>
          </div>

          {/* Milestone 3 */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-black/40 border border-white/5">
            <div className={`px-2.5 py-1 rounded text-[10px] font-bold ${watchCountToday >= 6 ? 'bg-green-500/20 text-green-400' : 'bg-gray-800 text-gray-400'}`}>
              {watchCountToday >= 6 ? 'مفتوح الآن' : `${watchCountToday} / 6 إعلانات`}
            </div>
            <div className="text-right">
              <span className="text-white text-xs font-bold block">فتح البحث المتقدم الشامل</span>
              <span className="text-gray-400 text-[10px]">شاهد ٦ إعلانات لتفعيل ميزة <span className="text-[#e5c158] font-bold">البحث المتقدم</span> مجاناً</span>
            </div>
          </div>
        </div>
      </div>

      {/* Available Ads (AdMob and private sponsors) */}
      <div className="space-y-3 text-right">
        <span className="text-[11px] text-[#c5a059] font-bold tracking-wider uppercase block">شبكة الإعلانات المتاحة للربح</span>

        {adsList.length > 0 ? (
          <div className="grid grid-cols-1 gap-3">
            {adsList.map((ad) => (
              <div
                key={ad.id}
                className="group flex flex-col md:flex-row items-stretch rounded-xl bg-gradient-to-br from-[#0c122b] to-[#070b1a] border border-[#c5a059]/15 overflow-hidden shadow-md hover:border-[#e5c158]/50 transition-all text-right"
              >
                {/* Visual Cover/Thumbnail if custom, or a nice placeholder */}
                {ad.mediaUrl ? (
                  <div className="md:w-1/3 h-28 md:h-auto relative overflow-hidden bg-black flex items-center justify-center">
                    <img src={ad.mediaUrl} alt={ad.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <Play className="w-7 h-7 text-[#e5c158] drop-shadow-lg" />
                    </div>
                  </div>
                ) : (
                  <div className="md:w-1/3 h-20 md:h-auto bg-gradient-to-br from-[#1a1c3d] to-[#12142d] flex flex-col items-center justify-center p-3 text-center border-b md:border-b-0 md:border-l border-white/5">
                    <span className="text-[10px] bg-yellow-500/10 text-yellow-400 px-2 py-0.5 rounded font-bold uppercase tracking-wider mb-1">
                      {ad.source === 'admob' ? 'AdMob Video' : 'Sponsor'}
                    </span>
                    <Smartphone className="w-5 h-5 text-[#c5a059]" />
                  </div>
                )}

                {/* Info and action */}
                <div className="flex-1 p-4 flex flex-col justify-between space-y-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 justify-end">
                      <span className="text-[10px] text-gray-500 flex items-center gap-0.5">
                        <Clock className="w-3 h-3" />
                        <span>{ad.duration} ثانية</span>
                      </span>
                      <span className="text-white text-xs font-bold leading-tight line-clamp-1">{ad.title}</span>
                    </div>
                    <p className="text-gray-400 text-[10px]">
                      {ad.type === 'rewarded' 
                        ? `شاهد بالكامل لشحن رصيد البحث فوراً بـ +${ad.reward} عملية` 
                        : `احصل على +${ad.reward || 10} نقاط تُضاف فوراً لمحفظتك`}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <div className="text-[10px] text-[#e5c158] font-bold">
                      {ad.type === 'rewarded' ? `+${ad.reward} رصيد بحث` : `+${ad.reward || 10} نقاط`}
                    </div>
                    <button
                      onClick={() => handleStartAd(ad)}
                      className="px-4 py-1.5 bg-[#c5a059] hover:bg-[#e5c158] text-black font-extrabold text-[11px] rounded-lg transition-all shadow hover:shadow-[0_0_10px_rgba(212,175,55,0.2)]"
                    >
                      مشاهدة
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-6 text-center rounded-xl bg-black/40 border border-white/5 text-gray-500 text-xs">
            لا توجد إعلانات نشطة حالياً. يرجى تفعيل الإعلانات من لوحة تحكم الإدارة.
          </div>
        )}
      </div>

      {/* Point Transaction History Ledger (Section 13) */}
      <div className="space-y-3 text-right">
        <span className="text-[11px] text-[#c5a059] font-bold tracking-wider uppercase block">سجل حركات المحفظة والنقاط</span>

        {currentUser && transactions.length > 0 ? (
          <div className="bg-black/35 border border-white/5 rounded-xl divide-y divide-white/5 max-h-52 overflow-y-auto">
            {transactions.map((t) => (
              <div key={t.id} className="p-3 flex items-center justify-between text-xs">
                <span className={`font-mono font-bold ${t.amount >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {t.amount >= 0 ? `+${t.amount}` : t.amount}
                </span>
                <div className="text-right">
                  <span className="text-white font-bold block">{t.action}</span>
                  <span className="text-gray-500 text-[9px] block mt-0.5">{new Date(t.date).toLocaleTimeString('ar-YE')}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-5 text-center rounded-xl bg-black/30 border border-white/5 text-gray-500 text-xs">
            لا توجد حركات تداول نقاط حتى الآن.
          </div>
        )}
      </div>

      {/* HIGH-FIDELITY AD PLAYER MODAL */}
      <AnimatePresence>
        {activeAd && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col justify-between p-6 text-right"
          >
            {/* Header / Countdown */}
            <div className="flex items-center justify-between">
              <button
                onClick={handleCloseAdPlayer}
                className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#c5a059]/10 border border-[#c5a059]/30 text-xs text-[#e5c158] font-bold">
                <Clock className="w-4 h-4 animate-pulse" />
                {timer > 0 ? (
                  <span>متبقي {timer} ثانية للمكافأة</span>
                ) : (
                  <span className="text-green-400 font-extrabold">مكتمل! يمكنك الإغلاق الآن</span>
                )}
              </div>
            </div>

            {/* Simulated Ad Video/Creative Canvas */}
            <div className="flex-1 my-8 max-w-lg mx-auto w-full rounded-2xl border border-white/10 overflow-hidden bg-gradient-to-b from-[#111324] to-black flex flex-col justify-between relative p-6">
              <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#c5a059_1px,transparent_1px)] [background-size:16px_16px]" />

              <span className="text-[10px] bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 px-2.5 py-1 rounded font-bold uppercase w-fit tracking-wider z-10">
                {activeAd.source === 'admob' ? 'AD UNIT: GOOGLE ADMOB REWARDED' : 'سبونسر معروف المباشر'}
              </span>

              {/* Central interactive ad body */}
              <div className="text-center space-y-4 py-6 z-10">
                {activeAd.mediaUrl ? (
                  <div className="w-full max-h-56 rounded-lg overflow-hidden border border-white/5">
                    <img src={activeAd.mediaUrl} alt={activeAd.title} className="w-full h-full object-cover max-h-56" />
                  </div>
                ) : (
                  <div className="w-20 h-20 rounded-full bg-[#c5a059]/10 border border-[#c5a059]/30 flex items-center justify-center mx-auto text-[#e5c158]">
                    <Sparkles className="w-10 h-10 animate-spin" />
                  </div>
                )}
                <h3 className="text-white text-base md:text-lg font-extrabold max-w-sm mx-auto leading-relaxed">{activeAd.title}</h3>
                <p className="text-gray-400 text-xs">برعاية معروف للخدمات والحلول الرقمية الفاخرة</p>
              </div>

              {/* Simulated Call-to-action */}
              {activeAd.linkUrl && (
                <a
                  href={activeAd.linkUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => {
                    fetch('/api/ads/click', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ adId: activeAd.id })
                    });
                  }}
                  className="w-full py-3 bg-[#e5c158] hover:bg-white text-black font-black text-xs rounded-xl transition-all text-center block z-10"
                >
                  تصفح موقع المعلن والحصول على نقاط بونص
                </a>
              )}
            </div>

            {/* Bottom Reward confirmation card */}
            <div className="p-4 rounded-xl bg-white/5 border border-white/5 max-w-lg mx-auto w-full text-center space-y-2">
              <p className="text-gray-500 text-[10px]">يساعدك هذا الإعلان في الحفاظ على عضوية معروف المجانية.</p>
              {completed && (
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="text-green-400 font-extrabold text-xs flex items-center justify-center gap-1.5"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>{rewardMsg || 'تم إضافة المكافأة لمحفظتك بنجاح!'}</span>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
