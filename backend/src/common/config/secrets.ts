/**
 * Centralized secrets for security.
 * In production, JWT_SECRET must be set in env; otherwise the app will not start.
 */
const isProduction = process.env.NODE_ENV === 'production';

const DEFAULT_JWT_SECRET = 'aimall-demo-secret-key-2024';

export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET?.trim();
  if (secret) return secret;
  if (isProduction) {
    throw new Error(
      'در محیط production متغیر JWT_SECRET باید در env تنظیم شود. لطفاً یک مقدار قوی و یکتا قرار دهید.',
    );
  }
  return DEFAULT_JWT_SECRET;
}

export function getApiKeyEncryptionKey(): string | null {
  const key = process.env.API_KEY_ENCRYPTION_KEY?.trim();
  if (key && key.length >= 16) return key;
  return null;
}

export function warnIfProductionSecretsMissing(): void {
  if (!isProduction) return;
  if (!process.env.JWT_SECRET?.trim()) {
    // getJwtSecret() will throw when modules load; this is a backup log
    console.warn('[Security] JWT_SECRET is required in production.');
  }
  if (!process.env.API_KEY_ENCRYPTION_KEY?.trim() || process.env.API_KEY_ENCRYPTION_KEY.length < 16) {
    console.warn(
      '[Security] API_KEY_ENCRYPTION_KEY should be set (min 16 chars) in production to encrypt provider API keys in DB.',
    );
  }
  if (!process.env.FRONTEND_URL?.trim()) {
    console.warn('[Security] FRONTEND_URL should be set in production to restrict CORS to your frontend.');
  }
}
