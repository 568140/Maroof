import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Award, Crown, Check, MessageCircle, Sparkles, ShieldCheck, Zap, 
  RefreshCw, Info, PhoneCall, ChevronDown, Trash2, Eye, Shield
} from 'lucide-react';
import { User, VipPlan, SystemSettings } from '../types';
import { apiFetch } from '../utils/apiHelper';

interface UpgradeSectionProps {
  currentUser: User | null;
  systemSettings?: SystemSettings;
  setActiveTab: (tab: string) => void;
  onOpenAuth: () => void;
  showToast: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
  onRefreshUser?: () => Promise<void>;
}

export default function UpgradeSection({
  currentUser,
  systemSettings,
  setActiveTab,
  onOpenAuth,
  showToast,
  onRefreshUser
}: UpgradeSectionProps) {
  const [plans, setPlans] = useState<VipPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedPlanId, setExpandedPlanId] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<'all' | 'bundle' | 'reveal_only' | 'delete_only'>('all');

  const adminPhone = systemSettings?.adminPhone || '774919194';

  const fetchPlans = async () => {
    try {
      setLoading(true);
      const res = await apiFetch('/api/vip-plans');
      if (res.ok) {
        const data: VipPlan[] = await res.json();
        const activeOnly = data.filter(p => p.isActive);
        setPlans(activeOnly);
        
        // Auto-expand recommended/pro plan or the first plan by default
        if (activeOnly.length > 0 && !expandedPlanId) {
          const defaultPlan = activeOnly.find(p => p.id.includes('pro') || (p.badge && p.badge.includes('الأكثر'))) || activeOnly[0];
          setExpandedPlanId(defaultPlan.id);
        }
      }
    } catch {
      showToast('تعذر جلب باقات الاشتراك من الخادم.', 'warning');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  // User active plan stats calculation
  const hasRevealPlan = Boolean(currentUser && currentUser.canRevealRegistrar);
  const totalRevealLimit = currentUser?.revealRegistrarLimit || 0;
  const usedRevealCount = currentUser?.revealRegistrarUsed || 0;
  const remainingReveals = Math.max(0, totalRevealLimit - usedRevealCount);

  const hasDeletePlan = Boolean(currentUser && currentUser.canDeleteNames);
  const totalDeleteLimit = currentUser?.nameDeletionsLimit || 0;
  const usedDeleteCount = currentUser?.nameDeletionsUsed || 0;
  const remainingDeletions = Math.max(0, totalDeleteLimit - usedDeleteCount);

  const hasAnyPlan = (hasRevealPlan && totalRevealLimit > 0) || (hasDeletePlan && totalDeleteLimit > 0);

  // Determine if a specific plan matches the user's active subscription capabilities
  const isPlanActiveForUser = (plan: VipPlan): boolean => {
    if (!currentUser || !hasAnyPlan) return false;

    const userHasBoth = hasRevealPlan && hasDeletePlan;
    if (userHasBoth && plan.planType === 'bundle') {
      return true;
    }
    if (hasRevealPlan && !hasDeletePlan && plan.planType === 'reveal_only') {
      return true;
    }
    if (hasDeletePlan && !hasRevealPlan && plan.planType === 'delete_only') {
      return true;
    }
    // Fallback match based on capabilities if planType is unspecified
    if (plan.revealsCount > 0 && (plan.nameDeletionsCount || 0) > 0 && userHasBoth) {
      return true;
    }
    return false;
  };

  const handleSubscribeWhatsApp = (plan: VipPlan) => {
    if (!currentUser || currentUser.isGuest) {
      showToast('يرجى تسجيل الدخول برقم هاتفك أولاً لربط باقة الاشتراك بحسابك.', 'warning');
      onOpenAuth();
      return;
    }

    const isCurrentActive = isPlanActiveForUser(plan);
    const actionSubject = isCurrentActive ? 'تجديد أو ترقية باقتي' : 'الاشتراك وتفعيل';

    const message = `السلام عليكم ورحمة الله،
أود ${actionSubject} «${plan.name}» في منصة معروف:
• رقم حسابي: ${currentUser.phone}
• الباقة المطلوبة: ${plan.name}
${plan.revealsCount > 0 ? `• عدد عمليات كشف المسجل: ${plan.revealsCount} عملية\n` : ''}${plan.nameDeletionsCount ? `• عدد عمليات حذف وتعديل الأسماء: ${plan.nameDeletionsCount} عملية\n` : ''}• السعر: ${plan.priceYmr.toLocaleString('ar-EG')} ريال يمني (${plan.priceUsd ? `$${plan.priceUsd}` : ''})
• ما تقدمه: ${plan.description}
يرجى اعتماد الطلب لحسابي في منصة معروف.`;

    const encoded = encodeURIComponent(message);
    const waUrl = `https://wa.me/967${adminPhone.replace(/^0+/, '')}?text=${encoded}`;
    window.open(waUrl, '_blank');
  };

  const toggleAccordion = (planId: string) => {
    setExpandedPlanId(prev => prev === planId ? null : planId);
  };

  // Filter plans based on category
  const filteredPlans = plans.filter(p => {
    if (activeCategory === 'all') return true;
    if (activeCategory === 'bundle') {
      return p.planType === 'bundle' || (p.revealsCount > 0 && (p.nameDeletionsCount || 0) > 0);
    }
    if (activeCategory === 'reveal_only') {
      return p.planType === 'reveal_only' || (p.revealsCount > 0 && !(p.nameDeletionsCount && p.nameDeletionsCount > 0));
    }
    if (activeCategory === 'delete_only') {
      return p.planType === 'delete_only' || ((p.nameDeletionsCount || 0) > 0 && p.revealsCount === 0);
    }
    return true;
  });

  return (
    <div className="max-w-4xl mx-auto space-y-8 text-right" dir="rtl">
      
      {/* Hero Title Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#170c32] via-[#0b143c] to-[#040924] border-2 border-purple-500/30 p-6 md:p-8 shadow-[0_15px_50px_rgba(147,51,234,0.2)]">
        {/* Glow dots */}
        <div className="absolute top-0 right-10 w-48 h-48 bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-10 w-48 h-48 bg-[#e5c158]/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-3 text-center md:text-right">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 border border-purple-500/40 text-purple-300 text-xs font-bold">
              <Crown className="w-4 h-4 text-yellow-400" />
              <span>الترقية وباقات كبار الشخصيات VIP</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-white leading-snug">
              باقات VIP «كاشف المسجّل وحذف الأسماء» <br className="hidden sm:inline" />
              <span className="bg-gradient-to-r from-yellow-300 via-amber-200 to-yellow-500 bg-clip-text text-transparent">
                حماية الهوية، كشف مسجّل الأرقام، وتعديل الأسماء
              </span>
            </h1>
            <p className="text-gray-300 text-xs md:text-sm max-w-xl leading-relaxed">
              تتيح لك باقات VIP الحصرية معرفة من سجّل أي رقم بدقة، بالإضافة لحذف وإخفاء الأسماء غير المرغوبة من قاعدة البيانات ونتائج البحث نهائياً مع حظر إعادة مزامنتها.
            </p>
          </div>

          <div className="w-24 h-24 md:w-28 md:h-28 rounded-2xl bg-gradient-to-tr from-purple-700 via-indigo-700 to-amber-500 p-0.5 shadow-xl shrink-0">
            <div className="w-full h-full bg-[#0a0f29] rounded-2xl flex flex-col items-center justify-center p-3 text-center">
              <Award className="w-10 h-10 text-yellow-400 animate-pulse" />
              <span className="text-[10px] font-black text-purple-200 mt-1 uppercase">VIP ACCESS</span>
            </div>
          </div>
        </div>

        {/* User Current Plan Status Banner */}
        <div className="mt-6 pt-5 border-t border-white/10">
          {hasAnyPlan ? (
            <div className="bg-gradient-to-r from-[#1c123d] via-[#151c4a] to-[#0c1638] border-2 border-[#ffcc00]/70 rounded-2xl p-5 shadow-[0_0_30px_rgba(255,204,0,0.25)] space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#ffd700] to-[#f59e0b] text-slate-950 flex items-center justify-center font-black shadow-md shrink-0">
                    <Crown className="w-6 h-6 stroke-[2.5]" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-white text-sm font-black">اشتراكك في باقات VIP نشط حالياً</span>
                      <span className="bg-[#ffcc00] text-slate-950 text-[10px] font-black px-2.5 py-0.5 rounded-full shadow-sm">
                        فعّال
                      </span>
                    </div>
                    <span className="text-slate-300 text-xs font-mono">رقم الحساب: {currentUser?.phone}</span>
                  </div>
                </div>

                <button
                  onClick={() => setActiveTab('search')}
                  className="px-4 py-2 bg-gradient-to-r from-[#ffcc00] to-[#f59e0b] hover:brightness-110 text-slate-950 font-black text-xs rounded-xl shadow-md transition-all cursor-pointer self-stretch sm:self-auto text-center"
                >
                  استخدام الخدمة في البحث الآن
                </button>
              </div>

              {/* Real-time Usage Progress Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {hasRevealPlan && totalRevealLimit > 0 && (
                  <div className="p-3.5 rounded-xl bg-black/40 border border-purple-500/30 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-purple-300 font-bold flex items-center gap-1.5">
                        <Eye className="w-4 h-4 text-purple-400" />
                        <span>رصيد كاشف المسجّل</span>
                      </span>
                      <span className="text-yellow-300 font-mono font-black text-sm">
                        {remainingReveals} <span className="text-[11px] font-normal text-slate-300">متبقي</span>
                      </span>
                    </div>
                    <div className="w-full h-2 bg-purple-950 rounded-full overflow-hidden border border-purple-800/40">
                      <div 
                        className="h-full bg-gradient-to-r from-purple-500 to-yellow-400 rounded-full transition-all duration-700"
                        style={{ width: `${Math.min(100, Math.max(5, ((totalRevealLimit - remainingReveals) / totalRevealLimit) * 100))}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-gray-400 font-mono">
                      <span>مستهلك: {usedRevealCount}</span>
                      <span>الإجمالي: {totalRevealLimit} عملية</span>
                    </div>
                  </div>
                )}

                {hasDeletePlan && totalDeleteLimit > 0 && (
                  <div className="p-3.5 rounded-xl bg-black/40 border border-rose-500/30 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-rose-300 font-bold flex items-center gap-1.5">
                        <Trash2 className="w-4 h-4 text-rose-400" />
                        <span>رصيد حذف الأسماء</span>
                      </span>
                      <span className="text-yellow-300 font-mono font-black text-sm">
                        {remainingDeletions} <span className="text-[11px] font-normal text-slate-300">متبقي</span>
                      </span>
                    </div>
                    <div className="w-full h-2 bg-rose-950 rounded-full overflow-hidden border border-rose-800/40">
                      <div 
                        className="h-full bg-gradient-to-r from-rose-500 to-amber-400 rounded-full transition-all duration-700"
                        style={{ width: `${Math.min(100, Math.max(5, ((totalDeleteLimit - remainingDeletions) / totalDeleteLimit) * 100))}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-gray-400 font-mono">
                      <span>محذوف: {usedDeleteCount}</span>
                      <span>الإجمالي: {totalDeleteLimit} أسماء</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-black/40 border border-white/5 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-300">
              <div className="flex items-center gap-2.5">
                <Info className="w-4 h-4 text-yellow-400 shrink-0" />
                <span>حسابك غير مشترك حالياً في باقات VIP. اختر باقتك المفضلة أدناه واطلب التفعيل عبر واتساب الإدارة.</span>
              </div>
              {(!currentUser || currentUser.isGuest) && (
                <button
                  onClick={onOpenAuth}
                  className="px-3.5 py-1.5 bg-[#ffcc00] hover:brightness-110 text-slate-950 rounded-xl text-xs font-black whitespace-nowrap cursor-pointer shadow-sm transition-all"
                >
                  تسجيل الدخول أولاً
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Available Plans Section */}
      <div className="space-y-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-yellow-400" />
            <h2 className="text-white text-lg font-black">باقات الاشتراك المتاحة</h2>
            <span className="text-xs text-gray-400">({filteredPlans.length} باقة)</span>
          </div>

          {/* Category Filter Tabs */}
          <div className="flex items-center gap-1 p-1 bg-[#091129] border border-white/10 rounded-2xl self-stretch sm:self-auto overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveCategory('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeCategory === 'all'
                  ? 'bg-[#ffcc00] text-slate-950 shadow-sm'
                  : 'text-gray-300 hover:text-white'
              }`}
            >
              الكل
            </button>
            <button
              type="button"
              onClick={() => setActiveCategory('bundle')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeCategory === 'bundle'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-gray-300 hover:text-white'
              }`}
            >
              الباقات الشاملة
            </button>
            <button
              type="button"
              onClick={() => setActiveCategory('reveal_only')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeCategory === 'reveal_only'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-gray-300 hover:text-white'
              }`}
            >
              كاشف المسجّل
            </button>
            <button
              type="button"
              onClick={() => setActiveCategory('delete_only')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeCategory === 'delete_only'
                  ? 'bg-rose-700 text-white shadow-sm'
                  : 'text-gray-300 hover:text-white'
              }`}
            >
              حذف الأسماء
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-16 text-gray-400 space-y-3">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-[#ffcc00]" />
            <p className="text-xs">جاري تحميل باقات VIP المتوفرة...</p>
          </div>
        ) : filteredPlans.length === 0 ? (
          <div className="text-center py-12 bg-[#0c122b] rounded-2xl border border-white/5 text-gray-400 text-xs">
            لا توجد باقات في هذا التصنيف حالياً. يمكنك التواصل مع الإدارة مباشرة للاستفسار.
          </div>
        ) : (
          /* High-craft Collapsible Accordion List */
          <div className="space-y-3.5">
            {filteredPlans.map((plan) => {
              const isExpanded = expandedPlanId === plan.id;
              const isActivePlan = isPlanActiveForUser(plan);
              const isPro = plan.id.includes('pro') || (plan.badge && plan.badge.includes('الأكثر'));

              return (
                <div
                  key={plan.id}
                  className={`rounded-2xl transition-all duration-300 overflow-hidden border-2 ${
                    isActivePlan
                      ? 'bg-gradient-to-b from-[#1c123d] to-[#0d163d] border-[#ffcc00] shadow-[0_0_25px_rgba(255,204,0,0.3)]'
                      : isExpanded
                      ? 'bg-[#0f173a] border-purple-500/70 shadow-[0_10px_30px_rgba(147,51,234,0.25)]'
                      : isPro
                      ? 'bg-[#0a122e]/90 border-purple-500/30 hover:border-purple-400/60'
                      : 'bg-[#080d24]/90 border-white/10 hover:border-white/20'
                  }`}
                >
                  {/* Collapsible Header */}
                  <div
                    onClick={() => toggleAccordion(plan.id)}
                    className="p-4 sm:p-5 flex items-center justify-between gap-3 cursor-pointer select-none group"
                  >
                    {/* Visual Right (RTL): Title, Badges, Summary chips */}
                    <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                      <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center shrink-0 ${
                        isActivePlan 
                          ? 'bg-[#ffcc00] text-slate-950 font-black' 
                          : isPro 
                          ? 'bg-purple-600/30 border border-purple-400 text-yellow-300' 
                          : 'bg-white/5 border border-white/10 text-purple-300'
                      }`}>
                        {isActivePlan ? (
                          <Crown className="w-5 h-5 stroke-[2.5]" />
                        ) : isPro ? (
                          <Award className="w-5 h-5" />
                        ) : (
                          <ShieldCheck className="w-5 h-5" />
                        )}
                      </div>

                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-white text-base sm:text-lg font-black truncate">{plan.name}</h3>
                          
                          {/* Active Subscription Badge */}
                          {isActivePlan && (
                            <span className="bg-gradient-to-r from-[#ffd700] to-[#f59e0b] text-slate-950 text-[10px] font-black px-2.5 py-0.5 rounded-full shadow-sm flex items-center gap-1">
                              <Check className="w-3 h-3 stroke-[3]" />
                              <span>باقتك النشطة حالياً</span>
                            </span>
                          )}

                          {/* Plan Badge (e.g. الأكثر طلباً) */}
                          {!isActivePlan && plan.badge && (
                            <span className="bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-md shadow-sm">
                              {plan.badge}
                            </span>
                          )}
                        </div>

                        {/* Summary capability indicators */}
                        <div className="flex items-center gap-2 text-xs text-gray-400 flex-wrap">
                          {plan.revealsCount > 0 && (
                            <span className="bg-purple-500/15 border border-purple-500/30 text-purple-200 px-2 py-0.5 rounded-md font-mono text-[11px] font-bold">
                              {plan.revealsCount} كشف مسجّل
                            </span>
                          )}
                          {(plan.nameDeletionsCount || 0) > 0 && (
                            <span className="bg-rose-500/15 border border-rose-500/30 text-rose-300 px-2 py-0.5 rounded-md font-mono text-[11px] font-bold">
                              {plan.nameDeletionsCount} حذف وتعديل 🛡️
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Visual Left (RTL): Price & Expand Arrow */}
                    <div className="flex items-center gap-3 sm:gap-5 shrink-0">
                      <div className="text-left font-mono">
                        <div className="flex items-baseline gap-1 justify-end">
                          <span className="text-[#ffcc00] font-black text-lg sm:text-xl font-mono">
                            {plan.priceYmr.toLocaleString('ar-EG')}
                          </span>
                          <span className="text-yellow-200/80 text-[11px] font-bold">ر.ي</span>
                        </div>
                        {plan.priceUsd > 0 && (
                          <span className="text-[10px] text-gray-400 block text-left" dir="ltr">
                            ~ ${plan.priceUsd} USD
                          </span>
                        )}
                      </div>

                      <div className={`w-8 h-8 rounded-full border flex items-center justify-center transition-all ${
                        isExpanded 
                          ? 'bg-[#ffcc00] text-slate-950 border-[#ffcc00] shadow-sm' 
                          : 'bg-white/5 border-white/10 text-gray-400 group-hover:text-white group-hover:border-white/30'
                      }`}>
                        <motion.div
                          animate={{ rotate: isExpanded ? 180 : 0 }}
                          transition={{ duration: 0.25, ease: 'easeInOut' }}
                        >
                          <ChevronDown className="w-4 h-4 stroke-[2.5]" />
                        </motion.div>
                      </div>
                    </div>
                  </div>

                  {/* Expandable Accordion Body */}
                  <AnimatePresence initial={false}>
                    {isExpanded && (
                      <motion.div
                        key="content"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                        className="overflow-hidden"
                      >
                        <div className="px-5 pb-5 pt-2 border-t border-white/10 space-y-4">
                          {/* Description */}
                          <p className="text-gray-300 text-xs sm:text-sm leading-relaxed bg-black/30 p-3 rounded-xl border border-white/5">
                            {plan.description}
                          </p>

                          {/* Features checklist */}
                          <div className="space-y-2">
                            <span className="text-[11px] text-[#ffcc00] font-bold block">مزايا وحصريات الباقة:</span>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                              {(plan.features || []).map((feature, fIdx) => (
                                <div key={fIdx} className="flex items-start gap-2 text-gray-200 bg-white/[0.02] p-2 rounded-lg border border-white/5">
                                  <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                                  <span className="leading-snug">{feature}</span>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Action Button */}
                          <div className="pt-2">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSubscribeWhatsApp(plan);
                              }}
                              className={`w-full py-3.5 rounded-xl font-black text-xs sm:text-sm shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer ${
                                isActivePlan
                                  ? 'bg-gradient-to-r from-amber-500 to-yellow-500 hover:brightness-110 text-slate-950 shadow-yellow-900/30'
                                  : isPro
                                  ? 'bg-gradient-to-r from-emerald-600 via-green-600 to-emerald-700 hover:brightness-110 text-white shadow-green-900/30'
                                  : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:brightness-110 text-white shadow-purple-900/30'
                              }`}
                            >
                              <MessageCircle className="w-4 h-4 stroke-[2.5]" />
                              <span>
                                {isActivePlan
                                  ? 'تجديد أو ترقية باقتك الحالية عبر واتساب الإدارة'
                                  : 'طلب تفعيل هذه الباقة فوراً عبر واتساب'}
                              </span>
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Trust & Guarantee Info Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
        <div className="p-4 rounded-2xl bg-[#0c122b]/70 border border-white/5 space-y-2">
          <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center">
            <Zap className="w-4 h-4" />
          </div>
          <h4 className="text-white text-xs font-bold">تفعيل فوري ومباشر</h4>
          <p className="text-gray-400 text-[11px] leading-relaxed">
            بمجرد إرسال طلبك عبر واتساب، يتم شحن رصيد باقتك وتفعيل الميزة لحسابك في دقائق معدودة.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-[#0c122b]/70 border border-white/5 space-y-2">
          <div className="w-8 h-8 rounded-lg bg-yellow-500/10 text-yellow-400 flex items-center justify-center">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <h4 className="text-white text-xs font-bold">بيانات دقيقة 100%</h4>
          <p className="text-gray-400 text-[11px] leading-relaxed">
            استعلامات حية مستخرجة مباشرة من قاعدة بيانات الهويات المتزامنة عبر مستخدمي تطبيق معروف.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-[#0c122b]/70 border border-white/5 space-y-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
            <PhoneCall className="w-4 h-4" />
          </div>
          <h4 className="text-white text-xs font-bold">دعم إدارة معروف</h4>
          <p className="text-gray-400 text-[11px] leading-relaxed">
            فريق دعم فني متواجد عبر واتساب الإدارة على الرقم المعتمد +967{adminPhone} لمساعدتك والإجابة عن استفساراتك.
          </p>
        </div>
      </div>

    </div>
  );
}
