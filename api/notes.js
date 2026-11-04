// /api/notes — lokasyon başına şirket içi notlar. GET ?site=ID · POST { site, body } · DELETE ?id=
import { sql, readJson } from '../lib/db.js';
import { requireAuth } from '../lib/auth.js';
import { ensureUsers } from '../lib/users.js';
import { logActivity } from '../lib/activity.js';

let _ready = null;
function ensureNotes() {
  if (_ready) return _ready;
  const s = sql();
  _ready = (async () => {
    await s`CREATE TABLE IF NOT EXISTS site_notes (
      id bigserial PRIMARY KEY,
      site_id text NOT NULL,
      author text NOT NULL,
      body text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    )`;
    await s`CREATE INDEX IF NOT EXISTS site_notes_site_idx ON site_notes (site_id, id)`;
    await ensureUsers();
  })().catch((e) => { _ready = null; throw e; });
  return _ready;
}

export default async function handler(req, res) {
  res.setHeader('cache-control', 'no-store');
  try {
    const user = await requireAuth(req, res);
    if (!user) return;
    if (!process.env.DATABASE_URL) return res.status(503).json({ error: 'Notlar için veritabanı gerekli' });
    await ensureNotes();
    const s = sql();

    if (req.method === 'GET') {
      const site = String(req.query?.site || '');
      if (!site) return res.status(400).json({ error: 'site gerekli' });
      const rows = await s`SELECT n.id, n.body, n.created_at, n.author, NULLIF(u.name, '') AS author_name
        FROM site_notes n LEFT JOIN users u ON u.email = n.author
        WHERE n.site_id = ${site} ORDER BY n.id`;
      return res.status(200).json({ notes: rows });
    }

    if (req.method === 'POST') {
      const b = (await readJson(req)) || {};
      const site = typeof b.site === 'string' ? b.site : '';
      const body = typeof b.body === 'string' ? b.body.trim() : '';
      if (!site) return res.status(400).json({ error: 'site gerekli' });
      if (!body || body.length > 2000) return res.status(400).json({ error: 'Not 1–2000 karakter olmalı' });
      const found = await s`SELECT data->>'name' AS name FROM sites WHERE id = ${site}`;
      if (!found.length) return res.status(404).json({ error: 'Lokasyon bulunamadı' });
      const r = await s`INSERT INTO site_notes (site_id, author, body) VALUES (${site}, ${user.email}, ${body}) RETURNING id`;
      await logActivity({ actor: user.email, action: 'not-ekle', entity: 'lokasyon', entityId: site, entityName: found[0].name, summary: 'Şirket içi not eklendi' });
      return res.status(201).json({ ok: true, id: r[0].id });
    }

    if (req.method === 'DELETE') {
      const id = String(req.query?.id || '');
      if (!/^\d+$/.test(id)) return res.status(400).json({ error: 'id gerekli' });
      const r = await s`SELECT n.author, n.site_id, (SELECT data->>'name' FROM sites WHERE id = n.site_id) AS name FROM site_notes n WHERE n.id = ${id}::bigint`;
      if (!r.length) return res.status(404).json({ error: 'Not bulunamadı' });
      if (r[0].author !== user.email && user.role !== 'admin') return res.status(403).json({ error: 'Notu yalnızca yazan kişi veya yönetici silebilir' });
      await s`DELETE FROM site_notes WHERE id = ${id}::bigint`;
      await logActivity({ actor: user.email, action: 'not-sil', entity: 'lokasyon', entityId: r[0].site_id, entityName: r[0].name || r[0].site_id, summary: 'Şirket içi not silindi' });
      return res.status(200).json({ ok: true });
    }

    res.setHeader('allow', 'GET, POST, DELETE');
    return res.status(405).json({ error: 'Yöntem desteklenmiyor' });
  } catch (e) {
    return res.status(500).json({ error: 'Notlar işlenemedi' });
  }
}
