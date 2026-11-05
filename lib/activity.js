// İşlem geçmişi (audit log): kim, ne zaman, hangi kaydı, neyi değiştirdi. Sunucuda yazılır; istemci oynayamaz.
import { sql } from './db.js';
import { ensureUsers, dbOn } from './users.js';

// Test için sql() değiştirilebilir.
export const _deps = { sql };

let _ready = null;
export function ensureActivity() {
  if (_ready) return _ready;
  const s = _deps.sql();
  _ready = (async () => {
    await s`CREATE TABLE IF NOT EXISTS activity_log (
      id bigserial PRIMARY KEY,
      at timestamptz NOT NULL DEFAULT now(),
      actor text NOT NULL DEFAULT '',
      action text NOT NULL,
      entity text NOT NULL,
      entity_id text,
      entity_name text,
      summary text NOT NULL DEFAULT '',
      changes jsonb
    )`;
    await s`CREATE INDEX IF NOT EXISTS activity_log_at_idx ON activity_log (at DESC, id DESC)`;
  })().catch((e) => { _ready = null; throw e; });
  return _ready;
}

// Günlük yazılamazsa asıl işlem bozulmasın.
export async function logActivity({ actor = '', action, entity, entityId = null, entityName = null, summary = '', changes = null }) {
  try {
    await ensureActivity();
    await _deps.sql()`INSERT INTO activity_log (actor, action, entity, entity_id, entity_name, summary, changes)
      VALUES (${actor}, ${action}, ${entity}, ${entityId}, ${entityName}, ${summary}, ${changes ? JSON.stringify(changes) : null}::jsonb)`;
  } catch { /* önemsiz */ }
}

export async function listActivity({ limit = 50, before = null, actor = '', entity = '', q = '' } = {}) {
  await ensureActivity();
  const lim = Math.min(Math.max(+limit || 50, 1), 200);
  const like = q ? `%${String(q).replace(/[%_\\]/g, (c) => '\\' + c)}%` : null;
  if (dbOn()) await ensureUsers();
  // Kullanıcı adları users tablosundan okunur: ad sonradan girilse bile eski kayıtlarda da görünür.
  const rows = await _deps.sql()`SELECT a.id, a.at, a.actor, a.action, a.entity, a.entity_id, a.entity_name, a.summary, a.changes,
      NULLIF(u.name, '') AS actor_name, CASE WHEN a.entity = 'kullanici' THEN NULLIF(e.name, '') END AS entity_user_name
    FROM activity_log a
    LEFT JOIN users u ON u.email = a.actor
    LEFT JOIN users e ON a.entity = 'kullanici' AND e.email = a.entity_id
    WHERE (${before}::bigint IS NULL OR a.id < ${before}::bigint)
      AND (${actor} = '' OR a.actor = ${actor})
      AND (${entity} = '' OR a.entity = ${entity})
      AND (${like}::text IS NULL OR a.entity_name ILIKE ${like} OR a.summary ILIKE ${like} OR a.actor ILIKE ${like} OR u.name ILIKE ${like} OR e.name ILIKE ${like})
    ORDER BY a.id DESC LIMIT ${lim + 1}`;
  const more = rows.length > lim;
  return { rows: rows.slice(0, lim), more };
}

export async function activityActors() {
  await ensureActivity();
  if (dbOn()) await ensureUsers();
  const r = await _deps.sql()`SELECT DISTINCT a.actor, NULLIF(u.name, '') AS name FROM activity_log a LEFT JOIN users u ON u.email = a.actor WHERE a.actor <> '' ORDER BY 2 NULLS LAST, 1`;
  return r.map((x) => ({ email: x.actor, name: x.name || '' }));
}

/* ---------- Lokasyon farkı ---------- */
const LABELS = {
  name: 'Lokasyon Adı', city: 'İl', district: 'İlçe', address: 'Adres', type: 'Saha Tipi', host: 'Yer Sağlayıcı',
  contact: 'İletişim Kişisi', contactCompany: 'Şirket', lat: 'Enlem', lng: 'Boylam', recordDate: 'Kayıt Tarihi', phone: 'Telefon', contractBase: 'İlk Süre (Yıl)', contractExt: 'Uzatma (Yıl)', contractYears: 'Toplam Süre (Yıl)', stage: 'Aşama', status: 'Durum', score: 'Skor', nextAction: 'Sıradaki İş',
  nextActionDate: 'Sıradaki İş Tarihi', blocker: 'Engel / Risk', blockerTr: 'Engel (TR)', statusTr: 'Son Durum (TR)', needs: 'Customer Needs',
  siteFiles: 'Saha Dosyaları', manHours: 'Adam-Saat', evseKw: 'EVSE kW', pvbess: 'PV & BESS', approvalDate: 'StarCharge Onay Tarihi',
  cpoPartner: 'CPO Partner', gridKva: 'Trafo kVA', notes: 'Notlar',
};
const STAGE = { '01': 'Lokasyon Önerisi', '02': 'Ön Değerlendirme', '03': 'Fizibilite', '04': 'StarCharge Değerlendirmesi', '05': 'Sözleşme Süreci', '06': 'Sözleşme İmzalandı', '07': 'Proje Geliştirme ve İzinler', '08': 'Kurulum', '09': 'Devreye Alma', '10': 'İşletme' };
const STATUS = { active: 'Aktif', hold: 'Beklemede', live: 'Kuruldu', ddfailed: 'Uygun Değil', lost: 'Kaybedildi', cancelled: 'İptal' };
const SKIP = new Set(['id', 'createdAt', 'updatedAt', 'units', 'tranches', 'fin', 'amg', 'dd', 'att', 'sign', 'survey', 'fx', 'demo']);

const show = (k, v) => {
  if (v === '' || v == null) return '—';
  if (k === 'stage') return `${v} ${STAGE[v] || ''}`.trim();
  if (k === 'status') return STATUS[v] || String(v);
  return String(v).length > 120 ? String(v).slice(0, 117) + '…' : String(v);
};
const same = (a, b) => JSON.stringify(a ?? '') === JSON.stringify(b ?? '');

// [{ alan, eski, yeni }] — yalnızca anlamlı değişiklikler.
export function diffSite(oldS, newS) {
  const out = [];
  const push = (alan, a, b) => out.push({ alan, eski: a, yeni: b });
  for (const k of Object.keys(LABELS)) {
    if (!same(oldS?.[k], newS?.[k])) push(LABELS[k], show(k, oldS?.[k]), show(k, newS?.[k]));
  }
  for (const k of ['lead', 'partner']) {
    const a = oldS?.survey?.[k], b = newS?.survey?.[k];
    if (!same(a, b)) push(k === 'lead' ? 'Sorumlu' : 'Yerel Ortak', show('x', a), show('x', b));
  }
  const fxA = oldS?.fx || {}, fxB = newS?.fx || {};
  const fxKeys = new Set([...Object.keys(fxA), ...Object.keys(fxB)]);
  const fxChanged = [...fxKeys].filter((k) => !same(fxA[k], fxB[k]));
  if (fxChanged.length) push('Feishu Alanları', fxChanged.join(', '), 'güncellendi');
  const ua = oldS?.units?.length ?? 0, ub = newS?.units?.length ?? 0;
  if (!same(oldS?.units, newS?.units)) push('Şarj Üniteleri', `${ua} kalem`, ua === ub ? 'değişti' : `${ub} kalem`);
  if (!same(oldS?.tranches, newS?.tranches)) push('Finansman Kalemleri', 'önceki', 'değişti');
  if (!same(oldS?.fin, newS?.fin)) push('Gelir Modeli / Paylaşım', 'önceki', 'değişti');
  if (!same(oldS?.amg, newS?.amg) || !same(oldS?.dd, newS?.dd)) push('Skor Hesaplama', 'önceki', 'değişti');
  const surveyKeys = Object.keys({ ...(oldS?.survey || {}), ...(newS?.survey || {}) }).filter((k) => !['lead', 'partner'].includes(k));
  const sv = surveyKeys.filter((k) => !same(oldS?.survey?.[k], newS?.survey?.[k]));
  if (sv.length) push('Saha Keşfi', `${sv.length} alan`, 'güncellendi');
  void SKIP;
  return out;
}

export const summarize = (changes) =>
  changes.slice(0, 4).map((c) => `${c.alan}: ${c.eski} → ${c.yeni}`).join('; ') + (changes.length > 4 ? ` (+${changes.length - 4} alan)` : '');
