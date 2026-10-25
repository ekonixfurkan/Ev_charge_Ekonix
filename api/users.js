// /api/users — yalnızca yönetici. GET liste · POST yeni hesap · PATCH güncelle/şifre · DELETE ?email=
import { readJson } from '../lib/db.js';
import { requireAdmin } from '../lib/auth.js';
import { ROLES, dbOn, listUsers, createUser, updateUser, deleteUser, findUser, activeAdminCount } from '../lib/users.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASS = 8;
const norm = (v) => (typeof v === 'string' ? v.trim().toLowerCase() : '');
const bad = (res, msg, code = 400) => res.status(code).json({ error: msg });

function checkPassword(p) {
  return typeof p === 'string' && p.length >= MIN_PASS && p.length <= 200;
}

export default async function handler(req, res) {
  res.setHeader('cache-control', 'no-store');
  try {
    const me = await requireAdmin(req, res);
    if (!me) return;
    if (!dbOn()) return bad(res, 'Kullanıcı yönetimi için veritabanı (DATABASE_URL) gerekli', 503);

    if (req.method === 'GET') {
      return res.status(200).json({ users: await listUsers(), me: me.email });
    }

    if (req.method === 'POST') {
      const b = (await readJson(req)) || {};
      const email = norm(b.email);
      const name = typeof b.name === 'string' ? b.name.trim().slice(0, 120) : '';
      const role = ROLES.includes(b.role) ? b.role : 'user';
      if (!EMAIL_RE.test(email) || email.length > 254) return bad(res, 'Geçerli bir e-posta girin');
      if (!checkPassword(b.password)) return bad(res, `Şifre en az ${MIN_PASS} karakter olmalı`);
      if (!(await createUser({ email, name, role, password: b.password }, me.email))) return bad(res, 'Bu e-posta zaten kayıtlı', 409);
      return res.status(201).json({ ok: true });
    }

    if (req.method === 'PATCH') {
      const b = (await readJson(req)) || {};
      const email = norm(b.email);
      const target = email && (await findUser(email));
      if (!target) return bad(res, 'Kullanıcı bulunamadı', 404);
      const patch = {};
      if (b.name !== undefined) patch.name = typeof b.name === 'string' ? b.name.trim().slice(0, 120) : '';
      if (b.role !== undefined) {
        if (!ROLES.includes(b.role)) return bad(res, 'Geçersiz rol');
        patch.role = b.role;
      }
      if (b.active !== undefined) patch.active = Boolean(b.active);
      if (b.password !== undefined) {
        if (!checkPassword(b.password)) return bad(res, `Şifre en az ${MIN_PASS} karakter olmalı`);
        patch.password = b.password;
      }
      const losesAdmin = target.role === 'admin' && target.active && (patch.role === 'user' || patch.active === false);
      if (losesAdmin) {
        if (email === me.email) return bad(res, 'Kendi yönetici yetkinizi veya hesabınızı kapatamazsınız', 409);
        if ((await activeAdminCount(email)) < 1) return bad(res, 'Son yönetici kapatılamaz', 409);
      }
      await updateUser(email, patch);
      return res.status(200).json({ ok: true });
    }

    if (req.method === 'DELETE') {
      const email = norm(req.query?.email);
      const target = email && (await findUser(email));
      if (!target) return bad(res, 'Kullanıcı bulunamadı', 404);
      if (email === me.email) return bad(res, 'Kendi hesabınızı silemezsiniz', 409);
      if (target.role === 'admin' && target.active && (await activeAdminCount(email)) < 1) return bad(res, 'Son yönetici silinemez', 409);
      await deleteUser(email);
      return res.status(200).json({ ok: true });
    }

    res.setHeader('allow', 'GET, POST, PATCH, DELETE');
    return bad(res, 'Yöntem desteklenmiyor', 405);
  } catch (e) {
    return bad(res, 'İşlem tamamlanamadı', 500);
  }
}
