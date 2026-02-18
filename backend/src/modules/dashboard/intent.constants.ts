/**
 * لیست بخش‌های پنل برای تحلیل نیت کاربر با LLM (هم‌تراز با frontend intent-targets).
 * فقط href و توضیح کوتاه برای پرامپت استفاده می‌شود.
 */
export const INTENT_OPTIONS: { href: string; label: string; desc: string }[] = [
  { href: '/dashboard', label: 'داشبورد', desc: 'خلاصه و دسترسی سریع' },
  { href: '/settings', label: 'تنظیمات', desc: 'اطلاعات کاربری و تنظیمات حساب' },
  { href: '/settings/api-keys', label: 'کلیدهای API', desc: 'کلید برای دسترسی برنامه‌نویسی' },
  { href: '/chat', label: 'چت هوشمند', desc: 'چت با هوش مصنوعی' },
  { href: '/text-studio', label: 'استودیو متن', desc: 'نوشتن و تولید متن' },
  { href: '/image-studio', label: 'استودیو تصویر', desc: 'خلق و تولید تصویر' },
  { href: '/audio-studio', label: 'استودیو صوت', desc: 'تبدیل متن به صدا و برعکس' },
  { href: '/agents', label: 'دستیارها', desc: 'لیست دستیارهای تخصصی' },
  { href: '/agents/student-tutor', label: 'دستیار دانش‌آموز', desc: 'معلم هوشمند برای درس و تمرین' },
  { href: '/agents/fitness-diet', label: 'دستیار ورزش و رژیم', desc: 'برنامه تمرینی، تغذیه، لاغری، تناسب اندام' },
  { href: '/agents/travel-tourism', label: 'دستیار گردشگری', desc: 'برنامه سفر و مقصد' },
  { href: '/agents/fashion', label: 'دستیار فشن و مد', desc: 'ست لباس، ست کردن، کمد، استایل، پوشش، لباس، فشن، مد' },
  { href: '/agents/home', label: 'دستیار خانه‌داری و آشپزی', desc: 'پخت غذا، بپزم، دستور پخت، قرمه سبزی، خورش، ناهار، شام، آشپزی، غذا درست کنم' },
  { href: '/agents/finance', label: 'دستیار مالی و سرمایه‌گذاری', desc: 'تحلیل و واچ‌لیست' },
  { href: '/agents/lifestyle', label: 'دستیار سبک زندگی', desc: 'روتین و برنامه‌ریزی روزانه' },
  { href: '/agents/instagram-admin', label: 'یار ادمین اینستاگرام', desc: 'تقویم محتوا و کپشن' },
  { href: '/agents/persian-pdf-maker', label: 'تبدیل به PDF فارسی', desc: 'متن یا ورد به PDF با کیفیت' },
  { href: '/billing', label: 'صورتحساب', desc: 'خرید سکه، بسته، پلن، شارژ، پرداخت، اعتبار' },
  { href: '/support', label: 'پشتیبانی', desc: 'تیکت و تماس با پشتیبانی' },
  { href: '/organizations', label: 'سازمان‌ها', desc: 'مدیریت سازمان و اعضا' },
  { href: '/knowledge', label: 'پایگاه دانش', desc: 'RAG و جستجو در اسناد' },
  { href: '/workflows', label: 'ورک‌فلوها', desc: 'اتوماسیون و گردش کار' },
  { href: '/jobs', label: 'کارهای صف', desc: 'وضعیت کارهای در صف' },
  { href: '/developer', label: 'مستندات API', desc: 'اسناد و تست API' },
  { href: '/admin', label: 'پنل ادمین', desc: 'مدیریت سیستم' },
];
