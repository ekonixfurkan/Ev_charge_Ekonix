// /api/notifications — başkalarının lokasyonlardaki işlemleri. GET: okunmamış sayısı + son 30 kayıt · POST: tümünü okundu say
import { sql } from '../lib/db.js';
import { requireAuth } from '../lib/auth.js';
import { ensureActivity } from '../lib/activity.js';
import { ensureUsers } from '../lib/users.js';

let _ready = null;
function ensureSeen() {
  if (_ready) return _ready;
  const s = sql();
  _ready = (async () => {
    await ensureActivity();
    await ensureUsers();
    await s`CREATE TABLE IF NOT EXISTS notif_seen (email text PRIMARY KEY, last_id bigint NOT NULL DEFAULT 0)`;
  })().catch((e) => { _ready = null; throw e; });
  return _ready;
}

const ACTIONS = ['olustur', 'guncelle', 'sil', 'not-ekle'];

export default async function handler(req, res) {
  res.setHeader('cache-control', 'no-store');
  try {
    const user = await requireAuth(req, res);
    if (!user) return;
    if (!process.env.DATABASE_URL) return res.status(503).json({ error: 'Bildirimler için veritabanı gerekli' });
    await ensureSeen();
    const s = sql();

    if (req.method === 'GET') {
      // İlk kez bakan kullanıcıya eski geçmiş bildirim olarak yağmasın: o ana kadarki her şey okunmuş sayılır.
      let seen = await s`SELECT last_id FROM notif_seen WHERE email = ${user.email}`;
      if (!seen.length) {
        seen = await s`INSERT INTO notif_seen (email, last_id) SELECT ${user.email}, COALESCE(MAX(id), 0) FROM activity_log
                       ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email RETURNING last_id`;
      }
      const last = String(seen[0].last_id);
      const items = await s`SELECT a.id, a.at, a.actor, a.action, a.entity_id, a.entity_name, a.summary, NULLIF(u.name, '') AS actor_name,
          (a.id > ${last}::bigint) AS unread
        FROM activity_log a LEFT JOIN users u ON u.email = a.actor
        WHERE a.entity = 'lokasyon' AND a.action = ANY(${ACTIONS}) AND a.actor <> ${user.email} AND a.actor <> 'Sistem'
        ORDER BY a.id DESC LIMIT 30`;
      const unread = items.filter((x) => x.unread).length;
      const more = await s`SELECT count(*)::int AS n FROM activity_log
        WHERE id > ${last}::bigint AND entity = 'lokasyon' AND action = ANY(${ACTIONS}) AND actor <> ${user.email} AND actor <> 'Sistem'`;
      return res.status(200).json({ unread: more[0].n, shown: unread, items });
    }

    if (req.method === 'POST') {
      await s`INSERT INTO notif_seen (email, last_id) SELECT ${user.email}, COALESCE(MAX(id), 0) FROM activity_log
              ON CONFLICT (email) DO UPDATE SET last_id = EXCLUDED.last_id`;
      return res.status(200).json({ ok: true });
    }

    res.setHeader('allow', 'GET, POST');
    return res.status(405).json({ error: 'Yöntem desteklenmiyor' });
  } catch (e) {
    return res.status(500).json({ error: 'Bildirimler okunamadı' });
  }
}
