import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldCheck, Smartphone, ShieldAlert, RefreshCw, X } from 'lucide-react';
import { User } from '../types';
import { safeFetchJson } from '../utils/apiHelper';
import { APP_LOGO } from '../assets/logoBase64';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRegisterSuccess: (user: User) => void;
  showToast: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
}

export default function AuthModal({
  isOpen,
  onClose,
  onRegisterSuccess,
  showToast,
}: AuthModalProps) {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [deviceSpecs, setDeviceSpecs] = useState({
    id: '',
    type: '',
    browser: ''
  });
  const [otpMode, setOtpMode] = useState(false); // Simulated Stage 2 toggle for verification!
  const [simulatedOtp, setSimulatedOtp] = useState('');
  const [userOtpInput, setUserOtpInput] = useState('');

  // Auto-generate realistic device identifiers on load to enforce Device Binding!
  useEffect(() => {
    const userAgent = navigator.userAgent;
    let browserName = "Chrome";
    if (userAgent.indexOf("Safari") > -1 && userAgent.indexOf("Chrome") === -1) browserName = "Safari";
    else if (userAgent.indexOf("Firefox") > -1) browserName = "Firefox";
    else if (userAgent.indexOf("Edge") > -1) browserName = "Edge";

    let deviceModel = "جوال أندرويد ذكي";
    if (/iPhone|iPad|iPod/i.test(userAgent)) deviceModel = "iPhone 15 Pro Max";
    else if (/Windows/i.test(userAgent)) deviceModel = "كمبيوتر شخصي Windows";
    else if (/Macintosh/i.test(userAgent)) deviceModel = "جهاز Apple Mac Book";

    // Create a stable unique device fingerprint stored in localStorage so it persists on the device!
    let storedDeviceId = localStorage.getItem('maarouf_device_fingerprint');
    if (!storedDeviceId) {
      storedDeviceId = 'mv_' + Math.random().toString(36).substring(2, 15) + '_' + Date.now().toString().substring(8);
      localStorage.setItem('maarouf_device_fingerprint', storedDeviceId);
    }

    setDeviceSpecs({
      id: storedDeviceId,
      type: deviceModel,
      browser: browserName
    });
  }, []);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone) {
      showToast('يرجى إدخال رقم الهاتف.', 'warning');
      return;
    }

    const cleanPhone = phone.trim().replace(/\s+/g, '');
    const phoneRegex = /^7\d{7,8}$/;
    if (!phoneRegex.test(cleanPhone)) {
      showToast('يجب إدخال رقم هاتف يمني صحيح (8 أو 9 أرقام يبدأ بـ 7).', 'error');
      return;
    }

    setLoading(true);

    try {
      // API registration call
      const data = await safeFetchJson('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: cleanPhone,
          deviceId: deviceSpecs.id,
          deviceType: deviceSpecs.type,
          browser: deviceSpecs.browser
        })
      });

      showToast('تم التحقق من بصمة الجهاز ومصادقة الرقم بنجاح.', 'success');
      onRegisterSuccess(data.user);
      onClose();

    } catch (err: any) {
      showToast(err.message || 'فشل التسجيل ومصادقة الجهاز.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Overlay background */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/75 backdrop-blur-sm"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 15 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 15 }}
            className="relative w-full max-w-md overflow-hidden rounded-3xl border-2 border-[#0d52ff]/40 bg-gradient-to-b from-[#071948] to-[#030d2a] p-6 text-right shadow-[0_20px_50px_rgba(2,11,39,0.9)] z-10"
          >
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute left-4 top-4 text-slate-400 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/5"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header branding with Logo */}
            <div className="text-center space-y-2.5 pb-5 border-b border-white/10 flex flex-col items-center">
              <img 
                src={APP_LOGO} 
                alt="شعار معروف" 
                loading="eager"
                decoding="sync"
                fetchPriority="high"
                width="64"
                height="64"
                className="w-16 h-16 rounded-2xl object-cover border-2 border-[#ffcc00]/50 shadow-[0_0_20px_rgba(13,82,255,0.4)] shrink-0"
              />
              <div>
                <h3 className="text-white text-lg font-black">توثيق الدخول في تطبيق معروف</h3>
                <p className="text-slate-300 text-xs max-w-xs mx-auto mt-1">
                  سجّل رقم هاتفك اليمني للتمتع بعمليات البحث المجانية ومزامنة دليلك بأمان
                </p>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleRegister} className="mt-5 space-y-4">
              <div className="space-y-1.5">
                <label className="text-[11px] text-[#ffcc00] font-bold tracking-wider uppercase block">رقم الهاتف اليمني</label>
                <div className="relative">
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/[^\d]/g, '').substring(0, 9))}
                    placeholder="771234567"
                    className="w-full text-left font-mono font-bold text-lg tracking-widest pl-3 pr-11 py-3 rounded-2xl bg-[#020b24]/90 border-2 border-[#0d52ff]/30 text-white focus:border-[#ffcc00] focus:ring-2 focus:ring-[#ffcc00]/30 transition-all outline-none"
                    dir="ltr"
                  />
                  <div className="absolute top-1/2 -translate-y-1/2 right-3.5 text-[#ffcc00]">
                    <Smartphone className="w-4.5 h-4.5" />
                  </div>
                </div>
              </div>

              <div className="p-3 bg-[#ffcc00]/10 rounded-xl border border-[#ffcc00]/20 text-[11px] text-[#ffcc00] leading-relaxed text-right flex gap-2 items-start">
                <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  تنبيه: سيتم ربط هذا الرقم بجهازك الحالي لضمان دقة معلومات الدليل ومكافحة الانتحال.
                </span>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-gradient-to-r from-[#ffcc00] via-[#ffb300] to-[#f59e0b] text-slate-950 font-black text-xs md:text-sm rounded-xl shadow-[0_0_20px_rgba(255,204,0,0.3)] transition-all hover:brightness-110 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {loading ? (
                  <RefreshCw className="w-4.5 h-4.5 animate-spin" />
                ) : (
                  <>
                    <ShieldCheck className="w-4.5 h-4.5 text-slate-950" />
                    <span>تسجيل ومصادقة الدخول</span>
                  </>
                )}
              </button>
            </form>

            {/* Simulated Stage 2 explanation footer */}
            <p className="text-[9px] text-gray-500 text-center mt-5">
              منصة معروف مجهزة لربط محركات الرسائل القصيرة Firebase SMS OTP وتوثيق الحساب مستقبلاً دون تغيير البنية التحتية.
            </p>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
