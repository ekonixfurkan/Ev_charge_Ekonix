// /api/sites — GET (tüm projeler + ekip), PUT (proje upsert), DELETE (?id=)
import { sql, ensureSchema, readJson } from '../lib/db.js';
import { requireAuth } from '../lib/auth.js';
import { logActivity, diffSite, summarize } from '../lib/activity.js';
import { seedOnce } from '../lib/seed.js';
import { nextCode, backfillCodes } from '../lib/codes.js';
import { reorderOnce } from '../lib/reorder.js';
import { _deps as _filesDeps } from '../lib/files.js';

export default async function handler(req, res) {
  try {
    const user = await requireAuth(req, res);
    if (!user) return;
    await ensureSchema();
    const s = sql();

    if (req.method === 'GET') {
      try { await seedOnce(s); } catch { /* başlangıç listesi eklenemezse okuma bozulmasın */ }
      try { await backfillCodes(s); } catch { /* kod verilemezse okuma bozulmasın */ }
      try { await reorderOnce(s); } catch { /* sıra değişmezse okuma bozulmasın */ }
      const rows = await s`SELECT data FROM sites ORDER BY updated_at`;
      const cfg = await s`SELECT data FROM config WHERE key = 'team'`;
      const team = cfg[0]?.data?.names;
      res.setHeader('cache-control', 'no-store');
      return res.status(200).json({
        sites: rows.map((r) => r.data),
        team: Array.isArray(team) ? team : [],
      });
    }

    if (req.method === 'PUT') {
      const site = await readJson(req);
      if (!site || typeof site.id !== 'string' || !site.id) {
        return res.status(400).json({ error: 'Geçersiz proje' });
      }
      const prev = await s`SELECT data FROM sites WHERE id = ${site.id}`;
      // Proje kodu yalnızca sunucudan gelir: varsa korunur, yoksa sıradaki numara verilir (istemcinin gönderdiği değer yok sayılır).
      site.code = prev[0]?.data?.code || (await nextCode(s));
      await s`INSERT INTO sites (id, data, updated_at)
              VALUES (${site.id}, ${JSON.stringify(site)}::jsonb, now())
              ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = now()`;
      const old = prev[0]?.data;
      if (!old) {
        await logActivity({ actor: user.email, action: 'olustur', entity: 'lokasyon', entityId: site.id, entityName: site.name, summary: 'Proje oluşturuldu' });
      } else {
        const changes = diffSite(old, site);
        if (changes.length) await logActivity({ actor: user.email, action: 'guncelle', entity: 'lokasyon', entityId: site.id, entityName: site.name, summary: summarize(changes), changes });
      }
      return res.status(200).json({ ok: true, code: site.code });
    }

    if (req.method === 'DELETE') {
      // Excel'deki kural: kayıt silinmez, Durum ile kapatılır. Silme yalnızca yönetici.
      if (user.role !== 'admin') return res.status(403).json({ error: 'Silme için yönetici yetkisi gerekli' });
      const id = req.query?.id;
      if (!id) return res.status(400).json({ error: 'id gerekli' });
      const prev = await s`SELECT data FROM sites WHERE id = ${id}`;
      await s`DELETE FROM sites WHERE id = ${id}`;
      try { await s`DELETE FROM site_notes WHERE site_id = ${id}`; } catch { /* not tablosu henüz yoksa */ }
      try {
        // Projenin dosyaları da silinir (Blob + kayıtlar).
        const files = await s`SELECT pathname FROM site_files WHERE site_id = ${id}`;
        if (files.length) await _filesDeps.del(files.map((f) => f.pathname));
        await s`DELETE FROM site_files WHERE site_id = ${id}`;
        await s`DELETE FROM site_folders WHERE site_id = ${id}`;
      } catch { /* dosya tabloları henüz yoksa */ }
      await logActivity({ actor: user.email, action: 'sil', entity: 'lokasyon', entityId: id, entityName: prev[0]?.data?.name || id, summary: 'Proje silindi' });
      return res.status(204).end();
    }

    res.setHeader('allow', 'GET, PUT, DELETE');
    return res.status(405).json({ error: 'Yöntem desteklenmiyor' });
  } catch (e) {
    return res.status(500).json({ error: String(e?.message || e) });
  }
}
