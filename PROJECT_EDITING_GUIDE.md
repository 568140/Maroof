# مشروع معروف — دليل التعديل والبناء

## محتويات المشروع

- `src/`: واجهة React ومكونات التطبيق.
- `src/App.tsx`: التنقل وحالة تسجيل الدخول والمزامنة.
- `src/components/`: مكونات البحث والمزامنة والموافقة القانونية ولوحة الإدارة.
- `src/utils/`: أدوات API وبصمة الجهاز والتنقل.
- `public/privacy.html`: سياسة الخصوصية.
- `public/terms.html`: شروط الاستخدام.
- `android/`: غلاف Android وWebView وManifest وصلاحيات جهات الاتصال.
- `api/` و`server.ts`: مسارات API والخادم.

## التشغيل المحلي

```bash
npm install
npm run dev
```

## فحص وبناء الموقع

```bash
npm run lint
npm run build
```

## بناء Android

تحتاج إلى Android SDK 36 وGradle 8.9 أو أحدث متوافق، ثم:

```bash
VITE_ANDROID=true VITE_API_BASE=https://maroof-beta.vercel.app npm run build
export ANDROID_SDK_ROOT=/path/to/android-sdk
/tmp/gradle-8.9/bin/gradle --no-daemon -p android assembleRelease bundleRelease
```

سيتم إنتاج:

- `android/app/build/outputs/apk/release/app-release.apk`
- `android/app/build/outputs/bundle/release/app-release.aab`

## التوقيع

ملف `android/keystore.properties` ومجلد `keys/` لا يتم تضمينهما في الحزمة حفاظًا على مفتاح توقيع Google Play. يجب استعادتهما من النسخة الاحتياطية الآمنة قبل بناء Release موقعة. لا تغيّر مفتاح التوقيع عند إصدار تحديثات للتطبيق المنشور.

## رفع إصدار جديد

زد `versionCode` في `android/app/build.gradle` في كل تحديث، ثم غيّر `versionName` عند الحاجة. ارفع ملف AAB إلى Google Play، واستخدم APK للاختبار اليدوي.

## السياسات

قبل نشر التطبيق، حدّث بريد الدعم وبيانات التواصل داخل `public/privacy.html` و`public/terms.html`، ثم انشرهما على رابط عام في Vercel وضع رابط سياسة الخصوصية في Google Play Console.
