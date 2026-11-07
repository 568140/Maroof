import React, { useState } from 'react';
import { ShieldCheck, ExternalLink } from 'lucide-react';

interface LegalConsentProps { onAccept: () => void; }

export default function LegalConsent({ onAccept }: LegalConsentProps) {
  const [checked, setChecked] = useState(false);
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#010817]/95 p-4" dir="rtl">
      <div className="w-full max-w-lg rounded-3xl border border-[#0d52ff]/50 bg-gradient-to-b from-[#071948] to-[#030d2a] p-6 text-right shadow-2xl">
        <div className="mb-4 flex items-center gap-3"><ShieldCheck className="h-8 w-8 text-[#ffcc00]" /><div><h2 className="text-xl font-black text-white">قبل استخدام معروف</h2><p className="text-xs text-slate-300">يرجى قراءة الموافقة والوثائق القانونية</p></div></div>
        <p className="text-sm leading-7 text-slate-200">تستخدم معروف رقم الهاتف وبيانات الجهاز لتسجيل الدخول وحماية الخدمة. عند طلب مزامنة جهات الاتصال، سيطلب Android إذنًا صريحًا وقد تُرسل الأسماء والأرقام إلى خوادم معروف لمعالجة الدليل.</p>
        <div className="my-4 flex gap-4 text-sm"><a className="flex items-center gap-1 text-[#8eb5ff] underline" href="./privacy.html" target="_blank" rel="noreferrer">سياسة الخصوصية <ExternalLink className="h-3 w-3" /></a><a className="flex items-center gap-1 text-[#8eb5ff] underline" href="./terms.html" target="_blank" rel="noreferrer">شروط الاستخدام <ExternalLink className="h-3 w-3" /></a></div>
        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-slate-100"><input type="checkbox" className="mt-1 h-4 w-4 accent-[#ffcc00]" checked={checked} onChange={e => setChecked(e.target.checked)} /><span>أقر بأنني قرأت سياسة الخصوصية وشروط الاستخدام وأوافق عليهما، وأفهم أن مزامنة جهات الاتصال اختيارية وتتطلب إذن Android.</span></label>
        <button disabled={!checked} onClick={onAccept} className="mt-5 w-full rounded-xl bg-gradient-to-r from-[#ffcc00] to-[#f59e0b] py-3 font-black text-slate-950 disabled:cursor-not-allowed disabled:opacity-40">أوافق وأتابع</button>
      </div>
    </div>
  );
}
