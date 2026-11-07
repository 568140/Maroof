import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Gift,
  Coins,
  Play,
  Sparkles,
  X,
  Clock,
  CheckCircle,
  Smartphone,
  Trophy,
  Star,
  Crown,
  Zap,
  ChevronLeft,
  Check,
  History,
} from 'lucide-react';
import { User, Ad, Transaction } from '../types';
import { registerBackHandler } from '../utils/backNavigation';
import { GOLD_COINS_STACK } from '../assets/walletAssetBase64';
import {
  REWARDS_GIFT_3D,
  REWARDS_TROPHY_3D,
  REWARDS_LAPTOP_3D,
  REWARDS_OFFER1_ICON,
  REWARDS_OFFER2_ICON,
  REWARDS_OFFER3_ICON,
} from '../assets/rewardsAssetsBase64';

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
  const adsGridRef = useRef<HTMLDivElement>(null);

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
        body: JSON.stringify({ phone: currentUser.phone, option }),
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
      showToast('يرجى تسجيل الدخول أولاً للمشاهدة وكسب المكافآت.', 'warning');
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
        setTimer((prev) => prev - 1);
      }, 1000);
    } else if (isPlaying && timer === 0) {
      handleCompleteAd();
    }
    return () => clearInterval(interval);
  }, [isPlaying, timer]);

  // Intercept Android Back Button to close active ad modal before anything else
  useEffect(() => {
    if (!activeAd) return;
    const unregister = registerBackHandler(() => {
      setActiveAd(null);
      setIsPlaying(false);
      return true;
    });
    return unregister;
  }, [activeAd]);

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
      showToast('تنبيه: تم إغلاق الإعلان قبل انتهاء الوقت، لن يتم احتساب المكافأة.', 'warning');
      setIsPlaying(false);
      setActiveAd(null);
    } else {
      setIsPlaying(false);
      setActiveAd(null);
      setCompleted(false);
    }
  };

  const handleQuickWatchBanner = () => {
    if (adsList.length > 0) {
      handleStartAd(adsList[0]);
    } else if (adsGridRef.current) {
      adsGridRef.current.scrollIntoView({ behavior: 'smooth' });
    } else {
      showToast('لا توجد عروض نشطة حالياً.', 'info');
    }
  };

  // Milestone progress calculations
  const milestone1Count = Math.min(watchCountToday, 1);
  const milestone1Pct = Math.min((watchCountToday / 1) * 100, 100);

  const milestone2Count = Math.min(watchCountToday, 3);
  const milestone2Pct = Math.min((watchCountToday / 3) * 100, 100);

  const milestone3Count = Math.min(watchCountToday, 6);
  const milestone3Pct = Math.min((watchCountToday / 6) * 100, 100);

  return (
    <div className="w-full max-w-3xl mx-auto space-y-6 pb-8" dir="rtl">
      {/* 1. HERO HEADER SECTION WITH 3D GIFT BOX & GOLDEN TROPHY */}
      <div className="relative pt-2 pb-1 px-2 flex items-center justify-between overflow-hidden rounded-3xl">
        {/* Right 3D Trophy Illustration (in RTL right side) */}
        <div className="w-20 sm:w-28 md:w-32 shrink-0 flex items-center justify-center pointer-events-none select-none">
          <img
            src={REWARDS_TROPHY_3D}
            alt="كأس المكافآت"
            loading="eager"
            decoding="sync"
            referrerPolicy="no-referrer"
            className="w-full h-auto object-contain drop-shadow-[0_10px_20px_rgba(0,0,0,0.75)] rounded-2xl"
          />
        </div>

        {/* Center Title & Subtitle */}
        <div className="flex-1 text-center px-2 z-10 space-y-2">
          <div className="relative inline-block">
            <h2 className="text-white text-xl sm:text-2xl md:text-3xl font-black tracking-wide drop-shadow-[0_2px_12px_rgba(255,204,0,0.3)]">
              المكافآت والربح من الإعلانات
            </h2>
            {/* Golden horizon light beam under title */}
            <div className="h-[2px] w-4/5 mx-auto mt-1.5 bg-gradient-to-r from-transparent via-[#ffcc00] to-transparent shadow-[0_0_12px_#ffcc00]" />
          </div>
          <p className="text-slate-300 text-xs sm:text-sm font-medium max-w-md mx-auto leading-relaxed">
            شاهد العروض الترويجية والبرامج التسويقية لدعم استمرارية المنصة ولضمان وصولك وفوزك دائماً
          </p>
        </div>

        {/* Left 3D Blue & Gold Gift Box Illustration (in RTL left side) */}
        <div className="w-20 sm:w-28 md:w-32 shrink-0 flex items-center justify-center pointer-events-none select-none">
          <img
            src={REWARDS_GIFT_3D}
            alt="صندوق الهدايا والجوائز"
            loading="eager"
            decoding="sync"
            referrerPolicy="no-referrer"
            className="w-full h-auto object-contain drop-shadow-[0_10px_20px_rgba(0,0,0,0.8)] rounded-2xl"
          />
        </div>
      </div>

      {/* 2. CURRENT BALANCE HERO CARD (Matches Reference Gold-Bordered Royal Navy Card) */}
      <div className="relative w-full rounded-[1.75rem] bg-gradient-to-r from-[#04154a] via-[#07257a] to-[#031038] border-2 border-[#ffcc00] p-5 sm:p-6 shadow-[0_0_30px_rgba(255,204,0,0.28)] overflow-hidden">
        {/* Ambient diagonal light sweep */}
        <div className="absolute -top-20 right-1/4 w-72 h-72 bg-[#1d5eff]/25 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 left-10 w-64 h-64 bg-[#ffcc00]/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex items-center justify-between gap-4">
          {/* Right Side (in RTL): Current Balance Label, Big Gold Points + Coins Stack, Subtitle */}
          <div className="flex-1 text-right space-y-1.5 pr-1 sm:pr-4">
            <span className="text-white/90 font-extrabold text-sm sm:text-base block">
              رصيدك الحالي
            </span>

            <div className="flex items-center justify-start gap-3 py-0.5">
              <img
                src={GOLD_COINS_STACK}
                alt="عملات ذهبية"
                loading="eager"
                decoding="sync"
                referrerPolicy="no-referrer"
                className="w-11 h-10 sm:w-13 sm:h-12 object-contain drop-shadow-[0_4px_10px_rgba(0,0,0,0.6)] shrink-0"
              />
              <span className="text-transparent bg-clip-text bg-gradient-to-b from-[#fffbeb] via-[#ffcc00] to-[#e59400] font-black text-4xl sm:text-5xl font-mono tabular-nums tracking-tight drop-shadow-[0_2px_14px_rgba(255,204,0,0.4)]">
                {currentUser ? currentUser.points : 100}
              </span>
            </div>

            <p className="text-slate-300 text-xs sm:text-sm font-medium">
              {currentUser
                ? `يمكنك الاستفادة من هذا الرصيد في العروض المتاحة • رصيد البحث اليومي: ${currentUser.searchBalance}`
                : 'يمكنك الاستفادة من هذا الرصيد في العروض المتاحة فور تسجيل الدخول'}
            </p>
          </div>

          {/* Vertical golden divider line */}
          <div className="h-20 w-[1px] bg-gradient-to-b from-transparent via-[#ffcc00]/50 to-transparent hidden sm:block" />

          {/* Left Side (in RTL): Circular Navy/Gold Gift Emblem */}
          <div className="shrink-0 pl-1 sm:pl-3">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-b from-[#071f66] to-[#030e33] border-2 border-[#ffcc00]/75 shadow-[0_0_25px_rgba(255,204,0,0.25),inset_0_0_15px_rgba(13,82,255,0.4)] flex items-center justify-center">
              <Gift className="w-10 h-10 sm:w-12 sm:h-12 text-[#ffcc00] stroke-[2.2] drop-shadow-[0_2px_8px_rgba(255,204,0,0.4)]" />
            </div>
          </div>
        </div>
      </div>

      {/* 3. POINT REDEMPTION & REWARDS STORE SECTION */}
      <div className="w-full rounded-[1.75rem] bg-gradient-to-b from-[#041342]/95 via-[#030f33]/95 to-[#020921]/95 border border-[#3b66d6]/45 p-4 sm:p-6 shadow-[0_12px_35px_rgba(0,0,0,0.6)] space-y-4">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 pb-1 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#ffcc00]/15 border border-[#ffcc00]/50 flex items-center justify-center text-[#ffcc00] shadow-sm">
              <Star className="w-4 h-4 fill-[#ffcc00]" />
            </div>
            <h3 className="text-white text-base sm:text-lg font-extrabold tracking-wide">
              متجر استبدال النقاط والجوائز
            </h3>
          </div>
          <p className="text-slate-300 text-xs font-medium">
            استبدل نقاطك المتراكمة بقسائم وهدايا وخدمات استثنائية فورية:
          </p>
        </div>

        {/* Store Offers List */}
        <div className="space-y-3.5">
          {/* Offer 1: Basic Search Balance (+5 Searches for 50 Points) */}
          <div className="rounded-2xl bg-gradient-to-r from-[#041138] via-[#06184d] to-[#041036] border border-[#2a4fa8]/50 hover:border-[#ffcc00]/60 transition-all p-3.5 sm:p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-md">
            <div className="flex items-center gap-3.5 w-full sm:w-auto">
              {/* Offer 1 3D Icon */}
              <div className="w-14 h-14 rounded-2xl overflow-hidden shrink-0 border border-[#ffcc00]/30 bg-[#020a24] flex items-center justify-center shadow-inner">
                <img
                  src={REWARDS_OFFER1_ICON}
                  alt="شحن رصيد بحث أساسي"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="h-10 w-[1px] bg-white/10 hidden sm:block" />

              <div className="text-right flex-1 space-y-1">
                <h4 className="text-white font-extrabold text-sm sm:text-base">
                  شحن رصيد بحث أساسي (+5 عمليات)
                </h4>
                <p className="text-slate-300 text-xs leading-relaxed">
                  استبدل 50 نقطة للحصول على 5 عمليات استعلام بحث أساسية مضافة لرصيدك اليوم.
                </p>
              </div>
            </div>

            <button
              type="button"
              disabled={isSubmitting || !currentUser || currentUser.points < 50}
              onClick={() => handleConvertPoints('5searches')}
              className="w-full sm:w-auto min-h-[44px] px-5 py-2.5 rounded-full bg-gradient-to-r from-[#ffd700] via-[#ffcc00] to-[#e69900] hover:brightness-110 disabled:from-slate-800 disabled:via-slate-800 disabled:to-slate-800 disabled:text-slate-500 text-slate-950 font-black text-xs sm:text-sm transition-all active:scale-95 shadow-[0_0_15px_rgba(255,204,0,0.3)] flex items-center justify-center gap-1.5 shrink-0 cursor-pointer disabled:cursor-not-allowed"
            >
              <span>استبدال بـ 50 نقطة</span>
              <ChevronLeft className="w-4 h-4 stroke-[3]" />
            </button>
          </div>

          {/* Offer 2: Intensive Search Balance (+12 Searches for 100 Points) */}
          <div className="rounded-2xl bg-gradient-to-r from-[#041138] via-[#06184d] to-[#041036] border border-[#2a4fa8]/50 hover:border-[#ffcc00]/60 transition-all p-3.5 sm:p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-md">
            <div className="flex items-center gap-3.5 w-full sm:w-auto">
              {/* Offer 2 3D Icon */}
              <div className="w-14 h-14 rounded-2xl overflow-hidden shrink-0 border border-[#ffcc00]/30 bg-[#020a24] flex items-center justify-center shadow-inner">
                <img
                  src={REWARDS_OFFER2_ICON}
                  alt="شحن رصيد بحث مكثف"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="h-10 w-[1px] bg-white/10 hidden sm:block" />

              <div className="text-right flex-1 space-y-1">
                <h4 className="text-white font-extrabold text-sm sm:text-base">
                  شحن رصيد بحث مكثف (+12 عملية)
                </h4>
                <p className="text-slate-300 text-xs leading-relaxed">
                  عرض ترويجي استثنائي .. استبدل 100 نقطة للحصول على 12 عملية استعلام إضافية مجاناً.
                </p>
              </div>
            </div>

            <button
              type="button"
              disabled={isSubmitting || !currentUser || currentUser.points < 100}
              onClick={() => handleConvertPoints('12searches')}
              className="w-full sm:w-auto min-h-[44px] px-5 py-2.5 rounded-full bg-gradient-to-r from-[#ffd700] via-[#ffcc00] to-[#e69900] hover:brightness-110 disabled:from-slate-800 disabled:via-slate-800 disabled:to-slate-800 disabled:text-slate-500 text-slate-950 font-black text-xs sm:text-sm transition-all active:scale-95 shadow-[0_0_15px_rgba(255,204,0,0.3)] flex items-center justify-center gap-1.5 shrink-0 cursor-pointer disabled:cursor-not-allowed"
            >
              <span>استبدال بـ 100 نقطة</span>
              <ChevronLeft className="w-4 h-4 stroke-[3]" />
            </button>
          </div>

          {/* Offer 3: Featured VIP Purple Card - Unlimited Reveal Names (80 Points) */}
          <div className="rounded-2xl bg-gradient-to-r from-[#24125c] via-[#34187d] to-[#1a0d47] border-2 border-[#a855f7]/70 hover:border-[#c084fc] transition-all p-3.5 sm:p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-[0_0_25px_rgba(168,85,247,0.28)] relative overflow-hidden">
            <div className="absolute -top-10 left-1/3 w-40 h-40 bg-purple-500/20 rounded-full blur-2xl pointer-events-none" />

            <div className="relative z-10 flex items-center gap-3.5 w-full sm:w-auto">
              {/* Offer 3 3D Rocket Icon */}
              <div className="w-14 h-14 rounded-2xl overflow-hidden shrink-0 border border-purple-400/50 bg-[#1a0c42] flex items-center justify-center shadow-inner">
                <img
                  src={REWARDS_OFFER3_ICON}
                  alt="كشف السجل بالكامل"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="h-10 w-[1px] bg-purple-300/20 hidden sm:block" />

              <div className="text-right flex-1 space-y-1">
                <h4 className="text-purple-100 font-black text-sm sm:text-base flex items-center gap-1.5">
                  <span>تخطي قيود الـ 15 اسماً وكشف السجل بالكامل</span>
                </h4>
                <p className="text-purple-200/80 text-xs leading-relaxed">
                  تجاوز حد عرض الـ 15 اسماً للمتصل، واكشف كامل أرشيف الأسماء والفرص لأي رقم يمني تبحث عنه.
                </p>
              </div>
            </div>

            <div className="relative z-10 w-full sm:w-auto shrink-0">
              {currentUser?.unlockedUnlimited ? (
                <div className="min-h-[44px] px-5 py-2.5 rounded-full bg-emerald-500/20 border border-emerald-400/50 text-emerald-300 font-black text-xs sm:text-sm flex items-center justify-center gap-1.5">
                  <CheckCircle className="w-4 h-4" />
                  <span>مفتوح ونشط مدى الحياة!</span>
                </div>
              ) : (
                <button
                  type="button"
                  disabled={isSubmitting || !currentUser || currentUser.points < 80}
                  onClick={() => handleConvertPoints('reveal_unlimited')}
                  className="w-full sm:w-auto min-h-[44px] px-5 py-2.5 rounded-full bg-gradient-to-r from-[#9333ea] via-[#7e22ce] to-[#6b21a8] hover:brightness-115 disabled:from-slate-800 disabled:via-slate-800 disabled:to-slate-800 disabled:text-slate-500 border border-purple-300/40 text-white font-black text-xs sm:text-sm transition-all active:scale-95 shadow-[0_0_20px_rgba(147,51,234,0.5)] flex items-center justify-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
                >
                  <Zap className="w-4 h-4 fill-current" />
                  <span>تفعيل بقيمة 80 نقطة</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 4. ACHIEVEMENT MILESTONES & BALANCE RECHARGE SECTION */}
      <div className="w-full rounded-[1.75rem] bg-gradient-to-b from-[#041342]/95 via-[#030f33]/95 to-[#020921]/95 border border-[#3b66d6]/45 p-4 sm:p-6 shadow-[0_12px_35px_rgba(0,0,0,0.6)] space-y-4">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 pb-1 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#ffcc00]/15 border border-[#ffcc00]/50 flex items-center justify-center text-[#ffcc00] shadow-sm">
              <Trophy className="w-4 h-4" />
            </div>
            <h3 className="text-white text-base sm:text-lg font-extrabold tracking-wide">
              مستويات الإنجاز وشحن الرصيد
            </h3>
          </div>
          <p className="text-slate-300 text-xs font-medium">
            شاهد الإعلانات يومياً واربح المزايا الاحترافية الإضافية:
          </p>
        </div>

        {/* Milestones Stack */}
        <div className="space-y-3">
          {/* Milestone 1: 1 Ad */}
          <div className="rounded-2xl bg-[#030e30]/95 border border-white/10 p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
            <div className="flex items-center gap-3.5">
              {/* Gold Medal Badge */}
              <div className="w-11 h-11 rounded-full bg-gradient-to-b from-[#ffd700] to-[#b45309] p-0.5 shadow-[0_0_15px_rgba(255,204,0,0.3)] shrink-0 flex items-center justify-center">
                <div className="w-full h-full rounded-full bg-[#78350f]/40 flex items-center justify-center text-white">
                  <Star className="w-5 h-5 fill-[#fffbeb] text-[#fffbeb]" />
                </div>
              </div>

              <div className="h-8 w-[1px] bg-white/10 hidden sm:block" />

              <div className="text-right space-y-0.5">
                <span className="text-white text-sm font-extrabold block">
                  مستوى البحث الأساسي
                </span>
                <span className="text-slate-300 text-xs block">
                  شاهد إعلاناً واحداً للحصول على{' '}
                  <span className="text-[#ffcc00] font-extrabold">+1 عملية بحث</span>
                </span>
              </div>
            </div>

            {/* Progress Bar & Fraction Counter */}
            <div className="flex flex-col items-end gap-1.5 sm:w-48 shrink-0">
              <div className="flex items-center gap-1.5 text-xs font-mono tabular-nums font-black text-white">
                <span>1 / {milestone1Count}</span>
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center ${
                    watchCountToday >= 1
                      ? 'bg-emerald-500 text-slate-950 shadow-[0_0_10px_rgba(16,185,129,0.5)]'
                      : 'bg-slate-800 text-slate-500 border border-white/10'
                  }`}
                >
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                </div>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-800/90 overflow-hidden p-[1px]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-green-500 transition-all duration-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]"
                  style={{ width: `${Math.max(milestone1Pct, 8)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Milestone 2: 3 Ads */}
          <div className="rounded-2xl bg-[#030e30]/95 border border-white/10 p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
            <div className="flex items-center gap-3.5">
              {/* Silver Medal Badge */}
              <div className="w-11 h-11 rounded-full bg-gradient-to-b from-slate-200 to-slate-500 p-0.5 shadow-[0_0_15px_rgba(226,232,240,0.25)] shrink-0 flex items-center justify-center">
                <div className="w-full h-full rounded-full bg-slate-800/40 flex items-center justify-center text-white">
                  <Star className="w-5 h-5 fill-white text-white" />
                </div>
              </div>

              <div className="h-8 w-[1px] bg-white/10 hidden sm:block" />

              <div className="text-right space-y-0.5">
                <span className="text-white text-sm font-extrabold block">
                  مستوى البحث الإضافي
                </span>
                <span className="text-slate-300 text-xs block">
                  شاهد 3 إعلانات للحصول على{' '}
                  <span className="text-[#ffcc00] font-extrabold">+3 عمليات بحث</span>
                </span>
              </div>
            </div>

            {/* Progress Bar & Fraction Counter */}
            <div className="flex flex-col items-end gap-1.5 sm:w-48 shrink-0">
              <div className="flex items-center gap-1.5 text-xs font-mono tabular-nums font-black text-white">
                <span>3 / {milestone2Count}</span>
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center ${
                    watchCountToday >= 3
                      ? 'bg-emerald-500 text-slate-950 shadow-[0_0_10px_rgba(16,185,129,0.5)]'
                      : 'bg-slate-800 text-slate-500 border border-white/10'
                  }`}
                >
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                </div>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-800/90 overflow-hidden p-[1px]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-green-500 transition-all duration-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]"
                  style={{ width: `${Math.max(milestone2Pct, 8)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Milestone 3: 6 Ads */}
          <div className="rounded-2xl bg-[#030e30]/95 border border-white/10 p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
            <div className="flex items-center gap-3.5">
              {/* Purple Crown Badge */}
              <div className="w-11 h-11 rounded-full bg-gradient-to-b from-purple-400 to-indigo-700 p-0.5 shadow-[0_0_15px_rgba(168,85,247,0.35)] shrink-0 flex items-center justify-center">
                <div className="w-full h-full rounded-full bg-indigo-950/40 flex items-center justify-center text-white">
                  <Crown className="w-5 h-5 fill-purple-100 text-purple-100" />
                </div>
              </div>

              <div className="h-8 w-[1px] bg-white/10 hidden sm:block" />

              <div className="text-right space-y-0.5">
                <span className="text-white text-sm font-extrabold block">
                  فتح البحث المتقدم الشامل
                </span>
                <span className="text-slate-300 text-xs block">
                  شاهد 6 إعلانات لتفعيل ميزة{' '}
                  <span className="text-[#ffcc00] font-extrabold">البحث المتقدم</span> مجاناً
                </span>
              </div>
            </div>

            {/* Progress Bar & Fraction Counter */}
            <div className="flex flex-col items-end gap-1.5 sm:w-48 shrink-0">
              <div className="flex items-center gap-1.5 text-xs font-mono tabular-nums font-black text-white">
                <span>6 / {milestone3Count}</span>
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center ${
                    watchCountToday >= 6
                      ? 'bg-emerald-500 text-slate-950 shadow-[0_0_10px_rgba(16,185,129,0.5)]'
                      : 'bg-slate-800 text-slate-500 border border-white/10'
                  }`}
                >
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                </div>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-800/90 overflow-hidden p-[1px]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-green-500 transition-all duration-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]"
                  style={{ width: `${Math.max(milestone3Pct, 8)}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 5. INTERACTIVE AD NETWORK FEATURE BANNER & ADS GRID */}
      <div ref={adsGridRef} className="space-y-4">
        {/* Hero Banner Card matching bottom of Reference Image */}
        <div className="w-full rounded-[1.75rem] bg-gradient-to-r from-[#041446] via-[#061f66] to-[#030e33] border-2 border-[#ffcc00]/65 p-4 sm:p-5 shadow-[0_0_25px_rgba(255,204,0,0.2)] flex flex-col sm:flex-row items-center justify-between gap-4 relative overflow-hidden">
          {/* Right 3D Laptop & Rising Gold Bars Illustration */}
          <div className="w-44 sm:w-52 shrink-0 flex items-center justify-center overflow-hidden rounded-xl">
            <img
              src={REWARDS_LAPTOP_3D}
              alt="شبكة الإعلانات التفاعلية"
              referrerPolicy="no-referrer"
              className="w-full h-auto object-contain drop-shadow-[0_6px_15px_rgba(0,0,0,0.7)]"
            />
          </div>

          {/* Center Title & Description */}
          <div className="flex-1 text-center sm:text-right space-y-1">
            <h3 className="text-[#ffcc00] font-black text-base sm:text-lg">
              شبكة الإعلانات التفاعلية لمزيد من الأرباح
            </h3>
            <p className="text-slate-200 text-xs sm:text-sm font-medium">
              احصل على أفضل العروض من شركائنا الموثوقين واشحن نقاطك ورصيدك فوراً
            </p>
          </div>

          {/* Left CTA Button: مشاهدة العروض */}
          <button
            type="button"
            onClick={handleQuickWatchBanner}
            className="w-full sm:w-auto min-h-[46px] px-6 py-2.5 rounded-full bg-gradient-to-r from-[#ffd700] via-[#ffcc00] to-[#e69900] hover:brightness-110 text-slate-950 font-black text-xs sm:text-sm shadow-[0_0_20px_rgba(255,204,0,0.4)] transition-all active:scale-95 flex items-center justify-center gap-2 shrink-0 cursor-pointer"
          >
            <Play className="w-4 h-4 fill-slate-950" />
            <span>مشاهدة العروض</span>
          </button>
        </div>

        {/* Active Ads List Grid */}
        {adsList.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {adsList.map((ad) => (
              <div
                key={ad.id}
                className="group flex flex-col justify-between rounded-2xl bg-gradient-to-b from-[#06184f]/90 to-[#030c2b]/95 border border-[#3b66d6]/40 hover:border-[#ffcc00]/70 overflow-hidden shadow-lg transition-all p-4 space-y-3"
              >
                <div className="flex items-start gap-3.5">
                  {/* Thumbnail or Icon */}
                  {ad.mediaUrl ? (
                    <div className="w-20 h-20 rounded-xl relative overflow-hidden bg-black shrink-0 border border-white/10">
                      <img
                        src={ad.mediaUrl}
                        alt={ad.title}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <Play className="w-6 h-6 text-[#ffcc00] fill-[#ffcc00]" />
                      </div>
                    </div>
                  ) : (
                    <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-[#0a236e] to-[#041038] border border-[#ffcc00]/35 flex flex-col items-center justify-center shrink-0 text-[#ffcc00] shadow-inner">
                      <Smartphone className="w-6 h-6" />
                      <span className="text-[9px] font-bold mt-0.5 uppercase">
                        {ad.source === 'admob' ? 'AdMob' : 'Sponsor'}
                      </span>
                    </div>
                  )}

                  <div className="flex-1 text-right space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-white text-sm font-extrabold line-clamp-1">
                        {ad.title}
                      </h4>
                      <span className="text-[11px] text-slate-300 font-mono tabular-nums flex items-center gap-1 shrink-0">
                        <Clock className="w-3 h-3 text-[#ffcc00]" />
                        <span>{ad.duration}ث</span>
                      </span>
                    </div>
                    <p className="text-slate-300 text-xs leading-relaxed">
                      {ad.type === 'rewarded'
                        ? `شاهد بالكامل لشحن رصيد البحث فوراً بـ +${ad.reward} عملية`
                        : `احصل على +${ad.reward || 10} نقاط تُضاف فوراً لمحفظتك`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-white/10">
                  <span className="text-xs text-[#ffcc00] font-black">
                    {ad.type === 'rewarded'
                      ? `المكافأة: +${ad.reward} رصيد بحث`
                      : `المكافأة: +${ad.reward || 10} نقاط`}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleStartAd(ad)}
                    className="min-h-[40px] px-5 py-1.5 rounded-full bg-gradient-to-r from-[#ffd700] to-[#f59e0b] hover:brightness-110 text-slate-950 font-black text-xs transition-all active:scale-95 shadow-md flex items-center gap-1.5 cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5 fill-slate-950" />
                    <span>مشاهدة العرض</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-6 text-center rounded-2xl bg-[#030d2b]/80 border border-white/10 text-slate-400 text-xs">
            لا توجد إعلانات نشطة حالياً. يرجى تفعيل الإعلانات من لوحة تحكم الإدارة.
          </div>
        )}
      </div>

      {/* 6. WALLET & POINTS TRANSACTION HISTORY LEDGER */}
      <div className="w-full rounded-[1.5rem] bg-[#030e30]/90 border border-white/10 p-4 sm:p-5 space-y-3">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-[#ffcc00]" />
          <h4 className="text-white text-xs sm:text-sm font-extrabold">
            سجل حركات المحفظة والنقاط
          </h4>
        </div>

        {currentUser && transactions.length > 0 ? (
          <div className="divide-y divide-white/10 max-h-52 overflow-y-auto pr-1">
            {transactions.map((t) => (
              <div key={t.id} className="py-2.5 flex items-center justify-between text-xs">
                <div className="text-right">
                  <span className="text-white font-bold block">{t.action}</span>
                  <span className="text-slate-400 text-[10px] block mt-0.5 font-mono">
                    {new Date(t.date).toLocaleTimeString('ar-YE')}
                  </span>
                </div>
                <span
                  className={`font-mono tabular-nums font-black text-sm ${
                    t.amount >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {t.amount >= 0 ? `+${t.amount}` : t.amount}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-4 text-center text-slate-400 text-xs">
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
            dir="rtl"
          >
            {/* Header / Countdown */}
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={handleCloseAdPlayer}
                className="w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#ffcc00]/15 border border-[#ffcc00]/40 text-xs text-[#ffcc00] font-bold">
                <Clock className="w-4 h-4 animate-pulse" />
                {timer > 0 ? (
                  <span>متبقي {timer} ثانية للمكافأة</span>
                ) : (
                  <span className="text-emerald-400 font-extrabold">
                    مكتمل! يمكنك الإغلاق الآن
                  </span>
                )}
              </div>
            </div>

            {/* Simulated Ad Video/Creative Canvas */}
            <div className="flex-1 my-6 max-w-lg mx-auto w-full rounded-3xl border border-[#ffcc00]/30 overflow-hidden bg-gradient-to-b from-[#07184d] to-[#02081c] flex flex-col justify-between relative p-6 shadow-[0_0_40px_rgba(0,0,0,0.8)]">
              <span className="text-[10px] bg-[#ffcc00]/15 text-[#ffcc00] border border-[#ffcc00]/30 px-3 py-1 rounded-full font-bold uppercase w-fit tracking-wider z-10">
                {activeAd.source === 'admob'
                  ? 'AD UNIT: GOOGLE ADMOB REWARDED'
                  : 'سبونسر معروف المباشر'}
              </span>

              {/* Central interactive ad body */}
              <div className="text-center space-y-4 py-6 z-10">
                {activeAd.mediaUrl ? (
                  <div className="w-full max-h-56 rounded-2xl overflow-hidden border border-white/10">
                    <img
                      src={activeAd.mediaUrl}
                      alt={activeAd.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover max-h-56"
                    />
                  </div>
                ) : (
                  <div className="w-20 h-20 rounded-full bg-[#ffcc00]/15 border border-[#ffcc00]/40 flex items-center justify-center mx-auto text-[#ffcc00]">
                    <Sparkles className="w-10 h-10 animate-spin" />
                  </div>
                )}
                <h3 className="text-white text-base md:text-lg font-extrabold max-w-sm mx-auto leading-relaxed">
                  {activeAd.title}
                </h3>
                <p className="text-slate-300 text-xs">
                  برعاية معروف للخدمات والحلول الرقمية الفاخرة
                </p>
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
                      body: JSON.stringify({ adId: activeAd.id }),
                    });
                  }}
                  className="w-full py-3.5 bg-gradient-to-r from-[#ffd700] to-[#f59e0b] hover:brightness-110 text-slate-950 font-black text-xs sm:text-sm rounded-2xl transition-all text-center block z-10 shadow-lg"
                >
                  تصفح موقع المعلن والحصول على نقاط بونص
                </a>
              )}
            </div>

            {/* Bottom Reward confirmation card */}
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 max-w-lg mx-auto w-full text-center space-y-2">
              <p className="text-slate-400 text-xs">
                يساعدك هذا الإعلان في الحفاظ على عضوية معروف المجانية.
              </p>
              {completed && (
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="text-emerald-400 font-extrabold text-xs sm:text-sm flex items-center justify-center gap-1.5"
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
