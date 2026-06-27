/**
 * AES-256-GCM column-level encryption/decryption utilities.
 * 
 * Sensitive columns (applicant, email, form_data, amount, department)
 * are encrypted before storing and decrypted after reading from SQLite.
 * 
 * Each encryption uses a random 12-byte IV and produces a 16-byte auth tag.
 * The encrypted output is: hex(IV) + ":" + hex(ciphertext) + ":" + hex(authTag)
 */

import crypto from 'crypto';
import { getConfig } from '../config';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;  // 96 bits for GCM
const TAG_LENGTH = 16; // 128 bits auth tag

/**
 * Get the encryption key as a Buffer.
 * Derives a 32-byte key from the configured encryption key.
 */
function getKey(): Buffer {
  const config = getConfig();
  const rawKey = config.db.encryptionKey;
  
  // Use SHA-256 to derive a consistent 32-byte key from the raw key string
  return crypto.createHash('sha256').update(rawKey).digest();
}

/**
 * Encrypt a plaintext string using AES-256-GCM.
 * Returns format: iv_hex:ciphertext_hex:tag_hex
 */
export function encrypt(plaintext: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  
  // Format: iv:ciphertext:authtag (all hex-encoded)
  return `${iv.toString('hex')}:${encrypted.toString('hex')}:${authTag.toString('hex')}`;
}

/**
 * Decrypt a ciphertext string produced by encrypt().
 * Input format: iv_hex:ciphertext_hex:tag_hex
 * Returns the original plaintext.
 */
export function decrypt(ciphertext: string): string {
  const key = getKey();
  
  const parts = ciphertext.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted data format');
  }
  
  const iv = Buffer.from(parts[0], 'hex');
  const encrypted = Buffer.from(parts[1], 'hex');
  const authTag = Buffer.from(parts[2], 'hex');
  
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  
  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]);
  
  return decrypted.toString('utf8');
}

/**
 * Encrypt a numeric value (stored as string).
 */
export function encryptNumber(value: number): string {
  return encrypt(value.toString());
}

/**
 * Decrypt a numeric value.
 */
export function decryptNumber(ciphertext: string): number {
  return parseFloat(decrypt(ciphertext));
}

/**
 * Encrypt nullable string — returns null if input is null/undefined.
 */
export function encryptNullable(value: string | null | undefined): string | null {
  if (value == null) return null;
  return encrypt(value);
}

/**
 * Decrypt nullable string.
 */
export function decryptNullable(ciphertext: string | null | undefined): string | null {
  if (ciphertext == null) return null;
  return decrypt(ciphertext);
}

export default { encrypt, decrypt, encryptNumber, decryptNumber, encryptNullable, decryptNullable };
