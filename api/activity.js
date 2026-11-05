// GET /api/activity — işlem geçmişi. Yönetici her şeyi görür; diğer kullanıcılar yalnızca lokasyon işlemlerini. ?limit&before&actor&entity&q
import { requireAuth } from '../lib/auth.js';
import { listActivity, activityActors, logActivity, ensureActivity } from '../lib/activity.js';
import { sql, readJson } from '../lib/db.js';

export default async function handler(req, res) {
  res.setHeader('cache-control', 'no-store');
  try {
    const user = await requireAuth(req, res);
    if (!user) return;
    if (!process.env.DATABASE_URL) return res.status(503).json({ error: 'İşlem geçmişi için veritabanı gerekli' });
    if (req.method === 'POST') {
      // Bir lokasyon sayfasının açılması işlem geçmişine yazılır (bildirim üretmez). Aynı kişi aynı lokasyonu 10 dakika içinde tekrar açarsa yeniden yazılmaz.
      const b = (await readJson(req)) || {};
      const id = typeof b.id === 'string' ? b.id : '';
      if (!id || b.action !== 'goruntule') return res.status(400).json({ error: 'Geçersiz istek' });
      await ensureActivity();
      const s = sql();
      const site = await s`SELECT data->>'name' AS name FROM sites WHERE id = ${id}`;
      if (!site.length) return res.status(404).json({ error: 'Lokasyon bulunamadı' });
      const recent = await s`SELECT 1 FROM activity_log WHERE actor = ${user.email} AND action = 'goruntule' AND entity_id = ${id} AND at > now() - interval '10 minutes' LIMIT 1`;
      if (!recent.length) await logActivity({ actor: user.email, action: 'goruntule', entity: 'lokasyon', entityId: id, entityName: site[0].name, summary: 'Lokasyon sayfası açıldı' });
      return res.status(200).json({ ok: true });
    }
    if (req.method !== 'GET') {
      res.setHeader('allow', 'GET, POST');
      return res.status(405).json({ error: 'Yöntem desteklenmiyor' });
    }
    const { limit, before, actor, q } = req.query || {};
    // Giriş/çıkış ve kullanıcı yönetimi kayıtları yalnızca yöneticiye açık.
    const entity = user.role === 'admin' ? (req.query || {}).entity : 'lokasyon';
    const beforeId = before && /^\d+$/.test(String(before)) ? String(before) : null;
    const [list, actors] = await Promise.all([
      listActivity({ limit, before: beforeId, actor: String(actor || ''), entity: String(entity || ''), q: String(q || '').slice(0, 100) }),
      activityActors(),
    ]);
    return res.status(200).json({ ...list, actors });
  } catch (e) {
    return res.status(500).json({ error: 'İşlem geçmişi okunamadı' });
  }
}
