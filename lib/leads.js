// Lead Havuzu (soğuk arama listesi). /api/contacts?leads=… üzerinden çalışır (Hobby planda 12 işlev sınırı nedeniyle ayrı işlev yok).
// GET ?leads=list|stats · POST ?leads=import (yalnızca sahip) · PATCH ?leads=<id> · DELETE ?leads=<id> (yalnızca sahip)
import { readJson } from './db.js';

export const STATUSES = ['Aranmadı', 'Ulaşılamadı', 'Tekrar Aranacak', 'İlgilendi', 'Toplantı Ayarlandı', 'İstemiyor', 'Yanlış Numara'];
export const PRIORITIES = ['Yüksek', 'Orta', 'Düşük'];

let _ready = null;
export function ensureLeads(s) {
  if (_ready) return _ready;
  _ready = (async () => {
    await s`CREATE TABLE IF NOT EXISTS leads (
      id bigserial PRIMARY KEY,
      company text NOT NULL,
      phone text NOT NULL,
      il text NOT NULL DEFAULT '',
      ilce text NOT NULL DEFAULT '',
      sector text NOT NULL DEFAULT '',
      priority text NOT NULL DEFAULT 'Orta',
      flags text NOT NULL DEFAULT '',
      source text NOT NULL DEFAULT '',
      status text NOT NULL DEFAULT 'Aranmadı',
      note text NOT NULL DEFAULT '',
      meeting_at date,
      called_at timestamptz,
      updated_by text NOT NULL DEFAULT '',
      updated_at timestamptz NOT NULL DEFAULT now(),
      created_by text NOT NULL DEFAULT '',
      created_at timestamptz NOT NULL DEFAULT now()
    )`;
    await s`ALTER TABLE leads ADD COLUMN IF NOT EXISTS email text NOT NULL DEFAULT ''`;
    await s`ALTER TABLE leads ADD COLUMN IF NOT EXISTS web text NOT NULL DEFAULT ''`;
    await s`ALTER TABLE leads ADD COLUMN IF NOT EXISTS address text NOT NULL DEFAULT ''`;
    await s`CREATE UNIQUE INDEX IF NOT EXISTS leads_phone_uq ON leads (phone)`;
    await s`CREATE INDEX IF NOT EXISTS leads_status_ix ON leads (status)`;
    await s`CREATE INDEX IF NOT EXISTS leads_sector_ix ON leads (sector)`;
    await s`CREATE INDEX IF NOT EXISTS leads_il_ix ON leads (il)`;
    // Her lead için birden çok not/aşama: kind 'not' (elle yazılan) ya da 'durum' (durum/toplantı değişikliği, otomatik).
    await s`CREATE TABLE IF NOT EXISTS lead_notes (
      id bigserial PRIMARY KEY,
      lead_id bigint NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
      author text NOT NULL DEFAULT '',
      kind text NOT NULL DEFAULT 'not',
      body text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    )`;
    await s`CREATE INDEX IF NOT EXISTS lead_notes_lead_ix ON lead_notes (lead_id, id)`;
    // Eski tek satırlık not alanı varsa ilk not olarak taşınır.
    await s`INSERT INTO lead_notes (lead_id, author, kind, body, created_at) SELECT id, updated_by, 'not', note, updated_at FROM leads WHERE note <> ''`;
    await s`UPDATE leads SET note = '' WHERE note <> ''`;
  })().catch((e) => { _ready = null; throw e; });
  return _ready;
}

const clip = (v, n) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, n) : '');
// "+90 322 323 03 93", "0322 323 03 93", "3223230393" → "3223230393"
export function normPhone(v) {
  let d = String(v ?? '').replace(/\D/g, '');
  if (d.startsWith('90') && d.length >= 12) d = d.slice(2);
  if (d.startsWith('0')) d = d.slice(1);
  return d;
}
const like = (q) => (q ? `%${String(q).replace(/[%_\\]/g, (c) => '\\' + c)}%` : null);
const shape = (r) => ({
  id: String(r.id), company: r.company, phone: r.phone, il: r.il, ilce: r.ilce, sector: r.sector, priority: r.priority,
  email: r.email || '', web: r.web || '', address: r.address || '', flags: r.flags, source: r.source, status: r.status, noteCount: r.note_count || 0, lastNote: r.last_note || '', meetingAt: r.meeting_day || '',
  calledAt: r.called_at, updatedBy: r.updated_by, updatedAt: r.updated_at,
});

export async function handleLeads(req, res, user, s) {
  await ensureLeads(s);
  const what = String(req.query?.leads || '');

  if (req.method === 'GET' && what === 'stats') {
    const [byStatus, bySector, byPrio, ils] = await Promise.all([
      s`SELECT status AS k, count(*)::int AS n FROM leads GROUP BY 1`,
      s`SELECT sector AS k, count(*)::int AS n FROM leads GROUP BY 1 ORDER BY 2 DESC`,
      s`SELECT priority AS k, count(*)::int AS n FROM leads GROUP BY 1`,
      s`SELECT il AS k, count(*)::int AS n FROM leads WHERE il <> '' GROUP BY 1 ORDER BY 1`,
    ]);
    const m = (rows) => Object.fromEntries(rows.map((r) => [r.k, r.n]));
    const st = m(byStatus);
    return res.status(200).json({ total: Object.values(st).reduce((a, b) => a + b, 0), byStatus: st, bySector: m(bySector), byPrio: m(byPrio), ils: ils.map((r) => r.k), sectors: bySector.map((r) => r.k), owner: Boolean(user.owner) });
  }

  if (req.method === 'GET' && what === 'list') {
    const q = req.query || {};
    const size = Math.min(Math.max(parseInt(q.size, 10) || 50, 1), 100);
    const page = Math.max(parseInt(q.page, 10) || 1, 1);
    const off = (page - 1) * size;
    const text = like(clip(String(q.q || ''), 80));
    const sector = clip(String(q.sector || ''), 60), il = clip(String(q.il || ''), 40), status = clip(String(q.status || ''), 40), prio = clip(String(q.prio || ''), 20);
    const flagged = q.flagged === '1' ? 1 : q.flagged === '0' ? 0 : -1;   // 1: yalnızca uyarılı, 0: uyarısız
    const rows = await s`SELECT leads.*, to_char(meeting_at, 'YYYY-MM-DD') AS meeting_day, count(*) OVER()::int AS total,
        (SELECT count(*)::int FROM lead_notes n WHERE n.lead_id = leads.id AND n.kind = 'not') AS note_count,
        (SELECT left(n.body, 160) FROM lead_notes n WHERE n.lead_id = leads.id AND n.kind = 'not' ORDER BY n.id DESC LIMIT 1) AS last_note
      FROM leads
      WHERE (${text}::text IS NULL OR company ILIKE ${text} OR phone LIKE ${text} OR il ILIKE ${text} OR ilce ILIKE ${text} OR address ILIKE ${text} OR email ILIKE ${text}
          OR EXISTS (SELECT 1 FROM lead_notes n WHERE n.lead_id = leads.id AND n.kind = 'not' AND n.body ILIKE ${text}))
        AND (${sector} = '' OR sector = ${sector}) AND (${il} = '' OR il = ${il})
        AND (${status} = '' OR status = ${status}) AND (${prio} = '' OR priority = ${prio})
        AND (${flagged}::int = -1 OR (${flagged}::int = 1 AND flags <> '') OR (${flagged}::int = 0 AND flags = ''))
      ORDER BY CASE priority WHEN 'Yüksek' THEN 0 WHEN 'Orta' THEN 1 ELSE 2 END, il, lower(company), id
      LIMIT ${size} OFFSET ${off}`;
    return res.status(200).json({ rows: rows.map(shape), total: rows[0]?.total || 0, page, size });
  }

  if (req.method === 'POST' && what === 'import') {
    if (!user.owner) return res.status(403).json({ error: 'İçe aktarma yalnızca sahip hesaba açık' });
    const body = (await readJson(req)) || {};
    const list = Array.isArray(body.rows) ? body.rows.slice(0, 500) : [];
    const keep = { company: [], phone: [], il: [], ilce: [], sector: [], priority: [], flags: [], source: [], email: [], web: [], address: [] };
    let invalid = 0, mobile = 0;
    const seen = new Set();
    for (const r of list) {
      const company = clip(r?.company, 200), phone = normPhone(r?.phone);
      if (!company || phone.length !== 10) { invalid++; continue; }
      // Cep numaraları (05xx) kişisel veri olabilir: havuza alınmaz.
      if (phone.startsWith('5')) { mobile++; continue; }
      if (seen.has(phone)) continue;
      seen.add(phone);
      keep.company.push(company); keep.phone.push(phone); keep.il.push(clip(r?.il, 40)); keep.ilce.push(clip(r?.ilce, 60));
      keep.sector.push(clip(r?.sector, 60)); keep.priority.push(PRIORITIES.includes(clip(r?.priority, 20)) ? clip(r?.priority, 20) : 'Orta');
      keep.flags.push(clip(r?.flags, 300)); keep.source.push(clip(r?.source, 80));
      const em = clip(r?.email, 200).toLowerCase();
      keep.email.push(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em) ? em : '');
      keep.web.push(clip(r?.web, 200).replace(/^https?:\/\//i, '').replace(/\/$/, ''));
      keep.address.push(clip(r?.address, 300));
    }
    let added = 0, enriched = 0;
    if (keep.phone.length) {
      // Aynı numara varsa kayıt korunur; yalnızca boş e-posta/web/adres alanları yeni dosyadaki bilgiyle doldurulur.
      const ins = await s`INSERT INTO leads (company, phone, il, ilce, sector, priority, flags, source, email, web, address, created_by, updated_by)
        SELECT t.company, t.phone, t.il, t.ilce, t.sector, t.priority, t.flags, t.source, t.email, t.web, t.address, ${user.email}, ${user.email}
        FROM unnest(${keep.company}::text[], ${keep.phone}::text[], ${keep.il}::text[], ${keep.ilce}::text[], ${keep.sector}::text[], ${keep.priority}::text[], ${keep.flags}::text[], ${keep.source}::text[], ${keep.email}::text[], ${keep.web}::text[], ${keep.address}::text[])
          AS t(company, phone, il, ilce, sector, priority, flags, source, email, web, address)
        ON CONFLICT (phone) DO UPDATE SET
          email = CASE WHEN leads.email = '' THEN EXCLUDED.email ELSE leads.email END,
          web = CASE WHEN leads.web = '' THEN EXCLUDED.web ELSE leads.web END,
          address = CASE WHEN leads.address = '' THEN EXCLUDED.address ELSE leads.address END
          WHERE (leads.email = '' AND EXCLUDED.email <> '') OR (leads.web = '' AND EXCLUDED.web <> '') OR (leads.address = '' AND EXCLUDED.address <> '')
        RETURNING (xmax = 0) AS inserted`;
      added = ins.filter((r) => r.inserted).length;
      enriched = ins.length - added;
    }
    return res.status(200).json({ added, enriched, duplicate: keep.phone.length - added - enriched, invalid, mobile, received: list.length });
  }

  // --- Notlar / aşama geçmişi ---
  const nameMap = async (emails) => {
    const out = {};
    try {
      const r = await s`SELECT email, NULLIF(name, '') AS name FROM users WHERE email = ANY(${emails}::text[])`;
      for (const x of r) out[x.email] = x.name || '';
    } catch { /* users tablosu yoksa e-posta gösterilir */ }
    return out;
  };
  const noteShape = (r, names) => ({ id: String(r.id), author: r.author, authorName: names[r.author] || '', kind: r.kind, body: r.body, createdAt: r.created_at });
  if (what === 'notes' && req.method === 'GET') {
    const lid = String(req.query?.id || '');
    if (!/^\d+$/.test(lid)) return res.status(400).json({ error: 'Geçersiz istek' });
    const lead = await s`SELECT leads.*, to_char(meeting_at, 'YYYY-MM-DD') AS meeting_day FROM leads WHERE id = ${lid}::bigint`;
    if (!lead.length) return res.status(404).json({ error: 'Kayıt bulunamadı' });
    const rows = await s`SELECT id, author, kind, body, created_at FROM lead_notes WHERE lead_id = ${lid}::bigint ORDER BY id`;
    const names = await nameMap([...new Set(rows.map((r) => r.author))]);
    return res.status(200).json({ lead: shape(lead[0]), notes: rows.map((r) => noteShape(r, names)), me: user.email, owner: Boolean(user.owner) });
  }
  if (what === 'note' && req.method === 'POST') {
    const b = (await readJson(req)) || {};
    const lid = String(b.id || '');
    const body = typeof b.body === 'string' ? b.body.trim().slice(0, 2000) : '';
    if (!/^\d+$/.test(lid) || !body) return res.status(400).json({ error: 'Not boş olamaz' });
    const ok = await s`SELECT 1 FROM leads WHERE id = ${lid}::bigint`;
    if (!ok.length) return res.status(404).json({ error: 'Kayıt bulunamadı' });
    const r = await s`INSERT INTO lead_notes (lead_id, author, kind, body) VALUES (${lid}::bigint, ${user.email}, 'not', ${body}) RETURNING id, author, kind, body, created_at`;
    await s`UPDATE leads SET updated_by = ${user.email}, updated_at = now() WHERE id = ${lid}::bigint`;
    const names = await nameMap([user.email]);
    return res.status(201).json({ note: noteShape(r[0], names) });
  }
  if (what === 'delnote' && req.method === 'DELETE') {
    if (!user.owner) return res.status(403).json({ error: 'Silme yetkisi yalnızca sahip hesaptadır' });
    const nid = String(req.query?.id || '');
    if (!/^\d+$/.test(nid)) return res.status(400).json({ error: 'Geçersiz istek' });
    await s`DELETE FROM lead_notes WHERE id = ${nid}::bigint`;
    return res.status(200).json({ ok: true });
  }

  const id = String(req.query?.leads || '');
  if (!/^\d+$/.test(id)) return res.status(400).json({ error: 'Geçersiz istek' });

  if (req.method === 'PATCH') {
    const b = (await readJson(req)) || {};
    const old = await s`SELECT status, to_char(meeting_at, 'YYYY-MM-DD') AS md FROM leads WHERE id = ${id}::bigint`;
    if (!old.length) return res.status(404).json({ error: 'Kayıt bulunamadı' });
    const status = typeof b.status === 'string' ? b.status : null;
    if (status !== null && !STATUSES.includes(status)) return res.status(400).json({ error: 'Geçersiz durum' });
    const note = typeof b.note === 'string' ? b.note.trim().slice(0, 2000) : null;
    const meet = typeof b.meetingAt === 'string' ? (b.meetingAt === '' ? '' : /^\d{4}-\d{2}-\d{2}$/.test(b.meetingAt) ? b.meetingAt : null) : null;
    if (b.meetingAt !== undefined && meet === null) return res.status(400).json({ error: 'Geçersiz tarih' });
    const meetSet = b.meetingAt !== undefined, meetDate = meet ? meet : null;   // '' → tarihi temizle
    const r = await s`UPDATE leads SET
        status = COALESCE(${status}::text, status),
        note = COALESCE(${note}::text, note),
        meeting_at = CASE WHEN ${meetSet}::boolean THEN ${meetDate}::date ELSE meeting_at END,
        called_at = CASE WHEN ${status}::text IS NOT NULL AND ${status}::text <> 'Aranmadı' AND ${status}::text <> status THEN now() ELSE called_at END,
        updated_by = ${user.email}, updated_at = now()
      WHERE id = ${id}::bigint RETURNING *, to_char(meeting_at, 'YYYY-MM-DD') AS meeting_day`;
    // Durum ya da toplantı tarihi değişince geçmişe otomatik satır eklenir (aşama takibi).
    const log = [];
    if (status !== null && status !== old[0].status) log.push(`Durum: ${old[0].status} → ${status}`);
    if (b.meetingAt !== undefined && (meetDate || '') !== (old[0].md || '')) log.push(`Toplantı tarihi: ${old[0].md || '—'} → ${meetDate || '—'}`);
    for (const line of log) await s`INSERT INTO lead_notes (lead_id, author, kind, body) VALUES (${id}::bigint, ${user.email}, 'durum', ${line})`;
    return res.status(200).json({ lead: shape(r[0]) });
  }

  if (req.method === 'DELETE') {
    if (!user.owner) return res.status(403).json({ error: 'Silme yetkisi yalnızca sahip hesaptadır' });
    await s`DELETE FROM leads WHERE id = ${id}::bigint`;
    return res.status(200).json({ ok: true });
  }

  res.setHeader('allow', 'GET, POST, PATCH, DELETE');
  return res.status(405).json({ error: 'Yöntem desteklenmiyor' });
}
