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
    await s`CREATE UNIQUE INDEX IF NOT EXISTS leads_phone_uq ON leads (phone)`;
    await s`CREATE INDEX IF NOT EXISTS leads_status_ix ON leads (status)`;
    await s`CREATE INDEX IF NOT EXISTS leads_sector_ix ON leads (sector)`;
    await s`CREATE INDEX IF NOT EXISTS leads_il_ix ON leads (il)`;
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
  flags: r.flags, source: r.source, status: r.status, note: r.note, meetingAt: r.meeting_day || '',
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
    const rows = await s`SELECT *, to_char(meeting_at, 'YYYY-MM-DD') AS meeting_day, count(*) OVER()::int AS total FROM leads
      WHERE (${text}::text IS NULL OR company ILIKE ${text} OR phone LIKE ${text} OR il ILIKE ${text} OR ilce ILIKE ${text} OR note ILIKE ${text})
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
    const keep = { company: [], phone: [], il: [], ilce: [], sector: [], priority: [], flags: [], source: [] };
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
    }
    let added = 0;
    if (keep.phone.length) {
      const ins = await s`INSERT INTO leads (company, phone, il, ilce, sector, priority, flags, source, created_by, updated_by)
        SELECT t.company, t.phone, t.il, t.ilce, t.sector, t.priority, t.flags, t.source, ${user.email}, ${user.email}
        FROM unnest(${keep.company}::text[], ${keep.phone}::text[], ${keep.il}::text[], ${keep.ilce}::text[], ${keep.sector}::text[], ${keep.priority}::text[], ${keep.flags}::text[], ${keep.source}::text[])
          AS t(company, phone, il, ilce, sector, priority, flags, source)
        ON CONFLICT (phone) DO NOTHING RETURNING id`;
      added = ins.length;
    }
    return res.status(200).json({ added, duplicate: keep.phone.length - added, invalid, mobile, received: list.length });
  }

  const id = String(req.query?.leads || '');
  if (!/^\d+$/.test(id)) return res.status(400).json({ error: 'Geçersiz istek' });

  if (req.method === 'PATCH') {
    const b = (await readJson(req)) || {};
    const old = await s`SELECT status FROM leads WHERE id = ${id}::bigint`;
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
