import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const adminPassword = await bcrypt.hash('admin123', 10);
  const userPassword = await bcrypt.hash('user123', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@aimall.ir' },
    update: {},
    create: {
      email: 'admin@aimall.ir',
      password: adminPassword,
      name: 'مدیر سیستم',
      role: 'ADMIN',
      coins: 1000,
    },
  });

  const user = await prisma.user.upsert({
    where: { email: 'user@aimall.ir' },
    update: {},
    create: {
      email: 'user@aimall.ir',
      password: userPassword,
      name: 'کاربر آزمایشی',
      role: 'USER',
      coins: 200,
    },
  });

  const adminTxCount = await prisma.transaction.count({ where: { userId: admin.id } });
  if (adminTxCount === 0) {
    await prisma.transaction.create({
      data: { userId: admin.id, type: 'CREDIT', amount: 1000, balance: 1000, reason: 'اعتبار اولیه مدیر', service: 'topup' },
    });
  }

  const userTxCount = await prisma.transaction.count({ where: { userId: user.id } });
  if (userTxCount === 0) {
    await prisma.transaction.create({
      data: { userId: user.id, type: 'CREDIT', amount: 200, balance: 200, reason: 'اعتبار خوش‌آمدگویی', service: 'topup' },
    });
  }

  const pkgCount = await prisma.coinPackage.count();
  if (pkgCount === 0) {
    await prisma.coinPackage.create({
      data: { name: 'بسته پایه', coins: 100, priceIRR: 50000, description: 'مناسب برای شروع', sortOrder: 1 },
    });
    await prisma.coinPackage.create({
      data: { name: 'بسته حرفه‌ای', coins: 500, priceIRR: 200000, description: 'محبوب‌ترین بسته', sortOrder: 2 },
    });
    await prisma.coinPackage.create({
      data: { name: 'بسته سازمانی', coins: 2000, priceIRR: 700000, description: 'مناسب تیم‌ها و سازمان‌ها', sortOrder: 3 },
    });
  }

  // Seed Tool Definitions
  const toolCount = await prisma.toolDefinition.count();
  if (toolCount === 0) {
    await prisma.toolDefinition.createMany({
      data: [
        {
          name: 'calculator',
          displayName: 'ماشین‌حساب',
          description: 'محاسبات ریاضی پیشرفته',
          category: 'utility',
          isEnabled: true,
          config: JSON.stringify({ precision: 10 }),
          schema: JSON.stringify({ input: { type: 'string', description: 'عبارت ریاضی' } }),
        },
        {
          name: 'web_search',
          displayName: 'جستجوی وب',
          description: 'جستجو در اینترنت برای اطلاعات به‌روز',
          category: 'search',
          isEnabled: true,
          config: JSON.stringify({ maxResults: 5 }),
          schema: JSON.stringify({ input: { type: 'string', description: 'عبارت جستجو' } }),
        },
        {
          name: 'code_runner',
          displayName: 'اجرای کد',
          description: 'اجرای کد JavaScript در محیط ایزوله',
          category: 'development',
          isEnabled: false,
          config: JSON.stringify({ timeout: 5000, language: 'javascript' }),
          schema: JSON.stringify({ input: { type: 'string', description: 'کد برای اجرا' } }),
        },
      ],
    });
  }

  // Seed System Settings
  const defaults: Array<{ key: string; value: string; description: string; category: string }> = [
    { key: 'coin_price_irr', value: '1000', description: 'قیمت هر سکه (تومان)', category: 'pricing' },
    { key: 'coin_cost_chat', value: '2', description: 'هزینه سکه برای هر پیام چت', category: 'billing' },
    { key: 'coin_cost_text', value: '5', description: 'هزینه سکه برای تولید متن', category: 'billing' },
    { key: 'coin_cost_image', value: '10', description: 'هزینه سکه برای تولید تصویر', category: 'billing' },
    { key: 'coin_cost_audio', value: '8', description: 'هزینه سکه برای پردازش صوت', category: 'billing' },
      { key: 'default_coins', value: '200', description: 'سکه اولیه برای کاربران جدید', category: 'billing' },
      { key: 'memory_auto_summary_threshold', value: '10', description: 'تعداد پیام برای خلاصه‌سازی خودکار', category: 'memory' },
      { key: 'memory_max_context_messages', value: '20', description: 'حداکثر پیام در context چت', category: 'memory' },
      { key: 'provider_health_check_interval', value: '300', description: 'فاصله بررسی سلامت (ثانیه)', category: 'provider' },
      { key: 'provider_max_retries', value: '2', description: 'حداکثر تلاش مجدد', category: 'provider' },
    { key: 'platform_name', value: 'AI Mall', description: 'نام پلتفرم', category: 'general' },
    { key: 'maintenance_mode', value: 'false', description: 'حالت تعمیرات', category: 'general' },
  ];
  for (const s of defaults) {
    await prisma.systemSetting.upsert({
      where: { key: s.key },
      create: s,
      update: {},
    });
  }

  // Seed Provider Health records
  const providerCount = await prisma.providerHealth.count();
  if (providerCount === 0) {
    await prisma.providerHealth.createMany({
      data: [
        { providerId: 'openrouter', name: 'OpenRouter', status: 'healthy', isEnabled: true },
        { providerId: 'pollinations', name: 'Pollinations AI', status: 'healthy', isEnabled: true },
      ],
    });
  }

  console.log('Seed completed:', { admin: admin.email, user: user.email });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
