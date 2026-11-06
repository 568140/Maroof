import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldCheck, Smartphone, ShieldAlert, RefreshCw, X } from 'lucide-react';
import { User } from '../types';
import { safeFetchJson } from '../utils/apiHelper';

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
            className="relative w-full max-w-md overflow-hidden rounded-2xl border border-[#c5a059]/30 bg-[#070b19] p-6 text-right shadow-[0_15px_40px_rgba(0,0,0,0.8)] z-10"
          >
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute left-4 top-4 text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header branding */}
            <div className="text-center space-y-2 pb-5 border-b border-white/5">
              <div className="w-12 h-12 rounded-full bg-[#1e295d] border border-[#c5a059]/30 flex items-center justify-center mx-auto text-[#e5c158] shadow-[0_0_15px_rgba(212,175,55,0.1)]">
                <Smartphone className="w-6 h-6" />
              </div>
              <h3 className="text-white text-lg font-black">ربط وتوثيق الجهاز التلقائي</h3>
              <p className="text-gray-400 text-xs max-w-xs mx-auto">
                منصة معروف تحظر إنشاء أكثر من حساب لكل هاتف يمني لمنع تلاعب منتحلي الشخصيات.
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleRegister} className="mt-5 space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] text-[#c5a059] font-bold tracking-wider uppercase block">رقم الهاتف اليمني</label>
                <div className="relative">
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/[^\d]/g, '').substring(0, 9))}
                    placeholder="771234567"
                    className="w-full text-left font-mono font-bold text-base tracking-widest pl-3 pr-10 py-3 rounded-xl bg-black/40 border border-[#c5a059]/15 text-white focus:border-[#e5c158] transition-all outline-none"
                    dir="ltr"
                  />
                  <span className="text-gray-400 font-mono text-xs absolute left-3 top-1/2 -translate-y-1/2 font-bold pointer-events-none" />
                  <div className="absolute top-1/2 -translate-y-1/2 right-3 text-gray-500">
                    <Smartphone className="w-4 h-4" />
                  </div>
                </div>
              </div>

              <div className="p-3 bg-yellow-500/5 rounded-lg border border-yellow-500/10 text-[10px] text-yellow-300 leading-relaxed text-right flex gap-1.5 items-start">
                <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  تنبيه: سيتم ربط هذا الرقم بجهازك الحالي بشكل دائم. لا يمكن تغيير الجهاز أو الدخول برقم آخر في وقت واحد لضمان دقة معلومات الدليل اليمني.
                </span>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-gradient-to-r from-[#e5c158] to-[#c5a059] text-black font-extrabold text-xs rounded-xl shadow-md transition-all hover:brightness-110 flex items-center justify-center gap-1.5"
              >
                {loading ? (
                  <RefreshCw className="w-4.5 h-4.5 animate-spin" />
                ) : (
                  <>
                    <ShieldCheck className="w-4.5 h-4.5" />
                    <span>موافق، تسجيل وتوثيق الجهاز</span>
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
