import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const ENCODING_PREFIX = 'encv1';

function deriveKey(): Buffer {
  const secret = process.env.AI_ENCRYPTION_KEY || '';
  return createHash('sha256').update(secret).digest();
}

/**
 * Encrypts a provider API key for storage. Stored form: encv1:<ivHex>:<authTagHex>:<cipherHex>
 */
export function encryptProviderSecret(plainText: string): string {
  const key = deriveKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [ENCODING_PREFIX, iv.toString('hex'), authTag.toString('hex'), encrypted.toString('hex')].join(':');
}

/**
 * Decrypts a provider API key previously stored with encryptProviderSecret.
 * Falls back to returning the raw value for legacy plaintext records so existing
 * deployments do not lose access while they are re-saved through the settings UI.
 */
export function decryptProviderSecret(storedValue: string): string {
  const parts = storedValue.split(':');
  if (parts.length !== 4 || parts[0] !== ENCODING_PREFIX) {
    return storedValue;
  }

  const [, ivHex, authTagHex, cipherHex] = parts;
  const key = deriveKey();
  const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(cipherHex, 'hex')),
    decipher.final(),
  ]);
  return decrypted.toString('utf8');
}
