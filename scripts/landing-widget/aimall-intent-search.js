/**
 * AIMall — ویجت «میخوای چه کار کنی؟» برای صفحهٔ اصلی (HTML + JS)
 * با شماره موبایل از API تحلیل قصد استفاده می‌کند؛ در غیر این صورت فقط تطبیق کلیدواژه.
 *
 * پیکربندی (قبل از لود اسکریپت):
 *   window.AIMALL_INTENT_SEARCH_CONFIG = {
 *     baseUrl: 'https://panel.aifoapp.ir',   // آدرس پنل (برای لینک «ورود به بخش»)
 *     apiUrl: 'https://api.aifoapp.ir/api/v1', // آدرس API (برای تحلیل با AI؛ اختیاری)
 *     containerId: 'aimall-intent-search'
 *   };
 */
(function () {
  'use strict';

  var INTENT_TARGETS = [
    { href: '/dashboard', label: 'داشبورد', desc: 'خلاصه و دسترسی سریع', keywords: ['داشبورد', 'داشبورد اصلی', 'صفحه اصلی', 'خلاصه', 'dashboard', 'اول'] },
    { href: '/settings', label: 'تنظیمات', desc: 'اطلاعات کاربری و تنظیمات حساب', keywords: ['تنظیمات', 'پروفایل', 'نام', 'شماره', 'حساب کاربری', 'settings', 'ویرایش پروفایل'] },
    { href: '/settings/api-keys', label: 'کلیدهای API', desc: 'کلید برای دسترسی برنامه‌نویسی', keywords: ['کلید api', 'api key', 'کلید برنامه', 'توکن', 'developer key'] },
    { href: '/chat', label: 'چت هوشمند', desc: 'چت با هوش مصنوعی', keywords: ['چت', 'گفتگو', 'سوال', 'پرسش', 'هوش مصنوعی', 'ربات', 'مکالمه', 'chat', 'سوال بپرسم', 'جواب بگیرم', 'کمک بگیرم', 'بپرسم'] },
    { href: '/text-studio', label: 'استودیو متن', desc: 'نوشتن و تولید متن', keywords: ['متن', 'مقاله', 'نوشتن', 'تولید متن', 'محتوا', 'ترجمه', 'text', 'بنویسم', 'مقاله بنویسم', 'بازنویسی'] },
    { href: '/image-studio', label: 'استودیو تصویر', desc: 'خلق و تولید تصویر', keywords: ['تصویر', 'عکس', 'تولید تصویر', 'نقاشی', 'طراحی', 'image', 'عکس بسازم', 'تصویر بسازم', 'ایمیج'] },
    { href: '/audio-studio', label: 'استودیو صوت', desc: 'تبدیل متن به صدا و برعکس', keywords: ['صدا', 'صوت', 'تبدیل صدا', 'خواندن متن', 'متن به صدا', 'audio', 'صداسازی', 'ویس'] },
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
    { href: '/billing', label: 'صورتحساب', desc: 'خرید سکه و مدیریت اعتبار', keywords: ['صورتحساب', 'سکه', 'خرید سکه', 'پرداخت', 'اعتبار', 'شارژ', 'billing', 'مالی', 'واریز', 'تراکنش', 'موجودی', 'سکه بخرم'] },
    { href: '/support', label: 'پشتیبانی', desc: 'تیکت و تماس با پشتیبانی', keywords: ['پشتیبانی', 'تیکت', 'مشکل', 'کمک', 'تماس', 'support', 'خطا', 'گزارش', 'سوال از پشتیبانی', 'مشکل دارم'] },
    { href: '/organizations', label: 'سازمان‌ها', desc: 'مدیریت سازمان و اعضا', keywords: ['سازمان', 'تیم', 'اعضا', 'دعوت', 'organizations', 'سازمان\u200cها'] },
    { href: '/knowledge', label: 'پایگاه دانش', desc: 'RAG و جستجو در اسناد', keywords: ['دانش', 'پایگاه دانش', 'سند', 'رگ', 'rag', 'جستجو در سند', 'knowledge'] },
    { href: '/workflows', label: 'ورک‌فلوها', desc: 'اتوماسیون و گردش کار', keywords: ['ورکفلو', 'اتوماسیون', 'خودکار', 'workflow', 'گردش کار'] },
    { href: '/jobs', label: 'کارهای صف', desc: 'وضعیت کارهای در صف', keywords: ['صف', 'کارهای صف', 'jobs', 'وظایف', 'وضعیت کار'] },
    { href: '/developer', label: 'مستندات API', desc: 'اسناد و تست API', keywords: ['api', 'مستندات', 'developer', 'برنامه\u200cنویسی', 'سوئagger', 'docs'] },
    { href: '/admin', label: 'پنل ادمین', desc: 'مدیریت سیستم', keywords: ['ادمین', 'پنل ادمین', 'مدیریت', 'admin'] }
  ];

  var ALL_HREFS = {};
  for (var i = 0; i < INTENT_TARGETS.length; i++) {
    ALL_HREFS[INTENT_TARGETS[i].href] = true;
  }

  function matchIntent(text, allowedHrefs) {
    var t = (text || '').trim().toLowerCase();
    if (!t) return null;
    var best = null;
    var bestScore = 0;
    var targets = INTENT_TARGETS;
    for (var i = 0; i < targets.length; i++) {
      var target = targets[i];
      if (allowedHrefs && !allowedHrefs[target.href]) continue;
      for (var j = 0; j < target.keywords.length; j++) {
        var kw = target.keywords[j].toLowerCase();
        if (t.indexOf(kw) !== -1 && kw.length > bestScore) {
          bestScore = kw.length;
          best = target;
        }
      }
    }
    return best;
  }

  function escapeHtml(s) {
    if (s == null) return '';
    var div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }

  function normalizePhone(val) {
    if (typeof val !== 'string') return '';
    var fa = '۰۱۲۳۴۵۶۷۸۹';
    var s = val.replace(/[\u06F0-\u06F9]/g, function (d) { return String(fa.indexOf(d)); });
    s = s.replace(/\D/g, '');
    if (s.length === 10 && s.indexOf('9') === 0) s = '0' + s;
    if (s.length === 12 && s.indexOf('989') === 0) s = '0' + s.slice(2);
    return s;
  }

  function isValidPhone(phone) {
    return /^09\d{9}$/.test(phone);
  }

  function renderResult(resultEl, matched, baseUrl) {
    if (!matched || !matched.href) return;
    var link = baseUrl + (matched.href.indexOf('/') === 0 ? matched.href : '/' + matched.href);
    resultEl.hidden = false;
    resultEl.innerHTML =
      '<div class="aimall-intent-result-card" style="' + resultCardStyle + '">' +
        '<p class="aimall-intent-result-hint" style="' + resultHintStyle + '">به نظر می‌رسه می‌خوای:</p>' +
        '<p class="aimall-intent-result-label" style="' + resultLabelStyle + '">' + escapeHtml(matched.label) + '</p>' +
        '<p class="aimall-intent-result-desc" style="' + resultDescStyle + '">' + escapeHtml(matched.desc) + '</p>' +
        '<a href="' + escapeHtml(link) + '" class="aimall-intent-result-link" style="' + resultLinkStyle + '">ورود به بخش ←</a>' +
      '</div>';
  }

  function renderNoResult(resultEl) {
    resultEl.hidden = false;
    resultEl.innerHTML = '<p class="aimall-intent-no-result" style="' + noResultStyle + '">نتیجه‌ای پیدا نشد؛ عبارت دیگری امتحان کن یا از منوی سایت استفاده کن.</p>';
  }

  function init() {
    var config = window.AIMALL_INTENT_SEARCH_CONFIG || {};
    var baseUrl = (config.baseUrl || '').replace(/\/$/, '') || (window.location.origin + window.location.pathname.replace(/\/[^/]*$/, ''));
    var apiUrl = (config.apiUrl || '').replace(/\/$/, '');
    var containerId = config.containerId || 'aimall-intent-search';
    var container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML =
      '<div class="aimall-intent-card" style="' + cardStyle + '">' +
        '<div class="aimall-intent-header" style="' + headerStyle + '">' +
          '<span class="aimall-intent-title" style="' + titleStyle + '">میخوای چه کار کنی؟</span>' +
        '</div>' +
        '<p class="aimall-intent-desc" style="' + descStyle + '">نیاز یا کاری که می‌خوای انجام بدی رو بنویس؛ با وارد کردن شماره موبایل پیشنهاد دقیق‌تر (با هوش مصنوعی) دریافت می‌کنی.</p>' +
        '<form class="aimall-intent-form" style="' + formStyle + '">' +
          '<input type="tel" class="aimall-intent-phone" placeholder="شماره موبایل (مثال: 09123456789)" ' +
            'style="' + inputStyle + '" autocomplete="tel" aria-label="شماره موبایل" dir="ltr" inputmode="numeric">' +
          '<input type="text" class="aimall-intent-input" placeholder="مثال: میخوام یه تصویر بسازم، سوالی از هوش مصنوعی بپرسم..." ' +
            'style="' + inputStyle + '" autocomplete="off" aria-label="بنویس میخوای چه کار کنی">' +
          '<button type="submit" class="aimall-intent-btn" style="' + btnStyle + '" id="' + containerId + '-btn">تحلیل کن</button>' +
        '</form>' +
        '<div class="aimall-intent-result" style="' + resultWrapStyle + '" id="' + containerId + '-result" hidden></div>' +
      '</div>';

    var form = container.querySelector('.aimall-intent-form');
    var phoneInput = container.querySelector('.aimall-intent-phone');
    var input = container.querySelector('.aimall-intent-input');
    var resultEl = document.getElementById(containerId + '-result');
    var btn = document.getElementById(containerId + '-btn');

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var q = (input.value || '').trim();
      if (!q) return;
      var rawPhone = (phoneInput.value || '').trim();
      var phone = normalizePhone(rawPhone);
      var useApi = apiUrl && isValidPhone(phone);

      function applyMatch(matched) {
        if (matched) renderResult(resultEl, matched, baseUrl);
        else renderNoResult(resultEl);
      }

      if (useApi) {
        btn.disabled = true;
        btn.textContent = 'در حال تحلیل...';
        fetch(apiUrl + '/public/landing/intent/classify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: q, phone: phone })
        })
          .then(function (res) {
            if (res.ok) return res.json();
            if (res.status === 429) return null;
            throw new Error('network');
          })
          .then(function (data) {
            if (data && data.href && data.label) {
              applyMatch({ href: data.href, label: data.label, desc: data.desc || '' });
              return;
            }
            applyMatch(matchIntent(q, ALL_HREFS));
          })
          .catch(function () {
            applyMatch(matchIntent(q, ALL_HREFS));
          })
          .then(function () {
            btn.disabled = false;
            btn.textContent = 'تحلیل کن';
          });
      } else {
        if (apiUrl && rawPhone && !isValidPhone(phone)) {
          resultEl.hidden = false;
          resultEl.innerHTML = '<p class="aimall-intent-no-result" style="' + noResultStyle + '">شماره موبایل معتبر وارد کنید (مثال: 09123456789).</p>';
          return;
        }
        var matched = matchIntent(q, ALL_HREFS);
        applyMatch(matched);
      }
    });
  }

  var cardStyle = 'max-width: 560px; margin: 0 auto; padding: 1.5rem; border-radius: 1rem; border: 1px solid rgba(0,0,0,.08); background: linear-gradient(to bottom, rgba(59,130,246,.06), transparent); direction: rtl; text-align: right; font-family: Vazirmatn, Tahoma, sans-serif;';
  var headerStyle = 'display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.75rem;';
  var titleStyle = 'font-size: 1.125rem; font-weight: 600; color: #1e293b;';
  var descStyle = 'font-size: 0.875rem; color: #64748b; margin-bottom: 1rem; line-height: 1.5;';
  var formStyle = 'display: flex; flex-direction: column; gap: 0.5rem;';
  var inputStyle = 'width: 100%; padding: 0.75rem 1rem; border: 1px solid #e2e8f0; border-radius: 0.5rem; font-size: 1rem; font-family: inherit; box-sizing: border-box;';
  var btnStyle = 'padding: 0.75rem 1.25rem; background: #2563eb; color: #fff; border: none; border-radius: 0.5rem; font-size: 1rem; font-weight: 500; font-family: inherit; cursor: pointer;';
  var resultWrapStyle = 'margin-top: 1rem;';
  var resultCardStyle = 'padding: 1rem; border-radius: 0.75rem; border: 1px solid rgba(37,99,235,.25); background: rgba(255,255,255,.9);';
  var resultHintStyle = 'font-size: 0.75rem; color: #64748b; margin: 0 0 0.25rem 0;';
  var resultLabelStyle = 'font-size: 1rem; font-weight: 600; color: #1e293b; margin: 0;';
  var resultDescStyle = 'font-size: 0.875rem; color: #64748b; margin: 0.25rem 0 0.75rem 0;';
  var resultLinkStyle = 'display: inline-block; padding: 0.5rem 1rem; background: #2563eb; color: #fff; border-radius: 0.5rem; text-decoration: none; font-size: 0.875rem;';
  var noResultStyle = 'font-size: 0.875rem; color: #64748b; margin: 0;';

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
