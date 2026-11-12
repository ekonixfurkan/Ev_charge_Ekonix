// /api/contacts — Kişiler rehberi (+ Lead Havuzu: ?leads=…, bkz. lib/leads.js) (şirket · ad · soyad · telefon · e-posta · unvan). Giriş yapan herkes okur/ekler/düzenler.
// GET · POST { alanlar } · PATCH ?id { değişen alanlar } · DELETE ?id (yalnızca sahip hesap)
import { sql, readJson } from '../lib/db.js';
import { requireAuth } from '../lib/auth.js';
import { ensureUsers } from '../lib/users.js';
import { logActivity } from '../lib/activity.js';
import { handleLeads } from '../lib/leads.js';

let _ready = null;
function ensureContacts() {
  if (_ready) return _ready;
  const s = sql();
  _ready = (async () => {
    await s`CREATE TABLE IF NOT EXISTS contacts (
      id bigserial PRIMARY KEY,
      company text NOT NULL DEFAULT '',
      first_name text NOT NULL DEFAULT '',
      last_name text NOT NULL DEFAULT '',
      phone text NOT NULL DEFAULT '',
      email text NOT NULL DEFAULT '',
      title text NOT NULL DEFAULT '',
      created_by text NOT NULL DEFAULT '',
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_by text NOT NULL DEFAULT '',
      updated_at timestamptz NOT NULL DEFAULT now()
    )`;
    await ensureUsers();
  })().catch((e) => { _ready = null; throw e; });
  return _ready;
}

// istemci alanı -> [sütun, en fazla uzunluk, görünen ad]
const FIELDS = {
  company: ['company', 120, 'Şirket'],
  firstName: ['first_name', 80, 'Ad'],
  lastName: ['last_name', 80, 'Soyad'],
  phone: ['phone', 30, 'Telefon'],
  email: ['email', 254, 'E-posta'],
  title: ['title', 100, 'Unvan'],
};

const clean = (v, max) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, max) : undefined);
function pick(body) {
  const out = {};
  for (const [k, [, max]] of Object.entries(FIELDS)) {
    const v = clean(body?.[k], max);
    if (v !== undefined) out[k] = v;
  }
  return out;
}
const shape = (r) => ({
  id: String(r.id), company: r.company, firstName: r.first_name, lastName: r.last_name, phone: r.phone, email: r.email, title: r.title,
  createdBy: r.created_by, updatedAt: r.updated_at,
});
const label = (r) => [r.first_name, r.last_name].filter(Boolean).join(' ') || r.company || 'Adsız Kişi';

export default async function handler(req, res) {
  res.setHeader('cache-control', 'no-store');
  try {
    const user = await requireAuth(req, res);
    if (!user) return;
    if (!process.env.DATABASE_URL) return res.status(503).json({ error: 'Kişiler için veritabanı gerekli' });
    // Lead Havuzu (soğuk arama listesi) aynı işlevde çalışır: ?leads=…
    if (req.query?.leads) return await handleLeads(req, res, user, sql());
    await ensureContacts();
    const s = sql();

    if (req.method === 'GET') {
      const rows = await s`SELECT * FROM contacts ORDER BY lower(company), lower(first_name), lower(last_name), id`;
      return res.status(200).json({ contacts: rows.map(shape), me: user.email, owner: Boolean(user.owner) });
    }

    if (req.method === 'POST') {
      const v = pick((await readJson(req)) || {});
      const r = await s`INSERT INTO contacts (company, first_name, last_name, phone, email, title, created_by, updated_by)
        VALUES (${v.company ?? ''}, ${v.firstName ?? ''}, ${v.lastName ?? ''}, ${v.phone ?? ''}, ${v.email ?? ''}, ${v.title ?? ''}, ${user.email}, ${user.email})
        RETURNING *`;
      const row = r[0];
      const filled = Object.keys(v).some((k) => v[k]);
      if (filled) await logActivity({ actor: user.email, action: 'olustur', entity: 'kisi', entityId: String(row.id), entityName: label(row), summary: 'Kişi eklendi' + (row.company ? ': ' + row.company : '') });
      return res.status(201).json({ contact: shape(row) });
    }

    const id = String(req.query?.id || '');
    if (!/^\d+$/.test(id)) return res.status(400).json({ error: 'id gerekli' });
    const old = await s`SELECT * FROM contacts WHERE id = ${id}::bigint`;
    if (!old.length) return res.status(404).json({ error: 'Kişi bulunamadı' });

    if (req.method === 'PATCH') {
      const v = pick((await readJson(req)) || {});
      const changes = Object.keys(v).filter((k) => v[k] !== old[0][FIELDS[k][0]]);
      if (!changes.length) return res.status(200).json({ contact: shape(old[0]) });
      const r = await s`UPDATE contacts SET
          company = COALESCE(${v.company ?? null}, company), first_name = COALESCE(${v.firstName ?? null}, first_name),
          last_name = COALESCE(${v.lastName ?? null}, last_name), phone = COALESCE(${v.phone ?? null}, phone),
          email = COALESCE(${v.email ?? null}, email), title = COALESCE(${v.title ?? null}, title),
          updated_by = ${user.email}, updated_at = now()
        WHERE id = ${id}::bigint RETURNING *`;
      const summary = changes.slice(0, 3).map((k) => `${FIELDS[k][2]}: ${old[0][FIELDS[k][0]] || '—'} → ${v[k] || '—'}`).join('; ');
      await logActivity({ actor: user.email, action: 'guncelle', entity: 'kisi', entityId: id, entityName: label(r[0]), summary });
      return res.status(200).json({ contact: shape(r[0]) });
    }

    if (req.method === 'DELETE') {
      if (!user.owner) return res.status(403).json({ error: 'Silme yetkisi yalnızca sahip hesaptadır' });
      await s`DELETE FROM contacts WHERE id = ${id}::bigint`;
      await logActivity({ actor: user.email, action: 'sil', entity: 'kisi', entityId: id, entityName: label(old[0]), summary: 'Kişi silindi' + (old[0].company ? ': ' + old[0].company : '') });
      return res.status(200).json({ ok: true });
    }

    res.setHeader('allow', 'GET, POST, PATCH, DELETE');
    return res.status(405).json({ error: 'Yöntem desteklenmiyor' });
  } catch (e) {
    return res.status(500).json({ error: 'Kişiler işlenemedi' });
  }
}
