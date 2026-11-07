import fs from 'fs';
import path from 'path';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  deleteDoc, 
  updateDoc,
  writeBatch, 
  query, 
  where, 
  limit, 
  runTransaction,
  increment,
  getCountFromServer
} from 'firebase/firestore';
import { User, Contact, Ad, Transaction, SystemSettings, AnalyticsStats, PlatformMetrics, VipPlan, DeletedNameRecord } from './types';

// Load Firebase configuration dynamically from firebase-applet-config.json or use fallback
let firebaseConfig: any = {
  projectId: process.env.FIREBASE_PROJECT_ID || "master-carport-g71nt",
  appId: process.env.FIREBASE_APP_ID || "1:731432445526:web:f698b6f50b497cf99f3df7",
  apiKey: process.env.FIREBASE_API_KEY || "AIzaSyD7unLBRol7TacRbiDF2WJMnmk84n5W02c",
  authDomain: process.env.FIREBASE_AUTH_DOMAIN || "master-carport-g71nt.firebaseapp.com",
  firestoreDatabaseId: process.env.FIREBASE_DATABASE_ID || "ai-studio-maarouf-5ead1727-a3c3-4a44-8734-29127a39a53b",
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET || "master-carport-g71nt.firebasestorage.app",
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || "731432445526",
};

try {
  const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
  if (fs.existsSync(configPath)) {
    const loaded = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    firebaseConfig = { ...firebaseConfig, ...loaded };
  }
} catch (err) {
  console.error('Error loading firebase-applet-config.json:', err);
}

// Initialize Firebase SDK
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

// Default settings
const DEFAULT_SETTINGS: SystemSettings = {
  dailySearchBalance: 3,
  resultsLimit: 15,
  pointsPerAd: 10,
  advancedSearchCost: 30,
  videoDuration: 15,
  advancedSearchEnabled: true,
  admobEnabled: true,
  admobRewarded: true,
  admobBanner: true,
  admobInterstitial: true,
  privateAdsEnabled: true,
  maxAccountsPerDevice: 1,
  multiAccountDetection: true,
  logActivity: true,
  adminPhone: '774919194',
  requirePhoneLogin: true,
  allowRevealRegistrarGlobal: false,
  googleAdSenseEnabled: false,
  googleAdSenseClientId: '',
  googleAdSenseSlotId: ''
};

// Seed Ads starting purely at 0 views and clicks
const SEED_ADS: Ad[] = [
  {
    id: 'ad1',
    title: 'مجموعة المترب التجارية - فخامة الاستثمار العقاري بصنعاء',
    type: 'custom',
    source: 'private',
    mediaUrl: 'https://images.unsplash.com/photo-1582407947304-fd86f028f716?auto=format&fit=crop&w=800&q=80',
    linkUrl: 'https://example.com/motareb',
    duration: 15,
    reward: 10,
    status: true,
    views: 0,
    clicks: 0
  },
  {
    id: 'ad2',
    title: 'إعلان AdMob مكافأة: شاهد واحصل على +1 عملية بحث إضافية',
    type: 'rewarded',
    source: 'admob',
    duration: 15,
    reward: 1,
    status: true,
    views: 0,
    clicks: 0
  },
  {
    id: 'ad3',
    title: 'إعلان AdMob بيني: جودة عالية وتصفح أسرع',
    type: 'interstitial',
    source: 'admob',
    duration: 10,
    reward: 5,
    status: true,
    views: 0,
    clicks: 0
  },
  {
    id: 'ad4',
    title: 'عسل السدر اليمني الفاخر - شحن لجميع المحافظات والدول',
    type: 'custom',
    source: 'private',
    mediaUrl: 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?auto=format&fit=crop&w=800&q=80',
    linkUrl: 'https://example.com/yemen-honey',
    duration: 30,
    reward: 20,
    status: true,
    views: 0,
    clicks: 0
  }
];

export class DbService {
  private static isInitialized = false;
  private static initPromise: Promise<void> | null = null;

  /**
   * Initialize Firestore database with seed data if empty.
   */
  public static async init(): Promise<void> {
    if (this.isInitialized) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      console.log('[DbService] Initializing Firestore connection...');
      try {
        // 1. Check & Seed Settings
        const settingsDocRef = doc(db, 'settings', 'system_settings');
        const settingsDoc = await getDoc(settingsDocRef);
        if (!settingsDoc.exists()) {
          console.log('[DbService] Seeding default settings...');
          await setDoc(settingsDocRef, DEFAULT_SETTINGS);
        }

        // 2. Check & Seed Ads
        const adsSnap = await getDocs(query(collection(db, 'ads'), limit(1)));
        if (adsSnap.empty) {
          console.log('[DbService] Seeding default ads...');
          const batch = writeBatch(db);
          for (const ad of SEED_ADS) {
            const ref = doc(db, 'ads', ad.id);
            batch.set(ref, ad);
          }
          await batch.commit();
        }

        this.isInitialized = true;
        console.log('[DbService] Firestore initialization completed successfully!');
      } catch (err) {
        console.error('[DbService] Error initializing Firestore database:', err);
      } finally {
        this.initPromise = null;
      }
    })();

    return this.initPromise;
  }

  // --- Users Service ---
  public static async getUsers(): Promise<User[]> {
    const snap = await getDocs(collection(db, 'users'));
    return snap.docs.map(doc => doc.data() as User);
  }

  public static async getUsersByDeviceId(deviceId: string): Promise<User[]> {
    const q = query(collection(db, 'users'), where('deviceId', '==', deviceId));
    const snap = await getDocs(q);
    return snap.docs.map(doc => doc.data() as User);
  }

  public static async getUserByPhone(phone: string): Promise<User | undefined> {
    const q = query(collection(db, 'users'), where('phone', '==', phone), limit(1));
    const snap = await getDocs(q);
    if (snap.empty) return undefined;
    return snap.docs[0].data() as User;
  }

  public static async getUserById(id: string): Promise<User | undefined> {
    const docRef = doc(db, 'users', id);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) return undefined;
    return docSnap.data() as User;
  }

  public static async getUserByDeviceId(deviceId: string): Promise<User | undefined> {
    const q = query(collection(db, 'users'), where('deviceId', '==', deviceId), limit(1));
    const snap = await getDocs(q);
    if (snap.empty) return undefined;
    return snap.docs[0].data() as User;
  }

  public static async getOrCreateGuestUser(deviceId: string, deviceType?: string, browser?: string): Promise<User> {
    const cleanDeviceId = (deviceId || '').trim() || `dev_${Date.now()}`;
    const guestId = `guest_${cleanDeviceId}`;
    
    // Check if guest user already exists in db
    const existing = await this.getUserById(guestId);
    if (existing) {
      return existing;
    }

    const settings = await this.getSettings();
    const guestUser: User = {
      id: guestId,
      phone: `زائر_${cleanDeviceId.slice(-6)}`,
      deviceId: cleanDeviceId,
      deviceType: deviceType || 'جوال ذكي',
      browser: browser || 'تطبيق معروف',
      verifiedStatus: false,
      contactsSynced: false,
      searchBalance: settings.dailySearchBalance || 3,
      points: 0,
      createdAt: new Date().toISOString(),
      isActive: true,
      isGuest: true
    };

    await setDoc(doc(db, 'users', guestId), guestUser);
    return guestUser;
  }

  public static async saveUser(user: User): Promise<User> {
    await setDoc(doc(db, 'users', user.id), user, { merge: true });
    this.clearMetricsCache();
    return user;
  }

  public static async deleteUser(id: string): Promise<boolean> {
    await deleteDoc(doc(db, 'users', id));
    this.clearMetricsCache();
    return true;
  }

  // --- Contacts / Numbers Service ---
  public static async getContacts(): Promise<Contact[]> {
    const snap = await getDocs(collection(db, 'contacts'));
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Contact));
  }

  public static async getContactsLimited(limitVal: number = 100): Promise<Contact[]> {
    const q = query(collection(db, 'contacts'), limit(limitVal));
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Contact));
  }

  public static async getContactById(id: string): Promise<Contact | undefined> {
    const docRef = doc(db, 'contacts', id);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) return undefined;
    return { id: docSnap.id, ...docSnap.data() } as Contact;
  }

  public static async queryContactsByPhone(phone: string, limitVal: number = 100): Promise<Contact[]> {
    const q = query(
      collection(db, 'contacts'),
      where('phoneNumber', '>=', phone),
      where('phoneNumber', '<=', phone + '\uf8ff'),
      limit(limitVal)
    );
    const snap = await getDocs(q);
    return snap.docs.map(doc => doc.data() as Contact);
  }

  public static async queryContactsByName(name: string, limitVal: number = 100): Promise<Contact[]> {
    const q = query(
      collection(db, 'contacts'),
      where('contactName', '>=', name),
      where('contactName', '<=', name + '\uf8ff'),
      limit(limitVal)
    );
    const snap = await getDocs(q);
    return snap.docs.map(doc => doc.data() as Contact);
  }

  public static async bulkAddContacts(contacts: { phoneNumber: string; contactName: string }[]): Promise<number> {
    let addedCount = 0;
    let batch = writeBatch(db);
    let batchOperations = 0;

    for (const c of contacts) {
      if (!c.phoneNumber || !c.contactName) continue;

      const num = c.phoneNumber.toString().trim().replace(/[^\d+]/g, '');
      const trimmedName = c.contactName.toString().trim().substring(0, 80);

      // Deterministic admin ID mapping to prevent any duplication and support zero-read upserts
      const id = `c_admin_${num}`;
      const ref = doc(db, 'contacts', id);

      batch.set(ref, {
        id,
        phoneNumber: num,
        contactName: trimmedName,
        addedByUser: 'الرفع الجماعي للمدير',
        createdAt: new Date().toISOString(),
        frequency: 1
      }, { merge: true });

      batchOperations++;
      addedCount++;

      if (batchOperations >= 500) {
        await batch.commit();
        batch = writeBatch(db);
        batchOperations = 0;
      }
    }

    if (batchOperations > 0) {
      await batch.commit();
    }

    this.clearMetricsCache();
    return addedCount;
  }

  public static async searchNumbers(phoneNumber: string): Promise<{ contact: Contact; score: number }[]> {
    const cleanNumber = phoneNumber.trim().replace(/\s+/g, '');
    
    // Increment search count using highly scalable Firestore increment operator
    const searchDocRef = doc(db, 'searchesCount', cleanNumber);
    try {
      await setDoc(searchDocRef, { count: increment(1) }, { merge: true });
      void this.incrementSearchCounter();
    } catch (e) {
      console.warn('Increment search count failed:', e);
    }

    // Query Firestore for contacts whose phoneNumber starts with or matches cleanNumber
    const q = query(
      collection(db, 'contacts'),
      where('phoneNumber', '>=', cleanNumber),
      where('phoneNumber', '<=', cleanNumber + '\uf8ff'),
      limit(100)
    );
    const snap = await getDocs(q);

    const matches = snap.docs
      .map(doc => ({ id: doc.id, ...doc.data() } as Contact))
      .filter(c => !c.isDeleted);

    // If matches are few, or we want a general search, let's also fetch exactly matched numbers.
    return matches.map(c => {
      let score = c.frequency || 1;
      if (c.phoneNumber === cleanNumber) {
        score += 1000; // Prefer exact matches
      }
      return { contact: c, score };
    }).sort((a, b) => b.score - a.score);
  }

  /**
   * Performs an optimized, real-time contact synchronization with strict User & Device isolation.
   * - Scoped strictly to the specific user (userPhone) and device fingerprint (deviceId).
   * - Identifies existing contacts by (phoneNumber + normalized contactName).
   * - If a number was previously synced as "علي" and is still "علي" for this user/device: SKIPPED (no redundant write).
   * - If a number was previously synced as "علي" and the user renamed it to "جاهل": SAVED as a new contact entry.
   * - Never mixes or compares against contacts synced by other users.
   */
  public static async syncUserContacts(
    userPhone: string,
    contacts: { name: string; phone: string }[],
    deviceId?: string
  ): Promise<{ addedCount: number; skippedCount: number; totalReceived: number }> {
    const cleanUserPhone = userPhone.trim();
    const cleanDeviceId = (deviceId || '').trim();
    const yemeniRegex = /^(77|73|71|70|78)\d{7}$/;

    // 1. Fetch this user's existing contacts from Firestore to isolate strictly to this user
    const existingSignatures = new Set<string>();
    try {
      const q = query(
        collection(db, 'contacts'),
        where('addedByUser', '==', cleanUserPhone)
      );
      const snap = await getDocs(q);
      snap.docs.forEach(docSnap => {
        const d = docSnap.data() as Contact;
        if (!d.phoneNumber || !d.contactName) return;
        const pNum = d.phoneNumber.trim();
        const pName = d.contactName.trim().toLowerCase();
        const pDev = (d.deviceId || cleanDeviceId).trim();

        // Strict User + Device signature
        if (cleanDeviceId) {
          existingSignatures.add(`${cleanDeviceId}_${pNum}_${pName}`);
        }
        // Also add without deviceId to match contacts synced earlier before deviceId was stamped
        existingSignatures.add(`legacy_${pNum}_${pName}`);
      });
    } catch (err) {
      console.warn('[DbService] Error fetching existing contacts for diffing:', err);
    }

    let addedCount = 0;
    let skippedCount = 0;
    let batch = writeBatch(db);
    let batchOperations = 0;

    // To prevent processing duplicates within the same uploaded list
    const seenInRequest = new Set<string>();

    for (const item of contacts) {
      if (!item.name || !item.phone) continue;

      // Clean phone number
      let num = item.phone.trim().replace(/[^\d+]/g, '');
      if (num.startsWith('+967')) num = num.substring(4);
      if (num.startsWith('00967')) num = num.substring(5);
      if (num.startsWith('0')) num = num.substring(1);

      if (yemeniRegex.test(num)) {
        const trimmedName = item.name.trim().substring(0, 80);
        const normName = trimmedName.toLowerCase();
        const requestItemKey = `${num}_${normName}`;

        if (seenInRequest.has(requestItemKey)) continue;
        seenInRequest.add(requestItemKey);

        // Check if this exact number AND exact name was already synced for this user & device
        const exactDevSig = cleanDeviceId ? `${cleanDeviceId}_${num}_${normName}` : '';
        const exactLegacySig = `legacy_${num}_${normName}`;

        if ((exactDevSig && existingSignatures.has(exactDevSig)) || existingSignatures.has(exactLegacySig)) {
          // Exact duplicate: Same number AND same name for this user & device -> SKIP
          skippedCount++;
          continue;
        }

        // Otherwise: It is either a new number, OR the name was changed (e.g. from "علي" to "جاهل")
        // Save as a new contact entry!
        const id = `c_${cleanUserPhone}_${num}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const ref = doc(db, 'contacts', id);

        const contactObj: Contact = {
          id,
          phoneNumber: num,
          contactName: trimmedName,
          addedByUser: cleanUserPhone,
          deviceId: cleanDeviceId || undefined,
          createdAt: new Date().toISOString(),
          frequency: 1
        };

        batch.set(ref, contactObj);
        batchOperations++;
        addedCount++;

        // Add to existing signatures so same batch doesn't insert duplicate
        if (exactDevSig) existingSignatures.add(exactDevSig);
        existingSignatures.add(exactLegacySig);

        // Commit batch when it reaches 500 operations
        if (batchOperations >= 500) {
          await batch.commit();
          batch = writeBatch(db);
          batchOperations = 0;
        }
      }
    }

    if (batchOperations > 0) {
      await batch.commit();
    }

    console.log(`[DbService] Differential sync complete for user ${cleanUserPhone} on device ${cleanDeviceId}. Added: ${addedCount}, Skipped: ${skippedCount}`);
    this.clearMetricsCache();
    return { addedCount, skippedCount, totalReceived: contacts.length };
  }

  public static async addContact(contact: Omit<Contact, 'id' | 'createdAt' | 'frequency'> & { frequency?: number }): Promise<Contact> {
    const trimmedName = contact.contactName.trim();
    const q = query(
      collection(db, 'contacts'),
      where('phoneNumber', '==', contact.phoneNumber),
      where('contactName', '==', trimmedName),
      limit(1)
    );
    const existingSnap = await getDocs(q);

    if (!existingSnap.empty) {
      const existingDoc = existingSnap.docs[0];
      const data = existingDoc.data() as Contact;
      const updatedFreq = (data.frequency || 0) + 1;
      await updateDoc(existingDoc.ref, { frequency: updatedFreq });
      return { ...data, frequency: updatedFreq };
    }

    const id = `c_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newContact: Contact = {
      frequency: contact.frequency || 1,
      ...contact,
      id,
      createdAt: new Date().toISOString()
    };
    await setDoc(doc(db, 'contacts', id), newContact);
    return newContact;
  }

  public static async deleteContact(id: string): Promise<boolean> {
    await deleteDoc(doc(db, 'contacts', id));
    return true;
  }

  public static async updateContact(contact: Contact): Promise<Contact> {
    await setDoc(doc(db, 'contacts', contact.id), contact, { merge: true });
    return contact;
  }

  // --- Ads Service ---
  public static async getAds(): Promise<Ad[]> {
    const snap = await getDocs(collection(db, 'ads'));
    return snap.docs.map(doc => doc.data() as Ad);
  }

  public static async getAdById(id: string): Promise<Ad | undefined> {
    const docRef = doc(db, 'ads', id);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) return undefined;
    return docSnap.data() as Ad;
  }

  public static async saveAd(ad: Ad): Promise<Ad> {
    await setDoc(doc(db, 'ads', ad.id), ad, { merge: true });
    return ad;
  }

  public static async deleteAd(id: string): Promise<boolean> {
    await deleteDoc(doc(db, 'ads', id));
    return true;
  }

  // --- Transactions / Logs ---
  public static async getTransactions(): Promise<Transaction[]> {
    const snap = await getDocs(collection(db, 'transactions'));
    return snap.docs
      .map(doc => doc.data() as Transaction)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  public static async addTransaction(tx: Omit<Transaction, 'id' | 'date'>): Promise<Transaction> {
    const id = `t_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newTx: Transaction = {
      ...tx,
      id,
      date: new Date().toISOString()
    };
    await setDoc(doc(db, 'transactions', id), newTx);
    return newTx;
  }

  // --- Settings ---
  public static async getSettings(): Promise<SystemSettings> {
    const docRef = doc(db, 'settings', 'system_settings');
    const settingsDoc = await getDoc(docRef);
    if (!settingsDoc.exists()) {
      return { ...DEFAULT_SETTINGS };
    }
    const settings = settingsDoc.data() as SystemSettings;
    if (!settings.adminPhone) {
      settings.adminPhone = '774919194';
    }
    if (settings.requirePhoneLogin === undefined) {
      settings.requirePhoneLogin = true;
    }
    if (settings.allowRevealRegistrarGlobal === undefined) {
      settings.allowRevealRegistrarGlobal = false;
    }
    return settings;
  }

  public static async saveSettings(settings: SystemSettings): Promise<SystemSettings> {
    await setDoc(doc(db, 'settings', 'system_settings'), settings, { merge: true });
    return settings;
  }

  // --- Analytics & Stats ---
  public static async getAnalytics(): Promise<AnalyticsStats> {
    const users = await this.getUsers();
    
    // High-performance server-side count to completely avoid pulling contacts into memory
    const contactsCountSnap = await getCountFromServer(collection(db, 'contacts'));
    const totalContacts = contactsCountSnap.data().count;
    
    const ads = await this.getAds();

    // Active users
    const activeUsers = users.filter(u => u.isActive).length;

    // Get search counts (limited to 500 to prevent crash or latency under massive scale)
    const searchesCountSnap = await getDocs(query(collection(db, 'searchesCount'), limit(500)));
    const searchesCountData = searchesCountSnap.docs.map(doc => ({
      number: doc.id,
      count: doc.data().count || 0
    }));

    const totalSearches = searchesCountData.reduce((acc, curr) => acc + curr.count, 0);
    const totalAdsViews = ads.reduce((acc, curr) => acc + (curr.views || 0), 0);

    const totalEarnings = ads.reduce((acc, curr) => {
      const views = curr.views || 0;
      const clicks = curr.clicks || 0;
      const pricePerView = curr.source === 'admob' ? 0.0012 : 0.005;
      return acc + (views * pricePerView) + (clicks * 0.15);
    }, 0);

    const topSearched = searchesCountData
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      totalUsers: users.length,
      activeUsers,
      totalContacts,
      totalSearches,
      totalAdsViews,
      totalEarnings: Math.round(totalEarnings * 100) / 100,
      topSearchedNumbers: topSearched
    };
  }

  public static async resetAnalytics(target: 'all' | 'earnings' | 'searches' = 'all'): Promise<{ target: string; message: string }> {
    const batch = writeBatch(db);
    let message = '';

    if (target === 'all' || target === 'earnings') {
      // 1. Reset all ads views and clicks to 0
      const adsSnap = await getDocs(collection(db, 'ads'));
      adsSnap.docs.forEach(docSnap => {
        batch.update(docSnap.ref, { views: 0, clicks: 0 });
      });
      message = 'تم تصفير أرباح ومشاهدات ونقرات الإعلانات بالكامل بنجاح!';
    }

    if (target === 'all' || target === 'searches') {
      // 2. Delete all documents in searchesCount collection
      const searchesSnap = await getDocs(collection(db, 'searchesCount'));
      searchesSnap.docs.forEach(docSnap => {
        batch.delete(docSnap.ref);
      });

      // 3. Reset platform searches counter
      const platformStatsRef = doc(db, 'metrics', 'platform_stats');
      batch.set(platformStatsRef, { searches: 0, resetAt: new Date().toISOString() }, { merge: true });

      message = target === 'all'
        ? 'تم تصفير جميع الإحصائيات (أرباح الإعلانات + عمليات البحث) بنجاح!'
        : 'تم تصفير جميع سجلات وعمليات البحث بنجاح!';
    }

    await batch.commit();
    this.clearMetricsCache();
    return { target, message };
  }

  // --- Dynamic Platform Real-Time Metrics (Base + Real Firestore Data) ---
  private static metricsCache: { data: PlatformMetrics; timestamp: number } | null = null;

  public static clearMetricsCache(): void {
    this.metricsCache = null;
  }

  public static async incrementSearchCounter(): Promise<void> {
    try {
      const metricDocRef = doc(db, 'metrics', 'platform_stats');
      await setDoc(metricDocRef, {
        searches: increment(1),
        lastSearchAt: new Date().toISOString()
      }, { merge: true });

      if (this.metricsCache) {
        this.metricsCache.data.real.searches += 1;
        this.metricsCache.data.total.searches += 1;
      }
    } catch (err) {
      console.warn('[DbService] Error incrementing platform search counter:', err);
    }
  }

  public static async getPlatformMetrics(): Promise<PlatformMetrics> {
    const now = Date.now();
    // Cache for 2.5 seconds for instant response and efficient reads
    if (this.metricsCache && (now - this.metricsCache.timestamp) < 2500) {
      return this.metricsCache.data;
    }

    // Fixed Baseline Constants requested by user
    const BASE_USERS = 1248563;
    const BASE_SEARCHES = 12458963;
    const BASE_CONTACTS = 45231789;

    let realUsers = 0;
    let realContacts = 0;
    let realSearches = 0;

    // 1. Real Registered Users Count in Firestore
    try {
      const usersCountSnap = await getCountFromServer(collection(db, 'users'));
      realUsers = usersCountSnap.data().count;
    } catch (err) {
      console.warn('[DbService] Error counting users:', err);
    }

    // 2. Real Contacts / Caller IDs Count in Firestore
    try {
      const contactsCountSnap = await getCountFromServer(collection(db, 'contacts'));
      realContacts = contactsCountSnap.data().count;
    } catch (err) {
      console.warn('[DbService] Error counting contacts:', err);
    }

    // 3. Real Search operations count in Firestore
    try {
      const metricDoc = await getDoc(doc(db, 'metrics', 'platform_stats'));
      if (metricDoc.exists()) {
        realSearches = metricDoc.data().searches || 0;
      } else {
        const searchesCountSnap = await getCountFromServer(collection(db, 'searchesCount'));
        realSearches = searchesCountSnap.data().count;
        await setDoc(doc(db, 'metrics', 'platform_stats'), { 
          searches: realSearches,
          createdAt: new Date().toISOString()
        }, { merge: true });
      }
    } catch (err) {
      console.warn('[DbService] Error fetching platform search metrics:', err);
    }

    const metrics: PlatformMetrics = {
      base: {
        users: BASE_USERS,
        searches: BASE_SEARCHES,
        contacts: BASE_CONTACTS
      },
      real: {
        users: realUsers,
        searches: realSearches,
        contacts: realContacts
      },
      total: {
        users: BASE_USERS + realUsers,
        searches: BASE_SEARCHES + realSearches,
        contacts: BASE_CONTACTS + realContacts
      }
    };

    this.metricsCache = { data: metrics, timestamp: now };
    return metrics;
  }

  // --- VIP Plans Management ---
  public static readonly DEFAULT_VIP_PLANS: VipPlan[] = [
    {
      id: 'plan_starter',
      name: 'باقة البداية (Starter VIP)',
      priceYmr: 2500,
      priceUsd: 5,
      revealsCount: 10,
      nameDeletionsCount: 1,
      planType: 'bundle',
      durationDays: 30,
      description: 'كشف هوية ورقم مسجّل الاسم لـ 10 عمليات + حذف اسم واحد من قاعدة البيانات',
      badge: 'بداية مثالية',
      features: [
        '10 عمليات كشف هوية ورقم مسجّل الاسم',
        'حذف أو إخفاء اسم واحد (1) من قاعدة البيانات نهائياً',
        'معرفة توقيت وتاريخ حفظ جهة الاتصال',
        'دعم فني واستجابة عبر واتساب الإدارة'
      ],
      isActive: true,
      order: 1
    },
    {
      id: 'plan_pro',
      name: 'باقة المحترفين (Pro VIP)',
      priceYmr: 5000,
      priceUsd: 10,
      revealsCount: 35,
      nameDeletionsCount: 3,
      planType: 'bundle',
      durationDays: 60,
      description: 'كشف هوية ورقم مسجّل الاسم لـ 35 عملية + حذف حتى 3 أسماء غير مرغوبة',
      badge: 'الأكثر طلباً ⭐',
      features: [
        '35 عملية كشف لهويات وأرقام المسجلين',
        'حذف وإخفاء حتى 3 أسماء غير مرغوبة من نتائج البحث',
        'حظر إعادة مزامنة الأسماء المحذوفة للرقم',
        'صلاحية استخدام لمدة 60 يوماً مع أولوية المعالجة'
      ],
      isActive: true,
      order: 2
    },
    {
      id: 'plan_elite',
      name: 'باقة النخبة الشاملة (Elite VIP)',
      priceYmr: 12000,
      priceUsd: 20,
      revealsCount: 100,
      nameDeletionsCount: 10,
      planType: 'bundle',
      durationDays: 0,
      description: '100 عملية كشف + حذف 10 أسماء مع صلاحية مفتوحة ودعم VIP مباشر',
      badge: 'أفضل قيمة 👑',
      features: [
        '100 عملية كشف مسجّل الأرقام والأسماء',
        'حذف وإخفاء حتى 10 أسماء من قاعدة البيانات وسجل البحث',
        'بدون تاريخ انتهاء (صلاحية مفتوحة حتى نفاد الرصيد)',
        'خط دعم مباشر مخصص 24/7 عبر واتساب الإدارة'
      ],
      isActive: true,
      order: 3
    },
    {
      id: 'plan_delete_shield',
      name: 'باقة حماية الخصوصية وحذف الأسماء (Name Shield VIP)',
      priceYmr: 3500,
      priceUsd: 7,
      revealsCount: 0,
      nameDeletionsCount: 5,
      planType: 'delete_only',
      durationDays: 0,
      description: 'حذف وإخفاء 5 أسماء غير مرغوبة من قاعدة البيانات ومنع ظهورها في البحث نهائياً',
      badge: 'حماية الخصوصية 🛡️',
      features: [
        'حذف وإخفاء 5 أسماء من نتائج البحث للرقم',
        'حظر إعادة مزامنة الاسم للرقم مستقبلاً',
        'صلاحية مفتوحة ومستمرة دون قيود زمنية',
        'تأكيد الحذف وتطبيق فوري على مستوى النظام'
      ],
      isActive: true,
      order: 4
    }
  ];

  public static async getVipPlans(): Promise<VipPlan[]> {
    try {
      const snap = await getDocs(collection(db, 'vipPlans'));
      if (snap.empty) {
        // Seed default VIP plans into Firestore
        const batch = writeBatch(db);
        for (const plan of this.DEFAULT_VIP_PLANS) {
          batch.set(doc(db, 'vipPlans', plan.id), plan);
        }
        await batch.commit();
        return this.DEFAULT_VIP_PLANS;
      }
      const plans = snap.docs.map(d => ({ id: d.id, ...d.data() } as VipPlan));
      return plans.sort((a, b) => (a.order || 0) - (b.order || 0));
    } catch (err) {
      console.warn('[DbService] Error reading vipPlans from Firestore:', err);
      return this.DEFAULT_VIP_PLANS;
    }
  }

  public static async saveVipPlan(plan: VipPlan): Promise<VipPlan> {
    const planId = plan.id || `plan_${Date.now()}`;
    const cleanPlan: VipPlan = {
      ...plan,
      id: planId,
      name: (plan.name || 'باقة مخصصة').trim(),
      priceYmr: Number(plan.priceYmr) || 0,
      priceUsd: Number(plan.priceUsd) || 0,
      revealsCount: Number(plan.revealsCount) || 0,
      nameDeletionsCount: Number(plan.nameDeletionsCount) || 0,
      planType: plan.planType || 'bundle',
      durationDays: Number(plan.durationDays) || 0,
      description: (plan.description || '').trim(),
      badge: (plan.badge || '').trim(),
      features: Array.isArray(plan.features) ? plan.features.filter(Boolean) : [],
      isActive: plan.isActive !== false,
      order: Number(plan.order) || 1
    };
    await setDoc(doc(db, 'vipPlans', planId), cleanPlan, { merge: true });
    return cleanPlan;
  }

  public static async deleteVipPlan(id: string): Promise<boolean> {
    await deleteDoc(doc(db, 'vipPlans', id));
    return true;
  }

  // --- Contact Name Deletion & Restoration Service ---
  public static async deleteContactName(
    phoneNumber: string,
    contactName: string,
    deletedByUserPhone: string,
    contactId?: string
  ): Promise<{ success: boolean; deletedCount: number; recordId: string }> {
    const cleanNumber = (phoneNumber || '').trim().replace(/[^\d+]/g, '');
    const cleanName = (contactName || '').trim();
    const cleanUserPhone = (deletedByUserPhone || '').trim();
    const nowIso = new Date().toISOString();
    const recordId = `del_${cleanNumber}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    // 1. Mark matching contacts in Firestore as isDeleted = true
    let deletedCount = 0;
    const batch = writeBatch(db);

    if (contactId) {
      const directRef = doc(db, 'contacts', contactId);
      batch.update(directRef, {
        isDeleted: true,
        deletedAt: nowIso,
        deletedByPhone: cleanUserPhone
      });
      deletedCount++;
    }

    // Query for any other records with same phoneNumber and contactName
    const q = query(
      collection(db, 'contacts'),
      where('phoneNumber', '==', cleanNumber),
      where('contactName', '==', cleanName),
      limit(20)
    );
    const snap = await getDocs(q);
    for (const docSnap of snap.docs) {
      if (docSnap.id !== contactId) {
        batch.update(doc(db, 'contacts', docSnap.id), {
          isDeleted: true,
          deletedAt: nowIso,
          deletedByPhone: cleanUserPhone
        });
        deletedCount++;
      }
    }

    // 2. Create DeletedNameRecord in 'deleted_contacts' collection for audit and blacklist
    const record: DeletedNameRecord = {
      id: recordId,
      phoneNumber: cleanNumber,
      contactName: cleanName,
      deletedByPhone: cleanUserPhone,
      deletedAt: nowIso,
      contactId: contactId || (snap.docs[0]?.id || ''),
      restored: false
    };
    batch.set(doc(db, 'deleted_contacts', recordId), record);

    await batch.commit();
    this.clearMetricsCache();
    return { success: true, deletedCount: Math.max(1, deletedCount), recordId };
  }

  public static async getDeletedNameRecords(): Promise<DeletedNameRecord[]> {
    try {
      const snap = await getDocs(collection(db, 'deleted_contacts'));
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as DeletedNameRecord));
      return list.sort((a, b) => new Date(b.deletedAt).getTime() - new Date(a.deletedAt).getTime());
    } catch (err) {
      console.warn('[DbService] Error reading deleted_contacts:', err);
      return [];
    }
  }

  public static async restoreDeletedNameRecord(recordId: string): Promise<boolean> {
    const res = await this.bulkActionDeletedNameRecords([recordId], 'restore');
    return res.processedCount > 0;
  }

  public static async bulkActionDeletedNameRecords(
    recordIds: string[],
    action: 'restore' | 'rehide' | 'delete_log'
  ): Promise<{ success: boolean; processedCount: number }> {
    if (!Array.isArray(recordIds) || recordIds.length === 0) {
      return { success: false, processedCount: 0 };
    }

    let processedCount = 0;
    const nowIso = new Date().toISOString();

    for (const recordId of recordIds) {
      try {
        const recRef = doc(db, 'deleted_contacts', recordId);
        const recDoc = await getDoc(recRef);
        if (!recDoc.exists()) continue;
        const rec = recDoc.data() as DeletedNameRecord;

        const batch = writeBatch(db);

        if (action === 'delete_log') {
          batch.delete(recRef);
          await batch.commit();
          processedCount++;
          continue;
        }

        const isRestore = action === 'restore';
        batch.update(recRef, { restored: isRestore });

        const q = query(
          collection(db, 'contacts'),
          where('phoneNumber', '==', rec.phoneNumber),
          where('contactName', '==', rec.contactName),
          limit(25)
        );
        const snap = await getDocs(q);
        const updatedContactIds = new Set<string>();

        for (const d of snap.docs) {
          updatedContactIds.add(d.id);
          batch.update(doc(db, 'contacts', d.id), {
            isDeleted: !isRestore,
            deletedAt: isRestore ? null : (rec.deletedAt || nowIso),
            deletedByPhone: isRestore ? null : (rec.deletedByPhone || '')
          });
        }

        if (rec.contactId && !updatedContactIds.has(rec.contactId)) {
          const directSnap = await getDoc(doc(db, 'contacts', rec.contactId));
          if (directSnap.exists()) {
            batch.update(doc(db, 'contacts', rec.contactId), {
              isDeleted: !isRestore,
              deletedAt: isRestore ? null : (rec.deletedAt || nowIso),
              deletedByPhone: isRestore ? null : (rec.deletedByPhone || '')
            });
          }
        }

        await batch.commit();
        processedCount++;
      } catch (err) {
        console.error(`[DbService] Error processing deleted record ${recordId} (${action}):`, err);
      }
    }

    this.clearMetricsCache();
    return { success: processedCount > 0, processedCount };
  }
}

