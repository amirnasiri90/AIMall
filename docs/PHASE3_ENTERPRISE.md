# فاز ۳ — Enterprise (خلاصه پیاده‌سازی)

## ۱. Audit پیشرفته
- **ماژول مشترک `AuditModule`**: سرویس `AuditService` به `modules/audit/` منتقل شد و به صورت Global در دسترس است.
- **لاگ ورود**: بعد از هر ورود موفق، رکورد `LOGIN` با `entity: User` و IP (در صورت وجود) ثبت می‌شود.
- **لاگ سازمان**: برای `ORGANIZATION_CREATE`, `ORGANIZATION_INVITE`, `ORGANIZATION_UPDATE_MEMBER_ROLE`, `ORGANIZATION_LEAVE`, `ORGANIZATION_REMOVE_MEMBER` رکورد audit ثبت می‌شود.
- **ادمین**: `GET /api/v1/admin/audit-logs` با فیلترهای userId, action, entity, from, to, page, limit (بدون تغییر).

## ۲. SLA
- **ماژول `SlaModule`**: 
  - `GET /api/v1/sla/status` (فقط ادمین): وضعیت SLA بر اساس uptime و P95 latency در مقایسه با اهداف.
  - `GET /api/v1/sla/targets` (فقط ادمین): اهداف فعلی (از SystemSetting).
- **تنظیمات پیشنهادی**: `sla_uptime_target_percent` (مثلاً 99.5), `sla_p95_max_ms` (مثلاً 2000). در صورت نبود از پیش‌فرض استفاده می‌شود.

## ۳. Policy-based routing
- **ماژول `PolicyModule`**: `PolicyService.getRouting(userId, organizationId?)` خروجی می‌دهد:
  - `preferredProviderId`, `preferredModel`, `rateLimitPerMinute` (از SystemSetting).
- **کلیدهای تنظیم**: 
  - پیش‌فرض: `policy_default_provider`, `policy_default_model`, `policy_default_rate_limit`
  - هر سازمان: `policy_org_<orgId>_provider`, `policy_org_<orgId>_model`, `policy_org_<orgId>_rate_limit`
- **Orchestrator**: در `runAI` قبل از فراخوانی provider، از policy مدل ترجیحی (در صورت وجود) استفاده می‌شود.

## ۴. قرارداد سازمانی
- **مدل `Organization`**: فیلدهای جدید:
  - `plan` (پیش‌فرض: FREE) — مقادیر پیشنهادی: FREE | PRO | ENTERPRISE
  - `customCoinQuota` (اختیاری)
  - `contractEndsAt` (اختیاری)
- اعمال سقف سکه و تاریخ قرارداد در بیلینگ/پالیسی در فازهای بعد قابل افزودن است.

## ۵. اسکلت SDK موبایل
- **پکیج `sdk/`**: کلاینت TypeScript با متدهای `login`, `getMe`, `getBalance`, `getConversations`, `getChatStreamUrl`.
- قابل استفاده در وب و موبایل (React Native / Flutter با پل مناسب).
- بیلد: `cd sdk && npm install && npm run build` (نیاز به `tsup`).

---

## APIهای جدید (فاز ۳)

| متد | مسیر | دسترسی | توضیح |
|-----|------|--------|--------|
| GET | /api/v1/sla/status | Admin | وضعیت SLA |
| GET | /api/v1/sla/targets | Admin | اهداف SLA |

بقیهٔ endpointها (audit-logs، auth، organizations و غیره) از قبل وجود داشتند و فقط رفتارشان گسترش یافته است.
