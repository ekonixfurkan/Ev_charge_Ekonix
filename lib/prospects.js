// Aday Müşteriler: henüz temas edilmemiş, ekibin tek tek seçtiği firma ve kişiler. /api/contacts?prospects=… üzerinden çalışır
// (Hobby planda işlev sayısı sınırlı olduğu için ayrı dosya açılmaz). Lead Havuzu (toplu arama listesi) ayrıdır.
// GET ?prospects=1 liste · POST ?prospects=new ekle (benzer kayıt varsa 409 + dups; force:true ile yine de eklenir) · PATCH ?prospects=ID
// POST ?prospects=ID&to=contact Müşteri Bilgileri'ne aktar · DELETE ?prospects=ID (yalnızca sahip; Çöp Kutusu'na gider)
import { readJson } from './db.js';
import { logActivity } from './activity.js';
import { trashPut, rowsOf } from './trash.js';

export const PR_STATUSES = ['Temas Edilmedi', 'Temas Edildi', 'Görüşülüyor', 'İlgilenmiyor'];
// istemci alanı -> [sütun, en fazla uzunluk, görünen ad]
const FIELDS = {
  company: ['company', 160, 'Firma'], person: ['person', 120, 'Kişi'], title: ['title', 100, 'Unvan'], phone: ['phone', 30, 'Telefon'], email: ['email', 254, 'E-posta'],
  il: ['il', 60, 'İl'], ilce: ['ilce', 60, 'İlçe'], sector: ['sector', 80, 'Sektör'], source: ['source', 120, 'Kaynak'], owner: ['owner', 120, 'Sorumlu'], note: ['note', 2000, 'Not'],
};

let _ready = null;
export function ensureProspects(s) {
  if (_ready) return _ready;
  _ready = (async () => {
    await s`CREATE TABLE IF NOT EXISTS prospects (
      id bigserial PRIMARY KEY,
      company text NOT NULL DEFAULT '', person text NOT NULL DEFAULT '', title text NOT NULL DEFAULT '',
      phone text NOT NULL DEFAULT '', email text NOT NULL DEFAULT '', il text NOT NULL DEFAULT '', ilce text NOT NULL DEFAULT '',
      sector text NOT NULL DEFAULT '', source text NOT NULL DEFAULT '', owner text NOT NULL DEFAULT '', note text NOT NULL DEFAULT '',
      status text NOT NULL DEFAULT 'Temas Edilmedi', contact_id bigint,
      created_by text NOT NULL DEFAULT '', created_at timestamptz NOT NULL DEFAULT now(),
      updated_by text NOT NULL DEFAULT '', updated_at timestamptz NOT NULL DEFAULT now()
    )`;
  })().catch((e) => { _ready = null; throw e; });
  return _ready;
}
export function _reset() { _ready = null; }

export function cleanProspect(b) {
  const out = {};
  for (const [k, [, max]] of Object.entries(FIELDS)) {
    if (typeof b?.[k] !== 'string') continue;
    out[k] = (k === 'note' ? b[k].replace(/\r/g, '').trim() : b[k].replace(/\s+/g, ' ').trim()).slice(0, max);
  }
  if (PR_STATUSES.includes(b?.status)) out.status = b.status;
  return out;
}
const shape = (r) => ({
  id: String(r.id), company: r.company, person: r.person, title: r.title, phone: r.phone, email: r.email, il: r.il, ilce: r.ilce, sector: r.sector,
  source: r.source, owner: r.owner, note: r.note, status: r.status, contactId: r.contact_id ? String(r.contact_id) : '', createdAt: r.created_at, createdBy: r.created_by, updatedAt: r.updated_at,
});
export const nm = (v) => String(v || '').normalize('NFC').replace(/\s+/g, ' ').trim().toLocaleLowerCase('tr-TR');
export const ph = (v) => { const d = String(v || '').replace(/\D/g, '').slice(-10); return d.length === 10 ? d : ''; };
const label = (r) => r.company || r.person || 'Aday';

// Aynı telefon (son 10 hane) ya da aynı firma adı (kişi kaydında aynı ad soyad): Aday Müşteriler, Müşteri Bilgileri ve Lead Havuzu'nda aranır.
export async function findDuplicates(s, v) {
  const phone = ph(v.phone), company = nm(v.company), person = nm(v.person), out = [];
  const hit = (rows, where, nameOf, companyOf, personOf) => {
    for (const r of rows) {
      const why = phone && ph(r.phone) === phone ? 'telefon' : company && nm(companyOf(r)) === company ? 'firma' : !company && person && nm(personOf(r)) === person ? 'kişi' : '';
      if (why) { out.push({ where, name: nameOf(r), why }); if (out.length >= 5) return; }
    }
  };
  hit(await s`SELECT company, person, phone FROM prospects`, 'Aday Müşteriler', (r) => [r.company, r.person].filter(Boolean).join(' · '), (r) => r.company, (r) => r.person);
  hit(await s`SELECT company, first_name, last_name, phone FROM contacts`, 'Müşteri Bilgileri', (r) => [r.company, [r.first_name, r.last_name].filter(Boolean).join(' ')].filter(Boolean).join(' · '), (r) => r.company, (r) => [r.first_name, r.last_name].filter(Boolean).join(' '));
  // Lead Havuzu büyüktür (binlerce kayıt): süzme veritabanında yapılır. Tablo henüz yoksa atlanır.
  if (out.length < 5 && (phone || company)) {
    try {
      const rows = await s`SELECT company, phone FROM leads WHERE (${phone} <> '' AND right(regexp_replace(phone, '[^0-9]', '', 'g'), 10) = ${phone}) OR (${company} <> '' AND lower(company) = lower(${v.company || ''})) LIMIT 3`;
      for (const r of rows) out.push({ where: 'Lead Havuzu', name: r.company, why: phone && ph(r.phone) === phone ? 'telefon' : 'firma' });
    } catch { /* leads tablosu yok */ }
  }
  return out.slice(0, 5);
}

const fail = (res, code, error, extra = {}) => res.status(code).json({ error, ...extra });

export async function handleProspects(req, res, user, s) {
  await ensureProspects(s);
  const key = String(req.query.prospects);
  if (req.method === 'GET') {
    const rows = await s`SELECT * FROM prospects ORDER BY id DESC`;
    return res.status(200).json({ prospects: rows.map(shape), me: user.email, owner: Boolean(user.owner) });
  }
  if (req.method === 'POST' && key === 'new') {
    const b = (await readJson(req)) || {};
    const v = cleanProspect(b);
    if (!v.company && !v.person) return fail(res, 400, 'Firma ya da kişi adı girin');
    if (b.force !== true) {
      const dups = await findDuplicates(s, v);
      if (dups.length) return fail(res, 409, 'Benzer bir kayıt var', { dups });
    }
    const r = await s`INSERT INTO prospects (company, person, title, phone, email, il, ilce, sector, source, owner, note, status, created_by, updated_by)
      VALUES (${v.company ?? ''}, ${v.person ?? ''}, ${v.title ?? ''}, ${v.phone ?? ''}, ${v.email ?? ''}, ${v.il ?? ''}, ${v.ilce ?? ''}, ${v.sector ?? ''}, ${v.source ?? ''}, ${v.owner ?? ''}, ${v.note ?? ''}, ${v.status ?? PR_STATUSES[0]}, ${user.email}, ${user.email}) RETURNING *`;
    await logActivity({ actor: user.email, action: 'olustur', entity: 'aday', entityId: String(r[0].id), entityName: label(r[0]), summary: 'Aday müşteri eklendi' });
    return res.status(201).json({ prospect: shape(r[0]) });
  }
  if (!/^\d+$/.test(key)) return fail(res, 400, 'id gerekli');
  const old = await s`SELECT * FROM prospects WHERE id = ${key}::bigint`;
  if (!old.length) return fail(res, 404, 'Aday bulunamadı');
  const o = old[0];

  // Müşteri Bilgileri'ne aktar: aynı telefon ya da aynı ad soyad (aynı firmada) varsa yeni kayıt açılmaz, ona bağlanır.
  if (req.method === 'POST' && req.query.to === 'contact') {
    const full = o.person || o.company;
    const all = await s`SELECT * FROM contacts`;
    const phone = ph(o.phone);
    let c = (o.contact_id && all.find((x) => String(x.id) === String(o.contact_id)))
      || all.find((x) => (phone && ph(x.phone) === phone) || (nm([x.first_name, x.last_name].filter(Boolean).join(' ')) === nm(full) && nm(x.company) === nm(o.company)));
    const created = !c;
    if (!c) {
      const parts = full.split(' ');
      const first = o.person && parts.length > 1 ? parts.slice(0, -1).join(' ') : full, last = o.person && parts.length > 1 ? parts[parts.length - 1] : '';
      c = (await s`INSERT INTO contacts (company, first_name, last_name, phone, email, title, created_by, updated_by)
        VALUES (${o.company.slice(0, 120)}, ${first.slice(0, 80)}, ${last.slice(0, 80)}, ${o.phone}, ${o.email}, ${o.title}, ${user.email}, ${user.email}) RETURNING *`)[0];
      await logActivity({ actor: user.email, action: 'olustur', entity: 'kisi', entityId: String(c.id), entityName: full, summary: 'Aday Müşteriler\'den aktarıldı' });
    }
    const r = await s`UPDATE prospects SET contact_id = ${String(c.id)}::bigint, updated_by = ${user.email}, updated_at = now() WHERE id = ${key}::bigint RETURNING *`;
    return res.status(200).json({ prospect: shape(r[0]), created, contact: { id: String(c.id), company: c.company, firstName: c.first_name, lastName: c.last_name, phone: c.phone, email: c.email, title: c.title } });
  }

  if (req.method === 'PATCH') {
    const v = cleanProspect((await readJson(req)) || {});
    const n = { ...o, ...v };
    if (!n.company && !n.person) return fail(res, 400, 'Firma ya da kişi adı girin');
    const r = await s`UPDATE prospects SET company = ${n.company}, person = ${n.person}, title = ${n.title}, phone = ${n.phone}, email = ${n.email}, il = ${n.il}, ilce = ${n.ilce},
        sector = ${n.sector}, source = ${n.source}, owner = ${n.owner}, note = ${n.note}, status = ${n.status}, updated_by = ${user.email}, updated_at = now()
      WHERE id = ${key}::bigint RETURNING *`;
    if (n.status !== o.status) await logActivity({ actor: user.email, action: 'guncelle', entity: 'aday', entityId: key, entityName: label(r[0]), summary: `Durum: ${o.status} → ${n.status}` });
    return res.status(200).json({ prospect: shape(r[0]) });
  }

  if (req.method === 'DELETE') {
    if (!user.owner) return fail(res, 403, 'Silme yetkisi yalnızca sahip hesaptadır');
    await trashPut(s, { kind: 'prospect', title: [o.company, o.person].filter(Boolean).join(' · '), context: o.status, tables: { prospects: rowsOf(await s`SELECT to_jsonb(t) AS r FROM prospects t WHERE id = ${key}::bigint`) }, by: user.email });
    await s`DELETE FROM prospects WHERE id = ${key}::bigint`;
    await logActivity({ actor: user.email, action: 'sil', entity: 'aday', entityId: key, entityName: label(o), summary: 'Aday müşteri silindi' });
    return res.status(200).json({ ok: true });
  }
  res.setHeader('allow', 'GET, POST, PATCH, DELETE');
  return fail(res, 405, 'Yöntem desteklenmiyor');
}
