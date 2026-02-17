# ادغام دستیارهای جدید (فشن، خانه‌داری، مالی، سبک زندگی، اینستاگرام)

## فاز ۰ — کشف و هم‌راستاسازی

### ساختار فعلی Assistants

- **لیست دستیارها:** `frontend/src/app/(dashboard)/agents/page.tsx`
  - داده از API: `api.getAgents()`؛ Fallback: آرایهٔ `FALLBACK_AGENTS` با فیلدهای id, name, description, tags, status, icon, coinCost
  - کارت‌ها: Card با آیکن (ICON_MAP)، نام، توضیح، تگ‌ها، دکمه «باز کردن» → `router.push(/agents/${id})`
- **مسیر هر دستیار:** پوشهٔ `agents/[slug]/page.tsx` مثلاً `travel-tourism/page.tsx`, `fitness-diet/page.tsx`, `student-tutor/page.tsx`
- **الگوی صفحهٔ دستیار:** یک `page.tsx` (state + API) و یک `*-view.tsx` (UI). state شامل: conversationId, message, streaming, streamText، و برای هر دستیار تنظیمات خاص (مثلاً level, style, mode). ارسال با `api.createAgentConversation(agentId)`, `api.agentStreamUrl(agentId, convId, message, params)` و EventSource.
- **بک‌اند:** `backend/src/modules/agents/agents.service.ts`
  - آرایهٔ `AGENTS` (AgentDefinition)، متدهای `listAgents()`, `getAgent(id)`
  - `streamAgent(userId, agentId, conversationId, message, params)`: بر اساس agentId یکی از buildStudentTutorSystemPrompt / buildFitnessDietSystemPrompt / buildTravelTourismSystemPrompt صدا زده می‌شود؛ سپس stream با providerManager.
- **کنترلر استریم:** `agents.controller.ts` — GET `:agentId/stream` با queryهای conversationId, message, level, style, mode, ... و token برای JWT.

### جایی که تغییر می‌کنیم

| محل | تغییر |
|-----|--------|
| `backend/.../agents.service.ts` | اضافه کردن ۵ تعریف به AGENTS؛ توابع build*SystemPrompt برای هر دستیار جدید؛ در streamAgent شاخه برای agentIdهای جدید |
| `backend/.../agents.controller.ts` | اضافه کردن prefixMap برای عنوان مکالمه |
| `frontend/.../agents/page.tsx` | اضافه کردن ۵ آیتم به FALLBACK_AGENTS؛ ICON_MAP برای آیکن‌های جدید؛ (اختیاری) feature flag برای نمایش/عدم نمایش دستیارهای جدید |
| `frontend/.../agents/fashion/page.tsx` (و home, finance, lifestyle, instagram-admin) | صفحهٔ هر دستیار با همان الگوی چت + هدر + quick actions؛ استفاده از AgentShell مشترک در فاز ۲ |
| `frontend/.../lib/api.ts` | بدون تغییر برای agentStreamUrl (همان params برای mode/level/style؛ برای دستیارهای ساده mode کافی است) |

### Feature flag

- ثابت یا env: `NEXT_PUBLIC_ENABLE_NEW_AGENTS=true` یا در کد `const ENABLE_NEW_AGENTS = true`.
- در لیست دستیارها فقط در صورت فعال بودن فلگ، دستیارهای fashion, home, finance, lifestyle, instagram-admin نمایش داده می‌شوند (یا همیشه نمایش و فلگ برای قابلیت‌های بعدی).

### سیستم چت و تزریق system prompt

- در بک‌اند، `streamAgent` بر اساس `agentId` یک systemPrompt می‌سازد و در آرایهٔ messages به مدل داده می‌شود. برای دستیارهای جدید کافی است یک تابع buildXSystemPrompt که متن ثابت (طبق پرامپت‌های ابلاغ‌شده) برمی‌گرداند فراخوانی شود.

---

## فاز ۱ — خروجی (انجام‌شده)

- **بک‌اند:** `backend/src/modules/agents/agents.service.ts` — ۵ تعریف در AGENTS؛ توابع buildFashionSystemPrompt، buildHomeCookingSystemPrompt، buildFinanceSystemPrompt، buildLifestyleSystemPrompt، buildInstagramAdminSystemPrompt؛ شاخه‌های streamAgent.
- **بک‌اند:** `backend/src/modules/agents/agents.controller.ts` — prefixMap برای عنوان مکالمه.
- **فرانت لیست:** `frontend/src/app/(dashboard)/agents/page.tsx` — FALLBACK_AGENTS (۵ آیتم)، ICON_MAP، ENABLE_NEW_AGENTS (feature flag).
- **فرانت صفحات دستیار:**
  - `frontend/src/app/(dashboard)/agents/agent-chat-shared.tsx` — کامپوننت مشترک چت با پیکربندی (agentId, titleFa, descriptionFa, chipsFa, quickActions).
  - `frontend/src/app/(dashboard)/agents/fashion/page.tsx`
  - `frontend/src/app/(dashboard)/agents/home/page.tsx`
  - `frontend/src/app/(dashboard)/agents/finance/page.tsx`
  - `frontend/src/app/(dashboard)/agents/lifestyle/page.tsx`
  - `frontend/src/app/(dashboard)/agents/instagram-admin/page.tsx`

مسیرها: `/agents/fashion`, `/agents/home`, `/agents/finance`, `/agents/lifestyle`, `/agents/instagram-admin`.

---

## فاز ۲ و ۳ — Shell و Workspace (انجام‌شده)

- **AgentShell با تب‌ها:** چت | فضای کار | ذخیره‌شده | بینش‌ها | تنظیمات در `agent-chat-shared.tsx`.
- **Workspace MVP:** `agent-workspaces/index.tsx` و کامپوننت‌های fashion, home, finance, lifestyle, instagram با state محلی و localStorage.

---

## فاز ۴ — پولیش (انجام‌شده)

- **ذخیره‌شده (Saved):** `agent-storage.ts` — `getSavedItems(agentId)`, `addSavedItem`, `removeSavedItem` با کلید `aimall_agent_saved_{agentId}`. در چت دکمه «ذخیره این پاسخ» (BookmarkPlus) کنار هر پاسخ دستیار. تب ذخیره‌شده: لیست با عنوان، تاریخ، جزئیات (مشاهده متن)، کپی و حذف.
- **بینش‌ها (Insights):** کارت آمار: تعداد ذخیره‌شده‌ها، آخرین ذخیره، تعداد پیام‌های این جلسه.
- **تنظیمات (Settings):** تنظیمات هر دستیار در localStorage (`aimall_agent_settings_{agentId}`): لحن پاسخ‌ها، زبان ترجیحی، اعلان هنگام ذخیره. فرم با Label/Input و به‌روزرسانی با toast.
- **دسترسی‌پذیری (a11y):** `aria-label` برای دکمه‌های فقط آیکن (کپی، ذخیره، ارسال، بازگشت، جلسه جدید)، `role="log"` و `aria-live="polite"` برای ناحیه چت، `aria-label` برای تب‌ها و tabpanelها، آیکن‌ها `aria-hidden`. تب‌ها با `flex-wrap` برای ریسپانسیو.
- **حالت خطا:** در صورت خطای استریم یا `type: 'error'`، بنر با `role="alert"` و دکمه «تلاش دوباره» نمایش داده می‌شود؛ `streamError` با ارسال پیام جدید پاک می‌شود.
