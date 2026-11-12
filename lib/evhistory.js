// Rakip Analizi geçmişi: her yeni TomTom analizi kaydedilir; listelenir, yeniden açılır, adlandırılır, (sahip hesap) silinir.
// /api/sites?evh=list|<id> (GET) · ?evh=<id> (PATCH {label}) · (DELETE, yalnızca sahip). Hobby planda 12 işlev sınırı nedeniyle ayrı işlev yok.
import { readJson } from './db.js';

let _ready = null;
export function ensureHistory(s) {
  if (_ready) return _ready;
  _ready = (async () => {
    await s`CREATE TABLE IF NOT EXISTS ev_analyses (
      id bigserial PRIMARY KEY,
      created_by text NOT NULL DEFAULT '',
      created_at timestamptz NOT NULL DEFAULT now(),
      lat double precision NOT NULL,
      lon double precision NOT NULL,
      radius integer NOT NULL,
      label text NOT NULL DEFAULT '',
      site_id text NOT NULL DEFAULT '',
      il text NOT NULL DEFAULT '',
      ilce text NOT NULL DEFAULT '',
      mahalle text NOT NULL DEFAULT '',
      cadde text NOT NULL DEFAULT '',
      address jsonb,
      totals jsonb NOT NULL,
      stations jsonb NOT NULL
    )`;
    await s`CREATE INDEX IF NOT EXISTS ev_analyses_at_ix ON ev_analyses (created_at DESC)`;
  })().catch((e) => { _ready = null; throw e; });
  return _ready;
}

const clip = (v, n) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, n) : '');

export async function saveAnalysis(s, user, data, { label = '', siteId = '' } = {}) {
  await ensureHistory(s);
  const a = data.address || {};
  const r = await s`INSERT INTO ev_analyses (created_by, lat, lon, radius, label, site_id, il, ilce, mahalle, cadde, address, totals, stations)
    VALUES (${user.email}, ${data.area.lat}, ${data.area.lon}, ${data.area.radius}, ${clip(label, 120)}, ${clip(siteId, 80)},
      ${clip(a.il, 60)}, ${clip(a.ilce, 60)}, ${clip(a.mahalle, 80)}, ${clip(a.cadde, 120)}, ${JSON.stringify(a)}::jsonb, ${JSON.stringify(data.totals)}::jsonb, ${JSON.stringify(data.stations)}::jsonb)
    RETURNING id`;
  return String(r[0].id);
}

const shape = (r, names = {}) => ({
  id: String(r.id), createdAt: r.created_at, createdBy: r.created_by, createdByName: names[r.created_by] || '',
  lat: r.lat, lon: r.lon, radius: r.radius, label: r.label, siteId: r.site_id,
  il: r.il, ilce: r.ilce, mahalle: r.mahalle, cadde: r.cadde, address: r.address || {}, totals: r.totals,
});

export async function handleHistory(req, res, user, s) {
  await ensureHistory(s);
  const what = String(req.query?.evh || '');
  const nameMap = async (emails) => {
    const out = {};
    try {
      const r = await s`SELECT email, NULLIF(name, '') AS name FROM users WHERE email = ANY(${emails}::text[])`;
      for (const x of r) out[x.email] = x.name || '';
    } catch { /* users tablosu yoksa e-posta gösterilir */ }
    return out;
  };

  if (req.method === 'GET' && what === 'list') {
    const q = req.query || {};
    const limit = Math.min(Math.max(parseInt(q.limit, 10) || 20, 1), 100);
    const offset = Math.max(parseInt(q.offset, 10) || 0, 0);
    const mine = q.mine === '1' ? user.email : '';
    const rows = await s`SELECT id, created_by, created_at, lat, lon, radius, label, site_id, il, ilce, mahalle, cadde, address, totals, count(*) OVER()::int AS total
      FROM ev_analyses WHERE (${mine} = '' OR created_by = ${mine}) ORDER BY id DESC LIMIT ${limit} OFFSET ${offset}`;
    const names = await nameMap([...new Set(rows.map((r) => r.created_by))]);
    return res.status(200).json({ rows: rows.map((r) => shape(r, names)), total: rows[0]?.total || 0, me: user.email, owner: Boolean(user.owner) });
  }

  if (!/^\d+$/.test(what)) return res.status(400).json({ error: 'Geçersiz istek' });

  if (req.method === 'GET') {
    const r = await s`SELECT * FROM ev_analyses WHERE id = ${what}::bigint`;
    if (!r.length) return res.status(404).json({ error: 'Analiz bulunamadı' });
    const names = await nameMap([r[0].created_by]);
    return res.status(200).json({ ...shape(r[0], names), stations: r[0].stations, fetchedAt: r[0].created_at, area: { lat: r[0].lat, lon: r[0].lon, radius: r[0].radius }, saved: true });
  }
  if (req.method === 'PATCH') {
    const b = (await readJson(req)) || {};
    const label = clip(b.label, 120);
    const r = await s`UPDATE ev_analyses SET label = ${label} WHERE id = ${what}::bigint RETURNING id, label`;
    if (!r.length) return res.status(404).json({ error: 'Analiz bulunamadı' });
    return res.status(200).json({ id: String(r[0].id), label: r[0].label });
  }
  if (req.method === 'DELETE') {
    if (!user.owner) return res.status(403).json({ error: 'Silme yetkisi yalnızca sahip hesaptadır' });
    await s`DELETE FROM ev_analyses WHERE id = ${what}::bigint`;
    return res.status(200).json({ ok: true });
  }
  res.setHeader('allow', 'GET, PATCH, DELETE');
  return res.status(405).json({ error: 'Yöntem desteklenmiyor' });
}
