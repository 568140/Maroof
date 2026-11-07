import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { LogOut, X, AlertCircle } from 'lucide-react';

interface ExitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmExit: () => void;
  durationMs?: number;
}

export default function ExitModal({
  isOpen,
  onClose,
  onConfirmExit,
  durationMs = 2000,
}: ExitModalProps) {
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    if (!isOpen) {
      setProgress(100);
      return;
    }

    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remainingPct = Math.max(0, 100 - (elapsed / durationMs) * 100);
      setProgress(remainingPct);
      if (remainingPct <= 0) {
        clearInterval(interval);
      }
    }, 40);

    return () => clearInterval(interval);
  }, [isOpen, durationMs]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          dir="rtl"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.92, y: 30, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.92, y: 30, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm bg-gradient-to-b from-[#051442] via-[#030d2a] to-[#020718] border-2 border-[#ffcc00]/50 rounded-3xl p-6 text-center space-y-5 shadow-[0_0_40px_rgba(255,204,0,0.25)] relative overflow-hidden"
          >
            {/* Subtle luxury glow flares */}
            <div className="absolute -top-12 -left-12 w-32 h-32 bg-[#0d52ff]/20 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute -bottom-12 -right-12 w-32 h-32 bg-[#ffcc00]/15 rounded-full blur-2xl pointer-events-none" />

            {/* Close Button top-left in RTL */}
            <button
              type="button"
              onClick={onClose}
              className="absolute top-4 left-4 p-2 text-slate-400 hover:text-white rounded-full hover:bg-white/10 transition-colors"
              aria-label="إغلاق"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Exit Icon with animated pulse glow */}
            <div className="relative mx-auto w-16 h-16 flex items-center justify-center">
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-[#ffcc00]/20 to-[#0d52ff]/30 blur-md animate-pulse" />
              <div className="relative w-14 h-14 rounded-2xl bg-[#030d29] border-2 border-[#ffcc00]/60 flex items-center justify-center text-[#ffcc00] shadow-inner">
                <LogOut className="w-7 h-7 transform -scale-x-100" />
              </div>
            </div>

            {/* Title & Description matching exact user specifications */}
            <div className="space-y-2">
              <h3 className="text-white font-extrabold text-xl tracking-wide font-sans">
                هل تريد مغادرة معروف؟
              </h3>
              <p className="text-slate-300 text-xs sm:text-sm font-medium leading-relaxed px-2">
                اضغط زر الرجوع مرة أخرى للخروج من التطبيق.
              </p>
            </div>

            {/* 2-second visual timer countdown bar */}
            <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#ffd700] to-[#f59e0b] transition-all duration-75"
                style={{ width: `${progress}%` }}
              />
            </div>

            {/* Action buttons */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="w-full py-3 px-4 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-white font-bold text-xs sm:text-sm transition-all active:scale-95 shadow-sm"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={onConfirmExit}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white font-bold text-xs sm:text-sm transition-all active:scale-95 shadow-md flex items-center justify-center gap-1.5"
              >
                <span>خروج الآن</span>
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
