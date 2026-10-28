// /api/sites — GET (tüm lokasyonlar + ekip), PUT (lokasyon upsert), DELETE (?id=)
import { sql, ensureSchema, readJson } from '../lib/db.js';
import { requireAuth } from '../lib/auth.js';

export default async function handler(req, res) {
  try {
    const user = await requireAuth(req, res);
    if (!user) return;
    await ensureSchema();
    const s = sql();

    if (req.method === 'GET') {
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
        return res.status(400).json({ error: 'Geçersiz lokasyon' });
      }
      await s`INSERT INTO sites (id, data, updated_at)
              VALUES (${site.id}, ${JSON.stringify(site)}::jsonb, now())
              ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = now()`;
      return res.status(200).json({ ok: true });
    }

    if (req.method === 'DELETE') {
      // Excel'deki kural: kayıt silinmez, Durum ile kapatılır. Silme yalnızca yönetici.
      if (user.role !== 'admin') return res.status(403).json({ error: 'Silme için yönetici yetkisi gerekli' });
      const id = req.query?.id;
      if (!id) return res.status(400).json({ error: 'id gerekli' });
      await s`DELETE FROM sites WHERE id = ${id}`;
      return res.status(204).end();
    }

    res.setHeader('allow', 'GET, PUT, DELETE');
    return res.status(405).json({ error: 'Yöntem desteklenmiyor' });
  } catch (e) {
    return res.status(500).json({ error: String(e?.message || e) });
  }
}
