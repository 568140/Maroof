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
}

export interface Contact {
  id: string;
  phoneNumber: string;
  contactName: string;
  addedByUser: string;
  createdAt: string;
  frequency: number; // For counting occurrences
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

