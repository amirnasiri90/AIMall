# AI Mall SDK

کلاینت رسمی API پلتفرم AI Mall برای استفاده در وب و اپ موبایل (React Native، Flutter و غیره).

## نصب

```bash
npm install @aimall/sdk
# یا از مسیر پروژه:
npm install file:../sdk
```

## استفاده

```typescript
import AimallClient from '@aimall/sdk';

const client = new AimallClient({
  baseUrl: 'https://api.example.com/api/v1',
  getToken: () => localStorage.getItem('token'), // یا از AsyncStorage در موبایل
});

// احراز هویت
const { access_token, user } = await client.login('user@example.com', 'password');
const me = await client.getMe();
const balance = await client.getBalance(); // { coins, calculatedBalance, ... }

// مکالمات و چت
const conversations = await client.getConversations();
const conv = await client.createConversation('عنوان');
const messages = await client.getMessages(conv.id);

// چت استریم — روش ۱: URL برای EventSource
const streamUrl = client.getChatStreamUrl(conv.id, 'سلام');
const es = new EventSource(streamUrl);
es.onmessage = (e) => console.log(e.data);

// چت استریم — روش ۲: async iterator (نیاز به fetch با stream)
for await (const ev of client.streamChat(conv.id, 'سلام')) {
  if (ev.event === 'message.delta') console.log(ev.data);
  if (ev.event === 'message.done') break;
}

// استودیو متن / تصویر / صوت
const textResult = await client.generateText({ prompt: 'یک جمله انگیزشی' });
const imageResult = await client.generateImage({ prompt: 'یک گربه', size: '512x512' });
const ttsResult = await client.textToSpeech({ text: 'سلام' });
const sttResult = await client.speechToText(audioFile);

// کارهای ناهمگام (تصویر/صدا)
const job = await client.generateImageAsync({ prompt: 'منظره' });
const status = await client.getJobStatus(job.id);
```

## API Keys

برای دسترسی با API Key به‌جای JWT، در `getToken` مقدار کلید را برگردانید و در هدر درخواست از پیشوند `Bearer ` استفاده می‌شود. سرور باید احراز با API Key را پشتیبانی کند.

## بیلد

```bash
cd sdk && npm install && npm run build
```

خروجی در `dist/` (CommonJS و ESM و فایل تعریف TypeScript) قرار می‌گیرد.
