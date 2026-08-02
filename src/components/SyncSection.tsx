import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldCheck, Database, FileText, CheckCircle, Smartphone, Info, RefreshCw, AlertCircle, Upload, FileSpreadsheet, HelpCircle } from 'lucide-react';
import { User } from '../types';

interface SyncSectionProps {
  currentUser: User | null;
  onSyncContacts: (contacts: { name: string; phone: string }[]) => Promise<{ user: User; importedCount: number }>;
  showToast: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
  setActiveTab: (tab: string) => void;
}

export default function SyncSection({
  currentUser,
  onSyncContacts,
  showToast,
  setActiveTab,
}: SyncSectionProps) {
  const [syncing, setSyncing] = useState(false);
  const [successCount, setSuccessCount] = useState<number | null>(null);
  const [manualText, setManualText] = useState('');
  const [syncMethod, setSyncMethod] = useState<'real' | 'manual'>('real');
  const [parsedContactsCount, setParsedContactsCount] = useState<number>(0);
  const [pendingContacts, setPendingContacts] = useState<{ name: string; phone: string }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- 1. Web Contacts Picker API Integration ---
  const handleWebContactsPicker = async () => {
    // Check if running inside an iframe (like AI Studio preview frame)
    const isIframe = window.self !== window.top;
    if (isIframe) {
      showToast('ميزة الوصول المباشر لدليل المتصفح محجوبة أمنياً داخل الإطارات الفرعية (Iframe). يرجى فتح التطبيق في علامة تبويب جديدة أو استخدام رفع ملف vCard أدناه.', 'warning');
      return;
    }

    // Check support
    const nav = navigator as any;
    if (!nav.contacts || !nav.contacts.select) {
      showToast('متصفحك الحالي لا يدعم الوصول المباشر لدليل الهاتف. يرجى استخدام طريقة تصدير ملف vCard أدناه.', 'info');
      return;
    }

    try {
      setSyncing(true);
      setSuccessCount(null);
      // Request permission and select contacts
      const props = ['name', 'tel'];
      const opts = { multiple: true };
      const selectedContacts = await nav.contacts.select(props, opts);

      if (!selectedContacts || selectedContacts.length === 0) {
        showToast('لم يتم اختيار أي جهة اتصال.', 'warning');
        setSyncing(false);
        return;
      }

      // Parse browser contacts format to server format
      const formatted: { name: string; phone: string }[] = [];
      selectedContacts.forEach((c: any) => {
        const name = c.name && c.name[0] ? c.name[0] : 'جهة اتصال';
        const phoneList = c.tel || [];
        phoneList.forEach((phoneNum: string) => {
          formatted.push({
            name: name,
            phone: phoneNum
          });
        });
      });

      if (formatted.length === 0) {
        showToast('لم نجد أرقام هواتف صالحة في جهات الاتصال المحددة.', 'warning');
        setSyncing(false);
        return;
      }

      const response = await onSyncContacts(formatted);
      setSuccessCount(response.importedCount);
      showToast(`تمت مزامنة حقيقية لـ ${response.importedCount} جهة اتصال بنجاح!`, 'success');
    } catch (err: any) {
      console.error('Contacts Picker error:', err);
      showToast('فشل فتح دليل الهاتف أو رفض المستخدم الإذن.', 'error');
    } finally {
      setSyncing(false);
    }
  };

  // --- 2. VCF / CSV / TXT File Upload & Parsing ---
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSyncing(true);
    setSuccessCount(null);
    setPendingContacts([]);
    setParsedContactsCount(0);

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        let parsed: { name: string; phone: string }[] = [];

        if (file.name.endsWith('.vcf')) {
          // Parse vCard (VCF) format
          const cards = text.split(/BEGIN:VCARD/i);
          cards.forEach(card => {
            if (!card.trim()) return;
            const fnMatch = card.match(/FN:(.+)/i) || card.match(/FN;[^:]*:(.+)/i);
            const telMatch = card.match(/TEL;[^:]*:(.+)/i) || card.match(/TEL:(.+)/i);
            if (telMatch) {
              const name = fnMatch ? fnMatch[1].trim() : 'جهة اتصال مجهولة';
              // strip any linebreaks or formatting
              const phone = telMatch[1].replace(/[\r\n]/g, '').trim();
              parsed.push({ name, phone });
            }
          });
        } else {
          // Parse CSV / TXT
          const lines = text.split('\n');
          lines.forEach(line => {
            if (!line.trim()) return;
            const parts = line.split(/[,;\t]/);
            if (parts.length >= 2) {
              parsed.push({
                name: parts[0].trim(),
                phone: parts[1].trim()
              });
            } else {
              const phoneMatch = line.match(/\+?\d[\d\s-]{6,14}\d/);
              if (phoneMatch) {
                const phone = phoneMatch[0].replace(/[^\d+]/g, '');
                const name = line.replace(phoneMatch[0], '').trim();
                if (name) {
                  parsed.push({ name, phone });
                }
              }
            }
          });
        }

        // Clean & Filter
        parsed = parsed.filter(c => c.name && c.phone);

        if (parsed.length === 0) {
          showToast('لم نعثر على أي جهات اتصال صالحة في الملف المرفوع.', 'error');
          setSyncing(false);
          return;
        }

        setPendingContacts(parsed);
        setParsedContactsCount(parsed.length);
        showToast(`تم العثور على ${parsed.length} جهة اتصال بالملف. اضغط على زر الحفظ للمزامنة الفورية.`, 'success');
      } catch (err) {
        showToast('حدث خطأ أثناء معالجة وقراءة الملف.', 'error');
      } finally {
        setSyncing(false);
      }
    };

    reader.readAsText(file);
  };

  const handleSaveUploadedContacts = async () => {
    if (pendingContacts.length === 0) return;
    setSyncing(true);
    try {
      const response = await onSyncContacts(pendingContacts);
      setSuccessCount(response.importedCount);
      showToast(`تمت مزامنة حقيقية لـ ${response.importedCount} جهة اتصال بنجاح!`, 'success');
      setPendingContacts([]);
      setParsedContactsCount(0);
    } catch (err: any) {
      showToast(err.message || 'فشلت المزامنة لقاعدة البيانات.', 'error');
    } finally {
      setSyncing(false);
    }
  };



  // --- 4. Manual Textarea Sync ---
  const handleManualSync = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualText.trim()) {
      showToast('يرجى كتابة جهات اتصال للمزامنة.', 'warning');
      return;
    }

    setSyncing(true);
    setSuccessCount(null);

    const lines = manualText.split('\n');
    const parsedContacts: { name: string; phone: string }[] = [];

    lines.forEach(line => {
      const parts = line.split(/[,;\t]/);
      if (parts.length >= 2) {
        parsedContacts.push({
          name: parts[0].trim(),
          phone: parts[1].trim().replace(/[^\d+]/g, '')
        });
      } else {
        const phoneMatch = line.match(/\+?\d[\d\s-]{6,14}\d/);
        if (phoneMatch) {
          const phone = phoneMatch[0].replace(/[^\d+]/g, '');
          const name = line.replace(phoneMatch[0], '').trim();
          if (name) {
            parsedContacts.push({ name, phone });
          }
        }
      }
    });

    if (parsedContacts.length === 0) {
      showToast('لم نتمكن من فرز جهات الاتصال. يرجى استخدام الصيغة: الاسم, الرقم', 'error');
      setSyncing(false);
      return;
    }

    try {
      const response = await onSyncContacts(parsedContacts);
      setSuccessCount(response.importedCount);
      showToast(`تمت مزامنة ${response.importedCount} جهة اتصال مضافة يدوياً!`, 'success');
      setManualText('');
    } catch (err: any) {
      showToast(err.message || 'فشلت المزامنة اليدوية.', 'error');
    } finally {
      setSyncing(false);
    }
  };

  if (!currentUser) {
    return (
      <div className="max-w-xl mx-auto text-center py-10 bg-[#0c122b]/60 border border-[#c5a059]/10 rounded-2xl p-6">
        <Smartphone className="w-12 h-12 text-[#c5a059] mx-auto mb-4" />
        <h3 className="text-white font-bold text-lg">مزامنة جهات الاتصال</h3>
        <p className="text-gray-400 text-xs mt-2 max-w-sm mx-auto">
          يرجى تسجيل الدخول برقم هاتفك أولاً لتتمكن من مزامنة جهات اتصالك وتفعيل حسابك للبحث المجاني عن الهويات.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto space-y-6">
      {/* Informative Header */}
      <div className="text-center space-y-2 py-2">
        <h2 className="text-white text-xl md:text-2xl font-extrabold text-gradient">مزامنة دفتر الأرقام</h2>
        <p className="text-gray-400 text-xs max-w-md mx-auto">
          تتم مزامنة ما لم يتم مزامنته سابقاً فقط لمنع التكرار، مما يعزز دقة دليل الهاتف اليمني معروف
        </p>
      </div>

      {/* Sync Status Badge */}
      <div className={`p-4 rounded-xl border text-right ${currentUser.contactsSynced ? 'bg-[#c5a059]/10 border-[#c5a059]/30' : 'bg-red-950/20 border-red-900/30'}`}>
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${currentUser.contactsSynced ? 'bg-gradient-to-tr from-[#152e1c] to-[#20512f] border border-green-500/30 text-green-400' : 'bg-gradient-to-tr from-red-950 to-red-900/30 border border-red-500/20 text-red-400'}`}>
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-white text-sm font-bold">
              حالة التفعيل: {currentUser.contactsSynced ? 'الحساب مفعل (نشط)' : 'غير مفعل'}
            </h4>
            <p className="text-gray-400 text-[11px] mt-0.5">
              {currentUser.contactsSynced 
                ? 'لقد قمت بمزامنة جهات الاتصال سابقاً. تضمن خوارزمية الذكاء الاصطناعي تفادي التكرار نهائياً وتنزيل الأسماء الجديدة فقط!' 
                : 'تحتاج لمزامنة جهات اتصالك لتفعيل محرك البحث وحصولك على الرصيد اليومي والترويجي.'}
            </p>
          </div>
        </div>
      </div>

      {/* Method tabs */}
      <div className="flex rounded-lg bg-black/40 p-1 border border-white/5" dir="rtl">
        <button
          onClick={() => { setSyncMethod('real'); setSuccessCount(null); }}
          className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${syncMethod === 'real' ? 'bg-[#c5a059]/20 text-[#e5c158]' : 'text-gray-400 hover:text-white'}`}
        >
          مزامنة حقيقية بالملف
        </button>
        <button
          onClick={() => { setSyncMethod('manual'); setSuccessCount(null); }}
          className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${syncMethod === 'manual' ? 'bg-[#c5a059]/20 text-[#e5c158]' : 'text-gray-400 hover:text-white'}`}
        >
          مزامنة يدوية
        </button>
      </div>

      {/* Main Action area */}
      <div className="bg-[#0c122b]/80 border border-[#c5a059]/20 rounded-2xl p-5 md:p-6 shadow-[0_10px_30px_rgba(0,0,0,0.5)] backdrop-blur-md text-right">
        <AnimatePresence mode="wait">
          {syncMethod === 'real' && (
            <motion.div
              key="real-sync"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-5"
            >
              <div className="space-y-2">
                <h3 className="text-white text-sm font-bold flex items-center gap-1.5 justify-end">
                  <span>المزامنة الحقيقية لأسماء الهاتف المرفوعة</span>
                  <Upload className="w-4 h-4 text-[#e5c158]" />
                </h3>
                <p className="text-gray-400 text-xs leading-relaxed">
                  نظراً للقيود الأمنية للمتصفحات، فإن الطريقة الأكثر دقة وسرعة لمزامنة هاتفك الحقيقي هي تصدير جهات الاتصال الخاصة بك إلى ملف vCard (.vcf) ورفعه هنا.
                </p>
              </div>

              {/* Browser API trigger (if supported) */}
              {'contacts' in (navigator as any) && (
                <button
                  onClick={handleWebContactsPicker}
                  disabled={syncing}
                  className="w-full py-3 bg-[#1e295d] hover:bg-[#25357a] text-white border border-[#c5a059]/30 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2"
                >
                  <Smartphone className="w-4 h-4 text-[#e5c158]" />
                  <span>مزامنة مباشرة من دليل المتصفح</span>
                </button>
              )}

              {/* Drag and Drop Zone */}
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-[#c5a059]/30 hover:border-[#e5c158]/60 bg-black/30 rounded-2xl p-6 text-center cursor-pointer transition-all space-y-3"
              >
                <input 
                  type="file" 
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept=".vcf,.csv,.txt"
                  className="hidden"
                />
                <FileSpreadsheet className="w-10 h-10 text-[#c5a059] mx-auto animate-pulse" />
                <div>
                  <p className="text-white text-xs font-bold">اسحب وأفلت ملف جهات الاتصال أو انقر للاختيار</p>
                  <p className="text-gray-500 text-[10px] mt-1">يدعم ملفات vCard (.vcf) أو ملفات Excel (.csv)</p>
                </div>
              </div>

              {/* Pending Upload Summary */}
              {parsedContactsCount > 0 && (
                <div className="p-3 bg-[#152e1c] border border-green-500/20 rounded-xl flex items-center justify-between text-right">
                  <button
                    onClick={handleSaveUploadedContacts}
                    disabled={syncing}
                    className="px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white font-black text-xs rounded-lg hover:brightness-110 transition-all flex items-center gap-1.5"
                  >
                    {syncing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : null}
                    <span>حفظ ومزامنة الآن</span>
                  </button>
                  <div>
                    <span className="text-white text-xs font-bold block">تم فحص وقراءة الملف بنجاح!</span>
                    <span className="text-green-400 text-[11px]">تم فك ترميز {parsedContactsCount} جهة اتصال جاهزة.</span>
                  </div>
                </div>
              )}

              {/* VCF Export Instructions Accordion */}
              <div className="p-3 bg-black/40 rounded-xl border border-white/5 space-y-2">
                <span className="text-[11px] text-[#e5c158] font-bold flex items-center gap-1.5 justify-end">
                  <span>كيف أقوم بتصدير ملف جهات الاتصال من هاتفي؟</span>
                  <HelpCircle className="w-3.5 h-3.5" />
                </span>
                
                <div className="grid grid-cols-2 gap-3 text-[10px] text-gray-400 text-right" dir="rtl">
                  <div className="space-y-1 bg-white/5 p-2 rounded-lg">
                    <span className="text-white font-bold block">لهواتف أندرويد (جالكسي/شاومي):</span>
                    <ol className="list-decimal list-inside space-y-0.5">
                      <li>افتح تطبيق جهات الاتصال</li>
                      <li>انقر على الإعدادات أو "إدارة جهات الاتصال"</li>
                      <li>اختر "استيراد/تصدير" ثم "تصدير"</li>
                      <li>احفظ الملف بصيغة .vcf وارفعه هنا</li>
                    </ol>
                  </div>
                  <div className="space-y-1 bg-white/5 p-2 rounded-lg">
                    <span className="text-white font-bold block">لهواتف آيفون (iPhone):</span>
                    <ol className="list-decimal list-inside space-y-0.5">
                      <li>افتح تطبيق جهات الاتصال</li>
                      <li>انقر على "تصدير جهات الاتصال" بالأسفل</li>
                      <li>أو افتح iCloud.com ثم جهات الاتصال</li>
                      <li>اختر تصدير vCard، وارفعه هنا</li>
                    </ol>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {syncMethod === 'manual' && (
            <motion.div
              key="manual-sync"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              <form onSubmit={handleManualSync} className="space-y-4">
                <div className="space-y-1.5">
                  <h3 className="text-white text-sm font-bold flex items-center gap-1.5 justify-end">
                    <span>لصق الأسماء والأرقام</span>
                    <FileText className="w-4 h-4 text-[#e5c158]" />
                  </h3>
                  <p className="text-gray-400 text-xs">
                    اكتب أو الصق أرقامك والأسماء المرتبطة بها. اكتب اسماً واحداً ورقماً في كل سطر مفصولاً بفاصلة.
                  </p>
                  <textarea
                    value={manualText}
                    onChange={(e) => setManualText(e.target.value)}
                    placeholder="محمد أحمد, 771234567&#10;مكتب المهندس علي, 770000000&#10;أبو خالد اليماني, 731234567"
                    rows={5}
                    className="w-full p-3 rounded-xl bg-black/40 border border-[#c5a059]/15 text-white placeholder-gray-600 focus:border-[#e5c158] transition-all text-right text-xs font-mono outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={syncing}
                  className="w-full py-3 bg-gradient-to-r from-[#e5c158] to-[#c5a059] text-black font-bold text-sm rounded-xl hover:brightness-110 transition-all flex items-center justify-center gap-2"
                >
                  {syncing ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      <span>مزامنة جهات الاتصال المدخلة</span>
                    </>
                  )}
                </button>
              </form>
            </motion.div>
          )}


        </AnimatePresence>

        {/* Success Status feedback */}
        {successCount !== null && (
          <div className="mt-5 p-4 rounded-xl bg-green-950/20 border border-green-500/20 space-y-3">
            <div className="flex items-start gap-2">
              <CheckCircle className="w-5 h-5 text-green-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-white text-xs font-bold">تمت عملية المزامنة الحقيقية بنجاح!</h4>
                <p className="text-gray-400 text-[10px] mt-0.5">
                  تمت تصفية وتحديث <span className="text-green-400 font-bold">+{successCount}</span> جهة اتصال بقاعدة البيانات دون أي تكرار للمدخرات السابقة.
                </p>
              </div>
            </div>
            
            <div className="flex justify-between items-center text-[11px] pt-2 border-t border-white/5">
              <span className="text-[#e5c158] font-bold">+50 نقطة</span>
              <span className="text-gray-400">مكافأة تنشيط الحساب المحدثة</span>
            </div>
            <div className="flex justify-between items-center text-[11px]">
              <span className="text-white font-bold">3 / 3 يومياً</span>
              <span className="text-gray-400">رصيد البحث المجاني المتاح حالياً</span>
            </div>

            <button
              onClick={() => setActiveTab('search')}
              className="w-full mt-2 py-2 bg-gradient-to-r from-green-600 to-green-700 text-white font-bold text-xs rounded-lg shadow-md hover:brightness-110"
            >
              الانتقال لمحرك البحث الآن
            </button>
          </div>
        )}
      </div>

      {/* Safety & Integrity Warning */}
      <div className="p-4 bg-gradient-to-br from-[#121424] to-[#0c122b] rounded-xl border border-white/5 space-y-2 text-right">
        <h4 className="text-[#e5c158] text-xs font-bold flex items-center gap-1.5 justify-end">
          <span>حماية الخصوصية والتحكم بالتكرار</span>
          <Info className="w-3.5 h-3.5" />
        </h4>
        <p className="text-gray-400 text-[10px] leading-relaxed">
          جميع جهات الاتصال المرفوعة تمر بعملية مطابقة خوارزمية ذكية لمزامنة الأسماء الجديدة والمنقحة فقط. لا يتم تكرار السجلات المدخلة في المرات السابقة لحفظ أداء قاعدة البيانات.
        </p>
      </div>
    </div>
  );
}

