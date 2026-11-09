import React, { useState } from 'react';
import { ShieldCheck, ExternalLink, Loader2 } from 'lucide-react';

interface LegalConsentProps {
  onAccept: () => void | Promise<void>;
}

export default function LegalConsent({ onAccept }: LegalConsentProps) {
  const [checked, setChecked] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleAcceptClick = async () => {
    if (!checked || isProcessing) return;
    setIsProcessing(true);
    try {
      await onAccept();
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#010817]/95 p-4 backdrop-blur-sm" dir="rtl">
      <div className="w-full max-w-lg rounded-3xl border border-[#0d52ff]/50 bg-gradient-to-b from-[#071948] to-[#030d2a] p-6 text-right shadow-2xl">
        <div className="mb-4 flex items-center gap-3">
          <ShieldCheck className="h-8 w-8 text-[#ffcc00] shrink-0" />
          <div>
            <h2 className="text-xl font-black text-white">قبل استخدام معروف</h2>
            <p className="text-xs text-slate-300">يرجى قراءة الموافقة والوثائق القانونية</p>
          </div>
        </div>
        <p className="text-sm leading-7 text-slate-200">
          تستخدم معروف رقم الهاتف وبيانات الجهاز لتسجيل الدخول وحماية الخدمة. عند النقر على «أوافق وأتابع»، سيطلب نظام Android إذن قراءة جهات الاتصال لمزامنتها وتفعيل رصيد البحث تلقائياً دون الحاجة لأي خطوات إضافية.
        </p>
        <div className="my-4 flex gap-4 text-sm">
          <a className="flex items-center gap-1 text-[#8eb5ff] hover:text-[#ffcc00] transition-colors underline" href="./privacy.html" target="_blank" rel="noreferrer">
            سياسة الخصوصية <ExternalLink className="h-3 w-3" />
          </a>
          <a className="flex items-center gap-1 text-[#8eb5ff] hover:text-[#ffcc00] transition-colors underline" href="./terms.html" target="_blank" rel="noreferrer">
            شروط الاستخدام <ExternalLink className="h-3 w-3" />
          </a>
        </div>
        <label className={`flex cursor-pointer items-start gap-3 rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-slate-100 transition-colors ${isProcessing ? 'opacity-60 cursor-not-allowed' : 'hover:bg-white/10'}`}>
          <input
            type="checkbox"
            className="mt-1 h-4 w-4 accent-[#ffcc00]"
            checked={checked}
            disabled={isProcessing}
            onChange={e => setChecked(e.target.checked)}
          />
          <span>أقر بأنني قرأت سياسة الخصوصية وشروط الاستخدام وأوافق عليهما، وأمنح التطبيق صلاحية مزامنة جهات الاتصال لتفعيل البحث وتسهيل كشف الأرقام.</span>
        </label>
        <button
          type="button"
          disabled={!checked || isProcessing}
          onClick={handleAcceptClick}
          className="mt-5 w-full rounded-xl bg-gradient-to-r from-[#ffcc00] to-[#f59e0b] hover:from-[#ffe066] hover:to-[#f59e0b] py-3.5 font-black text-slate-950 disabled:cursor-not-allowed disabled:opacity-40 transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#ffcc00]/20 active:scale-[0.99]"
        >
          {isProcessing ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin text-slate-950" />
              <span>جارٍ تفعيل الحساب ومزامنة الأرقام...</span>
            </>
          ) : (
            <span>أوافق وأتابع</span>
          )}
        </button>
      </div>
    </div>
  );
}

