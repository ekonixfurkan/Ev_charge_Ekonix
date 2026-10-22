// /api/team — PUT (ekip üyesi listesi upsert)
import { sql, ensureSchema, readJson } from '../lib/db.js';
import { requireAuth } from '../lib/auth.js';

export default async function handler(req, res) {
  try {
    if (!requireAuth(req, res)) return;
    await ensureSchema();
    const s = sql();

    if (req.method === 'GET') {
      const cfg = await s`SELECT data FROM config WHERE key = 'team'`;
      const team = cfg[0]?.data?.names;
      res.setHeader('cache-control', 'no-store');
      return res.status(200).json({ names: Array.isArray(team) ? team : [] });
    }

    if (req.method === 'PUT') {
      const body = await readJson(req);
      const names = Array.isArray(body?.names)
        ? body.names.filter((x) => typeof x === 'string' && x.trim()).slice(0, 200)
        : null;
      if (!names) return res.status(400).json({ error: 'names dizisi gerekli' });
      await s`INSERT INTO config (key, data)
              VALUES ('team', ${JSON.stringify({ names })}::jsonb)
              ON CONFLICT (key) DO UPDATE SET data = EXCLUDED.data`;
      return res.status(200).json({ ok: true });
    }

    res.setHeader('allow', 'GET, PUT');
    return res.status(405).json({ error: 'Yöntem desteklenmiyor' });
  } catch (e) {
    return res.status(500).json({ error: String(e?.message || e) });
  }
}
