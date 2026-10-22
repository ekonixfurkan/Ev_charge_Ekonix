// Şifre hashleme (scrypt). Bağımlılığı yok; scripts/hash-password.mjs de bunu kullanır.
import { scrypt, randomBytes, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scryptAsync = promisify(scrypt);
const KEYLEN = 64;

export async function hashPassword(password) {
  const salt = randomBytes(16);
  const hash = await scryptAsync(password, salt, KEYLEN);
  return `scrypt:${salt.toString('hex')}:${hash.toString('hex')}`;
}

export async function verifyPassword(password, stored) {
  const [alg, saltHex, hashHex] = String(stored).split(':');
  if (alg !== 'scrypt' || !saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, 'hex');
  const got = await scryptAsync(password, Buffer.from(saltHex, 'hex'), expected.length);
  return got.length === expected.length && timingSafeEqual(got, expected);
}
