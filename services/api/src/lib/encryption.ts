import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'crypto';
import { env } from './env';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const TAG_LENGTH = 16;

/**
 * Encrypts a string using AES-256-GCM.
 * Returns: iv:encryptedData:authTag (all hex-encoded)
 */
export function encrypt(plaintext: string): string {
  const key = Buffer.from(env.ENCRYPTION_KEY, 'hex');
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const tag = cipher.getAuthTag();

  return [iv.toString('hex'), encrypted, tag.toString('hex')].join(':');
}

/**
 * Decrypts a string encrypted with `encrypt()`.
 */
export function decrypt(ciphertext: string): string {
  const key = Buffer.from(env.ENCRYPTION_KEY, 'hex');
  const [ivHex, encryptedHex, tagHex] = ciphertext.split(':');

  if (!ivHex || !encryptedHex || !tagHex) {
    throw new Error('Invalid ciphertext format');
  }

  const iv  = Buffer.from(ivHex, 'hex');
  const tag = Buffer.from(tagHex, 'hex');

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * Hashes an API key for storage (SHA-256, then hex).
 * Use bcrypt for passwords; SHA-256 for API key lookup.
 */
export function hashApiKey(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}

/**
 * Generates a secure random API key with prefix.
 * Format: glt_<random-32-bytes-hex>
 */
export function generateApiKey(): { raw: string; hash: string } {
  const raw = `glt_${randomBytes(32).toString('hex')}`;
  const hash = hashApiKey(raw);
  return { raw, hash };
}

/**
 * Masks an API key for display: glt_abc...xyz
 */
export function maskApiKey(raw: string): string {
  if (raw.length <= 12) return '***';
  return `${raw.substring(0, 7)}...${raw.substring(raw.length - 4)}`;
}
