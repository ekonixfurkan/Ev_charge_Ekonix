// GET /api/people — aktif kullanıcıların ad listesi (Sorumlu seçimi için). Parola/rol bilgisi dönmez.
import { requireAuth } from '../lib/auth.js';
import { sql } from '../lib/db.js';
import { ensureUsers } from '../lib/users.js';

export default async function handler(req, res) {
  res.setHeader('cache-control', 'no-store');
  try {
    if (!(await requireAuth(req, res))) return;
    if (!process.env.DATABASE_URL) return res.status(503).json({ error: 'Veritabanı gerekli' });
    if (req.method !== 'GET') {
      res.setHeader('allow', 'GET');
      return res.status(405).json({ error: 'Yöntem desteklenmiyor' });
    }
    await ensureUsers();
    const rows = await sql()`SELECT email, name FROM users WHERE active ORDER BY COALESCE(NULLIF(name, ''), email)`;
    return res.status(200).json({ people: rows.map((r) => ({ email: r.email, name: r.name || '' })) });
  } catch (e) {
    return res.status(500).json({ error: 'Kişiler okunamadı' });
  }
}
