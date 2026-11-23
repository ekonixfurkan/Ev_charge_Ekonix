// Sevkiyatlar: Çin'den gelen konteynerler, içindeki ürünler, ürünlerin hangi projeye atandığı ve belgeler.
// Hobby planda işlev sınırı dolu olduğu için /api/files içinden çağrılır:
//   GET  ?ships=1                    tüm sevkiyatlar (+ belge sayısı)
//   GET  ?shipnext=1                 bir sonraki sevkiyat numarası (önizleme)
//   PUT  ?ship=1   {sevkiyat}        oluştur / güncelle (tüm belge)
//   DELETE ?ship=ID                  sil (yalnızca sahip hesap; belgeleri de siler)
//   GET  ?shipfiles=ID               sevkiyatın belgeleri
//   POST {action:'shipfile', ship, name, title, kind, pathname}   istemci yüklemesi bitince belge kaydı
//   PATCH ?shipfile=ID {title, kind} belge başlığı / türü
//   DELETE ?shipfile=ID              belgeyi sil (yalnızca sahip hesap)
//   GET  ?download=ID&ship=1         belgeyi indir / aç
import { readJson } from './db.js';
import { logActivity } from './activity.js';
import { _deps, MAX_BYTES, TYPES, cleanName, extOf, isAllowedName } from './files.js';

export const SHIP_STATUSES = ['hazirlaniyor', 'yolda', 'gumrukte', 'depoda', 'teslim'];
export const SHIP_KINDS = ['beyanname', 'sigorta', 'fatura', 'liman', 'denetim', 'uygunluk', 'nakliye', 'diger'];
const SHIP_ID = /^[A-Za-z0-9_-]{4,40}$/;

let _ready = null;
export function ensureShips(s) {
  if (_ready) return _ready;
  _ready = (async () => {
    await s`CREATE TABLE IF NOT EXISTS shipments (
      id text PRIMARY KEY,
      data jsonb NOT NULL,
      created_by text NOT NULL DEFAULT '',
      updated_by text NOT NULL DEFAULT '',
      updated_at timestamptz NOT NULL DEFAULT now()
    )`;
    await s`CREATE TABLE IF NOT EXISTS shipment_files (
      id bigserial PRIMARY KEY,
      ship_id text NOT NULL,
      kind text NOT NULL DEFAULT 'diger',
      title text NOT NULL DEFAULT '',
      name text NOT NULL,
      size bigint NOT NULL DEFAULT 0,
      mime text NOT NULL DEFAULT '',
      pathname text NOT NULL UNIQUE,
      uploaded_by text NOT NULL DEFAULT '',
      uploaded_at timestamptz NOT NULL DEFAULT now()
    )`;
    await s`CREATE INDEX IF NOT EXISTS shipment_files_ship_idx ON shipment_files (ship_id, id)`;
    // Sevkiyat numarası (EKOSEVK-0001…): tek satırlık sayaç, atomik artar; silinen numara yeniden verilmez.
    await s`CREATE TABLE IF NOT EXISTS shipment_counter (id int PRIMARY KEY, n int NOT NULL)`;
    await s`INSERT INTO shipment_counter (id, n) VALUES (1, 0) ON CONFLICT (id) DO NOTHING`;
  })().catch((e) => { _ready = null; throw e; });
  return _ready;
}

const text = (v, n) => (typeof v === 'string' ? v.replace(/[\u0000-\u001f\u007f<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, n) : '');
const multi = (v, n) => (typeof v === 'string' ? v.replace(/[\u0000-\u0009\u000b-\u001f\u007f<>]/g, '').replace(/\r/g, '').slice(0, n) : '');
const day = (v) => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v)) ? v : '');
const qty = (v) => { const n = Math.floor(Number(v)); return Number.isFinite(n) && n > 0 ? Math.min(n, 100000) : 0; };

// İstemciden gelen sevkiyat belgesini temizler (boyut ve tür sınırları sunucuda uygulanır).
export function cleanShipment(d, id, prev) {
  const items = (Array.isArray(d.items) ? d.items : []).slice(0, 100).map((it, i) => ({
    id: text(it && it.id, 40) || `i${i}${Date.now().toString(36)}`,
    model: text(it && it.model, 140),
    qty: qty(it && it.qty),
    note: text(it && it.note, 300),
    alloc: (Array.isArray(it && it.alloc) ? it.alloc : []).slice(0, 60)
      .map((a) => ({ site: text(a && a.site, 80), qty: qty(a && a.qty) })).filter((a) => a.site && a.qty > 0),
  }));
  return {
    id,
    no: text(d.no, 60),
    vessel: text(d.vessel, 60), invoiceNo: text(d.invoiceNo, 80), origin: text(d.origin, 80), port: text(d.port, 80),
    status: SHIP_STATUSES.includes(d.status) ? d.status : 'yolda',
    eta: day(d.eta), arrived: day(d.arrived), owner: text(d.owner, 80), note: multi(d.note, 3000),
    items,
    createdAt: (prev && prev.createdAt) || new Date().toISOString(), updatedAt: new Date().toISOString(),
  };
}

export const shipCode = (n) => 'EKOSEVK-' + String(n).padStart(4, '0');
async function nextShipNo(s) {
  // Sayaç satırı kaybolursa mevcut en büyük numaradan devam edilir.
  const r = await s`UPDATE shipment_counter SET n = n + 1 WHERE id = 1 RETURNING n`;
  if (r.length) return r[0].n;
  const mx = await s`SELECT COALESCE(MAX(NULLIF(regexp_replace(data->>'code', '\D', '', 'g'), '')::int), 0) AS m FROM shipments`;
  await s`INSERT INTO shipment_counter (id, n) VALUES (1, ${mx[0].m + 1}) ON CONFLICT (id) DO UPDATE SET n = GREATEST(shipment_counter.n, EXCLUDED.n)`;
  return mx[0].m + 1;
}

const fileShape = (r) => ({
  id: String(r.id), shipId: r.ship_id, kind: r.kind, title: r.title, name: r.name, size: Number(r.size), mime: r.mime,
  uploadedBy: r.uploaded_by, uploadedByName: r.uploaded_by_name || '', uploadedAt: r.uploaded_at,
});

export const shipPathOk = (pathname, id) => typeof pathname === 'string' && pathname.startsWith(`ships/${id}/`);
export async function shipExists(s, id) {
  await ensureShips(s);
  if (!SHIP_ID.test(String(id))) return false;
  return (await s`SELECT 1 FROM shipments WHERE id = ${id}`).length > 0;
}

// /api/files?ships… ve ?shipfile… istekleri. true dönerse yanıt yazılmıştır.
export async function handleShipQuery(req, res, user, s, q) {
  // Dosya indirme (?download=ID&ship=1) /api/files içindeki indirme koluna aittir; burada işlenmez.
  if (q.download !== undefined) return false;
  const isShip = q.ships !== undefined || q.shipnext !== undefined || q.ship !== undefined || q.shipfiles !== undefined || q.shipfile !== undefined;
  if (!isShip) return false;
  await ensureShips(s);

  if (req.method === 'GET' && q.ships !== undefined) {
    const rows = await s`SELECT sh.id, sh.data, sh.updated_at, NULLIF(u.name, '') AS updated_by_name,
        (SELECT count(*)::int FROM shipment_files f WHERE f.ship_id = sh.id) AS files
      FROM shipments sh LEFT JOIN users u ON u.email = sh.updated_by ORDER BY sh.updated_at DESC LIMIT 500`;
    return res.status(200).json({ ships: rows.map((r) => ({ ...r.data, id: r.id, files: r.files, updatedAt: r.updated_at, updatedByName: r.updated_by_name || '' })), me: user.email, owner: Boolean(user.owner) }), true;
  }

  // Yeni sevkiyat penceresinde kilitli gösterilecek bir sonraki numara (sayacı artırmaz; kesin numara kayıtta verilir).
  if (req.method === 'GET' && q.shipnext !== undefined) {
    const c = await s`SELECT n FROM shipment_counter WHERE id = 1`;
    const mx = await s`SELECT COALESCE(MAX(NULLIF(regexp_replace(data->>'code', '\\D', '', 'g'), '')::int), 0) AS m FROM shipments`;
    return res.status(200).json({ code: shipCode(Math.max(c.length ? c[0].n : 0, mx[0].m) + 1) }), true;
  }

  if (req.method === 'PUT' && q.ship !== undefined) {
    const b = (await readJson(req)) || {};
    const id = typeof b.id === 'string' ? b.id : '';
    if (!SHIP_ID.test(id)) return res.status(400).json({ error: 'Geçersiz sevkiyat' }), true;
    const prev = await s`SELECT data FROM shipments WHERE id = ${id}`;
    const doc = cleanShipment(b, id, prev[0] && prev[0].data);
    // Numara yalnızca sunucudan gelir: varsa korunur, yoksa sıradaki verilir (istemcinin gönderdiği değer yok sayılır).
    doc.code = (prev[0] && prev[0].data && prev[0].data.code) || shipCode(await nextShipNo(s));
    await s`INSERT INTO shipments (id, data, created_by, updated_by, updated_at) VALUES (${id}, ${JSON.stringify(doc)}::jsonb, ${user.email}, ${user.email}, now())
      ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_by = EXCLUDED.updated_by, updated_at = now()`;
    if (!prev.length) await logActivity({ actor: user.email, action: 'olustur', entity: 'sevkiyat', entityId: id, entityName: doc.code, summary: `Sevkiyat oluşturuldu (${doc.no})` });
    else if (prev[0].data && prev[0].data.status !== doc.status) await logActivity({ actor: user.email, action: 'guncelle', entity: 'sevkiyat', entityId: id, entityName: doc.no, summary: `Durum: ${prev[0].data.status} → ${doc.status}` });
    return res.status(200).json({ ok: true, ship: { ...doc, id } }), true;
  }

  if (req.method === 'DELETE' && q.ship !== undefined) {
    if (!user.owner) return res.status(403).json({ error: 'Silme yetkisi yalnızca sahip hesaptadır' }), true;
    const id = String(q.ship);
    const prev = await s`SELECT data FROM shipments WHERE id = ${id}`;
    if (!prev.length) return res.status(404).json({ error: 'Sevkiyat bulunamadı' }), true;
    const files = await s`SELECT pathname FROM shipment_files WHERE ship_id = ${id}`;
    for (const f of files) { try { await _deps.del(f.pathname); } catch { /* Blob'da yoksa kayıt yine de silinir */ } }
    await s`DELETE FROM shipment_files WHERE ship_id = ${id}`;
    await s`DELETE FROM shipments WHERE id = ${id}`;
    await logActivity({ actor: user.email, action: 'sil', entity: 'sevkiyat', entityId: id, entityName: prev[0].data.no || id, summary: 'Sevkiyat silindi' });
    return res.status(200).json({ ok: true }), true;
  }

  if (req.method === 'GET' && q.shipfiles !== undefined) {
    const id = String(q.shipfiles);
    const rows = await s`SELECT f.*, NULLIF(u.name, '') AS uploaded_by_name FROM shipment_files f LEFT JOIN users u ON u.email = f.uploaded_by WHERE f.ship_id = ${id} ORDER BY f.id`;
    return res.status(200).json({ files: rows.map(fileShape), max: MAX_BYTES, owner: Boolean(user.owner) }), true;
  }

  if (req.method === 'PATCH' && q.shipfile !== undefined) {
    const id = String(q.shipfile);
    if (!/^\d+$/.test(id)) return res.status(400).json({ error: 'id gerekli' }), true;
    const b = (await readJson(req)) || {};
    const title = text(b.title, 160), kind = SHIP_KINDS.includes(b.kind) ? b.kind : null;
    const r = await s`UPDATE shipment_files SET title = COALESCE(${title || null}, title), kind = COALESCE(${kind}, kind) WHERE id = ${id}::bigint RETURNING *`;
    if (!r.length) return res.status(404).json({ error: 'Belge bulunamadı' }), true;
    return res.status(200).json({ ok: true, file: fileShape(r[0]) }), true;
  }

  if (req.method === 'DELETE' && q.shipfile !== undefined) {
    if (!user.owner) return res.status(403).json({ error: 'Silme yetkisi yalnızca sahip hesaptadır' }), true;
    const id = String(q.shipfile);
    if (!/^\d+$/.test(id)) return res.status(400).json({ error: 'id gerekli' }), true;
    const r = await s`SELECT * FROM shipment_files WHERE id = ${id}::bigint`;
    if (!r.length) return res.status(404).json({ error: 'Belge bulunamadı' }), true;
    try { await _deps.del(r[0].pathname); } catch { /* yok say */ }
    await s`DELETE FROM shipment_files WHERE id = ${id}::bigint`;
    await logActivity({ actor: user.email, action: 'sil', entity: 'sevkiyat', entityId: r[0].ship_id, entityName: r[0].title || r[0].name, summary: `Belge silindi: ${r[0].name}` });
    return res.status(200).json({ ok: true }), true;
  }

  res.setHeader('allow', 'GET, PUT, PATCH, DELETE');
  return res.status(405).json({ error: 'Yöntem desteklenmiyor' }), true;
}

// POST {action:'shipfile'}: tarayıcıdan Blob'a yüklenen belgenin kaydı.
export async function registerShipFile(res, user, s, b) {
  await ensureShips(s);
  const ship = typeof b.ship === 'string' ? b.ship : '';
  if (!(await shipExists(s, ship))) return res.status(404).json({ error: 'Sevkiyat bulunamadı' });
  const fname = cleanName(b.name), pathname = typeof b.pathname === 'string' ? b.pathname : '';
  if (!fname || !isAllowedName(fname)) return res.status(400).json({ error: 'Bu dosya türü desteklenmiyor (Excel, PDF, Word, JPG, PNG)' });
  if (!shipPathOk(pathname, ship)) return res.status(400).json({ error: 'Geçersiz dosya yolu' });
  let meta;
  try { meta = await _deps.head(pathname); } catch { return res.status(400).json({ error: 'Yüklenen dosya bulunamadı' }); }
  if (meta.size > MAX_BYTES) { try { await _deps.del(pathname); } catch { /* yok say */ } return res.status(400).json({ error: 'Dosya 25 MB sınırını aşıyor' }); }
  const mime = TYPES[extOf(fname)] || meta.contentType || '';
  const title = text(b.title, 160) || fname.replace(/\.[A-Za-z0-9]{1,8}$/, '');
  const kind = SHIP_KINDS.includes(b.kind) ? b.kind : 'diger';
  const r = await s`INSERT INTO shipment_files (ship_id, kind, title, name, size, mime, pathname, uploaded_by)
    VALUES (${ship}, ${kind}, ${title}, ${fname}, ${meta.size}, ${mime}, ${pathname}, ${user.email}) ON CONFLICT (pathname) DO NOTHING RETURNING id`;
  if (!r.length) return res.status(200).json({ ok: true, duplicate: true });
  const sh = await s`SELECT data->>'no' AS no FROM shipments WHERE id = ${ship}`;
  await logActivity({ actor: user.email, action: 'olustur', entity: 'sevkiyat', entityId: ship, entityName: (sh[0] && sh[0].no) || ship, summary: `Belge eklendi: ${title}` });
  return res.status(201).json({ ok: true, id: String(r[0].id) });
}

// ?download=ID&ship=1
export async function shipFileRow(s, id) {
  await ensureShips(s);
  const r = await s`SELECT name, mime, pathname FROM shipment_files WHERE id = ${id}::bigint`;
  return r[0] || null;
}
