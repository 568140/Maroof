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
import { User, Contact, Ad, Transaction, SystemSettings, AnalyticsStats } from './types';

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
  /**
   * Initialize Firestore database with seed data if empty.
   */
  public static async init(): Promise<void> {
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

      console.log('[DbService] Firestore initialization completed successfully!');
    } catch (err) {
      console.error('[DbService] Error initializing Firestore database:', err);
    }
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

  public static async saveUser(user: User): Promise<User> {
    await setDoc(doc(db, 'users', user.id), user, { merge: true });
    return user;
  }

  public static async deleteUser(id: string): Promise<boolean> {
    await deleteDoc(doc(db, 'users', id));
    return true;
  }

  // --- Contacts / Numbers Service ---
  public static async getContacts(): Promise<Contact[]> {
    const snap = await getDocs(collection(db, 'contacts'));
    return snap.docs.map(doc => doc.data() as Contact);
  }

  public static async getContactsLimited(limitVal: number = 100): Promise<Contact[]> {
    const q = query(collection(db, 'contacts'), limit(limitVal));
    const snap = await getDocs(q);
    return snap.docs.map(doc => doc.data() as Contact);
  }

  public static async getContactById(id: string): Promise<Contact | undefined> {
    const docRef = doc(db, 'contacts', id);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) return undefined;
    return docSnap.data() as Contact;
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

    return addedCount;
  }

  public static async searchNumbers(phoneNumber: string): Promise<{ contact: Contact; score: number }[]> {
    const cleanNumber = phoneNumber.trim().replace(/\s+/g, '');
    
    // Increment search count using highly scalable Firestore increment operator
    const searchDocRef = doc(db, 'searchesCount', cleanNumber);
    try {
      await setDoc(searchDocRef, { count: increment(1) }, { merge: true });
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

    const matches = snap.docs.map(doc => doc.data() as Contact);

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
   * Performs an optimized, real-time, highly-scalable contact synchronization.
   * Uses a stateless zero-read mapping to execute upserts directly with merge.
   * This completely avoids memory-heavy database scans and makes the sync immune to quota exhaustion.
   */
  public static async syncUserContacts(userPhone: string, contacts: { name: string; phone: string }[]): Promise<number> {
    const cleanUserPhone = userPhone.trim();
    const yemeniRegex = /^(77|73|71|70|78)\d{7}$/;
    
    let addedCount = 0;
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
        if (seenInRequest.has(num)) continue;
        seenInRequest.add(num);

        const trimmedName = item.name.trim().substring(0, 80);
        
        // High-performance stateless ID binding
        const id = `c_${cleanUserPhone}_${num}`;
        const ref = doc(db, 'contacts', id);

        const contactObj: Contact = {
          id,
          phoneNumber: num,
          contactName: trimmedName,
          addedByUser: cleanUserPhone,
          createdAt: new Date().toISOString(),
          frequency: 1
        };

        batch.set(ref, contactObj, { merge: true });
        batchOperations++;
        addedCount++;

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

    console.log(`[DbService] Stateless sync complete for user ${cleanUserPhone}. Processed: ${addedCount}`);
    return addedCount;
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

  public static async resetAnalytics(): Promise<void> {
    // 1. Reset all ads views and clicks to 0
    const adsSnap = await getDocs(collection(db, 'ads'));
    const batch = writeBatch(db);
    adsSnap.docs.forEach(docSnap => {
      batch.update(docSnap.ref, { views: 0, clicks: 0 });
    });

    // 2. Delete all documents in searchesCount collection
    const searchesSnap = await getDocs(collection(db, 'searchesCount'));
    searchesSnap.docs.forEach(docSnap => {
      batch.delete(docSnap.ref);
    });

    await batch.commit();
  }
}
