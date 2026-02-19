/**
 * AIMall — ویجت «میخوای چه کار کنی؟» برای صفحهٔ اصلی (HTML + JS)
 * نسخهٔ ساده بدون API و بدون شماره موبایل؛ فقط با تطبیق کلیدواژه‌ها کاربر را به بخش مناسب هدایت می‌کند.
 *
 * استفاده:
 *   <div id="aimall-intent-search"></div>
 *   <script>
 *     window.AIMALL_INTENT_SEARCH_CONFIG = {
 *       baseUrl: 'https://panel.aifoapp.ir', // آدرس پنل برای لینک «ورود به بخش»
 *       containerId: 'aimall-intent-search'   // اختیاری، پیش‌فرض همین
 *     };
 *   </script>
 *   <script src="aimall-intent-search.js"></script>
 */
(function () {
  'use strict';

  var INTENT_TARGETS = [
    { href: '/chat', label: 'چت هوشمند', desc: 'چت با هوش مصنوعی',
      keywords: ['چت','گفتگو','سوال','پرسش','هوش مصنوعی','ربات','chat','بپرسم','جواب بگیرم','کمک بگیرم'] },
    { href: '/text-studio', label: 'استودیو متن', desc: 'نوشتن و تولید متن',
      keywords: ['متن','مقاله','نوشتن','تولید متن','محتوا','ترجمه','text','بازنویسی'] },
    { href: '/image-studio', label: 'استودیو تصویر', desc: 'خلق و تولید تصویر',
      keywords: ['تصویر','عکس','تولید تصویر','نقاشی','طراحی','image','عکس بسازم','تصویر بسازم'] },
    { href: '/audio-studio', label: 'استودیو صوت', desc: 'تبدیل متن به صدا و برعکس',
      keywords: ['صدا','صوت','تبدیل صدا','متن به صدا','ویس','tts','audio'] },
    { href: '/agents', label: 'دستیارها', desc: 'لیست دستیارهای تخصصی',
      keywords: ['دستیار','agent','ربات تخصصی','لیست دستیار'] },
    { href: '/billing', label: 'صورتحساب', desc: 'خرید سکه و مدیریت اعتبار',
      keywords: ['صورتحساب','سکه','خرید سکه','شارژ','پرداخت','اعتبار','billing'] },
    { href: '/support', label: 'پشتیبانی', desc: 'تیکت و تماس با پشتیبانی',
      keywords: ['پشتیبانی','تیکت','مشکل','کمک','support','گزارش','سوال از پشتیبانی'] },
    { href: '/knowledge', label: 'پایگاه دانش', desc: 'RAG و جستجو در اسناد',
      keywords: ['دانش','پایگاه دانش','سند','rag','جستجو در سند','knowledge'] },
    { href: '/workflows', label: 'ورک‌فلوها', desc: 'اتوماسیون و گردش کار',
      keywords: ['ورکفلو','workflow','اتوماسیون','گردش کار'] }
  ];

  function matchIntent(text) {
    var t = (text || '').trim().toLowerCase();
    if (!t) return null;
    var best = null;
    var bestScore = 0;
    for (var i = 0; i < INTENT_TARGETS.length; i++) {
      var target = INTENT_TARGETS[i];
      for (var j = 0; j < target.keywords.length; j++) {
        var kw = String(target.keywords[j]).toLowerCase();
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

  function init() {
    var config = window.AIMALL_INTENT_SEARCH_CONFIG || {};
    var baseUrl = (config.baseUrl || '').replace(/\/$/, '') || window.location.origin.replace(/\/$/, '');
    var containerId = config.containerId || 'aimall-intent-search';
    var container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML =
      '<div class="ai-intent-card">' +
        '<div class="ai-intent-header">' +
          '<div class="ai-intent-icon">✨</div>' +
          '<div>' +
            '<div class="ai-intent-title">میخوای چه کار کنی؟</div>' +
            '<div class="ai-intent-subtitle">نیازت رو بنویس تا بخش مناسب رو بهت پیشنهاد بدیم.</div>' +
          '</div>' +
        '</div>' +
        '<form class="ai-intent-form">' +
          '<input type="text" class="ai-intent-input" ' +
            'placeholder="مثال: میخوام یه تصویر بسازم، با هوش مصنوعی حرف بزنم..." ' +
            'aria-label="بنویس میخوای چه کار کنی">' +
          '<button type="submit" class="ai-intent-button">تحلیل کن</button>' +
        '</form>' +
        '<div class="ai-intent-result" hidden></div>' +
      '</div>';

    var style = document.createElement('style');
    style.textContent = ""
      + ".ai-intent-card{max-width:640px;margin:2rem auto;padding:1.5rem 1.75rem;border-radius:1.25rem;"
      + "border:1px solid rgba(15,23,42,0.08);background:radial-gradient(circle at top right,rgba(59,130,246,0.15),transparent 55%),"
      + "linear-gradient(to bottom,rgba(248,250,252,0.95),#ffffff);box-shadow:0 18px 45px rgba(15,23,42,0.08);direction:rtl;"
      + "text-align:right;font-family:Vazirmatn,system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;}"
      + ".ai-intent-header{display:flex;align-items:center;gap:.75rem;margin-bottom:1rem;}"
      + ".ai-intent-icon{width:40px;height:40px;border-radius:999px;display:flex;align-items:center;justify-content:center;"
      + "background:rgba(37,99,235,0.08);color:#2563eb;font-size:1.2rem;}"
      + ".ai-intent-title{font-size:1.2rem;font-weight:700;color:#0f172a;}"
      + ".ai-intent-subtitle{font-size:.875rem;color:#64748b;margin-top:.1rem;}"
      + ".ai-intent-form{display:flex;flex-direction:column;gap:.75rem;margin-top:.5rem;}"
      + ".ai-intent-input{width:100%;padding:.75rem .9rem;border-radius:.75rem;border:1px solid #e2e8f0;background:#f8fafc;"
      + "font-size:.95rem;font-family:inherit;box-sizing:border-box;outline:none;transition:border-color .15s,box-shadow .15s,background-color .15s;}"
      + ".ai-intent-input:focus{border-color:#2563eb;background:#ffffff;box-shadow:0 0 0 1px rgba(37,99,235,0.35);}"
      + ".ai-intent-button{align-self:flex-start;padding:.65rem 1.3rem;border-radius:999px;border:none;"
      + "background:linear-gradient(135deg,#2563eb,#4f46e5);color:#fff;font-size:.9rem;font-weight:600;font-family:inherit;cursor:pointer;"
      + "box-shadow:0 12px 30px rgba(37,99,235,0.35);display:inline-flex;align-items:center;gap:.35rem;}"
      + ".ai-intent-button::after{content:'→';transform:scaleX(-1);font-size:.9rem;}"
      + ".ai-intent-button:hover{filter:brightness(1.03);}"
      + ".ai-intent-button:active{transform:translateY(1px);box-shadow:0 6px 18px rgba(37,99,235,0.35);}"
      + ".ai-intent-result{margin-top:1.1rem;padding-top:.85rem;border-top:1px dashed rgba(148,163,184,0.6);font-size:.9rem;}"
      + ".ai-intent-result-card{display:flex;flex-direction:column;gap:.4rem;}"
      + ".ai-intent-result-hint{color:#64748b;margin:0;font-size:.8rem;}"
      + ".ai-intent-result-label{margin:0;font-weight:600;color:#0f172a;}"
      + ".ai-intent-result-desc{margin:0;color:#64748b;}"
      + ".ai-intent-result-link{margin-top:.5rem;display:inline-flex;align-items:center;gap:.3rem;font-size:.85rem;color:#2563eb;"
      + "text-decoration:none;font-weight:600;}"
      + ".ai-intent-result-link::before{content:'←';font-size:.9rem;}"
      + ".ai-intent-no-result{margin:0;color:#64748b;}"
      + "@media(max-width:600px){.ai-intent-card{margin:1.5rem 1rem;padding:1.25rem 1.2rem;}}";
    document.head.appendChild(style);

    var form = container.querySelector('.ai-intent-form');
    var input = container.querySelector('.ai-intent-input');
    var resultEl = container.querySelector('.ai-intent-result');

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var q = (input.value || '').trim();
      if (!q) return;
      var matched = matchIntent(q);
      if (matched) {
        var link = baseUrl + matched.href;
        resultEl.hidden = false;
        resultEl.innerHTML =
          '<div class="ai-intent-result-card">' +
            '<p class="ai-intent-result-hint">به نظر می‌رسه می‌خوای:</p>' +
            '<p class="ai-intent-result-label">' + escapeHtml(matched.label) + '</p>' +
            '<p class="ai-intent-result-desc">' + escapeHtml(matched.desc) + '</p>' +
            '<a class="ai-intent-result-link" href="' + escapeHtml(link) + '">ورود به بخش</a>' +
          '</div>';
      } else {
        resultEl.hidden = false;
        resultEl.innerHTML =
          '<p class="ai-intent-no-result">نتیجه‌ای پیدا نشد؛ عبارت دیگری امتحان کن یا از منوی سایت استفاده کن.</p>';
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

