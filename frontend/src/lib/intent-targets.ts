/**
 * همهٔ بخش‌های پنل و کلیدواژه‌های راهنما («میخوای چه کار کنی؟»)
 * از هر جای پنل کاربر می‌تواند بپرسد و به بخش مناسب هدایت شود.
 */
export interface IntentTarget {
  href: string;
  label: string;
  desc: string;
  keywords: string[];
}

export const INTENT_TARGETS: IntentTarget[] = [
  // ── داشبورد و تنظیمات ──
  { href: '/dashboard', label: 'داشبورد', desc: 'خلاصه و دسترسی سریع', keywords: ['داشبورد', 'داشبورد اصلی', 'صفحه اصلی', 'خلاصه', 'dashboard', 'اول'] },
  { href: '/settings', label: 'تنظیمات', desc: 'اطلاعات کاربری و تنظیمات حساب', keywords: ['تنظیمات', 'پروفایل', 'نام', 'شماره', 'حساب کاربری', 'settings', 'ویرایش پروفایل'] },
  { href: '/settings/api-keys', label: 'کلیدهای API', desc: 'کلید برای دسترسی برنامه‌نویسی', keywords: ['کلید api', 'api key', 'کلید برنامه', 'توکن', 'developer key'] },

  // ── چت و استودیوها ──
  { href: '/chat', label: 'چت هوشمند', desc: 'چت با هوش مصنوعی', keywords: ['چت', 'گفتگو', 'سوال', 'پرسش', 'هوش مصنوعی', 'ربات', 'مکالمه', 'chat', 'سوال بپرسم', 'جواب بگیرم', 'کمک بگیرم', 'بپرسم'] },
  { href: '/text-studio', label: 'استودیو متن', desc: 'نوشتن و تولید متن', keywords: ['متن', 'مقاله', 'نوشتن', 'تولید متن', 'محتوا', 'ترجمه', 'text', 'بنویسم', 'مقاله بنویسم', 'بازنویسی'] },
  { href: '/image-studio', label: 'استودیو تصویر', desc: 'خلق و تولید تصویر', keywords: ['تصویر', 'عکس', 'تولید تصویر', 'نقاشی', 'طراحی', 'image', 'عکس بسازم', 'تصویر بسازم', 'ایمیج'] },
  { href: '/audio-studio', label: 'استودیو صوت', desc: 'تبدیل متن به صدا و برعکس', keywords: ['صدا', 'صوت', 'تبدیل صدا', 'خواندن متن', 'متن به صدا', 'audio', 'تTS', 'استT', 'صداسازی', 'ویس'] },

  // ── دستیارها (عمومی و تخصصی) ──
  { href: '/agents', label: 'دستیارها', desc: 'لیست دستیارهای تخصصی', keywords: ['دستیار', 'ربات تخصصی', 'اژن', 'agent', 'دستیار تخصصی', 'لیست دستیار'] },
  { href: '/agents/student-tutor', label: 'دستیار دانش‌آموز', desc: 'معلم هوشمند برای درس و تمرین', keywords: ['دانش\u200cآموز', 'معلم', 'درس', 'تمرین', 'ریاضی', 'علوم', 'تدریس', 'student', 'مدرسه'] },
  { href: '/agents/fitness-diet', label: 'دستیار ورزش و رژیم', desc: 'برنامه تمرینی و تغذیه', keywords: ['ورزش', 'رژیم', 'تناسب اندام', 'تغذیه', 'برنامه تمرینی', 'fitness', 'دایت', 'کاهش وزن'] },
  { href: '/agents/travel-tourism', label: 'دستیار گردشگری', desc: 'برنامه سفر و مقصد', keywords: ['سفر', 'گردشگری', 'مقصد', 'برنامه سفر', 'طبیعت', 'travel', 'تور', 'مسافرت'] },
  { href: '/agents/fashion', label: 'دستیار فشن و مد', desc: 'ست‌ساز و مشاوره استایل', keywords: ['فشن', 'مد', 'استایل', 'ست\u200cساز', 'کمد', 'لباس', 'fashion', 'پوشش', 'ست لباس', 'ست کنم', 'ست درست کنم', 'ست کردن', 'با لباس', 'لباس هام', 'چه بپوشم'] },
  { href: '/agents/home', label: 'دستیار خانه‌داری و آشپزی', desc: 'دستور پخت و برنامه غذایی', keywords: ['آشپزی', 'خانه\u200cداری', 'دستور پخت', 'غذا', 'برنامه غذایی', 'home', 'پخت', 'خوراک', 'بپزم', 'قرمه سبزی', 'خورش', 'پختن', 'غذا درست کنم', 'دستور غذا', 'ناهار', 'شام'] },
  { href: '/agents/finance', label: 'دستیار مالی و سرمایه‌گذاری', desc: 'تحلیل و واچ‌لیست', keywords: ['مالی', 'سرمایه\u200cگذاری', 'واچ\u200cلیست', 'تحلیل', 'finance', 'سهام', 'بورس', 'معامله'] },
  { href: '/agents/lifestyle', label: 'دستیار سبک زندگی', desc: 'روتین و برنامه‌ریزی روزانه', keywords: ['سبک زندگی', 'روتین', 'تسک', 'عادت', 'برنامه\u200cریزی روزانه', 'lifestyle', 'کارهای روزانه'] },
  { href: '/agents/instagram-admin', label: 'یار ادمین اینستاگرام', desc: 'تقویم محتوا و کپشن', keywords: ['اینستاگرام', 'محتوا', 'ریلز', 'کپشن', 'هشتگ', 'برند', 'instagram', 'ادمین'] },
  { href: '/agents/persian-pdf-maker', label: 'تبدیل به PDF فارسی', desc: 'متن یا ورد به PDF با کیفیت', keywords: ['pdf', 'فارسی', 'تبدیل pdf', 'ورد به pdf', 'persian pdf', 'سند فارسی'] },

  // ── مالی و صورتحساب ──
  { href: '/billing', label: 'صورتحساب', desc: 'خرید سکه و مدیریت اعتبار', keywords: ['صورتحساب', 'سکه', 'خرید سکه', 'پرداخت', 'اعتبار', 'شارژ', 'billing', 'مالی', 'واریز', 'تراکنش', 'موجودی', 'سکه بخرم'] },

  // ── پشتیبانی ──
  { href: '/support', label: 'پشتیبانی', desc: 'تیکت و تماس با پشتیبانی', keywords: ['پشتیبانی', 'تیکت', 'مشکل', 'کمک', 'تماس', 'support', 'خطا', 'گزارش', 'سوال از پشتیبانی', 'مشکل دارم'] },

  // ── سازمان‌ها و تیم ──
  { href: '/organizations', label: 'سازمان‌ها', desc: 'مدیریت سازمان و اعضا', keywords: ['سازمان', 'تیم', 'اعضا', 'دعوت', 'organizations', 'سازمان\u200cها'] },

  // ── پایگاه دانش و ورک‌فلو ──
  { href: '/knowledge', label: 'پایگاه دانش', desc: 'RAG و جستجو در اسناد', keywords: ['دانش', 'پایگاه دانش', 'سند', 'رگ', 'rag', 'جستجو در سند', 'knowledge'] },
  { href: '/workflows', label: 'ورک‌فلوها', desc: 'اتوماسیون و گردش کار', keywords: ['ورکفلو', 'اتوماسیون', 'خودکار', 'workflow', 'گردش کار'] },
  { href: '/jobs', label: 'کارهای صف', desc: 'وضعیت کارهای در صف', keywords: ['صف', 'کارهای صف', 'jobs', 'وظایف', 'وضعیت کار'] },

  // ── مستندات و ادمین ──
  { href: '/developer', label: 'مستندات API', desc: 'اسناد و تست API', keywords: ['api', 'مستندات', 'developer', 'برنامه\u200cنویسی', 'سوئagger', 'docs'] },
  { href: '/admin', label: 'پنل ادمین', desc: 'مدیریت سیستم', keywords: ['ادمین', 'پنل ادمین', 'مدیریت', 'admin'] },
];

/**
 * متن کاربر را با کلیدواژه‌ها مقایسه می‌کند و بهترین بخش را برمی‌گرداند.
 * فقط بخش‌هایی که در allowedHrefs هستند پیشنهاد می‌شوند.
 */
export function matchIntent(
  text: string,
  allowedHrefs: Set<string>
): IntentTarget | null {
  const t = text.trim().toLowerCase();
  if (!t) return null;
  let best: IntentTarget | null = null;
  let bestScore = 0;
  for (const target of INTENT_TARGETS) {
    if (!allowedHrefs.has(target.href)) continue;
    for (const kw of target.keywords) {
      if (t.includes(kw.toLowerCase())) {
        const score = kw.length;
        if (score > bestScore) {
          bestScore = score;
          best = target;
        }
      }
    }
  }
  return best;
}

/** مجموعه همهٔ hrefهای قابل پیشنهاد (برای وقتی که فیلتر منو لازم نیست) */
export const ALL_INTENT_HREFS = new Set(INTENT_TARGETS.map((x) => x.href));
