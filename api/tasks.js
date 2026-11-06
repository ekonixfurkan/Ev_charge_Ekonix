// /api/tasks — Planlayıcı: lokasyon başına görevler (görev · sorumlu · termin · durum). Giriş yapan herkes okur/ekler/düzenler.
//   GET                      tüm görevler
//   POST {site, title?, assignee?, due?}   görev ekle
//   PATCH ?id {title?, assignee?, due?, done?}
//   DELETE ?id               (ekleyen veya yönetici)
import { sql, readJson } from '../lib/db.js';
import { requireAuth } from '../lib/auth.js';
import { ensureUsers } from '../lib/users.js';
import { logActivity } from '../lib/activity.js';

let _ready = null;
function ensureTasks() {
  if (_ready) return _ready;
  const s = sql();
  _ready = (async () => {
    await s`CREATE TABLE IF NOT EXISTS site_tasks (
      id bigserial PRIMARY KEY,
      site_id text NOT NULL,
      title text NOT NULL DEFAULT '',
      assignee text NOT NULL DEFAULT '',
      due date,
      done boolean NOT NULL DEFAULT false,
      done_at timestamptz,
      created_by text NOT NULL DEFAULT '',
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_by text NOT NULL DEFAULT '',
      updated_at timestamptz NOT NULL DEFAULT now()
    )`;
    await s`CREATE INDEX IF NOT EXISTS site_tasks_site_idx ON site_tasks (site_id, id)`;
    await ensureUsers();
  })().catch((e) => { _ready = null; throw e; });
  return _ready;
}

const SELECT_ONE = (s, id) => s`SELECT t.id, t.site_id, t.title, t.assignee, to_char(t.due, 'YYYY-MM-DD') AS due, t.done, t.done_at, t.created_by,
    NULLIF(u.name, '') AS assignee_name FROM site_tasks t LEFT JOIN users u ON u.email = t.assignee WHERE t.id = ${id}::bigint`;
const shape = (r) => ({
  id: String(r.id), siteId: r.site_id, title: r.title, assignee: r.assignee, assigneeName: r.assignee_name || '',
  due: r.due || '', done: !!r.done, doneAt: r.done_at, createdBy: r.created_by,
});
const cleanTitle = (v) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, 200) : undefined);
const cleanDue = (v) => (v === '' || v === null ? '' : typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v)) ? v : undefined);

async function siteName(s, id) {
  const r = await s`SELECT data->>'name' AS name FROM sites WHERE id = ${id}`;
  return r.length ? r[0].name || id : null;
}
async function personName(s, email) {
  if (!email) return '';
  const r = await s`SELECT NULLIF(name, '') AS name FROM users WHERE email = ${email}`;
  return (r[0] && r[0].name) || email;
}

export default async function handler(req, res) {
  res.setHeader('cache-control', 'no-store');
  try {
    const user = await requireAuth(req, res);
    if (!user) return;
    if (!process.env.DATABASE_URL) return res.status(503).json({ error: 'Planlayıcı için veritabanı gerekli' });
    await ensureTasks();
    const s = sql();

    if (req.method === 'GET') {
      const rows = await s`SELECT t.id, t.site_id, t.title, t.assignee, to_char(t.due, 'YYYY-MM-DD') AS due, t.done, t.done_at, t.created_by,
          NULLIF(u.name, '') AS assignee_name FROM site_tasks t LEFT JOIN users u ON u.email = t.assignee ORDER BY t.id`;
      return res.status(200).json({ tasks: rows.map(shape), me: user.email, admin: user.role === 'admin' });
    }

    if (req.method === 'POST') {
      const b = (await readJson(req)) || {};
      const site = typeof b.site === 'string' ? b.site : '';
      const name = await siteName(s, site);
      if (name == null) return res.status(404).json({ error: 'Lokasyon bulunamadı' });
      const title = cleanTitle(b.title) || '';
      const due = cleanDue(b.due);
      let assignee = typeof b.assignee === 'string' ? b.assignee : '';
      if (assignee) {
        const ok = await s`SELECT 1 FROM users WHERE email = ${assignee} AND active`;
        if (!ok.length) assignee = '';
      }
      const r = await s`INSERT INTO site_tasks (site_id, title, assignee, due, created_by, updated_by)
        VALUES (${site}, ${title}, ${assignee}, ${due || null}::date, ${user.email}, ${user.email}) RETURNING id`;
      if (title) await logActivity({ actor: user.email, action: 'gorev-ekle', entity: 'lokasyon', entityId: site, entityName: name, summary: title });
      const one = await SELECT_ONE(s, r[0].id);
      return res.status(201).json({ task: shape(one[0]) });
    }

    const id = String(req.query?.id || '');
    if (!/^\d+$/.test(id)) return res.status(400).json({ error: 'id gerekli' });
    const old = await s`SELECT * FROM site_tasks WHERE id = ${id}::bigint`;
    if (!old.length) return res.status(404).json({ error: 'Görev bulunamadı' });
    const o = old[0];
    const name = (await siteName(s, o.site_id)) || o.site_id;

    if (req.method === 'PATCH') {
      const b = (await readJson(req)) || {};
      const title = cleanTitle(b.title);
      const due = cleanDue(b.due);
      let assignee;
      if (typeof b.assignee === 'string') {
        assignee = b.assignee;
        if (assignee) {
          const ok = await s`SELECT 1 FROM users WHERE email = ${assignee} AND active`;
          if (!ok.length) return res.status(400).json({ error: 'Sorumlu geçerli bir kullanıcı olmalı' });
        }
      }
      const done = typeof b.done === 'boolean' ? b.done : undefined;
      await s`UPDATE site_tasks SET
          title = COALESCE(${title ?? null}, title),
          assignee = COALESCE(${assignee ?? null}, assignee),
          due = CASE WHEN ${due === undefined} THEN due ELSE ${due || null}::date END,
          done = COALESCE(${done ?? null}::boolean, done),
          done_at = CASE WHEN ${done === undefined} THEN done_at WHEN ${done === true} THEN now() ELSE NULL END,
          updated_by = ${user.email}, updated_at = now()
        WHERE id = ${id}::bigint`;
      const cur = (await SELECT_ONE(s, id))[0];
      if (title !== undefined && !o.title && title) await logActivity({ actor: user.email, action: 'gorev-ekle', entity: 'lokasyon', entityId: o.site_id, entityName: name, summary: title });
      if (done === true && !o.done) await logActivity({ actor: user.email, action: 'gorev-tamam', entity: 'lokasyon', entityId: o.site_id, entityName: name, summary: cur.title });
      if (assignee !== undefined && assignee !== o.assignee && assignee) await logActivity({ actor: user.email, action: 'gorev-ata', entity: 'lokasyon', entityId: o.site_id, entityName: name, summary: `${cur.title || 'Görev'} → ${await personName(s, assignee)}` });
      return res.status(200).json({ task: shape(cur) });
    }

    if (req.method === 'DELETE') {
      if (o.created_by !== user.email && user.role !== 'admin') return res.status(403).json({ error: 'Görevi yalnızca ekleyen veya yönetici silebilir' });
      await s`DELETE FROM site_tasks WHERE id = ${id}::bigint`;
      if (o.title) await logActivity({ actor: user.email, action: 'gorev-sil', entity: 'lokasyon', entityId: o.site_id, entityName: name, summary: o.title });
      return res.status(200).json({ ok: true });
    }

    res.setHeader('allow', 'GET, POST, PATCH, DELETE');
    return res.status(405).json({ error: 'Yöntem desteklenmiyor' });
  } catch (e) {
    return res.status(500).json({ error: 'Planlayıcı işlenemedi' });
  }
}
