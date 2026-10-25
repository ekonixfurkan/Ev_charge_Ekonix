// Kullanıcı hesapları: Neon'daki `users` tablosu. AUTH_USERS yalnızca ilk kurulum (tablo boşken yönetici olarak aktarılır).
import { sql } from './db.js';
import { hashPassword, verifyPassword } from './password.js';

// Test için sql() değiştirilebilir.
export const _deps = { sql };

export const ROLES = ['admin', 'user'];
export const dbOn = () => Boolean(process.env.DATABASE_URL);

// AUTH_USERS = "ad@firma.com:scrypt:<salt>:<hash>;diger@firma.com:scrypt:..."
export function envUsers() {
  const users = new Map();
  for (const entry of String(process.env.AUTH_USERS || '').split(';')) {
    const e = entry.trim();
    const i = e.indexOf(':');
    if (i < 1) continue;
    users.set(e.slice(0, i).trim().toLowerCase(), e.slice(i + 1).trim());
  }
  return users;
}

let _ready = null;
export function ensureUsers() {
  if (_ready) return _ready;
  const s = _deps.sql();
  _ready = (async () => {
    await s`CREATE TABLE IF NOT EXISTS users (
      email text PRIMARY KEY,
      name text NOT NULL DEFAULT '',
      role text NOT NULL DEFAULT 'user',
      pass text NOT NULL,
      active boolean NOT NULL DEFAULT true,
      created_at timestamptz NOT NULL DEFAULT now(),
      created_by text,
      last_login timestamptz
    )`;
    const c = await s`SELECT count(*)::int AS n FROM users`;
    if (!c[0].n) {
      for (const [email, pass] of envUsers()) {
        await s`INSERT INTO users (email, role, pass, created_by) VALUES (${email}, 'admin', ${pass}, 'env')
                ON CONFLICT (email) DO NOTHING`;
      }
    }
  })().catch((e) => { _ready = null; throw e; });
  return _ready;
}

export function _reset() { _ready = null; }

// { email, name, role, pass, active } ya da null. DB yoksa AUTH_USERS (hepsi yönetici).
export async function findUser(email) {
  if (!dbOn()) {
    const pass = envUsers().get(email);
    return pass ? { email, name: '', role: 'admin', pass, active: true } : null;
  }
  await ensureUsers();
  const r = await _deps.sql()`SELECT email, name, role, pass, active FROM users WHERE email = ${email}`;
  return r[0] || null;
}

const pub = (r) => ({
  email: r.email, name: r.name, role: r.role, active: r.active,
  createdAt: r.created_at, createdBy: r.created_by, lastLogin: r.last_login,
});

export async function listUsers() {
  await ensureUsers();
  const r = await _deps.sql()`SELECT email, name, role, active, created_at, created_by, last_login FROM users ORDER BY created_at, email`;
  return r.map(pub);
}

export async function createUser({ email, name, role, password }, by) {
  await ensureUsers();
  const pass = await hashPassword(password);
  const r = await _deps.sql()`INSERT INTO users (email, name, role, pass, created_by)
    VALUES (${email}, ${name}, ${role}, ${pass}, ${by}) ON CONFLICT (email) DO NOTHING RETURNING email`;
  return r.length > 0;
}

export async function activeAdminCount(exceptEmail) {
  const r = await _deps.sql()`SELECT count(*)::int AS n FROM users WHERE role = 'admin' AND active AND email <> ${exceptEmail}`;
  return r[0].n;
}

// Verilen alanlar güncellenir. Bulunamazsa false.
export async function updateUser(email, { name, role, active, password }) {
  await ensureUsers();
  const s = _deps.sql();
  const pass = password == null ? null : await hashPassword(password);
  const r = await s`UPDATE users SET
      name = COALESCE(${name ?? null}, name),
      role = COALESCE(${role ?? null}, role),
      active = COALESCE(${active ?? null}::boolean, active),
      pass = COALESCE(${pass}, pass)
    WHERE email = ${email} RETURNING email`;
  return r.length > 0;
}

export async function deleteUser(email) {
  await ensureUsers();
  const r = await _deps.sql()`DELETE FROM users WHERE email = ${email} RETURNING email`;
  return r.length > 0;
}

export async function touchLogin(email) {
  if (!dbOn()) return;
  try { await _deps.sql()`UPDATE users SET last_login = now() WHERE email = ${email}`; } catch { /* önemsiz */ }
}

export { verifyPassword, hashPassword };
