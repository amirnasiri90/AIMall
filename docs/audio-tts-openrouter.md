# استودیو صوت (TTS) و OpenRouter

## مدل پشتیبانی‌شده: GPT-4o Mini TTS

برای **تبدیل متن به گفتار (TTS)** با OpenRouter از مدل **`openai/gpt-4o-mini-tts`** استفاده می‌شود:

- درخواست **غیراستریم** به `POST https://openrouter.ai/api/v1/chat/completions`
- بدنه: `model`, `modalities: ["text","audio"]`, `messages`, `audio: { voice, format: "mp3" }`
- پاسخ: `choices[0].message.audio.data` (Base64) → به صورت `data:audio/mpeg;base64,...` در مرورگر پخش می‌شود.

کلید OpenRouter از `OPENROUTER_API_KEY` در `.env` یا از پنل ادمین (ارائه‌دهنده OpenRouter) خوانده می‌شود.

گزینه‌های دیگر TTS در استودیو صوت:

- **OpenAI TTS** — با تنظیم `OPENAI_API_KEY` در پنل ادمین یا `.env`
- **ElevenLabs** — با تنظیم API key در پنل ادمین (راهنما: `docs/elevenlabs-api-key-guide.md`)

## خطاهای رایج

- **۵۰۰ → ۴۰۰:** در نسخهٔ فعلی، خطاهای TTS به صورت **۴۰۰** با متن خطا به فرانت برگردانده می‌شوند تا علت در UI نمایش داده شود.
- **اعتبار کافی نیست:** سکه کاربر برای هزینهٔ مدل کافی نیست.
- **کلید تنظیم نشده:** برای مدل انتخاب‌شده (OpenAI یا ElevenLabs) API key در پنل یا env ست نشده است.
