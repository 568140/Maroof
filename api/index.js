// server.ts
import express from "express";
import path2 from "path";

// src/dbService.ts
import fs from "fs";
import path from "path";
import { initializeApp, getApps, getApp } from "firebase/app";
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
  increment,
  getCountFromServer
} from "firebase/firestore";
var firebaseConfig = {
  projectId: process.env.FIREBASE_PROJECT_ID || "master-carport-g71nt",
  appId: process.env.FIREBASE_APP_ID || "1:731432445526:web:f698b6f50b497cf99f3df7",
  apiKey: process.env.FIREBASE_API_KEY || "AIzaSyD7unLBRol7TacRbiDF2WJMnmk84n5W02c",
  authDomain: process.env.FIREBASE_AUTH_DOMAIN || "master-carport-g71nt.firebaseapp.com",
  firestoreDatabaseId: process.env.FIREBASE_DATABASE_ID || "ai-studio-maarouf-5ead1727-a3c3-4a44-8734-29127a39a53b",
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET || "master-carport-g71nt.firebasestorage.app",
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || "731432445526"
};
try {
  const configPath = path.join(process.cwd(), "firebase-applet-config.json");
  if (fs.existsSync(configPath)) {
    const loaded = JSON.parse(fs.readFileSync(configPath, "utf8"));
    firebaseConfig = { ...firebaseConfig, ...loaded };
  }
} catch (err) {
  console.error("Error loading firebase-applet-config.json:", err);
}
var app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
var db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
var DEFAULT_SETTINGS = {
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
  adminPhone: "774919194",
  googleAdSenseEnabled: false,
  googleAdSenseClientId: "",
  googleAdSenseSlotId: ""
};
var SEED_ADS = [
  {
    id: "ad1",
    title: "\u0645\u062C\u0645\u0648\u0639\u0629 \u0627\u0644\u0645\u062A\u0631\u0628 \u0627\u0644\u062A\u062C\u0627\u0631\u064A\u0629 - \u0641\u062E\u0627\u0645\u0629 \u0627\u0644\u0627\u0633\u062A\u062B\u0645\u0627\u0631 \u0627\u0644\u0639\u0642\u0627\u0631\u064A \u0628\u0635\u0646\u0639\u0627\u0621",
    type: "custom",
    source: "private",
    mediaUrl: "https://images.unsplash.com/photo-1582407947304-fd86f028f716?auto=format&fit=crop&w=800&q=80",
    linkUrl: "https://example.com/motareb",
    duration: 15,
    reward: 10,
    status: true,
    views: 0,
    clicks: 0
  },
  {
    id: "ad2",
    title: "\u0625\u0639\u0644\u0627\u0646 AdMob \u0645\u0643\u0627\u0641\u0623\u0629: \u0634\u0627\u0647\u062F \u0648\u0627\u062D\u0635\u0644 \u0639\u0644\u0649 +1 \u0639\u0645\u0644\u064A\u0629 \u0628\u062D\u062B \u0625\u0636\u0627\u0641\u064A\u0629",
    type: "rewarded",
    source: "admob",
    duration: 15,
    reward: 1,
    status: true,
    views: 0,
    clicks: 0
  },
  {
    id: "ad3",
    title: "\u0625\u0639\u0644\u0627\u0646 AdMob \u0628\u064A\u0646\u064A: \u062C\u0648\u062F\u0629 \u0639\u0627\u0644\u064A\u0629 \u0648\u062A\u0635\u0641\u062D \u0623\u0633\u0631\u0639",
    type: "interstitial",
    source: "admob",
    duration: 10,
    reward: 5,
    status: true,
    views: 0,
    clicks: 0
  },
  {
    id: "ad4",
    title: "\u0639\u0633\u0644 \u0627\u0644\u0633\u062F\u0631 \u0627\u0644\u064A\u0645\u0646\u064A \u0627\u0644\u0641\u0627\u062E\u0631 - \u0634\u062D\u0646 \u0644\u062C\u0645\u064A\u0639 \u0627\u0644\u0645\u062D\u0627\u0641\u0638\u0627\u062A \u0648\u0627\u0644\u062F\u0648\u0644",
    type: "custom",
    source: "private",
    mediaUrl: "https://images.unsplash.com/photo-1587049352846-4a222e784d38?auto=format&fit=crop&w=800&q=80",
    linkUrl: "https://example.com/yemen-honey",
    duration: 30,
    reward: 20,
    status: true,
    views: 0,
    clicks: 0
  }
];
var DbService = class {
  static {
    this.isInitialized = false;
  }
  static {
    this.initPromise = null;
  }
  /**
   * Initialize Firestore database with seed data if empty.
   */
  static async init() {
    if (this.isInitialized) return;
    if (this.initPromise) return this.initPromise;
    this.initPromise = (async () => {
      console.log("[DbService] Initializing Firestore connection...");
      try {
        const settingsDocRef = doc(db, "settings", "system_settings");
        const settingsDoc = await getDoc(settingsDocRef);
        if (!settingsDoc.exists()) {
          console.log("[DbService] Seeding default settings...");
          await setDoc(settingsDocRef, DEFAULT_SETTINGS);
        }
        const adsSnap = await getDocs(query(collection(db, "ads"), limit(1)));
        if (adsSnap.empty) {
          console.log("[DbService] Seeding default ads...");
          const batch = writeBatch(db);
          for (const ad of SEED_ADS) {
            const ref = doc(db, "ads", ad.id);
            batch.set(ref, ad);
          }
          await batch.commit();
        }
        this.isInitialized = true;
        console.log("[DbService] Firestore initialization completed successfully!");
      } catch (err) {
        console.error("[DbService] Error initializing Firestore database:", err);
      } finally {
        this.initPromise = null;
      }
    })();
    return this.initPromise;
  }
  // --- Users Service ---
  static async getUsers() {
    const snap = await getDocs(collection(db, "users"));
    return snap.docs.map((doc2) => doc2.data());
  }
  static async getUsersByDeviceId(deviceId) {
    const q = query(collection(db, "users"), where("deviceId", "==", deviceId));
    const snap = await getDocs(q);
    return snap.docs.map((doc2) => doc2.data());
  }
  static async getUserByPhone(phone) {
    const q = query(collection(db, "users"), where("phone", "==", phone), limit(1));
    const snap = await getDocs(q);
    if (snap.empty) return void 0;
    return snap.docs[0].data();
  }
  static async getUserById(id) {
    const docRef = doc(db, "users", id);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) return void 0;
    return docSnap.data();
  }
  static async getUserByDeviceId(deviceId) {
    const q = query(collection(db, "users"), where("deviceId", "==", deviceId), limit(1));
    const snap = await getDocs(q);
    if (snap.empty) return void 0;
    return snap.docs[0].data();
  }
  static async saveUser(user) {
    await setDoc(doc(db, "users", user.id), user, { merge: true });
    return user;
  }
  static async deleteUser(id) {
    await deleteDoc(doc(db, "users", id));
    return true;
  }
  // --- Contacts / Numbers Service ---
  static async getContacts() {
    const snap = await getDocs(collection(db, "contacts"));
    return snap.docs.map((doc2) => doc2.data());
  }
  static async getContactsLimited(limitVal = 100) {
    const q = query(collection(db, "contacts"), limit(limitVal));
    const snap = await getDocs(q);
    return snap.docs.map((doc2) => doc2.data());
  }
  static async getContactById(id) {
    const docRef = doc(db, "contacts", id);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) return void 0;
    return docSnap.data();
  }
  static async queryContactsByPhone(phone, limitVal = 100) {
    const q = query(
      collection(db, "contacts"),
      where("phoneNumber", ">=", phone),
      where("phoneNumber", "<=", phone + "\uF8FF"),
      limit(limitVal)
    );
    const snap = await getDocs(q);
    return snap.docs.map((doc2) => doc2.data());
  }
  static async queryContactsByName(name, limitVal = 100) {
    const q = query(
      collection(db, "contacts"),
      where("contactName", ">=", name),
      where("contactName", "<=", name + "\uF8FF"),
      limit(limitVal)
    );
    const snap = await getDocs(q);
    return snap.docs.map((doc2) => doc2.data());
  }
  static async bulkAddContacts(contacts) {
    let addedCount = 0;
    let batch = writeBatch(db);
    let batchOperations = 0;
    for (const c of contacts) {
      if (!c.phoneNumber || !c.contactName) continue;
      const num = c.phoneNumber.toString().trim().replace(/[^\d+]/g, "");
      const trimmedName = c.contactName.toString().trim().substring(0, 80);
      const id = `c_admin_${num}`;
      const ref = doc(db, "contacts", id);
      batch.set(ref, {
        id,
        phoneNumber: num,
        contactName: trimmedName,
        addedByUser: "\u0627\u0644\u0631\u0641\u0639 \u0627\u0644\u062C\u0645\u0627\u0639\u064A \u0644\u0644\u0645\u062F\u064A\u0631",
        createdAt: (/* @__PURE__ */ new Date()).toISOString(),
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
  static async searchNumbers(phoneNumber) {
    const cleanNumber = phoneNumber.trim().replace(/\s+/g, "");
    const searchDocRef = doc(db, "searchesCount", cleanNumber);
    try {
      await setDoc(searchDocRef, { count: increment(1) }, { merge: true });
    } catch (e) {
      console.warn("Increment search count failed:", e);
    }
    const q = query(
      collection(db, "contacts"),
      where("phoneNumber", ">=", cleanNumber),
      where("phoneNumber", "<=", cleanNumber + "\uF8FF"),
      limit(100)
    );
    const snap = await getDocs(q);
    const matches = snap.docs.map((doc2) => doc2.data());
    return matches.map((c) => {
      let score = c.frequency || 1;
      if (c.phoneNumber === cleanNumber) {
        score += 1e3;
      }
      return { contact: c, score };
    }).sort((a, b) => b.score - a.score);
  }
  /**
   * Performs an optimized, real-time, highly-scalable contact synchronization.
   * Uses a stateless zero-read mapping to execute upserts directly with merge.
   * This completely avoids memory-heavy database scans and makes the sync immune to quota exhaustion.
   */
  static async syncUserContacts(userPhone, contacts) {
    const cleanUserPhone = userPhone.trim();
    const yemeniRegex = /^(77|73|71|70|78)\d{7}$/;
    let addedCount = 0;
    let batch = writeBatch(db);
    let batchOperations = 0;
    const seenInRequest = /* @__PURE__ */ new Set();
    for (const item of contacts) {
      if (!item.name || !item.phone) continue;
      let num = item.phone.trim().replace(/[^\d+]/g, "");
      if (num.startsWith("+967")) num = num.substring(4);
      if (num.startsWith("00967")) num = num.substring(5);
      if (num.startsWith("0")) num = num.substring(1);
      if (yemeniRegex.test(num)) {
        if (seenInRequest.has(num)) continue;
        seenInRequest.add(num);
        const trimmedName = item.name.trim().substring(0, 80);
        const id = `c_${cleanUserPhone}_${num}`;
        const ref = doc(db, "contacts", id);
        const contactObj = {
          id,
          phoneNumber: num,
          contactName: trimmedName,
          addedByUser: cleanUserPhone,
          createdAt: (/* @__PURE__ */ new Date()).toISOString(),
          frequency: 1
        };
        batch.set(ref, contactObj, { merge: true });
        batchOperations++;
        addedCount++;
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
  static async addContact(contact) {
    const trimmedName = contact.contactName.trim();
    const q = query(
      collection(db, "contacts"),
      where("phoneNumber", "==", contact.phoneNumber),
      where("contactName", "==", trimmedName),
      limit(1)
    );
    const existingSnap = await getDocs(q);
    if (!existingSnap.empty) {
      const existingDoc = existingSnap.docs[0];
      const data = existingDoc.data();
      const updatedFreq = (data.frequency || 0) + 1;
      await updateDoc(existingDoc.ref, { frequency: updatedFreq });
      return { ...data, frequency: updatedFreq };
    }
    const id = `c_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newContact = {
      frequency: contact.frequency || 1,
      ...contact,
      id,
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    await setDoc(doc(db, "contacts", id), newContact);
    return newContact;
  }
  static async deleteContact(id) {
    await deleteDoc(doc(db, "contacts", id));
    return true;
  }
  static async updateContact(contact) {
    await setDoc(doc(db, "contacts", contact.id), contact, { merge: true });
    return contact;
  }
  // --- Ads Service ---
  static async getAds() {
    const snap = await getDocs(collection(db, "ads"));
    return snap.docs.map((doc2) => doc2.data());
  }
  static async getAdById(id) {
    const docRef = doc(db, "ads", id);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) return void 0;
    return docSnap.data();
  }
  static async saveAd(ad) {
    await setDoc(doc(db, "ads", ad.id), ad, { merge: true });
    return ad;
  }
  static async deleteAd(id) {
    await deleteDoc(doc(db, "ads", id));
    return true;
  }
  // --- Transactions / Logs ---
  static async getTransactions() {
    const snap = await getDocs(collection(db, "transactions"));
    return snap.docs.map((doc2) => doc2.data()).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }
  static async addTransaction(tx) {
    const id = `t_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newTx = {
      ...tx,
      id,
      date: (/* @__PURE__ */ new Date()).toISOString()
    };
    await setDoc(doc(db, "transactions", id), newTx);
    return newTx;
  }
  // --- Settings ---
  static async getSettings() {
    const docRef = doc(db, "settings", "system_settings");
    const settingsDoc = await getDoc(docRef);
    if (!settingsDoc.exists()) {
      return { ...DEFAULT_SETTINGS };
    }
    const settings = settingsDoc.data();
    if (!settings.adminPhone) {
      settings.adminPhone = "774919194";
    }
    return settings;
  }
  static async saveSettings(settings) {
    await setDoc(doc(db, "settings", "system_settings"), settings, { merge: true });
    return settings;
  }
  // --- Analytics & Stats ---
  static async getAnalytics() {
    const users = await this.getUsers();
    const contactsCountSnap = await getCountFromServer(collection(db, "contacts"));
    const totalContacts = contactsCountSnap.data().count;
    const ads = await this.getAds();
    const activeUsers = users.filter((u) => u.isActive).length;
    const searchesCountSnap = await getDocs(query(collection(db, "searchesCount"), limit(500)));
    const searchesCountData = searchesCountSnap.docs.map((doc2) => ({
      number: doc2.id,
      count: doc2.data().count || 0
    }));
    const totalSearches = searchesCountData.reduce((acc, curr) => acc + curr.count, 0);
    const totalAdsViews = ads.reduce((acc, curr) => acc + (curr.views || 0), 0);
    const totalEarnings = ads.reduce((acc, curr) => {
      const views = curr.views || 0;
      const clicks = curr.clicks || 0;
      const pricePerView = curr.source === "admob" ? 12e-4 : 5e-3;
      return acc + views * pricePerView + clicks * 0.15;
    }, 0);
    const topSearched = searchesCountData.sort((a, b) => b.count - a.count).slice(0, 5);
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
  static async resetAnalytics() {
    const adsSnap = await getDocs(collection(db, "ads"));
    const batch = writeBatch(db);
    adsSnap.docs.forEach((docSnap) => {
      batch.update(docSnap.ref, { views: 0, clicks: 0 });
    });
    const searchesSnap = await getDocs(collection(db, "searchesCount"));
    searchesSnap.docs.forEach((docSnap) => {
      batch.delete(docSnap.ref);
    });
    await batch.commit();
  }
};

// server.ts
var expressAppInstance = null;
function createExpressApp() {
  if (expressAppInstance) return expressAppInstance;
  const app3 = express();
  DbService.init().catch((err) => {
    console.error("[createExpressApp] Error in DbService.init:", err);
  });
  app3.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization, x-admin-token");
    if (req.method === "OPTIONS") {
      return res.status(200).end();
    }
    next();
  });
  app3.use((req, res, next) => {
    if (req.body && typeof req.body === "object") {
      return next();
    }
    express.json({ limit: "15mb" })(req, res, next);
  });
  app3.use((req, res, next) => {
    const matchedPath = req.headers["x-matched-path"] || "";
    if (matchedPath && matchedPath.startsWith("/api") && (req.url === "/api" || req.url === "/api/" || req.url === "")) {
      req.url = matchedPath;
    }
    if (req.url.startsWith("/api/api/")) {
      req.url = req.url.replace("/api/api/", "/api/");
    } else {
      const apiPrefixes = ["/auth", "/contacts", "/search", "/ads", "/settings", "/transactions", "/admin", "/user"];
      const isKnownApi = apiPrefixes.some((prefix) => req.path.startsWith(prefix));
      if (isKnownApi && !req.url.startsWith("/api")) {
        req.url = "/api" + (req.url.startsWith("/") ? req.url : "/" + req.url);
      }
    }
    if (req.path.startsWith("/api")) {
      console.log(`[API ${(/* @__PURE__ */ new Date()).toISOString()}] ${req.method} ${req.path}`);
    }
    next();
  });
  app3.get(["/api/health", "/api/status"], (req, res) => {
    res.json({
      status: "ok",
      service: "Maarouf API Server",
      message: "\u0627\u0644\u062E\u0627\u062F\u0645 \u064A\u0639\u0645\u0644 \u0628\u0646\u062C\u0627\u062D \u0648\u0645\u0633\u062A\u0639\u062F \u0644\u0627\u0633\u062A\u0642\u0628\u0627\u0644 \u0627\u0644\u0637\u0644\u0628\u0627\u062A",
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
  });
  app3.get("/api/settings", async (req, res) => {
    try {
      const settings = await DbService.getSettings();
      res.json(settings);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app3.get("/api/auth/me", async (req, res) => {
    const phone = req.query.phone;
    const deviceId = req.query.deviceId;
    if (!phone && !deviceId) {
      return res.status(400).json({ error: "\u0645\u0637\u0644\u0648\u0628 \u062A\u062D\u062F\u064A\u062F \u0631\u0642\u0645 \u0627\u0644\u0647\u0627\u062A\u0641 \u0623\u0648 \u0645\u0639\u0631\u0641 \u0627\u0644\u062C\u0647\u0627\u0632." });
    }
    try {
      let user;
      if (phone) user = await DbService.getUserByPhone(phone);
      if (!user && deviceId) user = await DbService.getUserByDeviceId(deviceId);
      if (!user) {
        return res.status(404).json({ error: "\u0627\u0644\u062D\u0633\u0627\u0628 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F." });
      }
      res.json(user);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  const isManagerPhone = (phone, adminPhoneSetting) => {
    if (!phone) return false;
    const clean = phone.trim().replace(/\s+/g, "");
    const adminClean = (adminPhoneSetting || "").trim().replace(/\s+/g, "");
    return clean === adminClean || clean === "774919194" || clean === "74919194" || clean.endsWith("74919194") || clean.endsWith("774919194") || adminClean.length > 0 && (adminClean.endsWith(clean) || clean.endsWith(adminClean));
  };
  app3.post("/api/auth/register", async (req, res) => {
    const { phone, deviceId, deviceType, browser } = req.body;
    if (!phone || !deviceId) {
      return res.status(400).json({ error: "\u062C\u0645\u064A\u0639 \u0627\u0644\u062D\u0642\u0648\u0644 \u0645\u0637\u0644\u0648\u0628\u0629: \u0627\u0644\u0647\u0627\u062A\u0641 \u0648\u0645\u0639\u0631\u0641 \u0627\u0644\u062C\u0647\u0627\u0632." });
    }
    const cleanPhone = phone.trim().replace(/\s+/g, "");
    const phoneRegex = /^7\d{7,8}$/;
    if (!phoneRegex.test(cleanPhone)) {
      return res.status(400).json({ error: "\u064A\u062C\u0628 \u0623\u0646 \u064A\u0643\u0648\u0646 \u0627\u0644\u0631\u0642\u0645 \u064A\u0645\u0646\u064A\u0627\u064B \u0635\u062D\u064A\u062D\u0627\u064B (\u0645\u0643\u0648\u0646 \u0645\u0646 8 \u0623\u0648 9 \u0623\u0631\u0642\u0627\u0645 \u064A\u0628\u062F\u0623 \u0628\u0640 7)." });
    }
    try {
      let existingUser = await DbService.getUserByPhone(cleanPhone);
      const settings = await DbService.getSettings();
      const isManager = isManagerPhone(cleanPhone, settings.adminPhone);
      if (existingUser) {
        existingUser.deviceId = deviceId;
        if (deviceType) existingUser.deviceType = deviceType;
        if (browser) existingUser.browser = browser;
        await DbService.saveUser(existingUser);
        return res.json({ message: "\u062A\u0645 \u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u062F\u062E\u0648\u0644 \u0628\u0646\u062C\u0627\u062D", user: existingUser });
      }
      if (!isManager && settings.multiAccountDetection) {
        const usersOnThisDevice = await DbService.getUsersByDeviceId(deviceId);
        if (usersOnThisDevice.length >= settings.maxAccountsPerDevice) {
          return res.status(400).json({
            error: `\u0639\u0630\u0631\u0627\u064B\u060C \u064A\u0648\u062C\u062F \u0628\u0627\u0644\u0641\u0639\u0644 \u062D\u0633\u0627\u0628 \u0645\u0631\u062A\u0628\u0637 \u0628\u0647\u0630\u0627 \u0627\u0644\u062C\u0647\u0627\u0632 (${usersOnThisDevice[0].phone}). \u064A\u0645\u0646\u0639 \u0625\u0646\u0634\u0627\u0621 \u0639\u062F\u0629 \u062D\u0633\u0627\u0628\u0627\u062A \u0645\u0646 \u0646\u0641\u0633 \u0627\u0644\u062C\u0647\u0627\u0632.`
          });
        }
      }
      const newUser = {
        id: `u_${Date.now()}`,
        phone: cleanPhone,
        deviceId,
        deviceType: deviceType || "\u0645\u062A\u0635\u0641\u062D \u0648\u064A\u0628",
        browser: browser || "Unknown",
        verifiedStatus: true,
        // Auto verified in Stage 1
        contactsSynced: false,
        // Must sync contacts to activate
        searchBalance: 0,
        // Gets balance after activation (syncing contacts)
        points: 100,
        // Gift on registration
        createdAt: (/* @__PURE__ */ new Date()).toISOString(),
        isActive: true
      };
      await DbService.saveUser(newUser);
      await DbService.addTransaction({
        userId: newUser.id,
        userPhone: newUser.phone,
        action: "\u0625\u0646\u0634\u0627\u0621 \u062D\u0633\u0627\u0628 \u062C\u062F\u064A\u062F \u0648\u0647\u062F\u064A\u0629 \u062A\u0631\u062D\u064A\u0628\u064A\u0629",
        amount: 100
      });
      res.json({ message: "\u062A\u0645 \u0625\u0646\u0634\u0627\u0621 \u0627\u0644\u062D\u0633\u0627\u0628 \u0628\u0646\u062C\u0627\u062D\u060C \u064A\u0631\u062C\u0649 \u0645\u0632\u0627\u0645\u0646\u0629 \u062C\u0647\u0627\u062A \u0627\u0644\u0627\u062A\u0635\u0627\u0644 \u0644\u062A\u0641\u0639\u064A\u0644 \u0627\u0644\u0628\u062D\u062B.", user: newUser });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app3.post("/api/contacts/sync", async (req, res) => {
    const { phone, contacts } = req.body;
    if (!phone || !contacts || !Array.isArray(contacts)) {
      return res.status(400).json({ error: "\u0627\u0644\u0645\u0639\u0637\u064A\u0627\u062A \u063A\u064A\u0631 \u0635\u0627\u0644\u062D\u0629. \u0645\u0637\u0644\u0648\u0628 \u0631\u0642\u0645 \u0627\u0644\u0647\u0627\u062A\u0641 \u0648\u0642\u0627\u0626\u0645\u0629 \u062C\u0647\u0627\u062A \u0627\u0644\u0627\u062A\u0635\u0627\u0644." });
    }
    try {
      const user = await DbService.getUserByPhone(phone);
      if (!user) {
        return res.status(404).json({ error: "\u0627\u0644\u062D\u0633\u0627\u0628 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F." });
      }
      const settings = await DbService.getSettings();
      let importedCount = 0;
      importedCount = await DbService.syncUserContacts(user.phone, contacts);
      const initialSyncBonus = 50;
      if (!user.contactsSynced) {
        user.contactsSynced = true;
        user.searchBalance = settings.dailySearchBalance;
        user.points += initialSyncBonus;
        await DbService.addTransaction({
          userId: user.id,
          userPhone: user.phone,
          action: "\u0645\u0632\u0627\u0645\u0646\u0629 \u062C\u0647\u0627\u062A \u0627\u0644\u0627\u062A\u0635\u0627\u0644 \u0648\u0645\u0643\u0627\u0641\u0623\u0629 \u062A\u0641\u0639\u064A\u0644 \u0627\u0644\u062D\u0633\u0627\u0628",
          amount: initialSyncBonus
        });
      } else {
        user.points += 10;
        await DbService.addTransaction({
          userId: user.id,
          userPhone: user.phone,
          action: "\u062A\u062D\u062F\u064A\u062B \u0648\u0645\u0632\u0627\u0645\u0646\u0629 \u062C\u0647\u0627\u062A \u0627\u0644\u0627\u062A\u0635\u0627\u0644",
          amount: 10
        });
      }
      await DbService.saveUser(user);
      res.json({
        message: "\u062A\u0645\u062A \u0645\u0632\u0627\u0645\u0646\u0629 \u062C\u0647\u0627\u062A \u0627\u0644\u0627\u062A\u0635\u0627\u0644 \u0628\u0646\u062C\u0627\u062D \u0648\u062A\u0641\u0639\u064A\u0644 \u0627\u0644\u062D\u0633\u0627\u0628!",
        user,
        importedCount
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app3.get("/api/search", async (req, res) => {
    const { query: query2, phone } = req.query;
    if (!query2 || !phone) {
      return res.status(400).json({ error: "\u0645\u0637\u0644\u0648\u0628 \u0643\u0644\u0645\u0629 \u0627\u0644\u0628\u062D\u062B \u0648\u0631\u0642\u0645 \u0627\u0644\u0647\u0627\u062A\u0641 \u0627\u0644\u0645\u0633\u062A\u0639\u0644\u0645." });
    }
    try {
      const user = await DbService.getUserByPhone(phone);
      if (!user) {
        return res.status(404).json({ error: "\u0627\u0644\u062D\u0633\u0627\u0628 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F." });
      }
      if (!user.isActive) {
        return res.status(403).json({ error: "\u0627\u0644\u062D\u0633\u0627\u0628 \u0645\u0639\u0637\u0644 \u0645\u0646 \u0642\u0628\u0644 \u0627\u0644\u0625\u062F\u0627\u0631\u0629." });
      }
      if (!user.contactsSynced) {
        return res.status(403).json({ error: "\u064A\u062C\u0628 \u062A\u0641\u0639\u064A\u0644 \u0627\u0644\u062D\u0633\u0627\u0628 \u0628\u0645\u0632\u0627\u0645\u0646\u0629 \u062C\u0647\u0627\u062A \u0627\u0644\u0627\u062A\u0635\u0627\u0644 \u0623\u0648\u0644\u0627\u064B \u0642\u0628\u0644 \u0627\u0633\u062A\u062E\u062F\u0627\u0645 \u0627\u0644\u0628\u062D\u062B." });
      }
      const settings = await DbService.getSettings();
      if (user.searchBalance <= 0) {
        return res.status(402).json({
          error: "\u0627\u0646\u062A\u0647\u0649 \u0631\u0635\u064A\u062F \u0627\u0644\u0628\u062D\u062B \u0627\u0644\u0645\u062C\u0627\u0646\u064A \u0627\u0644\u064A\u0648\u0645\u064A \u0627\u0644\u062E\u0627\u0635 \u0628\u0643!",
          outOfBalance: true
        });
      }
      const searchResults = await DbService.searchNumbers(query2);
      user.searchBalance -= 1;
      await DbService.saveUser(user);
      await DbService.addTransaction({
        userId: user.id,
        userPhone: user.phone,
        action: `\u0628\u062D\u062B \u0639\u0646 \u0631\u0642\u0645: ${query2}`,
        amount: -1
      });
      const limit2 = user.unlockedUnlimited ? 9999 : settings.resultsLimit;
      const finalResults = searchResults.slice(0, limit2);
      res.json({
        results: finalResults,
        searchBalance: user.searchBalance,
        totalFound: searchResults.length,
        unlockedUnlimited: !!user.unlockedUnlimited
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app3.get("/api/search/advanced", async (req, res) => {
    const { query: query2, phone } = req.query;
    if (!query2 || !phone) {
      return res.status(400).json({ error: "\u0645\u0637\u0644\u0648\u0628 \u0643\u0644\u0645\u0629 \u0627\u0644\u0628\u062D\u062B \u0648\u0631\u0642\u0645 \u0627\u0644\u0647\u0627\u062A\u0641 \u0627\u0644\u0645\u0633\u062A\u0639\u0644\u0645." });
    }
    try {
      const user = await DbService.getUserByPhone(phone);
      if (!user) {
        return res.status(404).json({ error: "\u0627\u0644\u062D\u0633\u0627\u0628 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F." });
      }
      if (!user.contactsSynced) {
        return res.status(403).json({ error: "\u064A\u062C\u0628 \u062A\u0641\u0639\u064A\u0644 \u0627\u0644\u062D\u0633\u0627\u0628 \u0628\u0645\u0632\u0627\u0645\u0646\u0629 \u062C\u0647\u0627\u062A \u0627\u0644\u0627\u062A\u0635\u0627\u0644 \u0623\u0648\u0644\u0627\u064B." });
      }
      const settings = await DbService.getSettings();
      if (!settings.advancedSearchEnabled) {
        return res.status(403).json({ error: "\u0627\u0644\u0628\u062D\u062B \u0627\u0644\u0645\u062A\u0642\u062F\u0645 \u063A\u064A\u0631 \u0645\u0641\u0639\u0644 \u062D\u0627\u0644\u064A\u0627\u064B \u0641\u064A \u0627\u0644\u0646\u0638\u0627\u0645." });
      }
      if (user.points < settings.advancedSearchCost) {
        return res.status(402).json({
          error: `\u0646\u0642\u0627\u0637\u0643 \u063A\u064A\u0631 \u0643\u0627\u0641\u064A\u0629 \u0644\u0644\u0628\u062D\u062B \u0627\u0644\u0645\u062A\u0642\u062F\u0645. \u0645\u0637\u0644\u0648\u0628 ${settings.advancedSearchCost} \u0646\u0642\u0637\u0629.`,
          insufficientPoints: true
        });
      }
      const searchResults = await DbService.searchNumbers(query2);
      user.points -= settings.advancedSearchCost;
      await DbService.saveUser(user);
      await DbService.addTransaction({
        userId: user.id,
        userPhone: user.phone,
        action: `\u0628\u062D\u062B \u0645\u062A\u0642\u062F\u0645 \u0639\u0646 \u0627\u0644\u0631\u0642\u0645: ${query2}`,
        amount: -settings.advancedSearchCost
      });
      res.json({
        results: searchResults,
        // unlimited or much higher
        points: user.points,
        totalFound: searchResults.length
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app3.get("/api/ads", async (req, res) => {
    try {
      const ads = (await DbService.getAds()).filter((ad) => ad.status);
      res.json(ads);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app3.post("/api/ads/view", async (req, res) => {
    const { adId, phone } = req.body;
    if (!adId || !phone) {
      return res.status(400).json({ error: "\u0645\u0637\u0644\u0648\u0628 \u0645\u0639\u0631\u0641 \u0627\u0644\u0625\u0639\u0644\u0627\u0646 \u0648\u0631\u0642\u0645 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645." });
    }
    try {
      const ad = await DbService.getAdById(adId);
      if (!ad) {
        return res.status(404).json({ error: "\u0627\u0644\u0625\u0639\u0644\u0627\u0646 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F." });
      }
      const user = await DbService.getUserByPhone(phone);
      if (!user) {
        return res.status(404).json({ error: "\u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F." });
      }
      const settings = await DbService.getSettings();
      ad.views += 1;
      await DbService.saveAd(ad);
      let rewardText = "";
      let rewardValue = 0;
      user.consecutiveAdsWatched = (user.consecutiveAdsWatched || 0) + 1;
      let unlockedMsg = "";
      if (user.consecutiveAdsWatched >= 6) {
        user.unlockedUnlimited = true;
        unlockedMsg = " \u0648\u0645\u0628\u0627\u0631\u0643! \u062A\u0645 \u062A\u0641\u0639\u064A\u0644 \u0645\u064A\u0632\u0629 \u0643\u0634\u0641 \u062C\u0645\u064A\u0639 \u0627\u0644\u0623\u0633\u0645\u0627\u0621 \u0648\u0627\u0644\u0628\u062D\u062B \u0627\u0644\u0634\u0627\u0645\u0644 \u0644\u0645\u0634\u0627\u0647\u062F\u062A\u0643 6 \u0625\u0639\u0644\u0627\u0646\u0627\u062A \u0645\u062A\u062A\u0627\u0644\u064A\u0629!";
      }
      if (ad.type === "rewarded") {
        user.searchBalance += ad.reward;
        rewardText = `\u0627\u0644\u062D\u0635\u0648\u0644 \u0639\u0644\u0649 +${ad.reward} \u0631\u0635\u064A\u062F \u0628\u062D\u062B \u0625\u0636\u0627\u0641\u064A` + unlockedMsg;
        rewardValue = ad.reward;
      } else {
        const pointsReward = ad.reward || settings.pointsPerAd;
        user.points += pointsReward;
        rewardText = `\u0627\u0644\u062D\u0635\u0648\u0644 \u0639\u0644\u0649 +${pointsReward} \u0646\u0642\u0637\u0629 \u0644\u0645\u0634\u0627\u0647\u062F\u0629 \u0627\u0644\u0625\u0639\u0644\u0627\u0646` + unlockedMsg;
        rewardValue = pointsReward;
      }
      await DbService.saveUser(user);
      await DbService.addTransaction({
        userId: user.id,
        userPhone: user.phone,
        action: user.consecutiveAdsWatched >= 6 ? `\u0645\u0634\u0627\u0647\u062F\u0629 \u0625\u0639\u0644\u0627\u0646 6 \u0645\u062A\u062A\u0627\u0644\u064A: ${ad.title} (\u0641\u062A\u062D \u0643\u0634\u0641 \u062C\u0645\u064A\u0639 \u0627\u0644\u0623\u0633\u0645\u0627\u0621 \u062A\u0644\u0642\u0627\u0626\u064A\u0627\u064B)` : `\u0645\u0634\u0627\u0647\u062F\u0629 \u0625\u0639\u0644\u0627\u0646: ${ad.title}`,
        amount: rewardValue
      });
      res.json({
        message: "\u062A\u0645 \u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u0645\u0634\u0627\u0647\u062F\u0629 \u0648\u0645\u0646\u062D \u0627\u0644\u0645\u0643\u0627\u0641\u0623\u0629 \u0628\u0646\u062C\u0627\u062D!",
        rewardText,
        user,
        ad
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app3.post("/api/ads/click", async (req, res) => {
    const { adId } = req.body;
    try {
      const ad = await DbService.getAdById(adId);
      if (!ad) {
        return res.status(404).json({ error: "\u0627\u0644\u0625\u0639\u0644\u0627\u0646 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F." });
      }
      ad.clicks += 1;
      await DbService.saveAd(ad);
      res.json({ message: "\u062A\u0645 \u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u0636\u063A\u0637\u0629 \u0628\u0646\u062C\u0627\u062D", ad });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app3.post("/api/user/convert-points", async (req, res) => {
    const { phone, option } = req.body;
    if (!phone || !option) {
      return res.status(400).json({ error: "\u0627\u0644\u0631\u0642\u0645 \u0648\u0646\u0648\u0639 \u0627\u0644\u062A\u062D\u0648\u064A\u0644 \u0645\u0637\u0644\u0648\u0628\u0627\u0646." });
    }
    try {
      const user = await DbService.getUserByPhone(phone);
      if (!user) {
        return res.status(404).json({ error: "\u0627\u0644\u062D\u0633\u0627\u0628 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F." });
      }
      let cost = 0;
      let searchesToAdd = 0;
      if (option === "5searches") {
        cost = 50;
        searchesToAdd = 5;
      } else if (option === "12searches") {
        cost = 100;
        searchesToAdd = 12;
      } else if (option === "reveal_unlimited") {
        cost = 80;
      } else {
        return res.status(400).json({ error: "\u062E\u064A\u0627\u0631 \u062A\u062D\u0648\u064A\u0644 \u063A\u064A\u0631 \u0635\u0627\u0644\u062D." });
      }
      if (user.points < cost) {
        return res.status(400).json({ error: `\u0639\u0630\u0631\u0627\u064B\u060C \u0631\u0635\u064A\u062F \u0646\u0642\u0627\u0637\u0643 \u063A\u064A\u0631 \u0643\u0627\u0641\u064D. \u062A\u062D\u062A\u0627\u062C \u0625\u0644\u0649 ${cost} \u0646\u0642\u0637\u0629 \u0644\u062A\u0646\u0641\u064A\u0630 \u0647\u0630\u0647 \u0627\u0644\u0639\u0645\u0644\u064A\u0629.` });
      }
      user.points -= cost;
      if (searchesToAdd > 0) {
        user.searchBalance += searchesToAdd;
      } else if (option === "reveal_unlimited") {
        user.unlockedUnlimited = true;
      }
      await DbService.saveUser(user);
      await DbService.addTransaction({
        userId: user.id,
        userPhone: user.phone,
        action: option === "reveal_unlimited" ? "\u062A\u062D\u0648\u064A\u0644 \u0646\u0642\u0627\u0637 \u0644\u062A\u0641\u0639\u064A\u0644 \u0643\u0634\u0641 \u062C\u0645\u064A\u0639 \u0627\u0644\u0623\u0633\u0645\u0627\u0621 \u0648\u062A\u062C\u0627\u0648\u0632 \u062D\u062F \u0627\u0644\u0640 15 \u0627\u0633\u0645\u0627\u064B" : `\u062A\u062D\u0648\u064A\u0644 \u0646\u0642\u0627\u0637 \u0644\u0634\u0631\u0627\u0621 \u0631\u0635\u064A\u062F \u0628\u062D\u062B \u0625\u0636\u0627\u0641\u064A (+${searchesToAdd} \u0639\u0645\u0644\u064A\u0629)`,
        amount: -cost
      });
      res.json({
        message: option === "reveal_unlimited" ? "\u062A\u0645 \u062E\u0635\u0645 \u0627\u0644\u0646\u0642\u0627\u0637 \u0648\u062A\u0641\u0639\u064A\u0644 \u0645\u064A\u0632\u0629 \u0643\u0634\u0641 \u062C\u0645\u064A\u0639 \u0627\u0644\u0623\u0633\u0645\u0627\u0621 \u0628\u0646\u062C\u0627\u062D \u0644\u0631\u0642\u0645\u0643!" : `\u062A\u0645 \u062A\u062D\u0648\u064A\u0644 \u0627\u0644\u0646\u0642\u0627\u0637 \u0648\u0634\u062D\u0646 \u0631\u0635\u064A\u062F\u0643 \u0628\u0640 +${searchesToAdd} \u0639\u0645\u0644\u064A\u0629 \u0628\u062D\u062B \u0628\u0646\u062C\u0627\u062D!`,
        user
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app3.get("/api/transactions", async (req, res) => {
    const phone = req.query.phone;
    if (!phone) {
      return res.status(400).json({ error: "\u0645\u0637\u0644\u0648\u0628 \u0631\u0642\u0645 \u0627\u0644\u0647\u0627\u062A\u0641." });
    }
    try {
      const user = await DbService.getUserByPhone(phone);
      if (!user) {
        return res.status(404).json({ error: "\u0627\u0644\u062D\u0633\u0627\u0628 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F." });
      }
      const txs = (await DbService.getTransactions()).filter((t) => t.userId === user.id);
      res.json(txs);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  const adminAuthMiddleware = async (req, res, next) => {
    const adminToken = req.headers["x-admin-token"];
    try {
      const adminPhoneSetting = (await DbService.getSettings()).adminPhone || "774919194";
      if (adminToken && (adminToken.includes("774282944trtr") || adminToken.includes("774919194") || adminToken.includes("74919194") || adminToken.startsWith(adminPhoneSetting))) {
        next();
        return;
      }
      return res.status(403).json({ error: "\u063A\u064A\u0631 \u0645\u0635\u0631\u062D \u0628\u0627\u0644\u062F\u062E\u0648\u0644 \u0644\u0644\u0648\u062D\u0629 \u0627\u0644\u062A\u062D\u0643\u0645. \u064A\u062A\u0637\u0644\u0628 \u0635\u0644\u0627\u062D\u064A\u0627\u062A \u0627\u0644\u0645\u062F\u064A\u0631 \u0627\u0644\u0639\u0627\u0645." });
    } catch (err) {
      return res.status(403).json({ error: "\u0641\u0634\u0644 \u0627\u0644\u062A\u062D\u0642\u0642 \u0645\u0646 \u0627\u0644\u0635\u0644\u0627\u062D\u064A\u0627\u062A \u0627\u0644\u0625\u062F\u0627\u0631\u064A\u0629." });
    }
  };
  app3.get("/api/admin/stats", adminAuthMiddleware, async (req, res) => {
    try {
      res.json(await DbService.getAnalytics());
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app3.post("/api/admin/reset-stats", adminAuthMiddleware, async (req, res) => {
    try {
      await DbService.resetAnalytics();
      res.json({ message: "\u062A\u0645 \u0625\u0639\u0627\u062F\u0629 \u0636\u0628\u0637 \u062C\u0645\u064A\u0639 \u0627\u0644\u0625\u062D\u0635\u0627\u0626\u064A\u0627\u062A\u060C \u0633\u062C\u0644\u0627\u062A \u0627\u0644\u0628\u062D\u062B \u0648\u0623\u0631\u0628\u0627\u062D \u0627\u0644\u0625\u0639\u0644\u0627\u0646\u0627\u062A \u0625\u0644\u0649 \u0627\u0644\u0635\u0641\u0631 \u0628\u0646\u062C\u0627\u062D!" });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app3.get("/api/admin/users", adminAuthMiddleware, async (req, res) => {
    try {
      res.json(await DbService.getUsers());
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app3.post("/api/admin/users/toggle-status", adminAuthMiddleware, async (req, res) => {
    const { userId } = req.body;
    try {
      const user = await DbService.getUserById(userId);
      if (!user) return res.status(404).json({ error: "\u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F." });
      user.isActive = !user.isActive;
      await DbService.saveUser(user);
      res.json({ message: `\u062A\u0645 ${user.isActive ? "\u062A\u0641\u0639\u064A\u0644" : "\u062A\u0639\u0637\u064A\u0644"} \u062D\u0633\u0627\u0628 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u0628\u0646\u062C\u0627\u062D.`, user });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app3.post("/api/admin/users/grant-points", adminAuthMiddleware, async (req, res) => {
    const { userId, amount } = req.body;
    try {
      const user = await DbService.getUserById(userId);
      if (!user) return res.status(404).json({ error: "\u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F." });
      user.points += Number(amount);
      await DbService.saveUser(user);
      await DbService.addTransaction({
        userId: user.id,
        userPhone: user.phone,
        action: "\u0645\u0646\u062D \u0646\u0642\u0627\u0637 \u0625\u062F\u0627\u0631\u064A\u0629 \u0645\u0646 \u0644\u0648\u062D\u0629 \u0627\u0644\u062A\u062D\u0643\u0645",
        amount: Number(amount)
      });
      res.json({ message: "\u062A\u0645 \u0645\u0646\u062D \u0627\u0644\u0646\u0642\u0627\u0637 \u0628\u0646\u062C\u0627\u062D.", user });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app3.delete("/api/admin/users/:id", adminAuthMiddleware, async (req, res) => {
    try {
      const success = await DbService.deleteUser(req.params.id);
      if (success) {
        res.json({ message: "\u062A\u0645 \u062D\u0630\u0641 \u062D\u0633\u0627\u0628 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u0628\u0646\u062C\u0627\u062D." });
      } else {
        res.status(404).json({ error: "\u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F." });
      }
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app3.get("/api/admin/contacts", adminAuthMiddleware, async (req, res) => {
    const { search } = req.query;
    try {
      if (search) {
        const cleanSearch = search.trim();
        let contacts2 = [];
        if (/^\d+$/.test(cleanSearch)) {
          contacts2 = await DbService.queryContactsByPhone(cleanSearch, 100);
        } else {
          contacts2 = await DbService.queryContactsByName(cleanSearch, 100);
        }
        return res.json(contacts2);
      }
      const contacts = await DbService.getContactsLimited(100);
      res.json(contacts);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app3.post("/api/admin/contacts", adminAuthMiddleware, async (req, res) => {
    const { phoneNumber, contactName } = req.body;
    if (!phoneNumber || !contactName) {
      return res.status(400).json({ error: "\u0645\u0637\u0644\u0648\u0628 \u0631\u0642\u0645 \u0627\u0644\u0647\u0627\u062A\u0641 \u0648\u0627\u0644\u0627\u0633\u0645." });
    }
    try {
      const cleanNum = phoneNumber.trim().replace(/\s+/g, "");
      const contact = await DbService.addContact({
        phoneNumber: cleanNum,
        contactName: contactName.trim(),
        addedByUser: "\u0627\u0644\u0625\u062F\u0627\u0631\u0629"
      });
      res.json({ message: "\u062A\u0645 \u0625\u0636\u0627\u0641\u0629 \u062C\u0647\u0629 \u0627\u0644\u0627\u062A\u0635\u0627\u0644 \u064A\u062F\u0648\u064A\u0627\u064B \u0628\u0646\u062C\u0627\u062D \u0644\u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A.", contact });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app3.post("/api/admin/contacts/edit", adminAuthMiddleware, async (req, res) => {
    const { id, phoneNumber, contactName, frequency } = req.body;
    if (!id || !phoneNumber || !contactName) {
      return res.status(400).json({ error: "\u0645\u0637\u0644\u0648\u0628 \u0645\u0639\u0631\u0641 \u062C\u0647\u0629 \u0627\u0644\u0627\u062A\u0635\u0627\u0644\u060C \u0631\u0642\u0645 \u0627\u0644\u0647\u0627\u062A\u0641\u060C \u0648\u0627\u0644\u0627\u0633\u0645 \u0644\u062A\u062D\u062F\u064A\u062B\u0647." });
    }
    try {
      const contact = await DbService.getContactById(id);
      if (!contact) {
        return res.status(404).json({ error: "\u062C\u0647\u0629 \u0627\u0644\u0627\u062A\u0635\u0627\u0644 \u0627\u0644\u0645\u0637\u0644\u0648\u0628\u0629 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F\u0629 \u0641\u064A \u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A." });
      }
      contact.phoneNumber = phoneNumber.trim().replace(/\s+/g, "");
      contact.contactName = contactName.trim();
      if (frequency !== void 0) {
        contact.frequency = Number(frequency) || 1;
      }
      await DbService.updateContact(contact);
      res.json({ message: "\u062A\u0645 \u062A\u0639\u062F\u064A\u0644 \u062C\u0647\u0629 \u0627\u0644\u0627\u062A\u0635\u0627\u0644 \u0648\u062A\u062D\u062F\u064A\u062B\u0647\u0627 \u0641\u064A \u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0628\u0646\u062C\u0627\u062D.", contact });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app3.delete("/api/admin/contacts/:id", adminAuthMiddleware, async (req, res) => {
    try {
      const success = await DbService.deleteContact(req.params.id);
      if (success) {
        res.json({ message: "\u062A\u0645 \u062D\u0630\u0641 \u0627\u0644\u0631\u0642\u0645 \u0648\u0627\u0644\u0627\u0633\u0645 \u0645\u0646 \u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0628\u0646\u062C\u0627\u062D." });
      } else {
        res.status(404).json({ error: "\u062C\u0647\u0629 \u0627\u0644\u0627\u062A\u0635\u0627\u0644 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F\u0629." });
      }
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app3.post("/api/admin/contacts/bulk", adminAuthMiddleware, async (req, res) => {
    const { contacts } = req.body;
    if (!contacts || !Array.isArray(contacts)) {
      return res.status(400).json({ error: "\u0645\u0637\u0644\u0648\u0628 \u0625\u062F\u062E\u0627\u0644 \u0645\u0635\u0641\u0648\u0641\u0629 \u0645\u0646 \u062C\u0647\u0627\u062A \u0627\u0644\u0627\u062A\u0635\u0627\u0644." });
    }
    try {
      const formattedContacts = contacts.filter((c) => c && (c.phoneNumber || c.phone) && (c.contactName || c.name)).map((c) => ({
        phoneNumber: (c.phoneNumber || c.phone).toString(),
        contactName: (c.contactName || c.name).toString()
      }));
      const addedCount = await DbService.bulkAddContacts(formattedContacts);
      res.json({ message: `\u062A\u0645 \u0627\u0633\u062A\u064A\u0631\u0627\u062F ${addedCount} \u0627\u0633\u0645\u0627\u064B \u0628\u0646\u062C\u0627\u062D \u0625\u0644\u0649 \u0642\u0627\u0639\u062F\u0629 \u0628\u064A\u0627\u0646\u0627\u062A \u0645\u0639\u0631\u0648\u0641 \u0628\u0646\u062C\u0627\u062D.` });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app3.post("/api/admin/ads", adminAuthMiddleware, async (req, res) => {
    const { title, type, source, mediaUrl, linkUrl, duration, reward } = req.body;
    if (!title || !type || !source) {
      return res.status(400).json({ error: "\u0627\u0644\u062D\u0642\u0648\u0644 \u0627\u0644\u0623\u0633\u0627\u0633\u064A\u0629 \u0645\u0637\u0644\u0648\u0628\u0629: \u0627\u0644\u0639\u0646\u0648\u0627\u0646\u060C \u0627\u0644\u0646\u0648\u0639\u060C \u0648\u0627\u0644\u0645\u0635\u062F\u0631." });
    }
    try {
      const newAd = {
        id: `ad_${Date.now()}`,
        title,
        type,
        source,
        mediaUrl,
        linkUrl,
        duration: Number(duration) || 15,
        reward: Number(reward) || 10,
        status: true,
        views: 0,
        clicks: 0
      };
      await DbService.saveAd(newAd);
      res.json({ message: "\u062A\u0645 \u0625\u0636\u0627\u0641\u0629 \u0627\u0644\u0625\u0639\u0644\u0627\u0646 \u0628\u0646\u062C\u0627\u062D.", ad: newAd });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app3.post("/api/admin/ads/toggle", adminAuthMiddleware, async (req, res) => {
    const { adId } = req.body;
    try {
      const ad = await DbService.getAdById(adId);
      if (!ad) return res.status(404).json({ error: "\u0627\u0644\u0625\u0639\u0644\u0627\u0646 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F." });
      ad.status = !ad.status;
      await DbService.saveAd(ad);
      res.json({ message: `\u062A\u0645 ${ad.status ? "\u062A\u0641\u0639\u064A\u0644" : "\u0625\u064A\u0642\u0627\u0641"} \u0627\u0644\u0625\u0639\u0644\u0627\u0646 \u0628\u0646\u062C\u0627\u062D.`, ad });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app3.delete("/api/admin/ads/:id", adminAuthMiddleware, async (req, res) => {
    try {
      const success = await DbService.deleteAd(req.params.id);
      if (success) {
        res.json({ message: "\u062A\u0645 \u062D\u0630\u0641 \u0627\u0644\u0625\u0639\u0644\u0627\u0646 \u0628\u0646\u062C\u0627\u062D." });
      } else {
        res.status(404).json({ error: "\u0627\u0644\u0625\u0639\u0644\u0627\u0646 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F." });
      }
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app3.post("/api/admin/settings", adminAuthMiddleware, async (req, res) => {
    const newSettings = req.body;
    try {
      await DbService.saveSettings(newSettings);
      res.json({ message: "\u062A\u0645 \u062A\u062D\u062F\u064A\u062B \u0625\u0639\u062F\u0627\u062F\u0627\u062A \u0646\u0638\u0627\u0645 \u0645\u0639\u0631\u0648\u0641 \u0628\u0646\u062C\u0627\u062D \u062F\u0648\u0646 \u0627\u0644\u062D\u0627\u062C\u0629 \u0644\u0625\u0639\u0627\u062F\u0629 \u0627\u0644\u0628\u0631\u0645\u062C\u0629.", settings: newSettings });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app3.all("/api/*", (req, res) => {
    res.status(404).json({
      error: `\u0627\u0644\u0645\u0633\u0627\u0631 \u0627\u0644\u0628\u0631\u0645\u062C\u064A \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F: ${req.method} ${req.originalUrl || req.url}`,
      hint: "\u062A\u062D\u0642\u0642 \u0645\u0646 \u0635\u062D\u0629 \u0627\u0644\u0645\u0633\u0627\u0631 \u0623\u0648 \u0625\u0639\u062F\u0627\u062F\u0627\u062A \u0627\u0644\u062A\u0648\u062C\u064A\u0647"
    });
  });
  app3.use((err, req, res, next) => {
    console.error("[Express Global Error]:", err);
    if (!res.headersSent) {
      res.status(500).json({
        error: "\u062E\u0637\u0623 \u0641\u064A \u0645\u0639\u0627\u0644\u062C\u0629 \u0637\u0644\u0628 \u0627\u0644\u062E\u0627\u062F\u0645: " + (err?.message || "Unknown error"),
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      });
    }
  });
  expressAppInstance = app3;
  return app3;
}
async function startServer() {
  const PORT = 3e3;
  const app3 = createExpressApp();
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app3.use(vite.middlewares);
  } else {
    const distPath = path2.join(process.cwd(), "dist");
    app3.use(express.static(distPath));
    app3.get("*", (req, res) => {
      res.sendFile(path2.join(distPath, "index.html"));
    });
  }
  app3.listen(PORT, "0.0.0.0", () => {
    console.log(`[Maarouf Full-Stack Server] Server is running on http://0.0.0.0:${PORT}`);
  });
}
var isServerless = Boolean(
  process.env.VERCEL || process.env.VERCEL_ENV || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.LAMBDA_TASK_ROOT || process.env.NETLIFY
);
var isDirectRun = Boolean(
  process.argv[1] && (process.argv[1].endsWith("server.ts") || process.argv[1].endsWith("server.cjs") || process.argv[1].endsWith("server.js"))
);
if (!isServerless && isDirectRun) {
  startServer().catch((err) => {
    console.error("[Maarouf Server] Failed to start:", err);
  });
}

// api/index.ts
var app2 = createExpressApp();
var index_default = app2;
export {
  index_default as default
};
