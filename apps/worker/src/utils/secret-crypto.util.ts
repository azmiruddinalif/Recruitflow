import { createDecipheriv, createHash } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const ENCODING_PREFIX = 'encv1';

function deriveKey(): Buffer {
  const secret = process.env.AI_ENCRYPTION_KEY || '';
  return createHash('sha256').update(secret).digest();
}

/**
 * Mirrors apps/api/src/common/utils/secret-crypto.util.ts — the worker runs as a
 * separate process and cannot import NestJS application code, so the decrypt
 * routine is duplicated here against the same AI_ENCRYPTION_KEY.
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
