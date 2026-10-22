// Oturum yönetimi: e-posta + şifre, HttpOnly imzalı çerez. Hesaplar AUTH_USERS ortam değişkeninden gelir (kayıt kapalı).
import { timingSafeEqual, createHmac } from 'node:crypto';
import { sql } from './db.js';
import { hashPassword, verifyPassword } from './password.js';

const COOKIE = 'ekore_session';
const MAX_AGE = 7 * 24 * 60 * 60; // saniye

// Test için sql() değiştirilebilir.
export const _deps = { sql };

export class ConfigError extends Error {}

// AUTH_USERS = "ad@firma.com:scrypt:<salt>:<hash>;diger@firma.com:scrypt:..."
export function loadUsers() {
  const users = new Map();
  for (const entry of String(process.env.AUTH_USERS || '').split(';')) {
    const e = entry.trim();
    const i = e.indexOf(':');
    if (i < 1) continue;
    users.set(e.slice(0, i).trim().toLowerCase(), e.slice(i + 1).trim());
  }
  return users;
}

function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) throw new ConfigError('SESSION_SECRET tanımlı değil veya 32 karakterden kısa');
  return s;
}

export function assertConfigured() {
  secret();
  if (!loadUsers().size) throw new ConfigError('AUTH_USERS tanımlı değil');
}

const b64u = (b) => Buffer.from(b).toString('base64url');
const sign = (p) => createHmac('sha256', secret()).update(p).digest('base64url');

export function createToken(email) {
  const p = b64u(JSON.stringify({ e: email, exp: Math.floor(Date.now() / 1000) + MAX_AGE }));
  return `${p}.${sign(p)}`;
}

export function readToken(token) {
  const [p, sig] = String(token || '').split('.');
  if (!p || !sig) return null;
  const want = Buffer.from(sign(p));
  const have = Buffer.from(sig);
  if (want.length !== have.length || !timingSafeEqual(want, have)) return null;
  try {
    const d = JSON.parse(Buffer.from(p, 'base64url').toString('utf8'));
    if (!d || typeof d.e !== 'string' || !(d.exp > Date.now() / 1000)) return null;
    // Kullanıcı AUTH_USERS'tan çıkarıldıysa oturumu da düşer.
    return loadUsers().has(d.e) ? d.e : null;
  } catch { return null; }
}

function cookies(req) {
  const out = {};
  for (const part of String(req.headers.cookie || '').split(';')) {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}

export function sessionEmail(req) {
  return readToken(cookies(req)[COOKIE]);
}

const isHttps = (req) => (req.headers['x-forwarded-proto'] || '').split(',')[0].trim() === 'https';

export function setSession(req, res, email) {
  res.setHeader('set-cookie',
    `${COOKIE}=${createToken(email)}; Path=/; Max-Age=${MAX_AGE}; HttpOnly; SameSite=Lax${isHttps(req) ? '; Secure' : ''}`);
}

export function clearSession(req, res) {
  res.setHeader('set-cookie',
    `${COOKIE}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax${isHttps(req) ? '; Secure' : ''}`);
}

// Başka bir siteden gelen yazma isteklerini reddet.
export function sameOrigin(req) {
  const o = req.headers.origin;
  if (!o) return true;
  try { return new URL(o).host === req.headers.host; } catch { return false; }
}

// API uçlarını korur. Oturum yoksa yanıtı kendisi yazar ve null döner.
export function requireAuth(req, res) {
  try { assertConfigured(); } catch (e) {
    if (!(e instanceof ConfigError)) throw e;
    res.status(503).json({ error: 'Kimlik doğrulama yapılandırılmamış' });
    return null;
  }
  if (req.method !== 'GET' && req.method !== 'HEAD' && !sameOrigin(req)) {
    res.status(403).json({ error: 'Geçersiz istek kaynağı' });
    return null;
  }
  const email = sessionEmail(req);
  if (!email) {
    res.status(401).json({ error: 'Oturum gerekli' });
    return null;
  }
  return email;
}

// Deneme sayacı (DB'de, sunucu örnekleri arasında ortak). 15 dk pencere.
let _tableReady = null;
export async function attempt(key) {
  const s = _deps.sql();
  _tableReady ??= s`CREATE TABLE IF NOT EXISTS auth_attempts (
    k text PRIMARY KEY, n int NOT NULL, reset_at timestamptz NOT NULL)`.catch((e) => { _tableReady = null; throw e; });
  await _tableReady;
  const rows = await s`INSERT INTO auth_attempts (k, n, reset_at)
    VALUES (${key}, 1, now() + interval '15 minutes')
    ON CONFLICT (k) DO UPDATE SET
      n = CASE WHEN auth_attempts.reset_at < now() THEN 1 ELSE auth_attempts.n + 1 END,
      reset_at = CASE WHEN auth_attempts.reset_at < now() THEN now() + interval '15 minutes' ELSE auth_attempts.reset_at END
    RETURNING n`;
  return rows[0].n;
}

export async function clearAttempts(key) {
  await _deps.sql()`DELETE FROM auth_attempts WHERE k = ${key}`;
}

export function clientIp(req) {
  return String(req.headers['x-real-ip'] || (req.headers['x-forwarded-for'] || '').split(',')[0] || req.socket?.remoteAddress || 'unknown').trim();
}

// Bilinmeyen e-postada da aynı süreyi harcamak için.
let _dummy = null;
export async function checkLogin(email, password) {
  const stored = loadUsers().get(email);
  _dummy ??= await hashPassword('dummy-password');
  const ok = await verifyPassword(password, stored || _dummy);
  return Boolean(stored) && ok;
}
