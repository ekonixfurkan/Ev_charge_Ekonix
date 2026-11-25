// GET /api/activity — işlem geçmişi. Yalnızca sahip hesap okuyabilir (diğerlerine 403). ?limit&before&actor&entity&q&own
import { requireAuth } from '../lib/auth.js';
import { listActivity, activityActors, logActivity, ensureActivity } from '../lib/activity.js';
import { sql, readJson } from '../lib/db.js';
import { trashList, trashRestore, TRASH_DAYS } from '../lib/trash.js';

export default async function handler(req, res) {
  res.setHeader('cache-control', 'no-store');
  try {
    const user = await requireAuth(req, res);
    if (!user) return;
    if (!process.env.DATABASE_URL) return res.status(503).json({ error: 'İşlem geçmişi için veritabanı gerekli' });
    // Çöp Kutusu (Hobby planda işlev sayısı sınırlı olduğu için burada): GET ?trash=1 liste · POST ?trash=1 { action:'restore', id }. Yalnızca sahip hesap.
    if (req.query?.trash !== undefined) {
      if (!user.owner) return res.status(403).json({ error: 'Çöp Kutusu yalnızca sahip hesaba açık' });
      const s = sql();
      if (req.method === 'GET') return res.status(200).json({ items: await trashList(s), days: TRASH_DAYS });
      if (req.method !== 'POST') return res.status(405).json({ error: 'Yöntem desteklenmiyor' });
      const b = (await readJson(req)) || {};
      if (b.action !== 'restore' || !/^\d+$/.test(String(b.id || ''))) return res.status(400).json({ error: 'Geçersiz istek' });
      try {
        const r = await trashRestore(s, String(b.id));
        const siteId = r.tables.sites?.[0]?.id || r.tables.site_files?.[0]?.site_id || r.tables.site_notes?.[0]?.site_id || '';
        const shipId = r.tables.shipments?.[0]?.id || r.tables.shipment_files?.[0]?.ship_id || '';
        await logActivity({ actor: user.email, action: 'geri-al', entity: shipId ? 'sevkiyat' : 'lokasyon', entityId: shipId || siteId, entityName: r.title, summary: 'Çöp Kutusu\'ndan geri alındı' });
        return res.status(200).json({ ok: true, kind: r.kind });
      } catch (e) {
        return res.status(e.status || 500).json({ error: e.status ? e.message : 'Geri alınamadı' });
      }
    }
    if (req.method === 'POST') {
      // Bir proje sayfasının açılması işlem geçmişine yazılır (bildirim üretmez). Aynı kişi aynı projeyi 10 dakika içinde tekrar açarsa yeniden yazılmaz.
      const b = (await readJson(req)) || {};
      const id = typeof b.id === 'string' ? b.id : '';
      if (!id || b.action !== 'goruntule') return res.status(400).json({ error: 'Geçersiz istek' });
      await ensureActivity();
      const s = sql();
      const site = await s`SELECT data->>'name' AS name FROM sites WHERE id = ${id}`;
      if (!site.length) return res.status(404).json({ error: 'Proje bulunamadı' });
      const recent = await s`SELECT 1 FROM activity_log WHERE actor = ${user.email} AND action = 'goruntule' AND entity_id = ${id} AND at > now() - interval '10 minutes' LIMIT 1`;
      if (!recent.length) await logActivity({ actor: user.email, action: 'goruntule', entity: 'lokasyon', entityId: id, entityName: site[0].name, summary: 'Proje sayfası açıldı' });
      return res.status(200).json({ ok: true });
    }
    if (req.method !== 'GET') {
      res.setHeader('allow', 'GET, POST');
      return res.status(405).json({ error: 'Yöntem desteklenmiyor' });
    }
    // İşlem geçmişi yalnızca sahip hesabın görebileceği bir sayfadır.
    if (!user.owner) return res.status(403).json({ error: 'Bu sayfayı yalnızca sahip hesap görebilir' });
    const { limit, before, actor, q, site, own } = req.query || {};
    // Varsayılan: kendi işlemlerim gizli. own=1 ya da Kullanıcı süzgecinde kendim seçiliyse gösterilir.
    const exclude = own === '1' || String(actor || '') === user.email ? '' : user.email;
    // Giriş/çıkış ve kullanıcı yönetimi kayıtları yalnızca yöneticiye açık.
    const entity = user.role === 'admin' ? (req.query || {}).entity : 'lokasyon';
    const beforeId = before && /^\d+$/.test(String(before)) ? String(before) : null;
    const [list, actors] = await Promise.all([
      listActivity({ limit, before: beforeId, actor: String(actor || ''), entity: String(entity || ''), q: String(q || '').slice(0, 100), site: String(site || '').slice(0, 80), exclude }),
      activityActors(),
    ]);
    return res.status(200).json({ ...list, actors });
  } catch (e) {
    return res.status(500).json({ error: 'İşlem geçmişi okunamadı' });
  }
}
