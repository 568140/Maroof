import React from 'react';
import { motion } from 'motion/react';
import { Menu, User, Sparkles, Coins, LogOut, ShieldCheck, HelpCircle, Settings, Bell, Search, History, Gift, Crown, Award } from 'lucide-react';
import { User as UserType } from '../types';
import { APP_LOGO } from '../assets/logoBase64';
import { APP_AVATAR } from '../assets/avatarBase64';

interface HeaderProps {
  currentUser: UserType | null;
  onLogout: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isAdmin: boolean;
  onOpenAuth: () => void;
  drawerOpen: boolean;
  setDrawerOpen: (open: boolean) => void;
}

export default function Header({
  currentUser,
  onLogout,
  activeTab,
  setActiveTab,
  isAdmin,
  onOpenAuth,
  drawerOpen,
  setDrawerOpen,
}: HeaderProps) {
  return (
    <>
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-[#040f33]/90 backdrop-blur-md border-b border-[#0d52ff]/20 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setDrawerOpen(true)}
            className="p-2 text-slate-300 hover:text-[#ffb300] transition-colors rounded-xl hover:bg-white/5"
            id="menu-toggle"
          >
            <Menu className="w-6 h-6" />
          </button>
          
          {/* Logo with official attached visual identity */}
          <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => setActiveTab('search')}>
            <img 
              src={APP_LOGO} 
              alt="شعار معروف" 
              loading="eager"
              decoding="sync"
              fetchPriority="high"
              width="40"
              height="40"
              className="w-10 h-10 rounded-xl object-cover shadow-[0_0_15px_rgba(13,82,255,0.4)] border border-[#ffcc00]/40 shrink-0"
            />
            <div className="flex flex-col">
              <span className="text-white font-extrabold text-lg tracking-wider font-display">معروف</span>
              <span className="text-[10px] text-[#ffcc00] font-bold tracking-widest uppercase">MAAROUF</span>
            </div>
          </div>
        </div>

        {/* User context action */}
        <div className="flex items-center gap-3">
          {currentUser ? (
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Point badge */}
              <div 
                onClick={() => setActiveTab('rewards')}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#0a2368] border border-[#ffcc00]/40 text-xs text-[#ffcc00] font-bold cursor-pointer hover:border-[#ffcc00] shadow-[0_0_10px_rgba(255,204,0,0.2)] transition-all"
              >
                <Coins className="w-3.5 h-3.5" />
                <span>{currentUser.points} نقطة</span>
              </div>

              {/* Free search balance badge */}
              <div className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#071948] border border-[#0d52ff]/30 text-[11px] text-white">
                <span className="text-[#ffcc00] font-bold">{currentUser.searchBalance}</span>
                <span className="text-slate-300">/ 3 عمليات مجانية</span>
              </div>

              {/* VIP Upgrade Action Button */}
              <button
                type="button"
                onClick={() => setActiveTab('upgrade')}
                className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                  activeTab === 'upgrade'
                    ? 'bg-purple-600/30 text-yellow-300 border-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.4)]'
                    : 'bg-gradient-to-r from-purple-900/40 to-indigo-900/40 text-purple-200 border-purple-500/30 hover:border-purple-400 hover:text-white'
                }`}
                title="الترقية وباقات كاشف المسجّل VIP"
              >
                <Crown className="w-3.5 h-3.5 text-yellow-400 shrink-0" />
                <span className="hidden sm:inline">الترقية</span>
                <span>VIP</span>
              </button>

              {/* User Avatar Action (with official high-res character mascot) */}
              <button
                onClick={() => setActiveTab('profile')}
                className={`w-10 h-10 rounded-full bg-[#0d2a7a] border-2 ${activeTab === 'profile' ? 'border-[#ffcc00] shadow-[0_0_15px_rgba(255,204,0,0.5)]' : 'border-[#ffcc00]/50 hover:border-[#ffcc00]'} overflow-hidden flex items-center justify-center p-0.5 transition-all shadow-md group`}
                title={currentUser.isGuest ? "حساب زائر" : "الملف الشخصي"}
              >
                <img
                  src={APP_AVATAR}
                  alt="المحقق معروف"
                  loading="eager"
                  decoding="sync"
                  fetchPriority="high"
                  width="40"
                  height="40"
                  className="w-full h-full object-cover rounded-full transform group-hover:scale-105 transition-transform"
                />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className="px-3.5 py-1.5 text-xs font-bold text-slate-950 bg-gradient-to-r from-[#ffcc00] to-[#f59e0b] rounded-xl shadow-[0_0_15px_rgba(255,204,0,0.3)] hover:brightness-110 transition-all transform active:scale-95 flex items-center gap-2 group"
            >
              <img
                src={APP_AVATAR}
                alt="المحقق معروف"
                loading="eager"
                decoding="sync"
                fetchPriority="high"
                width="28"
                height="28"
                className="w-7 h-7 rounded-full object-cover border border-slate-900 shadow-sm"
              />
              <span>تسجيل الدخول</span>
            </button>
          )}

          {isAdmin && (
            <button
              onClick={() => setActiveTab('admin')}
              className={`hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${activeTab === 'admin' ? 'bg-[#ffcc00]/20 text-[#ffcc00] border-[#ffcc00]' : 'bg-[#0a256e] text-[#ffcc00] border-[#0d52ff]/40'} hover:bg-[#ffcc00]/10`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>لوحة التحكم</span>
            </button>
          )}
        </div>
      </header>

      {/* Side Drawer Overlay */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm transition-opacity"
          onClick={() => setDrawerOpen(false)}
        />
      )}

      {/* Drawer content */}
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: drawerOpen ? 0 : '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="fixed top-0 right-0 h-full w-80 max-w-[85vw] bg-[#030d2a] border-l border-[#0d52ff]/20 shadow-[0_0_40px_rgba(0,0,0,0.9)] z-50 flex flex-col text-right justify-between"
      >
        <div className="p-6">
          {/* Header Inside Drawer */}
          <div className="flex items-center justify-between pb-6 border-b border-white/5">
            <div className="flex items-center gap-2.5">
              <img 
                src="./logo.webp" 
                alt="شعار معروف" 
                className="w-8 h-8 rounded-lg object-cover border border-[#ffcc00]/40 shadow-sm"
              />
              <div>
                <span className="text-white font-extrabold text-sm tracking-wider">منصة معروف</span>
              </div>
            </div>
            <button
              onClick={() => setDrawerOpen(false)}
              className="text-gray-400 hover:text-white"
            >
              ✕
            </button>
          </div>

          {/* Profile Quick Summary */}
          {currentUser ? (
            <div className="mt-6 p-4 rounded-xl bg-gradient-to-br from-[#0e1634] to-[#151f4c] border border-[#ffcc00]/30 flex items-center gap-3">
              <div className="w-13 h-13 rounded-full bg-[#1e295d] border-2 border-[#ffcc00]/50 overflow-hidden flex items-center justify-center shrink-0 shadow-md">
                <img
                  src={APP_AVATAR}
                  alt="المحقق معروف"
                  loading="eager"
                  decoding="sync"
                  fetchPriority="high"
                  width="52"
                  height="52"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex flex-col flex-1">
                <span className="text-white font-bold text-sm">مستخدم معروف</span>
                <span className="text-gray-400 text-xs mt-0.5 font-mono">{currentUser.phone}</span>
                <div className="mt-2 flex items-center gap-1.5 text-[10px] bg-black/40 w-fit px-2.5 py-0.5 rounded-full border border-[#ffcc00]/30 text-[#ffcc00] font-bold">
                  <Coins className="w-3 h-3" />
                  <span>{currentUser.points} نقطة</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-6 p-4 text-center rounded-xl bg-[#0e1634] border border-dashed border-gray-700">
              <p className="text-gray-400 text-xs mb-3">سجل الآن للحصول على ٣ عمليات بحث مجانية يومياً ومزامنة جهات اتصالك</p>
              <button
                onClick={() => {
                  setDrawerOpen(false);
                  onOpenAuth();
                }}
                className="w-full py-2 bg-gradient-to-r from-[#e5c158] to-[#c5a059] text-black text-xs font-bold rounded-lg shadow-lg hover:brightness-110"
              >
                إنشاء حساب سريع
              </button>
            </div>
          )}

          {/* Navigation Links */}
          <nav className="mt-8 flex flex-col gap-2">
            <button
              onClick={() => {
                setActiveTab('search');
                setDrawerOpen(false);
              }}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all ${activeTab === 'search' ? 'bg-[#c5a059]/15 text-[#e5c158] font-bold' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
            >
              <Search className="w-4.5 h-4.5" />
              <span>البحث عن رقم</span>
            </button>

            {currentUser && (
              <button
                onClick={() => {
                  setActiveTab('sync');
                  setDrawerOpen(false);
                }}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all ${activeTab === 'sync' ? 'bg-[#c5a059]/15 text-[#e5c158] font-bold' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
              >
                <History className="w-4.5 h-4.5" />
                <span>مزامنة جهات الاتصال</span>
                {!currentUser.contactsSynced && (
                  <span className="mr-auto px-2 py-0.5 bg-red-500/20 text-red-400 text-[10px] font-bold rounded">تفعيل</span>
                )}
              </button>
            )}

            <button
              onClick={() => {
                setActiveTab('rewards');
                setDrawerOpen(false);
              }}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all ${activeTab === 'rewards' ? 'bg-[#c5a059]/15 text-[#e5c158] font-bold' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
            >
              <Gift className="w-4.5 h-4.5" />
              <span>المكافآت والربح</span>
            </button>

            {/* VIP Plans & Upgrade Link */}
            <button
              onClick={() => {
                setActiveTab('upgrade');
                setDrawerOpen(false);
              }}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all ${activeTab === 'upgrade' ? 'bg-gradient-to-r from-purple-900/40 to-amber-950/40 text-amber-300 font-bold border border-amber-500/40' : 'text-gray-300 hover:bg-white/5 hover:text-white'}`}
            >
              <Crown className="w-4.5 h-4.5 text-yellow-400 shrink-0" />
              <span>الترقية وباقات VIP</span>
              <span className="mr-auto px-2 py-0.5 bg-gradient-to-r from-amber-500 to-yellow-500 text-black text-[9px] font-black rounded-full shadow-sm">
                كاشف المسجل
              </span>
            </button>

            {currentUser && (
              <button
                onClick={() => {
                  setActiveTab('profile');
                  setDrawerOpen(false);
                }}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all ${activeTab === 'profile' ? 'bg-[#c5a059]/15 text-[#e5c158] font-bold' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
              >
                <User className="w-4.5 h-4.5" />
                <span>الملف الشخصي</span>
              </button>
            )}

            <button
              onClick={() => {
                setActiveTab('settings');
                setDrawerOpen(false);
              }}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all ${activeTab === 'settings' ? 'bg-[#c5a059]/15 text-[#e5c158] font-bold' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
            >
              <Settings className="w-4.5 h-4.5" />
              <span>الإعدادات والمساعدة</span>
            </button>

            {isAdmin && (
              <button
                onClick={() => {
                  setActiveTab('admin');
                  setDrawerOpen(false);
                }}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all ${activeTab === 'admin' ? 'bg-[#c5a059]/25 text-[#e5c158] border border-[#c5a059]/20 font-bold' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
              >
                <ShieldCheck className="w-4.5 h-4.5" />
                <span>لوحة تحكم الإدارة</span>
              </button>
            )}
          </nav>
        </div>

        {/* Logout / Bottom Actions */}
        <div className="p-6 border-t border-white/5">
          {currentUser ? (
            <button
              onClick={() => {
                onLogout();
                setDrawerOpen(false);
              }}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-red-950/30 hover:bg-red-900/30 text-red-400 hover:text-red-300 text-xs font-bold transition-all border border-red-900/20"
            >
              <LogOut className="w-4 h-4" />
              <span>تسجيل الخروج</span>
            </button>
          ) : (
            <p className="text-gray-500 text-[10px] text-center">النسخة 1.0 (إصدار الحماية المتكاملة)</p>
          )}
        </div>
      </motion.div>
    </>
  );
}
