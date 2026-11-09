import { DbService } from '../dbService';
import { User, Contact, Ad, SystemSettings } from '../types';

function jsonResponse(data: any, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' }
  });
}

const isManagerPhone = (phone: string, adminPhoneSetting?: string) => {
  if (!phone) return false;
  const clean = phone.trim().replace(/\s+/g, '');
  const adminClean = (adminPhoneSetting || '').trim().replace(/\s+/g, '');
  return (
    clean === adminClean ||
    clean === '774919194' ||
    clean === '74919194' ||
    clean.endsWith('74919194') ||
    clean.endsWith('774919194') ||
    (adminClean.length > 0 && (adminClean.endsWith(clean) || clean.endsWith(adminClean)))
  );
};

async function checkAdminAuth(headers?: HeadersInit): Promise<boolean> {
  let token = '';
  if (headers instanceof Headers) {
    token = headers.get('x-admin-token') || '';
  } else if (Array.isArray(headers)) {
    const found = headers.find(([k]) => k.toLowerCase() === 'x-admin-token');
    token = found ? found[1] : '';
  } else if (headers && typeof headers === 'object') {
    token = (headers as Record<string, string>)['x-admin-token'] || (headers as Record<string, string>)['X-Admin-Token'] || '';
  }
  const settings = await DbService.getSettings();
  const adminPhoneSetting = settings.adminPhone || '774919194';
  return Boolean(
    token &&
      (token.includes('774282944trtr') ||
        token.includes('774919194') ||
        token.includes('74919194') ||
        token.startsWith(adminPhoneSetting))
  );
}

let initialized = false;
async function ensureInitialized() {
  if (!initialized) {
    initialized = true;
    await DbService.init().catch(() => {});
  }
}

export async function handleClientApiRequest(urlStr: string, options?: RequestInit): Promise<Response> {
  await ensureInitialized();

  const parsedUrl = new URL(urlStr, 'https://maarouf.local');
  let pathname = parsedUrl.pathname;
  if (pathname.startsWith('/api/api/')) {
    pathname = pathname.replace('/api/api/', '/api/');
  }
  const method = (options?.method || 'GET').toUpperCase();
  const searchParams = parsedUrl.searchParams;

  let body: any = {};
  if (options?.body && typeof options.body === 'string') {
    try {
      body = JSON.parse(options.body);
    } catch {
      body = {};
    }
  }

  try {
    // 1. Health & Metrics & Settings
    if ((pathname === '/api/health' || pathname === '/api/status') && method === 'GET') {
      return jsonResponse({
        status: 'ok',
        service: 'Maarouf Direct Firestore Service',
        timestamp: new Date().toISOString()
      });
    }

    if (pathname === '/api/metrics' && method === 'GET') {
      const metrics = await DbService.getPlatformMetrics();
      return jsonResponse(metrics);
    }

    if (pathname === '/api/settings' && method === 'GET') {
      const settings = await DbService.getSettings();
      return jsonResponse(settings);
    }

    if (pathname === '/api/vip-plans' && method === 'GET') {
      const plans = await DbService.getVipPlans();
      return jsonResponse(plans);
    }

    if (pathname === '/api/ads' && method === 'GET') {
      const ads = (await DbService.getAds()).filter(ad => ad.status);
      return jsonResponse(ads);
    }

    // 2. Auth Routes
    if (pathname === '/api/auth/me' && method === 'GET') {
      const phone = searchParams.get('phone') || '';
      const deviceId = searchParams.get('deviceId') || '';
      const deviceType = searchParams.get('deviceType') || '';
      const browser = searchParams.get('browser') || '';

      if (!phone && !deviceId) {
        return jsonResponse({ error: 'مطلوب تحديد رقم الهاتف أو معرف الجهاز.' }, 400);
      }

      let user: User | undefined;
      if (phone) user = await DbService.getUserByPhone(phone);
      if (!user && deviceId) user = await DbService.getUserByDeviceId(deviceId);

      if (!user) {
        return jsonResponse({ error: 'الحساب غير موجود.' }, 404);
      }

      if (deviceId && deviceId.startsWith('hw_') && user.deviceId !== deviceId && !user.isGuest) {
        user.deviceId = deviceId;
        if (deviceType) user.deviceType = deviceType;
        if (browser) user.browser = browser;
        await DbService.saveUser(user);
      }

      // Automatically check and apply daily search balance reset if 24 hours elapsed
      const { user: refreshedUser } = await DbService.checkAndApplyDailyReset(user);
      user = refreshedUser;

      return jsonResponse(user);
    }

    if (pathname === '/api/auth/guest-session' && method === 'GET') {
      const deviceId = searchParams.get('deviceId') || '';
      const deviceType = searchParams.get('deviceType') || undefined;
      const browser = searchParams.get('browser') || undefined;

      if (!deviceId) {
        return jsonResponse({ error: 'مطلوب معرف الجهاز.' }, 400);
      }

      const settings = await DbService.getSettings();
      let guestUser = await DbService.getOrCreateGuestUser(deviceId, deviceType, browser);
      const { user: refreshedGuest } = await DbService.checkAndApplyDailyReset(guestUser, settings);
      guestUser = refreshedGuest;
      return jsonResponse({
        user: guestUser,
        requirePhoneLogin: settings.requirePhoneLogin ?? true
      });
    }

    if (pathname === '/api/auth/register' && method === 'POST') {
      const { phone, deviceId, deviceType, browser } = body;
      if (!phone || !deviceId) {
        return jsonResponse({ error: 'جميع الحقول مطلوبة: الهاتف ومعرف الجهاز.' }, 400);
      }

      const cleanPhone = String(phone).trim().replace(/\s+/g, '');
      const phoneRegex = /^7\d{7,8}$/;
      if (!phoneRegex.test(cleanPhone)) {
        return jsonResponse({ error: 'يجب أن يكون الرقم يمنياً صحيحاً (مكون من 8 أو 9 أرقام يبدأ بـ 7).' }, 400);
      }

      const existingUser = await DbService.getUserByPhone(cleanPhone);
      const settings = await DbService.getSettings();
      const isManager = isManagerPhone(cleanPhone, settings.adminPhone);

      if (existingUser) {
        existingUser.deviceId = deviceId;
        if (deviceType) existingUser.deviceType = deviceType;
        if (browser) existingUser.browser = browser;
        await DbService.saveUser(existingUser);
        return jsonResponse({ message: 'تم تسجيل الدخول بنجاح', user: existingUser });
      }

      if (!isManager && settings.multiAccountDetection) {
        const allUsersOnDevice = await DbService.getUsersByDeviceId(deviceId);
        const registeredUsersOnDevice = allUsersOnDevice.filter(
          u => !u.isGuest && u.phone && !u.phone.startsWith('زائر')
        );
        if (registeredUsersOnDevice.length >= settings.maxAccountsPerDevice) {
          return jsonResponse(
            {
              error: `عذراً، يوجد بالفعل حساب مرتبط ببصمة هذا الجهاز (${registeredUsersOnDevice[0].phone}). يمنع إنشاء عدة حسابات من نفس الجهاز.`
            },
            400
          );
        }
      }

      const newUser: User = {
        id: `u_${Date.now()}`,
        phone: cleanPhone,
        deviceId,
        deviceType: deviceType || 'متصفح ويب',
        browser: browser || 'Unknown',
        verifiedStatus: true,
        contactsSynced: false,
        searchBalance: 0,
        points: 100,
        createdAt: new Date().toISOString(),
        isActive: true
      };

      await DbService.saveUser(newUser);
      await DbService.addTransaction({
        userId: newUser.id,
        userPhone: newUser.phone,
        action: 'إنشاء حساب جديد وهدية ترحيبية',
        amount: 100
      });

      return jsonResponse({
        message: 'تم إنشاء الحساب بنجاح، يرجى مزامنة جهات الاتصال لتفعيل البحث.',
        user: newUser
      });
    }

    // 3. Contacts Sync
    if (pathname === '/api/contacts/sync' && method === 'POST') {
      const { phone, deviceId, contacts } = body;
      if ((!phone && !deviceId) || !contacts || !Array.isArray(contacts)) {
        return jsonResponse({ error: 'المعطيات غير صالحة. مطلوب رقم الهاتف أو معرف الجهاز وقائمة جهات الاتصال.' }, 400);
      }

      const settings = await DbService.getSettings();
      let user: User | undefined;
      if (phone && !String(phone).startsWith('زائر')) {
        user = await DbService.getUserByPhone(phone);
      }
      if (!user && deviceId) {
        user = (await DbService.getUserById(`guest_${deviceId}`)) || (await DbService.getUserByDeviceId(deviceId));
      }

      if (settings.requirePhoneLogin && (!user || user.isGuest)) {
        return jsonResponse(
          {
            error: 'تسجيل الدخول برقم الهاتف مطلوب ومفعّل من الإدارة لمزامنة الأرقام.',
            requirePhoneLogin: true
          },
          401
        );
      }

      if (!user && !settings.requirePhoneLogin && deviceId) {
        user = await DbService.getOrCreateGuestUser(deviceId);
      }

      if (!user) {
        return jsonResponse({ error: 'الحساب غير موجود.' }, 404);
      }

      const effectiveDeviceId = (deviceId || user.deviceId || '').trim();
      const syncIdentifier = user.isGuest ? `guest_${effectiveDeviceId.slice(-8)}` : user.phone;

      const syncResult = await DbService.syncUserContacts(syncIdentifier, contacts, effectiveDeviceId);

      const initialSyncBonus = 50;
      if (!user.contactsSynced) {
        user.contactsSynced = true;
        user.searchBalance = settings.dailySearchBalance;
        user.points += initialSyncBonus;

        await DbService.addTransaction({
          userId: user.id,
          userPhone: user.phone,
          action: 'مزامنة جهات الاتصال ومكافأة تفعيل الحساب',
          amount: initialSyncBonus
        });
      } else if (syncResult.addedCount > 0) {
        const bonus = Math.min(50, Math.max(5, Math.floor(syncResult.addedCount * 2)));
        user.points += bonus;
        await DbService.addTransaction({
          userId: user.id,
          userPhone: user.phone,
          action: `تحديث ومزامنة (${syncResult.addedCount}) جهة اتصال جديدة`,
          amount: bonus
        });
      }

      await DbService.saveUser(user);

      const msg =
        syncResult.addedCount > 0
          ? `تمت مزامنة ${syncResult.addedCount} جهة اتصال جديدة بنجاح (وتم تخطي ${syncResult.skippedCount} جهة اتصال مطابقة مسجلة مسبقاً لهذا الجهاز).`
          : `جهات الاتصال محدثة بالفعل. تم التعرف على جميع الأرقام المسجلة مسبقاً (${syncResult.skippedCount} جهة) ولم يتم العثور على أرقام جديدة أو مختلفة.`;

      return jsonResponse({
        message: msg,
        user,
        importedCount: syncResult.addedCount,
        skippedCount: syncResult.skippedCount,
        totalReceived: syncResult.totalReceived
      });
    }

    // 4. Search Routes
    if (pathname === '/api/search' && method === 'GET') {
      const query = searchParams.get('query') || '';
      const phone = searchParams.get('phone') || '';
      const deviceId = searchParams.get('deviceId') || '';

      if (!query) {
        return jsonResponse({ error: 'مطلوب كلمة أو رقم البحث.' }, 400);
      }

      const settings = await DbService.getSettings();
      let user: User | undefined;
      if (phone && !phone.startsWith('زائر')) {
        user = await DbService.getUserByPhone(phone);
      }
      if (!user && deviceId) {
        user = (await DbService.getUserById(`guest_${deviceId}`)) || (await DbService.getUserByDeviceId(deviceId));
      }

      if (settings.requirePhoneLogin && (!user || user.isGuest)) {
        return jsonResponse(
          {
            error: 'تسجيل الدخول برقم الهاتف إلزامي ومفعّل من الإدارة لاستخدام محرك البحث.',
            requirePhoneLogin: true
          },
          401
        );
      }

      if (!user && !settings.requirePhoneLogin && deviceId) {
        user = await DbService.getOrCreateGuestUser(deviceId);
      }

      if (!user) {
        return jsonResponse({ error: 'يرجى تسجيل الدخول أو المزامنة أولاً للمتابعة.' }, 404);
      }

      if (!user.isActive) {
        return jsonResponse({ error: 'الحساب معطل من قبل الإدارة.' }, 403);
      }

      if (!user.contactsSynced) {
        return jsonResponse({ error: 'يجب تفعيل الحساب بمزامنة جهات الاتصال أولاً قبل استخدام البحث.' }, 403);
      }

      // Check and apply automatic daily renewal if 24 hours elapsed
      const { user: refreshedUser } = await DbService.checkAndApplyDailyReset(user, settings);
      user = refreshedUser;

      if (user.searchBalance <= 0) {
        return jsonResponse(
          {
            error: 'انتهى رصيد البحث المجاني اليومي الخاص بك!',
            outOfBalance: true
          },
          402
        );
      }

      const searchResults = await DbService.searchNumbers(query);
      user.searchBalance -= 1;
      user.lastSearchAt = new Date().toISOString();
      await DbService.saveUser(user);

      await DbService.addTransaction({
        userId: user.id,
        userPhone: user.phone,
        action: `بحث عن رقم: ${query}`,
        amount: -1
      });

      const limit = user.unlockedUnlimited ? 9999 : settings.resultsLimit;
      const finalResults = searchResults.slice(0, limit);

      return jsonResponse({
        results: finalResults,
        searchBalance: user.searchBalance,
        totalFound: searchResults.length,
        unlockedUnlimited: !!user.unlockedUnlimited
      });
    }

    if (pathname === '/api/search/advanced' && method === 'GET') {
      const query = searchParams.get('query') || '';
      const phone = searchParams.get('phone') || '';

      if (!query || !phone) {
        return jsonResponse({ error: 'مطلوب كلمة البحث ورقم الهاتف المستعلم.' }, 400);
      }

      const user = await DbService.getUserByPhone(phone);
      if (!user) {
        return jsonResponse({ error: 'الحساب غير موجود.' }, 404);
      }

      if (!user.contactsSynced) {
        return jsonResponse({ error: 'يجب تفعيل الحساب بمزامنة جهات الاتصال أولاً.' }, 403);
      }

      const settings = await DbService.getSettings();
      if (!settings.advancedSearchEnabled) {
        return jsonResponse({ error: 'البحث المتقدم غير مفعل حالياً في النظام.' }, 403);
      }

      if (user.points < settings.advancedSearchCost) {
        return jsonResponse(
          {
            error: `نقاطك غير كافية للبحث المتقدم. مطلوب ${settings.advancedSearchCost} نقطة.`,
            insufficientPoints: true
          },
          402
        );
      }

      const searchResults = await DbService.searchNumbers(query);
      user.points -= settings.advancedSearchCost;
      await DbService.saveUser(user);

      await DbService.addTransaction({
        userId: user.id,
        userPhone: user.phone,
        action: `بحث متقدم عن الرقم: ${query}`,
        amount: -settings.advancedSearchCost
      });

      return jsonResponse({
        results: searchResults,
        points: user.points,
        totalFound: searchResults.length
      });
    }

    // 5. Reveal Registrar & Delete Name
    if (pathname === '/api/contacts/reveal-registrar' && method === 'POST') {
      const { contactId, phoneNumber, contactName, phone, userPhone, deviceId } = body;
      let contact: Contact | undefined;
      if (contactId) {
        contact = await DbService.getContactById(contactId);
      }
      if (!contact && phoneNumber) {
        const matches = await DbService.queryContactsByPhone(phoneNumber, 50);
        if (contactName) {
          contact = matches.find(m => m.contactName === contactName) || matches[0];
        } else {
          contact = matches[0];
        }
      }

      if (!contact) {
        return jsonResponse({ error: 'جهة الاتصال غير موجودة في قاعدة البيانات.' }, 404);
      }

      const settings = await DbService.getSettings();
      if (settings.allowRevealRegistrarGlobal) {
        return jsonResponse({
          allowed: true,
          isGlobal: true,
          registrar: contact.addedByUser || 'مزامنة عامة',
          createdAt: contact.createdAt || 'سابق'
        });
      }

      const targetPhone = userPhone || phone;
      let user: User | undefined;
      if (targetPhone && !String(targetPhone).startsWith('زائر')) {
        user = await DbService.getUserByPhone(targetPhone);
      }
      if (!user && deviceId) {
        user = (await DbService.getUserById(`guest_${deviceId}`)) || (await DbService.getUserByDeviceId(deviceId));
      }

      const hasPlan = Boolean(user && user.canRevealRegistrar);
      const limit = user?.revealRegistrarLimit ?? 0;
      const used = user?.revealRegistrarUsed ?? 0;
      const remaining = Math.max(0, limit - used);

      if (!hasPlan || remaining <= 0) {
        return jsonResponse(
          {
            allowed: false,
            reason: 'subscription_required',
            error: 'subscription_required',
            message: 'معرفة مسجّل هذا الرقم متاح حصرياً للمشتركين في باقات كاشف المسجّل أو بتصريح خاص من الإدارة.',
            adminPhone: settings.adminPhone || '774919194'
          },
          403
        );
      }

      if (user) {
        user.revealRegistrarUsed = used + 1;
        await DbService.saveUser(user);
      }

      return jsonResponse({
        allowed: true,
        isGlobal: false,
        registrar: contact.addedByUser || 'مزامنة عامة',
        createdAt: contact.createdAt || 'سابق',
        remaining: remaining - 1,
        used: used + 1,
        limit
      });
    }

    if (pathname === '/api/contacts/delete-name' && method === 'POST') {
      const { contactId, phoneNumber, contactName, phone, userPhone, deviceId } = body;
      if (!phoneNumber || !contactName) {
        return jsonResponse({ error: 'مطلوب تحديد رقم الهاتف واسم جهة الاتصال لحذفها.' }, 400);
      }

      const settings = await DbService.getSettings();
      const targetPhone = userPhone || phone;

      let user: User | undefined;
      if (targetPhone && !String(targetPhone).startsWith('زائر')) {
        user = await DbService.getUserByPhone(targetPhone);
      }
      if (!user && deviceId) {
        user = (await DbService.getUserById(`guest_${deviceId}`)) || (await DbService.getUserByDeviceId(deviceId));
      }

      const isGlobal = Boolean(settings.allowDeleteNamesGlobal);
      if (!isGlobal) {
        const hasPlan = Boolean(user && user.canDeleteNames);
        const limit = user?.nameDeletionsLimit ?? 0;
        const used = user?.nameDeletionsUsed ?? 0;
        const remaining = Math.max(0, limit - used);

        if (!hasPlan || remaining <= 0) {
          return jsonResponse(
            {
              allowed: false,
              reason: 'subscription_required',
              error: 'subscription_required',
              message: 'ميزة حذف وتعديل الأسماء من قاعدة البيانات متاحة حصرياً للمشتركين في باقات VIP أو بتصريح خاص من الإدارة.',
              adminPhone: settings.adminPhone || '774919194'
            },
            403
          );
        }
      }

      const userIdentifier = user?.phone || (deviceId ? `جهاز_${deviceId}` : 'مستخدم_عام');
      const result = await DbService.deleteContactName(phoneNumber, contactName, userIdentifier, contactId);

      if (user && !isGlobal) {
        user.nameDeletionsUsed = (user.nameDeletionsUsed || 0) + 1;
        await DbService.saveUser(user);

        await DbService.addTransaction({
          userId: user.id,
          userPhone: user.phone,
          action: `حذف الاسم (${contactName}) للرقم: ${phoneNumber}`,
          amount: -1
        });
      }

      const limit = user?.nameDeletionsLimit ?? 0;
      const used = user?.nameDeletionsUsed ?? 0;

      return jsonResponse({
        success: true,
        message: `تم حذف الاسم (${contactName}) بنجاح من قاعدة البيانات ومنع ظهوره في نتائج البحث.`,
        deletedCount: result.deletedCount,
        remaining: Math.max(0, limit - used),
        used,
        limit,
        user
      });
    }

    // 6. Ads View / Click / Convert Points / Transactions
    if (pathname === '/api/ads/view' && method === 'POST') {
      const { adId, phone } = body;
      if (!adId || !phone) {
        return jsonResponse({ error: 'مطلوب معرف الإعلان ورقم المستخدم.' }, 400);
      }

      const ad = await DbService.getAdById(adId);
      if (!ad) return jsonResponse({ error: 'الإعلان غير موجود.' }, 404);

      const user = await DbService.getUserByPhone(phone);
      if (!user) return jsonResponse({ error: 'المستخدم غير موجود.' }, 404);

      const settings = await DbService.getSettings();
      ad.views += 1;
      await DbService.saveAd(ad);

      user.consecutiveAdsWatched = (user.consecutiveAdsWatched || 0) + 1;
      let unlockedMsg = '';
      if (user.consecutiveAdsWatched >= 6) {
        user.unlockedUnlimited = true;
        unlockedMsg = ' ومبارك! تم تفعيل ميزة كشف جميع الأسماء والبحث الشامل لمشاهدتك 6 إعلانات متتالية!';
      }

      let rewardText = '';
      let rewardValue = 0;
      if (ad.type === 'rewarded') {
        user.searchBalance += ad.reward;
        rewardText = `الحصول على +${ad.reward} رصيد بحث إضافي` + unlockedMsg;
        rewardValue = ad.reward;
      } else {
        const pointsReward = ad.reward || settings.pointsPerAd;
        user.points += pointsReward;
        rewardText = `الحصول على +${pointsReward} نقطة لمشاهدة الإعلان` + unlockedMsg;
        rewardValue = pointsReward;
      }

      await DbService.saveUser(user);
      await DbService.addTransaction({
        userId: user.id,
        userPhone: user.phone,
        action:
          user.consecutiveAdsWatched >= 6
            ? `مشاهدة إعلان 6 متتالي: ${ad.title} (فتح كشف جميع الأسماء تلقائياً)`
            : `مشاهدة إعلان: ${ad.title}`,
        amount: rewardValue
      });

      return jsonResponse({
        message: 'تم تسجيل المشاهدة ومنح المكافأة بنجاح!',
        rewardText,
        user,
        ad
      });
    }

    if (pathname === '/api/ads/click' && method === 'POST') {
      const { adId } = body;
      const ad = await DbService.getAdById(adId);
      if (!ad) return jsonResponse({ error: 'الإعلان غير موجود.' }, 404);
      ad.clicks += 1;
      await DbService.saveAd(ad);
      return jsonResponse({ message: 'تم تسجيل الضغطة بنجاح', ad });
    }

    if (pathname === '/api/user/convert-points' && method === 'POST') {
      const { phone, option } = body;
      if (!phone || !option) {
        return jsonResponse({ error: 'الرقم ونوع التحويل مطلوبان.' }, 400);
      }

      const user = await DbService.getUserByPhone(phone);
      if (!user) return jsonResponse({ error: 'الحساب غير موجود.' }, 404);

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
        return jsonResponse({ error: 'خيار تحويل غير صالح.' }, 400);
      }

      if (user.points < cost) {
        return jsonResponse({ error: `عذراً، رصيد نقاطك غير كافٍ. تحتاج إلى ${cost} نقطة لتنفيذ هذه العملية.` }, 400);
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
        action:
          option === 'reveal_unlimited'
            ? 'تحويل نقاط لتفعيل كشف جميع الأسماء وتجاوز حد الـ 15 اسماً'
            : `تحويل نقاط لشراء رصيد بحث إضافي (+${searchesToAdd} عملية)`,
        amount: -cost
      });

      return jsonResponse({
        message:
          option === 'reveal_unlimited'
            ? 'تم خصم النقاط وتفعيل ميزة كشف جميع الأسماء بنجاح لرقمك!'
            : `تم تحويل النقاط وشحن رصيدك بـ +${searchesToAdd} عملية بحث بنجاح!`,
        user
      });
    }

    if (pathname === '/api/transactions' && method === 'GET') {
      const phone = searchParams.get('phone') || '';
      if (!phone) {
        return jsonResponse({ error: 'مطلوب رقم الهاتف.' }, 400);
      }

      const user = await DbService.getUserByPhone(phone);
      if (!user) {
        return jsonResponse([]);
      }

      const txs = (await DbService.getTransactions()).filter(t => t.userId === user.id);
      return jsonResponse(txs);
    }

    // 7. Admin Routes
    if (pathname.startsWith('/api/admin/')) {
      const isAdmin = await checkAdminAuth(options?.headers);
      if (!isAdmin) {
        return jsonResponse({ error: 'غير مصرح بالدخول للوحة التحكم. يتطلب صلاحيات المدير العام.' }, 403);
      }

      if (pathname === '/api/admin/stats' && method === 'GET') {
        return jsonResponse(await DbService.getAnalytics());
      }

      if (pathname === '/api/admin/reset-stats' && method === 'POST') {
        const result = await DbService.resetAnalytics(body?.target || 'all');
        return jsonResponse({ message: result.message, target: result.target });
      }

      if (pathname === '/api/admin/users' && method === 'GET') {
        return jsonResponse(await DbService.getUsers());
      }

      if (pathname === '/api/admin/users/toggle-status' && method === 'POST') {
        const user = await DbService.getUserById(body.userId);
        if (!user) return jsonResponse({ error: 'المستخدم غير موجود.' }, 404);
        user.isActive = !user.isActive;
        await DbService.saveUser(user);
        return jsonResponse({ message: `تم ${user.isActive ? 'تفعيل' : 'تعطيل'} حساب المستخدم بنجاح.`, user });
      }

      if (pathname === '/api/admin/users/grant-points' && method === 'POST') {
        const user = await DbService.getUserById(body.userId);
        if (!user) return jsonResponse({ error: 'المستخدم غير موجود.' }, 404);
        user.points += Number(body.amount);
        await DbService.saveUser(user);
        await DbService.addTransaction({
          userId: user.id,
          userPhone: user.phone,
          action: 'منح نقاط إدارية من لوحة التحكم',
          amount: Number(body.amount)
        });
        return jsonResponse({ message: 'تم منح النقاط بنجاح.', user });
      }

      if (pathname.startsWith('/api/admin/users/') && method === 'DELETE') {
        const id = pathname.split('/').pop() || '';
        const success = await DbService.deleteUser(id);
        return success
          ? jsonResponse({ message: 'تم حذف حساب المستخدم بنجاح.' })
          : jsonResponse({ error: 'المستخدم غير موجود.' }, 404);
      }

      if (pathname === '/api/admin/users/plan' && method === 'POST') {
        const {
          userId,
          canRevealRegistrar,
          revealRegistrarLimit,
          revealRegistrarUsed,
          canDeleteNames,
          nameDeletionsLimit,
          nameDeletionsUsed,
          points,
          searchBalance,
          isActive,
          unlockedUnlimited,
          contactsSynced
        } = body;

        const user = await DbService.getUserById(userId);
        if (!user) return jsonResponse({ error: 'المستخدم غير موجود.' }, 404);

        if (typeof canRevealRegistrar === 'boolean') user.canRevealRegistrar = canRevealRegistrar;
        if (typeof revealRegistrarLimit === 'number') user.revealRegistrarLimit = revealRegistrarLimit;
        if (typeof revealRegistrarUsed === 'number') user.revealRegistrarUsed = revealRegistrarUsed;
        if (typeof canDeleteNames === 'boolean') user.canDeleteNames = canDeleteNames;
        if (typeof nameDeletionsLimit === 'number') user.nameDeletionsLimit = nameDeletionsLimit;
        if (typeof nameDeletionsUsed === 'number') user.nameDeletionsUsed = nameDeletionsUsed;
        if (typeof points === 'number') user.points = points;
        if (typeof searchBalance === 'number') user.searchBalance = searchBalance;
        if (typeof isActive === 'boolean') user.isActive = isActive;
        if (typeof unlockedUnlimited === 'boolean') user.unlockedUnlimited = unlockedUnlimited;
        if (typeof contactsSynced === 'boolean') user.contactsSynced = contactsSynced;

        await DbService.saveUser(user);
        return jsonResponse({ message: 'تم حفظ وتحديث ملف وصلاحيات المستخدم بنجاح.', user });
      }

      if (pathname === '/api/admin/deleted-names' && method === 'GET') {
        return jsonResponse(await DbService.getDeletedNameRecords());
      }

      if (pathname === '/api/admin/restore-name' && method === 'POST') {
        const success = await DbService.restoreDeletedNameRecord(body.recordId);
        return success
          ? jsonResponse({ message: 'تم استعادة الاسم وإعادة إتاحته في نتائج البحث بنجاح!' })
          : jsonResponse({ error: 'سجل الحذف غير موجود أو تم استعادته مسبقاً.' }, 404);
      }

      if (pathname === '/api/admin/deleted-names/action' && method === 'POST') {
        const { recordIds, action } = body as {
          recordIds?: string[];
          action?: 'restore' | 'rehide' | 'delete_log';
        };
        if (!Array.isArray(recordIds) || recordIds.length === 0 || !action) {
          return jsonResponse({ error: 'يرجى تحديد السجلات ونوع الإجراء المطلوب تنفيذه.' }, 400);
        }
        const result = await DbService.bulkActionDeletedNameRecords(recordIds, action);
        if (!result.success) {
          return jsonResponse({ error: 'لم يتم العثور على السجلات المحددة أو تعذر تنفيذ الإجراء.' }, 404);
        }
        const actionMessages: Record<'restore' | 'rehide' | 'delete_log', string> = {
          restore: `تم تفعيل واستعادة (${result.processedCount}) اسم للظهور في نتائج البحث بنجاح!`,
          rehide: `تم إعادة إخفاء وتعطيل (${result.processedCount}) اسم من نتائج البحث بنجاح!`,
          delete_log: `تم مسح (${result.processedCount}) سجل من قائمة المحذوفات نهائياً!`
        };
        return jsonResponse({
          message: actionMessages[action],
          processedCount: result.processedCount
        });
      }

      if (pathname === '/api/admin/contacts' && method === 'GET') {
        const search = searchParams.get('search') || '';
        if (search.trim()) {
          const cleanSearch = search.trim();
          const contacts = /^\d+$/.test(cleanSearch)
            ? await DbService.queryContactsByPhone(cleanSearch, 500)
            : await DbService.queryContactsByName(cleanSearch, 500);
          return jsonResponse(contacts);
        }
        return jsonResponse(await DbService.getContacts());
      }

      if (pathname === '/api/admin/contacts' && method === 'POST') {
        const { phoneNumber, contactName } = body;
        if (!phoneNumber || !contactName) {
          return jsonResponse({ error: 'مطلوب رقم الهاتف والاسم.' }, 400);
        }
        const cleanNum = String(phoneNumber).trim().replace(/\s+/g, '');
        const contact = await DbService.addContact({
          phoneNumber: cleanNum,
          contactName: String(contactName).trim(),
          addedByUser: 'الإدارة'
        });
        return jsonResponse({ message: 'تم إضافة جهة الاتصال يدوياً بنجاح لقاعدة البيانات.', contact });
      }

      if (pathname === '/api/admin/contacts/edit' && method === 'POST') {
        const { id, phoneNumber, contactName, frequency } = body;
        if (!id || !phoneNumber || !contactName) {
          return jsonResponse({ error: 'مطلوب معرف جهة الاتصال، رقم الهاتف، والاسم لتحديثه.' }, 400);
        }
        const contact = await DbService.getContactById(id);
        if (!contact) return jsonResponse({ error: 'جهة الاتصال المطلوبة غير موجودة في قاعدة البيانات.' }, 404);
        contact.phoneNumber = String(phoneNumber).trim().replace(/\s+/g, '');
        contact.contactName = String(contactName).trim();
        if (frequency !== undefined) contact.frequency = Number(frequency) || 1;
        await DbService.updateContact(contact);
        return jsonResponse({ message: 'تم تعديل جهة الاتصال وتحديثها في قاعدة البيانات بنجاح.', contact });
      }

      if (pathname.startsWith('/api/admin/contacts/') && method === 'DELETE') {
        const id = pathname.split('/').pop() || '';
        const success = await DbService.deleteContact(id);
        return success
          ? jsonResponse({ message: 'تم حذف الرقم والاسم من قاعدة البيانات بنجاح.' })
          : jsonResponse({ error: 'جهة الاتصال غير موجودة.' }, 404);
      }

      if (pathname === '/api/admin/contacts/bulk' && method === 'POST') {
        const { contacts } = body;
        if (!contacts || !Array.isArray(contacts)) {
          return jsonResponse({ error: 'مطلوب إدخال مصفوفة من جهات الاتصال.' }, 400);
        }
        const formattedContacts = contacts
          .filter((c: any) => c && (c.phoneNumber || c.phone) && (c.contactName || c.name))
          .map((c: any) => ({
            phoneNumber: (c.phoneNumber || c.phone).toString(),
            contactName: (c.contactName || c.name).toString()
          }));
        const addedCount = await DbService.bulkAddContacts(formattedContacts);
        return jsonResponse({ message: `تم استيراد ${addedCount} اسماً بنجاح إلى قاعدة بيانات معروف بنجاح.` });
      }

      if (pathname === '/api/admin/ads' && method === 'POST') {
        const { title, type, source, mediaUrl, linkUrl, duration, reward } = body;
        if (!title || !type || !source) {
          return jsonResponse({ error: 'الحقول الأساسية مطلوبة: العنوان، النوع، والمصدر.' }, 400);
        }
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
        return jsonResponse({ message: 'تم إضافة الإعلان بنجاح.', ad: newAd });
      }

      if (pathname === '/api/admin/ads/toggle' && method === 'POST') {
        const ad = await DbService.getAdById(body.adId);
        if (!ad) return jsonResponse({ error: 'الإعلان غير موجود.' }, 404);
        ad.status = !ad.status;
        await DbService.saveAd(ad);
        return jsonResponse({ message: `تم ${ad.status ? 'تفعيل' : 'إيقاف'} الإعلان بنجاح.`, ad });
      }

      if (pathname.startsWith('/api/admin/ads/') && method === 'DELETE') {
        const id = pathname.split('/').pop() || '';
        const success = await DbService.deleteAd(id);
        return success
          ? jsonResponse({ message: 'تم حذف الإعلان بنجاح.' })
          : jsonResponse({ error: 'الإعلان غير موجود.' }, 404);
      }

      if (pathname === '/api/admin/settings' && method === 'POST') {
        const newSettings: SystemSettings = body;
        await DbService.saveSettings(newSettings);
        return jsonResponse({
          message: 'تم تحديث إعدادات نظام معروف بنجاح دون الحاجة لإعادة البرمجة.',
          settings: newSettings
        });
      }

      if (pathname === '/api/admin/vip-plans' && method === 'POST') {
        const plan = await DbService.saveVipPlan(body);
        return jsonResponse({ message: 'تم حفظ وتحديث باقة VIP بنجاح!', plan });
      }

      if (pathname.startsWith('/api/admin/vip-plans/') && method === 'DELETE') {
        const id = pathname.split('/').pop() || '';
        await DbService.deleteVipPlan(id);
        return jsonResponse({ message: 'تم حذف باقة VIP بنجاح!' });
      }
    }

    return jsonResponse({ error: `المسار البرمجي غير موجود: ${method} ${pathname}` }, 404);
  } catch (err: any) {
    return jsonResponse({ error: err?.message || 'خطأ في معالجة الطلب.' }, 500);
  }
}
