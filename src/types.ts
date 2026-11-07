export interface User {
  id: string;
  phone: string;
  deviceId: string;
  deviceType: string;
  browser: string;
  verifiedStatus: boolean;
  contactsSynced: boolean;
  searchBalance: number;
  points: number;
  createdAt: string;
  isActive: boolean;
  consecutiveAdsWatched?: number;
  unlockedUnlimited?: boolean;
  isGuest?: boolean;
  canRevealRegistrar?: boolean;
  revealRegistrarLimit?: number;
  revealRegistrarUsed?: number;
  canDeleteNames?: boolean;
  nameDeletionsLimit?: number;
  nameDeletionsUsed?: number;
}

export interface Contact {
  id: string;
  phoneNumber: string;
  contactName: string;
  addedByUser: string;
  deviceId?: string;
  createdAt: string;
  frequency: number; // For counting occurrences
  isDeleted?: boolean;
  deletedAt?: string;
  deletedByPhone?: string;
}

export interface Ad {
  id: string;
  title: string;
  type: 'rewarded' | 'banner' | 'interstitial' | 'custom';
  source: 'admob' | 'private';
  mediaUrl?: string; // Image or video placeholder
  linkUrl?: string;  // Destination link
  duration: number;  // Duration in seconds (10, 15, 30)
  reward: number;    // Reward value
  status: boolean;   // Active / Inactive
  views: number;
  clicks: number;
}

export interface Transaction {
  id: string;
  userId: string;
  userPhone: string;
  action: string; // e.g., 'مشاهدة إعلان', 'عملية بحث', 'تحويل نقاط'
  amount: number; // e.g., +10, -20
  date: string;
}

export interface SystemSettings {
  dailySearchBalance: number;
  resultsLimit: number;
  pointsPerAd: number;
  advancedSearchCost: number;
  videoDuration: number; // 10, 15, 30, 0 (completed)
  advancedSearchEnabled: boolean;
  admobEnabled: boolean;
  admobRewarded: boolean;
  admobBanner: boolean;
  admobInterstitial: boolean;
  privateAdsEnabled: boolean;
  maxAccountsPerDevice: number;
  multiAccountDetection: boolean;
  logActivity: boolean;
  adminPhone: string;
  requirePhoneLogin: boolean; // التحكم بإلزامية تسجيل الدخول برقم الهاتف
  allowRevealRegistrarGlobal?: boolean; // السماح للجميع بكشف مسجل الرقم مجاناً
  allowDeleteNamesGlobal?: boolean;     // خيار إتاحة الحذف للجميع أو للمشتركين فقط
  googleAdSenseEnabled?: boolean;
  googleAdSenseClientId?: string;
  googleAdSenseSlotId?: string;
}

export interface AnalyticsStats {
  totalUsers: number;
  activeUsers: number;
  totalContacts: number;
  totalSearches: number;
  totalAdsViews: number;
  totalEarnings: number;
  topSearchedNumbers: { number: string; count: number }[];
}

export interface PlatformMetrics {
  base: {
    users: number;
    searches: number;
    contacts: number;
  };
  real: {
    users: number;
    searches: number;
    contacts: number;
  };
  total: {
    users: number;
    searches: number;
    contacts: number;
  };
}

export interface VipPlan {
  id: string;
  name: string;             // e.g. 'باقة البداية', 'باقة المحترفين', 'باقة النخبة'
  priceYmr: number;         // e.g. 2500 ريال يمني
  priceUsd: number;         // e.g. 5 دولار
  revealsCount: number;     // e.g. 10 أو 35 أو 100 عملية كشف مسجّل
  nameDeletionsCount?: number; // e.g. 1 أو 3 أو 10 عمليات حذف وتعديل أسماء
  planType?: 'bundle' | 'reveal_only' | 'delete_only';
  durationDays?: number;    // e.g. 30 يوم أو 0 لـ غير محدودة الصلاحية
  description: string;      // ما تقدمه الباقة بالتفصيل
  badge?: string;           // مثل 'الأكثر طلباً' أو 'الموصى بها'
  features: string[];       // قائمة المزايا
  isActive: boolean;
  order?: number;
}

export interface DeletedNameRecord {
  id: string;
  phoneNumber: string;
  contactName: string;
  deletedByPhone: string;
  deletedAt: string;
  contactId?: string;
  restored?: boolean;
}
