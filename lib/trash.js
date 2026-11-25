// Çöp Kutusu: silinen kayıt önce buraya kopyalanır, sonra asıl tablosundan silinir (mevcut sorgular değişmez).
// Dosyanın kendisi (Blob) süre dolana kadar silinmez. 30 gün sonra kalıcı olarak temizlenir. Geri alma yalnızca sahip hesapta.
// Kopyalanamazsa silme de yapılmaz: trashPut hata fırlatır, çağıran taraf asıl DELETE'e geçmez.
import { _deps as _files, DEFAULT_FOLDERS } from './files.js';

export const TRASH_DAYS = 30;
export const _deps = { del: (p) => _files.del(p) };

let _ready = null;
export function ensureTrash(s) {
  if (_ready) return _ready;
  _ready = (async () => {
    await s`CREATE TABLE IF NOT EXISTS trash (
      id bigserial PRIMARY KEY,
      kind text NOT NULL,
      title text NOT NULL DEFAULT '',
      context text NOT NULL DEFAULT '',
      payload jsonb NOT NULL,
      deleted_by text NOT NULL DEFAULT '',
      deleted_at timestamptz NOT NULL DEFAULT now()
    )`;
  })().catch((e) => { _ready = null; throw e; });
  return _ready;
}
export function _reset() { _ready = null; }

// Satırlar `SELECT to_jsonb(t) AS r FROM tablo t …` sonucudur.
export const rowsOf = (res) => (res || []).map((x) => x.r);

export async function trashPut(s, { kind, title, context = '', tables, by }) {
  await ensureTrash(s);
  await s`INSERT INTO trash (kind, title, context, payload, deleted_by)
    VALUES (${kind}, ${String(title || '').slice(0, 200)}, ${String(context || '').slice(0, 200)}, ${JSON.stringify({ tables })}::jsonb, ${by})`;
  try { await purgeExpired(s); } catch { /* temizlik sonraki sefere kalır */ }
}

const pathsOf = (payload) => ['site_files', 'shipment_files'].flatMap((t) => ((payload && payload.tables && payload.tables[t]) || []).map((r) => r.pathname).filter(Boolean));

// Süresi dolanlar: önce dosyalar depodan, sonra çöp kaydı silinir. Depodan silinemezse kayıt kalır, sonra yeniden denenir.
export async function purgeExpired(s) {
  await ensureTrash(s);
  const old = await s`SELECT id, payload FROM trash WHERE deleted_at < now() - make_interval(days => ${TRASH_DAYS}) ORDER BY id LIMIT 20`;
  for (const row of old) {
    const paths = pathsOf(row.payload);
    if (paths.length) { try { await _deps.del(paths); } catch { continue; } }
    await s`DELETE FROM trash WHERE id = ${row.id}`;
  }
}

export async function trashList(s) {
  await purgeExpired(s);
  const rows = await s`SELECT t.id, t.kind, t.title, t.context, t.deleted_by, t.deleted_at, NULLIF(u.name, '') AS deleted_by_name
    FROM trash t LEFT JOIN users u ON u.email = t.deleted_by ORDER BY t.id DESC LIMIT 500`;
  return rows.map((r) => ({ id: String(r.id), kind: r.kind, title: r.title, context: r.context, deletedBy: r.deleted_by_name || r.deleted_by, deletedAt: r.deleted_at,
    daysLeft: Math.max(0, TRASH_DAYS - Math.floor((Date.now() - new Date(r.deleted_at).getTime()) / 864e5)) }));
}

class TrashError extends Error { constructor(m, status = 409) { super(m); this.status = status; } }

// Geri alma. Üst kayıt (proje / sevkiyat) önce eklenir; alt kaydın üstü yoksa reddedilir. Başarısız olursa çöp kaydı durur.
export async function trashRestore(s, id) {
  await ensureTrash(s);
  const found = await s`SELECT * FROM trash WHERE id = ${id}::bigint`;
  if (!found.length) throw new TrashError('Kayıt çöp kutusunda bulunamadı', 404);
  const item = found[0], t = (item.payload && item.payload.tables) || {};
  const j = (name) => JSON.stringify(t[name] || []);
  const has = (name) => Array.isArray(t[name]) && t[name].length > 0;

  if (has('sites')) {
    await s`INSERT INTO sites SELECT * FROM jsonb_populate_recordset(NULL::sites, ${j('sites')}::jsonb) ON CONFLICT DO NOTHING`;
    const ok = await s`SELECT 1 FROM sites WHERE id = ${t.sites[0].id}`;
    if (!ok.length) throw new TrashError('Proje geri alınamadı: aynı proje kodu başka bir projede kullanılıyor');
  }
  if (has('prospects')) await s`INSERT INTO prospects SELECT * FROM jsonb_populate_recordset(NULL::prospects, ${j('prospects')}::jsonb) ON CONFLICT DO NOTHING`;
  if (has('shipments')) await s`INSERT INTO shipments SELECT * FROM jsonb_populate_recordset(NULL::shipments, ${j('shipments')}::jsonb) ON CONFLICT DO NOTHING`;

  for (const sid of [...new Set(['site_files', 'site_notes', 'site_folders'].flatMap((n) => (t[n] || []).map((r) => r.site_id)))]) {
    const ok = await s`SELECT 1 FROM sites WHERE id = ${sid}`;
    // Grup notu birden çok projeye yazılmıştır: bazıları silinmiş olsa da kalanlara geri döner.
    if (!ok.length && !(item.kind === 'note' && (t.site_notes || []).length > 1)) throw new TrashError('Bağlı olduğu proje silinmiş; önce projeyi geri alın');
  }
  for (const sid of [...new Set((t.shipment_files || []).map((r) => r.ship_id))]) {
    const ok = await s`SELECT 1 FROM shipments WHERE id = ${sid}`;
    if (!ok.length) throw new TrashError('Bağlı olduğu sevkiyat silinmiş; önce sevkiyatı geri alın');
  }

  if (has('site_folders')) await s`INSERT INTO site_folders SELECT * FROM jsonb_populate_recordset(NULL::site_folders, ${j('site_folders')}::jsonb) ON CONFLICT DO NOTHING`;
  if (has('site_files')) {
    await s`INSERT INTO site_files SELECT * FROM jsonb_populate_recordset(NULL::site_files, ${j('site_files')}::jsonb) ON CONFLICT DO NOTHING`;
    // Özel klasör bu arada kaldırılmış olabilir: dosya görünsün diye klasör kaydı yeniden eklenir (varsayılan klasörlerde etkisizdir).
    for (const f of t.site_files.filter((x) => !DEFAULT_FOLDERS.includes(x.folder))) await s`INSERT INTO site_folders (site_id, name, created_by) VALUES (${f.site_id}, ${f.folder}, ${item.deleted_by}) ON CONFLICT DO NOTHING`;
  }
  if (has('shipment_files')) await s`INSERT INTO shipment_files SELECT * FROM jsonb_populate_recordset(NULL::shipment_files, ${j('shipment_files')}::jsonb) ON CONFLICT DO NOTHING`;
  if (has('site_notes')) await s`INSERT INTO site_notes SELECT n.* FROM jsonb_populate_recordset(NULL::site_notes, ${j('site_notes')}::jsonb) n WHERE EXISTS (SELECT 1 FROM sites st WHERE st.id = n.site_id) ON CONFLICT DO NOTHING`;

  await s`DELETE FROM trash WHERE id = ${id}::bigint`;
  return { kind: item.kind, title: item.title, tables: t };
}
