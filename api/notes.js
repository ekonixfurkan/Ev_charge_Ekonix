// /api/notes — proje başına şirket içi notlar. GET ?site=ID · POST { site, body } · DELETE ?id=
// Toplantı notları da burada (Hobby planda işlev sayısı sınırlı): ?meeting=list (GET) · ?meeting=new (POST) · ?meeting=ID (PATCH, DELETE)
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
    await s`CREATE TABLE IF NOT EXISTS meetings (
      id bigserial PRIMARY KEY,
      site_id text,
      project_name text NOT NULL DEFAULT '',
      meeting_date date NOT NULL DEFAULT current_date,
      title text NOT NULL DEFAULT '',
      participants jsonb NOT NULL DEFAULT '[]'::jsonb,
      body text NOT NULL DEFAULT '',
      created_by text NOT NULL DEFAULT '',
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_by text NOT NULL DEFAULT '',
      updated_at timestamptz NOT NULL DEFAULT now()
    )`;
    await ensureUsers();
  })().catch((e) => { _ready = null; throw e; });
  return _ready;
}

const meetShape = (r) => ({
  id: String(r.id), siteId: r.site_id || '', projectName: r.project_name || '', date: r.d, title: r.title, participants: Array.isArray(r.participants) ? r.participants : [],
  body: r.body, createdBy: r.created_by, createdByName: r.created_by_name || '', updatedAt: r.updated_at,
});
const meetOne = (s, id) => s`SELECT m.id, m.site_id, m.project_name, to_char(m.meeting_date, 'YYYY-MM-DD') AS d, m.title, m.participants, m.body, m.created_by, m.updated_at,
    NULLIF(u.name, '') AS created_by_name FROM meetings m LEFT JOIN users u ON u.email = m.created_by WHERE m.id = ${id}::bigint`;
const oneLine = (v, max) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, max) : undefined);

// Toplantı notları: proje ya mevcut bir projedir (siteId) ya da henüz sistemde olmayan yeni bir projedir (projectName).
async function meetingHandler(req, res, user, s) {
  const key = String(req.query.meeting);
  if (req.method === 'GET') {
    const rows = await s`SELECT m.id, m.site_id, m.project_name, to_char(m.meeting_date, 'YYYY-MM-DD') AS d, m.title, m.participants, m.body, m.created_by, m.updated_at,
        NULLIF(u.name, '') AS created_by_name FROM meetings m LEFT JOIN users u ON u.email = m.created_by ORDER BY m.meeting_date DESC, m.id DESC`;
    return res.status(200).json({ meetings: rows.map(meetShape), me: user.email, owner: Boolean(user.owner) });
  }

  const readFields = async (b, partial) => {
    const out = {};
    const siteId = typeof b.siteId === 'string' ? b.siteId : undefined;
    const projectName = oneLine(b.projectName, 120);
    if (siteId !== undefined) {
      if (siteId) {
        const f = await s`SELECT 1 FROM sites WHERE id = ${siteId}`;
        if (!f.length) throw Object.assign(new Error('Proje bulunamadı'), { code: 404 });
      }
      out.siteId = siteId;
    }
    if (projectName !== undefined) out.projectName = projectName;
    if (typeof b.date === 'string') {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(b.date) || Number.isNaN(Date.parse(b.date))) throw Object.assign(new Error('Geçerli bir tarih girin'), { code: 400 });
      out.date = b.date;
    }
    const title = oneLine(b.title, 150);
    if (title !== undefined) out.title = title;
    if (Array.isArray(b.participants)) {
      const seen = new Set();
      out.participants = b.participants.map((x) => oneLine(x, 80)).filter((x) => x && !seen.has(x.toLowerCase()) && seen.add(x.toLowerCase())).slice(0, 30);
    }
    if (typeof b.body === 'string') {
      if (b.body.length > 20000) throw Object.assign(new Error('Notlar en fazla 20.000 karakter olabilir'), { code: 400 });
      out.body = b.body;
    }
    if (!partial) {
      if (!out.siteId && !out.projectName) throw Object.assign(new Error('Bir proje seçin ya da yeni projenin adını yazın'), { code: 400 });
      if (!out.title && !out.body) throw Object.assign(new Error('Konu veya not girin'), { code: 400 });
    }
    return out;
  };
  const label = async (siteId, projectName, title) => {
    let n = projectName;
    if (siteId) { const f = await s`SELECT data->>'name' AS name FROM sites WHERE id = ${siteId}`; n = (f[0] && f[0].name) || siteId; }
    return { name: n || title || 'Toplantı', entity: siteId ? 'lokasyon' : 'toplanti', id: siteId || null };
  };

  try {
    if (req.method === 'POST') {
      const f = await readFields((await readJson(req)) || {}, false);
      const site = f.siteId || null, pname = site ? '' : f.projectName || '';
      const r = await s`INSERT INTO meetings (site_id, project_name, meeting_date, title, participants, body, created_by, updated_by)
        VALUES (${site}, ${pname}, COALESCE(${f.date ?? null}::date, current_date), ${f.title ?? ''}, ${JSON.stringify(f.participants || [])}::jsonb, ${f.body ?? ''}, ${user.email}, ${user.email}) RETURNING id`;
      const one = await meetOne(s, r[0].id);
      const l = await label(site, pname, f.title);
      await logActivity({ actor: user.email, action: 'toplanti-ekle', entity: l.entity, entityId: l.id, entityName: l.name, summary: f.title || 'Toplantı notu' });
      return res.status(201).json({ meeting: meetShape(one[0]) });
    }

    if (!/^\d+$/.test(key)) return res.status(400).json({ error: 'id gerekli' });
    const old = await s`SELECT * FROM meetings WHERE id = ${key}::bigint`;
    if (!old.length) return res.status(404).json({ error: 'Toplantı notu bulunamadı' });
    const o = old[0];

    if (req.method === 'PATCH') {
      const f = await readFields((await readJson(req)) || {}, true);
      let site = o.site_id, pname = o.project_name;
      if (f.siteId !== undefined) { site = f.siteId || null; pname = site ? '' : (f.projectName ?? o.project_name); }
      else if (f.projectName !== undefined) pname = f.projectName;
      if (!site && !pname) return res.status(400).json({ error: 'Bir proje seçin ya da yeni projenin adını yazın' });
      await s`UPDATE meetings SET site_id = ${site}, project_name = ${site ? '' : pname}, meeting_date = COALESCE(${f.date ?? null}::date, meeting_date),
          title = COALESCE(${f.title ?? null}, title), participants = COALESCE(${f.participants ? JSON.stringify(f.participants) : null}::jsonb, participants),
          body = COALESCE(${f.body ?? null}, body), updated_by = ${user.email}, updated_at = now() WHERE id = ${key}::bigint`;
      const one = await meetOne(s, key);
      return res.status(200).json({ meeting: meetShape(one[0]) });
    }

    if (req.method === 'DELETE') {
      if (!user.owner) return res.status(403).json({ error: 'Silme yetkisi yalnızca sahip hesaptadır' });
      await s`DELETE FROM meetings WHERE id = ${key}::bigint`;
      const l = await label(o.site_id, o.project_name, o.title);
      await logActivity({ actor: user.email, action: 'toplanti-sil', entity: l.entity, entityId: l.id, entityName: l.name, summary: o.title || 'Toplantı notu' });
      return res.status(200).json({ ok: true });
    }
    res.setHeader('allow', 'GET, POST, PATCH, DELETE');
    return res.status(405).json({ error: 'Yöntem desteklenmiyor' });
  } catch (e) {
    if (e && e.code && Number.isInteger(e.code)) return res.status(e.code).json({ error: e.message });
    throw e;
  }
}

export default async function handler(req, res) {
  res.setHeader('cache-control', 'no-store');
  try {
    const user = await requireAuth(req, res);
    if (!user) return;
    if (!process.env.DATABASE_URL) return res.status(503).json({ error: 'Notlar için veritabanı gerekli' });
    await ensureNotes();
    const s = sql();
    if (req.query?.meeting !== undefined) return await meetingHandler(req, res, user, s);

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
      if (!found.length) return res.status(404).json({ error: 'Proje bulunamadı' });
      const r = await s`INSERT INTO site_notes (site_id, author, body) VALUES (${site}, ${user.email}, ${body}) RETURNING id`;
      await logActivity({ actor: user.email, action: 'not-ekle', entity: 'lokasyon', entityId: site, entityName: found[0].name, summary: 'Şirket içi not eklendi' });
      return res.status(201).json({ ok: true, id: r[0].id });
    }

    if (req.method === 'DELETE') {
      const id = String(req.query?.id || '');
      if (!/^\d+$/.test(id)) return res.status(400).json({ error: 'id gerekli' });
      const r = await s`SELECT n.author, n.site_id, (SELECT data->>'name' FROM sites WHERE id = n.site_id) AS name FROM site_notes n WHERE n.id = ${id}::bigint`;
      if (!r.length) return res.status(404).json({ error: 'Not bulunamadı' });
      if (!user.owner) return res.status(403).json({ error: 'Silme yetkisi yalnızca sahip hesaptadır' });
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
