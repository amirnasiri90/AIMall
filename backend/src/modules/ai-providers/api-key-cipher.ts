import * as crypto from 'crypto';
import { getApiKeyEncryptionKey } from '../../common/config/secrets';

const PREFIX = 'enc:';
const ALGO = 'aes-256-gcm';
const IV_LEN = 16;
const AUTH_TAG_LEN = 16;
const KEY_LEN = 32;

function getKey(): Buffer | null {
  const envKey = getApiKeyEncryptionKey();
  if (!envKey) return null;
  return crypto.scryptSync(envKey, 'aimall-salt', KEY_LEN);
}

export function encryptApiKey(plain: string): string {
  const key = getKey();
  if (!key || !plain) return plain;
  const iv = crypto.randomBytes(IV_LEN);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  const combined = Buffer.concat([iv, authTag, enc]);
  return PREFIX + combined.toString('base64');
}

export function decryptApiKey(value: string): string {
  if (!value || !value.startsWith(PREFIX)) return value;
  const key = getKey();
  if (!key) return value;
  try {
    const combined = Buffer.from(value.slice(PREFIX.length), 'base64');
    const iv = combined.subarray(0, IV_LEN);
    const authTag = combined.subarray(IV_LEN, IV_LEN + AUTH_TAG_LEN);
    const enc = combined.subarray(IV_LEN + AUTH_TAG_LEN);
    const decipher = crypto.createDecipheriv(ALGO, key, iv);
    decipher.setAuthTag(authTag);
    return decipher.update(enc) + decipher.final('utf8');
  } catch {
    return value;
  }
}
