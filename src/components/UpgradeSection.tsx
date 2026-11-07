import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Award, Crown, Check, MessageCircle, Sparkles, ShieldCheck, Zap, RefreshCw, Star, Info, PhoneCall } from 'lucide-react';
import { User, VipPlan, SystemSettings } from '../types';
import { APP_LOGO } from '../assets/logoBase64';

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
  const [selectedPlanId, setSelectedPlanId] = useState<string>('plan_pro');

  const adminPhone = systemSettings?.adminPhone || '774919194';

  const fetchPlans = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/vip-plans');
      if (res.ok) {
        const data: VipPlan[] = await res.json();
        setPlans(data.filter(p => p.isActive));
        if (data.length > 0 && !selectedPlanId) {
          setSelectedPlanId(data[0].id);
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

  const hasRevealPlan = Boolean(currentUser && currentUser.canRevealRegistrar);
  const totalRevealLimit = currentUser?.revealRegistrarLimit || 0;
  const usedRevealCount = currentUser?.revealRegistrarUsed || 0;
  const remainingReveals = Math.max(0, totalRevealLimit - usedRevealCount);

  const hasDeletePlan = Boolean(currentUser && currentUser.canDeleteNames);
  const totalDeleteLimit = currentUser?.nameDeletionsLimit || 0;
  const usedDeleteCount = currentUser?.nameDeletionsUsed || 0;
  const remainingDeletions = Math.max(0, totalDeleteLimit - usedDeleteCount);

  const hasAnyPlan = hasRevealPlan || hasDeletePlan;

  const handleSubscribeWhatsApp = (plan: VipPlan) => {
    if (!currentUser || currentUser.isGuest) {
      showToast('يرجى تسجيل الدخول برقم هاتفك أولاً لربط باقة الاشتراك بحسابك.', 'warning');
      onOpenAuth();
      return;
    }

    const message = `السلام عليكم ورحمة الله،
أود الاشتراك وتفعيل «${plan.name}» في منصة معروف:
• رقم حسابي: ${currentUser.phone}
• الباقة المختارة: ${plan.name}
${plan.revealsCount > 0 ? `• عدد عمليات كشف المسجل: ${plan.revealsCount} عملية\n` : ''}${plan.nameDeletionsCount ? `• عدد عمليات حذف وتعديل الأسماء: ${plan.nameDeletionsCount} عملية\n` : ''}• السعر: ${plan.priceYmr.toLocaleString('ar-EG')} ريال يمني (${plan.priceUsd ? `$${plan.priceUsd}` : ''})
• ما تقدمه: ${plan.description}
يرجى تفعيل الباقة لحسابي في منصة معروف.`;

    const encoded = encodeURIComponent(message);
    const waUrl = `https://wa.me/967${adminPhone.replace(/^0+/, '')}?text=${encoded}`;
    window.open(waUrl, '_blank');
  };

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
            <div className="bg-purple-950/40 border border-purple-400/40 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-600/30 border border-purple-400/50 flex items-center justify-center text-yellow-300 shrink-0">
                  <Check className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <span className="text-white text-xs font-bold block">اشتراكك في باقات VIP نشط حالياً:</span>
                  <div className="flex flex-wrap items-center gap-3 text-xs">
                    {hasRevealPlan && (
                      <span className="text-purple-200">
                        كاشف المسجّل: <strong className="text-yellow-300 font-mono text-sm">{remainingReveals}</strong> متبقي (من {totalRevealLimit})
                      </span>
                    )}
                    {hasDeletePlan && (
                      <span className="text-rose-200">
                        حذف الأسماء: <strong className="text-yellow-300 font-mono text-sm">{remainingDeletions}</strong> متبقي (من {totalDeleteLimit})
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => setActiveTab('search')}
                  className="px-4 py-2 bg-gradient-to-r from-yellow-500 to-amber-600 text-black font-extrabold text-xs rounded-xl shadow hover:brightness-110 transition-all cursor-pointer"
                >
                  استخدام الخدمة في البحث الآن
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-black/40 border border-white/5 rounded-2xl p-3.5 flex items-center justify-between gap-3 text-xs text-gray-300">
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-yellow-400 shrink-0" />
                <span>حسابك غير مشترك حالياً في باقات VIP. اختر باقتك المفضلة أدناه واطلب التفعيل عبر واتساب الإدارة.</span>
              </div>
              {(!currentUser || currentUser.isGuest) && (
                <button
                  onClick={onOpenAuth}
                  className="px-3 py-1 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-bold whitespace-nowrap cursor-pointer"
                >
                  تسجيل الدخول أولاً
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Available Plans Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-gray-400 text-xs">تفعيل فوري وآمن برقم حسابك</span>
          <h2 className="text-white text-lg font-bold flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-yellow-400" />
            <span>باقات الاشتراك المتاحة</span>
          </h2>
        </div>

        {loading ? (
          <div className="text-center py-16 text-gray-400">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-purple-400" />
            <span>جاري تحميل باقات VIP المتوفرة...</span>
          </div>
        ) : plans.length === 0 ? (
          <div className="text-center py-12 bg-[#0c122b] rounded-2xl border border-white/5 text-gray-400 text-xs">
            لا توجد باقات معروضة حالياً. يمكنك التواصل مع الإدارة مباشرة للاشتراك.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {plans.map((plan) => {
              const isSelected = selectedPlanId === plan.id;
              const isPro = plan.id.includes('pro') || (plan.badge && plan.badge.includes('الأكثر'));

              return (
                <div
                  key={plan.id}
                  onClick={() => setSelectedPlanId(plan.id)}
                  className={`relative cursor-pointer rounded-3xl p-6 transition-all duration-200 flex flex-col justify-between space-y-5 border-2 ${
                    isSelected
                      ? 'bg-gradient-to-b from-[#1b103d] to-[#0c143c] border-purple-400 shadow-[0_15px_40px_rgba(147,51,234,0.35)] scale-[1.02]'
                      : isPro
                      ? 'bg-[#0f1738]/80 border-purple-500/40 hover:border-purple-400'
                      : 'bg-[#0a112c]/70 border-white/5 hover:border-white/20'
                  }`}
                >
                  {/* Badge */}
                  {plan.badge && (
                    <div className="absolute -top-3.5 right-6 bg-gradient-to-r from-amber-500 to-yellow-500 text-black text-[10px] font-black px-3 py-1 rounded-full shadow-md uppercase tracking-wider">
                      {plan.badge}
                    </div>
                  )}

                  {/* Top: Name & Price */}
                  <div className="space-y-3 pt-1">
                    <h3 className="text-white text-lg font-black">{plan.name}</h3>
                    <p className="text-gray-300 text-xs leading-relaxed min-h-[36px]">
                      {plan.description}
                    </p>

                    <div className="p-3.5 rounded-2xl bg-black/40 border border-white/5 space-y-1">
                      <div className="flex items-baseline justify-between">
                        <span className="text-gray-400 text-xs">سعر الباقة:</span>
                        <div className="text-right">
                          <span className="text-yellow-400 font-mono font-black text-xl">
                            {plan.priceYmr.toLocaleString('ar-EG')}
                          </span>
                          <span className="text-yellow-200 text-xs mr-1 font-bold">ريال يمني</span>
                        </div>
                      </div>
                      {plan.priceUsd > 0 && (
                        <div className="text-left text-[11px] text-gray-400 font-mono" dir="ltr">
                          ~ ${plan.priceUsd} USD
                        </div>
                      )}
                    </div>

                    <div className="space-y-1.5 py-1 border-b border-white/5 text-xs">
                      {plan.revealsCount > 0 && (
                        <div className="flex items-center justify-between">
                          <span className="text-gray-400">عمليات كشف المسجّل:</span>
                          <span className="text-white font-mono font-bold text-sm bg-purple-500/20 px-2.5 py-0.5 rounded-lg border border-purple-500/30 text-purple-200">
                            {plan.revealsCount} كشف
                          </span>
                        </div>
                      )}
                      {(plan.nameDeletionsCount || 0) > 0 && (
                        <div className="flex items-center justify-between">
                          <span className="text-gray-400">حذف وتعديل الأسماء:</span>
                          <span className="text-white font-mono font-bold text-sm bg-rose-500/20 px-2.5 py-0.5 rounded-lg border border-rose-500/30 text-rose-300">
                            {plan.nameDeletionsCount} أسماء 🛡️
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Features list */}
                  <div className="space-y-2 text-xs">
                    {(plan.features || []).map((feature, fIdx) => (
                      <div key={fIdx} className="flex items-start gap-2 text-gray-300">
                        <Check className="w-3.5 h-3.5 text-green-400 shrink-0 mt-0.5" />
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>

                  {/* Subscribe Action Button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSubscribeWhatsApp(plan);
                    }}
                    className={`w-full py-3 rounded-2xl font-black text-xs shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer ${
                      isSelected
                        ? 'bg-gradient-to-r from-emerald-600 via-green-600 to-emerald-700 hover:brightness-110 text-white shadow-green-900/30'
                        : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:brightness-110 text-white shadow-purple-900/30'
                    }`}
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>طلب الاشتراك عبر واتساب</span>
                  </button>
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
