require('dotenv').config({ path: require('path').resolve(process.cwd(), '.env') });

// OpenTelemetry: اگر dist/tracing.js وجود داشت لود می‌شود (برای production می‌توان با node -r dist/tracing.js اجرا کرد)
try {
  require('./tracing');
} catch {
  // tracing در build فعلی Nest ممکن است خروجی نداشته باشد؛ اختیاری است
}
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { warnIfProductionSecretsMissing } from './common/config/secrets';

// When backend runs on the same port as users expect the app (e.g. 3000), set FRONTEND_URL to the real frontend (e.g. http://localhost:3001) so GET /login redirects there
const FRONTEND_URL = process.env.FRONTEND_URL || process.env.NEXT_PUBLIC_APP_URL || '';
const isProduction = process.env.NODE_ENV === 'production';

async function bootstrap() {
  warnIfProductionSecretsMissing();

  const port = process.env.PORT || 3001;
  const app = await NestFactory.create(AppModule);
  if (FRONTEND_URL) {
    app.use((req: any, res: any, next: any) => {
      const path = req.url?.split('?')[0] || '';
      if (req.method === 'GET' && ['/login', '/register', '/dashboard', '/'].includes(path)) {
        res.redirect(302, `${FRONTEND_URL}${path}`);
        return;
      }
      next();
    });
  }
  app.setGlobalPrefix('api/v1');

  // Security headers (Helmet)
  app.use(
    helmet({
      contentSecurityPolicy: false, // API backend; CSP usually set by frontend
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  // CORS: in production restrict to frontend origin(s); in dev allow all for flexibility
  const corsOrigin = isProduction && FRONTEND_URL
    ? FRONTEND_URL.split(',').map((u) => u.trim()).filter(Boolean)
    : true;
  app.enableCors({
    origin: corsOrigin,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Api-Key'],
    credentials: false,
  });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  // OpenAPI (Swagger) docs — Phase 4
  const config = new DocumentBuilder()
    .setTitle('AI Mall API')
    .setDescription('API پلتفرم AI Mall — احراز هویت، چت، استودیوهای متن/تصویر/صوت، صورتحساب و مدیریت.')
    .setVersion('1.0')
    .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'JWT')
    .addTag('auth', 'ثبت‌نام و ورود')
    .addTag('conversations', 'مکالمات و پیام‌ها')
    .addTag('chat', 'چت استریم')
    .addTag('text', 'استودیو متن')
    .addTag('images', 'استودیو تصویر')
    .addTag('audio', 'استودیو صوت')
    .addTag('billing', 'صورتحساب و سکه')
    .addTag('admin', 'پنل مدیریت (فقط ادمین)')
    .addTag('organizations', 'سازمان‌ها')
    .addTag('knowledge', 'پایگاه دانش (RAG)')
    .addTag('workflows', 'ورک‌فلوها')
    .addTag('jobs', 'کارهای صف')
    .addTag('api-keys', 'کلیدهای API')
    .addTag('sla', 'وضعیت SLA (ادمین)')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/v1/docs', app, document, {
    customSiteTitle: 'AI Mall API Docs',
    customfavIcon: undefined,
  });

  await app.listen(port, '0.0.0.0');
  console.log(`AI Mall Backend running on http://0.0.0.0:${port} (accessible from network)`);
  console.log(`API Docs: http://localhost:${port}/api/v1/docs`);
  console.log(`اگر از سیستم دیگر خطای Failed to fetch می‌گیرید، پورت ${port} را در فایروال ویندوز باز کنید:`);
  console.log(`  PowerShell (Admin): .\\scripts\\allow-port-3001-firewall.ps1`);
}
bootstrap();
