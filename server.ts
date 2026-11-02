import express from 'express';
import path from 'path';
import { DbService } from './src/dbService';
import { User, Contact, Ad, Transaction, SystemSettings } from './src/types';

let expressAppInstance: express.Express | null = null;

export async function createExpressApp() {
  if (expressAppInstance) return expressAppInstance;

  const app = express();

  // Initialize Firestore database connections and push initial seed data in background
  DbService.init().catch(err => {
    console.error('[createExpressApp] Error in DbService.init:', err);
  });

  // CORS Middleware for web and serverless hosting environments
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, x-admin-token');
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }
    next();
  });

  // Express JSON Body Parser (increased limit for contacts sync payload)
  app.use(express.json({ limit: '15mb' }));

  // Normalize incoming URLs to handle Vercel rewrites and path variations
  app.use((req, res, next) => {
    // Fix duplicate /api/api/ prefix if present
    if (req.url.startsWith('/api/api/')) {
      req.url = req.url.replace('/api/api/', '/api/');
    } else {
      // Only prefix with /api if this is specifically an API route called without /api
      const apiPrefixes = ['/auth', '/contacts', '/search', '/ads', '/settings', '/transactions', '/admin', '/user'];
      const isKnownApi = apiPrefixes.some(prefix => req.path.startsWith(prefix));
      if (isKnownApi && !req.url.startsWith('/api')) {
        req.url = '/api' + (req.url.startsWith('/') ? req.url : '/' + req.url);
      }
    }

    if (req.path.startsWith('/api')) {
      console.log(`[API ${new Date().toISOString()}] ${req.method} ${req.path}`);
    }
    next();
  });

  // Health and Diagnostic endpoints
  app.get(['/api/health', '/api/status'], (req, res) => {
    res.json({
      status: 'ok',
      service: 'Maarouf API Server',
      message: 'الخادم يعمل بنجاح ومستعد لاستقبال الطلبات',
      timestamp: new Date().toISOString()
    });
  });

  // --- API ROUTES ---

  // Get current system settings
  app.get('/api/settings', async (req, res) => {
    try {
      const settings = await DbService.getSettings();
      res.json(settings);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // User Profile
  app.get('/api/auth/me', async (req, res) => {
    const phone = req.query.phone as string;
    const deviceId = req.query.deviceId as string;

    if (!phone && !deviceId) {
      return res.status(400).json({ error: 'مطلوب تحديد رقم الهاتف أو معرف الجهاز.' });
    }

    try {
      let user: User | undefined;
      if (phone) user = await DbService.getUserByPhone(phone);
      if (!user && deviceId) user = await DbService.getUserByDeviceId(deviceId);

      if (!user) {
        return res.status(404).json({ error: 'الحساب غير موجود.' });
      }

      res.json(user);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

// Helper to check manager phone
const isManagerPhone = (phone: string, adminPhoneSetting?: string) => {
  if (!phone) return false;
  const clean = phone.trim().replace(/\s+/g, '');
  const adminClean = (adminPhoneSetting || '').trim().replace(/\s+/g, '');
  return clean === adminClean || 
         clean === '774919194' || 
         clean === '74919194' || 
         clean.endsWith('74919194') || 
         clean.endsWith('774919194') ||
         (adminClean.length > 0 && (adminClean.endsWith(clean) || clean.endsWith(adminClean)));
};

  // Register / Login (Stage 1: without SMS verification)
  app.post('/api/auth/register', async (req, res) => {
    const { phone, deviceId, deviceType, browser } = req.body;

    if (!phone || !deviceId) {
      return res.status(400).json({ error: 'جميع الحقول مطلوبة: الهاتف ومعرف الجهاز.' });
    }

    // Yemeni Phone Validation (8 or 9 digits starting with 7)
    const cleanPhone = phone.trim().replace(/\s+/g, '');
    const phoneRegex = /^7\d{7,8}$/;
    if (!phoneRegex.test(cleanPhone)) {
      return res.status(400).json({ error: 'يجب أن يكون الرقم يمنياً صحيحاً (مكون من 8 أو 9 أرقام يبدأ بـ 7).' });
    }

    try {
      let existingUser = await DbService.getUserByPhone(cleanPhone);
      const settings = await DbService.getSettings();
      const isManager = isManagerPhone(cleanPhone, settings.adminPhone);

      if (existingUser) {
        // Update device binding on login seamlessly so users are never locked out
        existingUser.deviceId = deviceId;
        if (deviceType) existingUser.deviceType = deviceType;
        if (browser) existingUser.browser = browser;
        await DbService.saveUser(existingUser);

        return res.json({ message: 'تم تسجيل الدخول بنجاح', user: existingUser });
      }

      // Check device binding limits (Prevent multiple accounts on same device), unless it is the manager
      if (!isManager && settings.multiAccountDetection) {
        const usersOnThisDevice = await DbService.getUsersByDeviceId(deviceId);
        if (usersOnThisDevice.length >= settings.maxAccountsPerDevice) {
          return res.status(400).json({
            error: `عذراً، يوجد بالفعل حساب مرتبط بهذا الجهاز (${usersOnThisDevice[0].phone}). يمنع إنشاء عدة حسابات من نفس الجهاز.`
          });
        }
      }

      // Register new user
      const newUser: User = {
        id: `u_${Date.now()}`,
        phone: cleanPhone,
        deviceId,
        deviceType: deviceType || 'متصفح ويب',
        browser: browser || 'Unknown',
        verifiedStatus: true, // Auto verified in Stage 1
        contactsSynced: false, // Must sync contacts to activate
        searchBalance: 0, // Gets balance after activation (syncing contacts)
        points: 100, // Gift on registration
        createdAt: new Date().toISOString(),
        isActive: true
      };

      await DbService.saveUser(newUser);

      // Record Transaction
      await DbService.addTransaction({
        userId: newUser.id,
        userPhone: newUser.phone,
        action: 'إنشاء حساب جديد وهدية ترحيبية',
        amount: 100
      });

      res.json({ message: 'تم إنشاء الحساب بنجاح، يرجى مزامنة جهات الاتصال لتفعيل البحث.', user: newUser });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Contact Synchronization (Cleanses, Saves, and Activates account)
  app.post('/api/contacts/sync', async (req, res) => {
    const { phone, contacts } = req.body;

    if (!phone || !contacts || !Array.isArray(contacts)) {
      return res.status(400).json({ error: 'المعطيات غير صالحة. مطلوب رقم الهاتف وقائمة جهات الاتصال.' });
    }

    try {
      const user = await DbService.getUserByPhone(phone);
      if (!user) {
        return res.status(404).json({ error: 'الحساب غير موجود.' });
      }

      const settings = await DbService.getSettings();
      let importedCount = 0;

      // Cleanse, Diff, and Save contacts in high-performance Firestore batches of 500
      importedCount = await DbService.syncUserContacts(user.phone, contacts);

      // Activate user search balance if not already synced
      const initialSyncBonus = 50;
      if (!user.contactsSynced) {
        user.contactsSynced = true;
        user.searchBalance = settings.dailySearchBalance; // Give default free searches
        user.points += initialSyncBonus; // Award points

        await DbService.addTransaction({
          userId: user.id,
          userPhone: user.phone,
          action: 'مزامنة جهات الاتصال ومكافأة تفعيل الحساب',
          amount: initialSyncBonus
        });
      } else {
        // Award minor reward for updating contacts list
        user.points += 10;
        await DbService.addTransaction({
          userId: user.id,
          userPhone: user.phone,
          action: 'تحديث ومزامنة جهات الاتصال',
          amount: 10
        });
      }

      await DbService.saveUser(user);

      res.json({
        message: 'تمت مزامنة جهات الاتصال بنجاح وتفعيل الحساب!',
        user,
        importedCount
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Standard Caller-ID Search
  app.get('/api/search', async (req, res) => {
    const { query, phone } = req.query as { query: string; phone: string };

    if (!query || !phone) {
      return res.status(400).json({ error: 'مطلوب كلمة البحث ورقم الهاتف المستعلم.' });
    }

    try {
      const user = await DbService.getUserByPhone(phone);
      if (!user) {
        return res.status(404).json({ error: 'الحساب غير موجود.' });
      }

      if (!user.isActive) {
        return res.status(403).json({ error: 'الحساب معطل من قبل الإدارة.' });
      }

      if (!user.contactsSynced) {
        return res.status(403).json({ error: 'يجب تفعيل الحساب بمزامنة جهات الاتصال أولاً قبل استخدام البحث.' });
      }

      const settings = await DbService.getSettings();

      // Check search balance
      if (user.searchBalance <= 0) {
        return res.status(402).json({
          error: 'انتهى رصيد البحث المجاني اليومي الخاص بك!',
          outOfBalance: true
        });
      }

      // Execute Search
      const searchResults = await DbService.searchNumbers(query);
      
      // Deduct Search Balance
      user.searchBalance -= 1;
      await DbService.saveUser(user);

      // Record Transaction
      await DbService.addTransaction({
        userId: user.id,
        userPhone: user.phone,
        action: `بحث عن رقم: ${query}`,
        amount: -1
      });

      // Enforce limits (max 15 results for free search, unless unlocked unlimited is true)
      const limit = user.unlockedUnlimited ? 9999 : settings.resultsLimit;
      const finalResults = searchResults.slice(0, limit);

      res.json({
        results: finalResults,
        searchBalance: user.searchBalance,
        totalFound: searchResults.length,
        unlockedUnlimited: !!user.unlockedUnlimited
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Advanced Lookup (Uses points instead of search balance, reveals all names + stats)
  app.get('/api/search/advanced', async (req, res) => {
    const { query, phone } = req.query as { query: string; phone: string };

    if (!query || !phone) {
      return res.status(400).json({ error: 'مطلوب كلمة البحث ورقم الهاتف المستعلم.' });
    }

    try {
      const user = await DbService.getUserByPhone(phone);
      if (!user) {
        return res.status(404).json({ error: 'الحساب غير موجود.' });
      }

      if (!user.contactsSynced) {
        return res.status(403).json({ error: 'يجب تفعيل الحساب بمزامنة جهات الاتصال أولاً.' });
      }

      const settings = await DbService.getSettings();

      if (!settings.advancedSearchEnabled) {
        return res.status(403).json({ error: 'البحث المتقدم غير مفعل حالياً في النظام.' });
      }

      if (user.points < settings.advancedSearchCost) {
        return res.status(402).json({
          error: `نقاطك غير كافية للبحث المتقدم. مطلوب ${settings.advancedSearchCost} نقطة.`,
          insufficientPoints: true
        });
      }

      // Execute Search & return ALL names
      const searchResults = await DbService.searchNumbers(query);

      // Deduct points
      user.points -= settings.advancedSearchCost;
      await DbService.saveUser(user);

      // Record Transaction
      await DbService.addTransaction({
        userId: user.id,
        userPhone: user.phone,
        action: `بحث متقدم عن الرقم: ${query}`,
        amount: -settings.advancedSearchCost
      });

      res.json({
        results: searchResults, // unlimited or much higher
        points: user.points,
        totalFound: searchResults.length
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Ads: Retrieve available ads
  app.get('/api/ads', async (req, res) => {
    try {
      const ads = (await DbService.getAds()).filter(ad => ad.status);
      res.json(ads);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Ads: Record Impression/View & Reward User
  app.post('/api/ads/view', async (req, res) => {
    const { adId, phone } = req.body;

    if (!adId || !phone) {
      return res.status(400).json({ error: 'مطلوب معرف الإعلان ورقم المستخدم.' });
    }

    try {
      const ad = await DbService.getAdById(adId);
      if (!ad) {
        return res.status(404).json({ error: 'الإعلان غير موجود.' });
      }

      const user = await DbService.getUserByPhone(phone);
      if (!user) {
        return res.status(404).json({ error: 'المستخدم غير موجود.' });
      }

      const settings = await DbService.getSettings();

      // Increment Ad view
      ad.views += 1;
      await DbService.saveAd(ad);

      // Reward calculation based on ad type
      let rewardText = '';
      let rewardValue = 0;

      // Increment consecutive ads watched
      user.consecutiveAdsWatched = (user.consecutiveAdsWatched || 0) + 1;
      let unlockedMsg = '';
      if (user.consecutiveAdsWatched >= 6) {
        user.unlockedUnlimited = true;
        unlockedMsg = ' ومبارك! تم تفعيل ميزة كشف جميع الأسماء والبحث الشامل لمشاهدتك 6 إعلانات متتالية!';
      }

      if (ad.type === 'rewarded') {
        // Direct +1 search balance or search credits
        user.searchBalance += ad.reward;
        rewardText = `الحصول على +${ad.reward} رصيد بحث إضافي` + unlockedMsg;
        rewardValue = ad.reward;
      } else {
        // Award generic points (e.g. 10 points)
        const pointsReward = ad.reward || settings.pointsPerAd;
        user.points += pointsReward;
        rewardText = `الحصول على +${pointsReward} نقطة لمشاهدة الإعلان` + unlockedMsg;
        rewardValue = pointsReward;
      }

      await DbService.saveUser(user);

      // Record Transaction
      await DbService.addTransaction({
        userId: user.id,
        userPhone: user.phone,
        action: user.consecutiveAdsWatched >= 6
          ? `مشاهدة إعلان 6 متتالي: ${ad.title} (فتح كشف جميع الأسماء تلقائياً)`
          : `مشاهدة إعلان: ${ad.title}`,
        amount: rewardValue
      });

      res.json({
        message: 'تم تسجيل المشاهدة ومنح المكافأة بنجاح!',
        rewardText,
        user,
        ad
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Ads: Record Click
  app.post('/api/ads/click', async (req, res) => {
    const { adId } = req.body;
    try {
      const ad = await DbService.getAdById(adId);
      if (!ad) {
        return res.status(404).json({ error: 'الإعلان غير موجود.' });
      }
      ad.clicks += 1;
      await DbService.saveAd(ad);
      res.json({ message: 'تم تسجيل الضغطة بنجاح', ad });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Convert points to search balance or unlimited reveal status
  app.post('/api/user/convert-points', async (req, res) => {
    const { phone, option } = req.body;
    if (!phone || !option) {
      return res.status(400).json({ error: 'الرقم ونوع التحويل مطلوبان.' });
    }

    try {
      const user = await DbService.getUserByPhone(phone);
      if (!user) {
        return res.status(404).json({ error: 'الحساب غير موجود.' });
      }

      let cost = 0;
      let searchesToAdd = 0;

      if (option === '5searches') {
        cost = 50;
        searchesToAdd = 5;
      } else if (option === '12searches') {
        cost = 100;
        searchesToAdd = 12;
      } else if (option === 'reveal_unlimited') {
        cost = 80;
      } else {
        return res.status(400).json({ error: 'خيار تحويل غير صالح.' });
      }

      if (user.points < cost) {
        return res.status(400).json({ error: `عذراً، رصيد نقاطك غير كافٍ. تحتاج إلى ${cost} نقطة لتنفيذ هذه العملية.` });
      }

      user.points -= cost;
      if (searchesToAdd > 0) {
        user.searchBalance += searchesToAdd;
      } else if (option === 'reveal_unlimited') {
        user.unlockedUnlimited = true;
      }

      await DbService.saveUser(user);

      await DbService.addTransaction({
        userId: user.id,
        userPhone: user.phone,
        action: option === 'reveal_unlimited' 
          ? 'تحويل نقاط لتفعيل كشف جميع الأسماء وتجاوز حد الـ 15 اسماً' 
          : `تحويل نقاط لشراء رصيد بحث إضافي (+${searchesToAdd} عملية)`,
        amount: -cost
      });

      res.json({ 
        message: option === 'reveal_unlimited'
          ? 'تم خصم النقاط وتفعيل ميزة كشف جميع الأسماء بنجاح لرقمك!'
          : `تم تحويل النقاط وشحن رصيدك بـ +${searchesToAdd} عملية بحث بنجاح!`, 
        user 
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Fetch transaction history
  app.get('/api/transactions', async (req, res) => {
    const phone = req.query.phone as string;
    if (!phone) {
      return res.status(400).json({ error: 'مطلوب رقم الهاتف.' });
    }

    try {
      const user = await DbService.getUserByPhone(phone);
      if (!user) {
        return res.status(404).json({ error: 'الحساب غير موجود.' });
      }

      const txs = (await DbService.getTransactions()).filter(t => t.userId === user.id);
      res.json(txs);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // --- ADMIN API ENDPOINTS (Dynamic Admin check based on settings) ---

  const adminAuthMiddleware = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const adminToken = req.headers['x-admin-token'] as string;
    try {
      const adminPhoneSetting = (await DbService.getSettings()).adminPhone || '774919194';

      if (adminToken && (
        adminToken.includes('774282944trtr') ||
        adminToken.includes('774919194') ||
        adminToken.includes('74919194') ||
        adminToken.startsWith(adminPhoneSetting)
      )) {
        next();
        return;
      }
      return res.status(403).json({ error: 'غير مصرح بالدخول للوحة التحكم. يتطلب صلاحيات المدير العام.' });
    } catch (err) {
      return res.status(403).json({ error: 'فشل التحقق من الصلاحيات الإدارية.' });
    }
  };

  // Get Admin Dashboard Stats
  app.get('/api/admin/stats', adminAuthMiddleware, async (req, res) => {
    try {
      res.json(await DbService.getAnalytics());
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Reset Admin Stats & Earnings
  app.post('/api/admin/reset-stats', adminAuthMiddleware, async (req, res) => {
    try {
      await DbService.resetAnalytics();
      res.json({ message: 'تم إعادة ضبط جميع الإحصائيات، سجلات البحث وأرباح الإعلانات إلى الصفر بنجاح!' });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Get List of Users
  app.get('/api/admin/users', adminAuthMiddleware, async (req, res) => {
    try {
      res.json(await DbService.getUsers());
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Modify User Status
  app.post('/api/admin/users/toggle-status', adminAuthMiddleware, async (req, res) => {
    const { userId } = req.body;
    try {
      const user = await DbService.getUserById(userId);
      if (!user) return res.status(404).json({ error: 'المستخدم غير موجود.' });

      user.isActive = !user.isActive;
      await DbService.saveUser(user);
      res.json({ message: `تم ${user.isActive ? 'تفعيل' : 'تعطيل'} حساب المستخدم بنجاح.`, user });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Add Points to User manually
  app.post('/api/admin/users/grant-points', adminAuthMiddleware, async (req, res) => {
    const { userId, amount } = req.body;
    try {
      const user = await DbService.getUserById(userId);
      if (!user) return res.status(404).json({ error: 'المستخدم غير موجود.' });

      user.points += Number(amount);
      await DbService.saveUser(user);

      await DbService.addTransaction({
        userId: user.id,
        userPhone: user.phone,
        action: 'منح نقاط إدارية من لوحة التحكم',
        amount: Number(amount)
      });

      res.json({ message: 'تم منح النقاط بنجاح.', user });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Delete User
  app.delete('/api/admin/users/:id', adminAuthMiddleware, async (req, res) => {
    try {
      const success = await DbService.deleteUser(req.params.id);
      if (success) {
        res.json({ message: 'تم حذف حساب المستخدم بنجاح.' });
      } else {
        res.status(404).json({ error: 'المستخدم غير موجود.' });
      }
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Database Management: List and search contacts
  app.get('/api/admin/contacts', adminAuthMiddleware, async (req, res) => {
    const { search } = req.query as { search: string };
    try {
      if (search) {
        const cleanSearch = search.trim();
        let contacts: Contact[] = [];
        if (/^\d+$/.test(cleanSearch)) {
          contacts = await DbService.queryContactsByPhone(cleanSearch, 100);
        } else {
          contacts = await DbService.queryContactsByName(cleanSearch, 100);
        }
        return res.json(contacts);
      }
      const contacts = await DbService.getContactsLimited(100);
      res.json(contacts);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Database Management: Add Custom Phone Identity
  app.post('/api/admin/contacts', adminAuthMiddleware, async (req, res) => {
    const { phoneNumber, contactName } = req.body;

    if (!phoneNumber || !contactName) {
      return res.status(400).json({ error: 'مطلوب رقم الهاتف والاسم.' });
    }

    try {
      const cleanNum = phoneNumber.trim().replace(/\s+/g, '');
      const contact = await DbService.addContact({
        phoneNumber: cleanNum,
        contactName: contactName.trim(),
        addedByUser: 'الإدارة'
      });

      res.json({ message: 'تم إضافة جهة الاتصال يدوياً بنجاح لقاعدة البيانات.', contact });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Database Management: Edit Custom Phone Identity
  app.post('/api/admin/contacts/edit', adminAuthMiddleware, async (req, res) => {
    const { id, phoneNumber, contactName, frequency } = req.body;

    if (!id || !phoneNumber || !contactName) {
      return res.status(400).json({ error: 'مطلوب معرف جهة الاتصال، رقم الهاتف، والاسم لتحديثه.' });
    }

    try {
      const contact = await DbService.getContactById(id);
      if (!contact) {
        return res.status(404).json({ error: 'جهة الاتصال المطلوبة غير موجودة في قاعدة البيانات.' });
      }

      contact.phoneNumber = phoneNumber.trim().replace(/\s+/g, '');
      contact.contactName = contactName.trim();
      if (frequency !== undefined) {
        contact.frequency = Number(frequency) || 1;
      }

      await DbService.updateContact(contact);

      res.json({ message: 'تم تعديل جهة الاتصال وتحديثها في قاعدة البيانات بنجاح.', contact });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Database Management: Delete Caller-ID Info
  app.delete('/api/admin/contacts/:id', adminAuthMiddleware, async (req, res) => {
    try {
      const success = await DbService.deleteContact(req.params.id);
      if (success) {
        res.json({ message: 'تم حذف الرقم والاسم من قاعدة البيانات بنجاح.' });
      } else {
        res.status(404).json({ error: 'جهة الاتصال غير موجودة.' });
      }
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Database Management: Bulk CSV / JSON Upload
  app.post('/api/admin/contacts/bulk', adminAuthMiddleware, async (req, res) => {
    const { contacts } = req.body; // Array of { phoneNumber, contactName }

    if (!contacts || !Array.isArray(contacts)) {
      return res.status(400).json({ error: 'مطلوب إدخال مصفوفة من جهات الاتصال.' });
    }

    try {
      // Map properties correctly for the high-performance batch upsert
      const formattedContacts = contacts
        .filter(c => c && (c.phoneNumber || c.phone) && (c.contactName || c.name))
        .map(c => ({
          phoneNumber: (c.phoneNumber || c.phone).toString(),
          contactName: (c.contactName || c.name).toString()
        }));

      const addedCount = await DbService.bulkAddContacts(formattedContacts);

      res.json({ message: `تم استيراد ${addedCount} اسماً بنجاح إلى قاعدة بيانات معروف بنجاح.` });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Ads Management: Create Ad
  app.post('/api/admin/ads', adminAuthMiddleware, async (req, res) => {
    const { title, type, source, mediaUrl, linkUrl, duration, reward } = req.body;

    if (!title || !type || !source) {
      return res.status(400).json({ error: 'الحقول الأساسية مطلوبة: العنوان، النوع، والمصدر.' });
    }

    try {
      const newAd: Ad = {
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
      res.json({ message: 'تم إضافة الإعلان بنجاح.', ad: newAd });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Ads Management: Toggle Ad Status
  app.post('/api/admin/ads/toggle', adminAuthMiddleware, async (req, res) => {
    const { adId } = req.body;
    try {
      const ad = await DbService.getAdById(adId);
      if (!ad) return res.status(404).json({ error: 'الإعلان غير موجود.' });

      ad.status = !ad.status;
      await DbService.saveAd(ad);
      res.json({ message: `تم ${ad.status ? 'تفعيل' : 'إيقاف'} الإعلان بنجاح.`, ad });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Ads Management: Delete Ad
  app.delete('/api/admin/ads/:id', adminAuthMiddleware, async (req, res) => {
    try {
      const success = await DbService.deleteAd(req.params.id);
      if (success) {
        res.json({ message: 'تم حذف الإعلان بنجاح.' });
      } else {
        res.status(404).json({ error: 'الإعلان غير موجود.' });
      }
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Update Settings
  app.post('/api/admin/settings', adminAuthMiddleware, async (req, res) => {
    const newSettings: SystemSettings = req.body;
    try {
      await DbService.saveSettings(newSettings);
      res.json({ message: 'تم تحديث إعدادات نظام معروف بنجاح دون الحاجة لإعادة البرمجة.', settings: newSettings });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Fallback 404 handler for unknown API routes to always return JSON (never HTML)
  app.all('/api/*', (req, res) => {
    res.status(404).json({
      error: `المسار البرمجي غير موجود: ${req.method} ${req.originalUrl || req.url}`,
      hint: 'تحقق من صحة المسار أو إعدادات التوجيه'
    });
  });

  expressAppInstance = app;
  return app;
}

async function startServer() {
  const PORT = 3000;
  const app = await createExpressApp();

  // --- VITE MIDDLEWARE CONFIGURATION ---
  if (process.env.NODE_ENV !== 'production') {
    // In development mode, dynamically load Vite Dev Server
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // In production mode, serve built files
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Maarouf Full-Stack Server] Server is running on http://0.0.0.0:${PORT}`);
  });
}

// Only launch standalone HTTP server when executed directly (dev / standalone node),
// NOT inside serverless environments (Vercel, AWS Lambda, Netlify).
const isServerless = Boolean(
  process.env.VERCEL || 
  process.env.AWS_LAMBDA_FUNCTION_NAME || 
  process.env.LAMBDA_TASK_ROOT ||
  process.env.NETLIFY
);

if (!isServerless) {
  startServer().catch(err => {
    console.error('[Maarouf Server] Failed to start:', err);
  });
}

