/**
 * AES-256-GCM field-level encryption for sensitive data at rest.
 *
 * Requires the FIELD_ENCRYPTION_KEY environment variable to be set to a
 * 64-character hex string (32 bytes).  Generate one with:
 *   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
 *
 * Ciphertext format (stored as a single string):
 *   <iv_hex>:<authTag_hex>:<ciphertext_hex>
 */

import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96-bit IV recommended for GCM

function getKey(): Buffer {
  const raw = process.env.FIELD_ENCRYPTION_KEY;
  if (!raw || raw.length !== 64) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('FATAL: FIELD_ENCRYPTION_KEY must be a 64-char hex string');
    }
    // Dev/test fallback — never use in production
    console.warn('WARNING: FIELD_ENCRYPTION_KEY not set; using insecure dev key');
    return Buffer.alloc(32, 0);
  }
  return Buffer.from(raw, 'hex');
}

export function encrypt(plaintext: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

export function decrypt(ciphertext: string): string {
  const parts = ciphertext.split(':');
  if (parts.length !== 3) throw new Error('Invalid ciphertext format');
  const [ivHex, authTagHex, encryptedHex] = parts;
  const key = getKey();
  const decipher = crypto.createDecipheriv(ALGORITHM, key, Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedHex, 'hex')),
    decipher.final(),
  ]);
  return decrypted.toString('utf8');
}

/**
 * Safe decrypt: returns the raw value if it doesn't look like an encrypted
 * blob (handles rows that were stored before encryption was introduced).
 */
export function safeDecrypt(value: string): string {
  if (!value) return value;
  // Encrypted values always have two colons
  if ((value.match(/:/g) ?? []).length !== 2) return value;
  try {
    return decrypt(value);
  } catch {
    return value; // fallback for legacy plaintext rows
  }
}
