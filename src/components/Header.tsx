import React from 'react';
import { motion } from 'motion/react';
import { Menu, User, Sparkles, Coins, LogOut, ShieldCheck, HelpCircle, Settings, Bell, Search, History, Gift } from 'lucide-react';
import { User as UserType } from '../types';

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
      <header className="sticky top-0 z-40 bg-[#070b19]/90 backdrop-blur-md border-b border-[#c5a059]/10 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setDrawerOpen(true)}
            className="p-2 text-gray-400 hover:text-[#e5c158] transition-colors rounded-lg hover:bg-white/5"
            id="menu-toggle"
          >
            <Menu className="w-6 h-6" />
          </button>
          
          {/* Logo with luxurious typography */}
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setActiveTab('search')}>
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#0d1430] to-[#1e295d] border border-[#c5a059]/30 flex items-center justify-center shadow-[0_0_15px_rgba(212,175,55,0.15)]">
              <span className="text-[#e5c158] font-bold text-lg">م</span>
            </div>
            <div className="flex flex-col">
              <span className="text-white font-extrabold text-lg tracking-wider font-display">معروف</span>
              <span className="text-[10px] text-[#c5a059] font-medium tracking-widest uppercase">MAAROUF</span>
            </div>
          </div>
        </div>

        {/* User context action */}
        <div className="flex items-center gap-3">
          {currentUser ? (
            <div className="flex items-center gap-3">
              {/* Point badge */}
              <div 
                onClick={() => setActiveTab('rewards')}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-[#1a1c1e] to-[#25282a] border border-[#c5a059]/30 text-xs text-[#e5c158] font-bold cursor-pointer hover:border-[#e5c158] transition-all"
              >
                <Coins className="w-3.5 h-3.5" />
                <span>{currentUser.points} نقطة</span>
              </div>

              {/* Free search balance badge */}
              <div className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#c5a059]/10 border border-[#c5a059]/20 text-[11px] text-white">
                <span className="text-[#e5c158] font-bold">{currentUser.searchBalance}</span>
                <span className="text-gray-400">/ 3 عمليات مجانية</span>
              </div>

              {/* User Avatar Action */}
              <button
                onClick={() => setActiveTab('profile')}
                className={`w-9 h-9 rounded-full bg-[#1e295d]/60 border ${activeTab === 'profile' ? 'border-[#e5c158] shadow-[0_0_10px_rgba(212,175,55,0.3)]' : 'border-gray-700'} flex items-center justify-center text-white hover:border-[#e5c158] transition-all`}
              >
                <User className="w-4 h-4 text-[#e5c158]" />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className="px-4 py-2 text-xs font-semibold text-black bg-gradient-to-r from-[#e5c158] to-[#c5a059] rounded-lg shadow-md hover:from-[#f3e5ab] hover:to-[#e5c158] transition-all transform active:scale-95 flex items-center gap-1"
            >
              <User className="w-3.5 h-3.5" />
              <span>تسجيل الدخول</span>
            </button>
          )}

          {isAdmin && (
            <button
              onClick={() => setActiveTab('admin')}
              className={`hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${activeTab === 'admin' ? 'bg-[#c5a059]/20 text-[#e5c158] border-[#e5c158]' : 'bg-[#121c3e] text-[#c5a059] border-[#c5a059]/30'} hover:bg-[#c5a059]/10`}
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
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm transition-opacity"
          onClick={() => setDrawerOpen(false)}
        />
      )}

      {/* Drawer content */}
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: drawerOpen ? 0 : '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="fixed top-0 right-0 h-full w-80 max-w-[85vw] bg-[#070b19] border-l border-[#c5a059]/10 shadow-[0_0_40px_rgba(0,0,0,0.8)] z-50 flex flex-col text-right justify-between"
      >
        <div className="p-6">
          {/* Header Inside Drawer */}
          <div className="flex items-center justify-between pb-6 border-b border-white/5">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#0d1430] to-[#1e295d] border border-[#c5a059]/30 flex items-center justify-center">
                <span className="text-[#e5c158] font-bold text-sm">م</span>
              </div>
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
            <div className="mt-6 p-4 rounded-xl bg-gradient-to-br from-[#0e1634] to-[#151f4c] border border-[#c5a059]/20 flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-[#1e295d] border border-[#c5a059]/30 flex items-center justify-center text-[#e5c158]">
                <User className="w-6 h-6" />
              </div>
              <div className="flex flex-col flex-1">
                <span className="text-white font-bold text-sm">مستخدم معروف</span>
                <span className="text-gray-400 text-xs mt-0.5">{currentUser.phone}</span>
                <div className="mt-2 flex items-center gap-1.5 text-[10px] bg-black/30 w-fit px-2 py-0.5 rounded text-[#e5c158] font-bold">
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
