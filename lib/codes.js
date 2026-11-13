// Proje kodu: EKO-YYNNN (YY = projenin başlangıç yılı, NNN = o yıl içindeki sıra). Örn. 2026'da başlayan ilk proje EKO-26001.
// Sayaç yıl başına config tablosunda tutulur; aynı kod iki kez verilmez (sites_code_uq benzersiz dizini).
const keyOf = (yy) => 'seq:project-code:' + yy;
const pad = (yy, n) => 'EKO-' + yy + String(n).padStart(3, '0');

// Kodun yılı: kayıt tarihi (recordDate), yoksa oluşturulma zamanı, yoksa bugün.
export function yearOf(site) {
  for (const v of [site?.recordDate, site?.createdAt]) {
    const m = /^(\d{4})-\d{2}-\d{2}/.exec(String(v || ''));
    if (m && +m[1] >= 2000 && +m[1] <= 2099) return m[1].slice(2);
  }
  return String(new Date().getFullYear()).slice(2);
}

async function ensureCounter(s, yy) {
  // Sayaç yoksa o yılın mevcut en büyük sırasından başlat (hiç yoksa 0).
  await s`INSERT INTO config (key, data)
    SELECT ${keyOf(yy)}, jsonb_build_object('n', COALESCE((SELECT max(substring(data->>'code' from 8)::int) FROM sites WHERE data->>'code' ~ ${'^EKO-' + yy + '[0-9]{3,}$'}), 0))
    ON CONFLICT (key) DO NOTHING`;
}

// Alt proje kodu: ana proje kodu + sıra (EKO-26001-1, -2, -3…). Sayaç ana proje başına tutulur; silinen alt projenin numarası yeniden verilmez.
export async function nextSubCode(s, parent) {
  const key = 'seq:subcode:' + parent.id;
  const rx = '^' + String(parent.data.code).replace(/[^A-Za-z0-9-]/g, '') + '-[0-9]+$';
  await s`INSERT INTO config (key, data)
    SELECT ${key}, jsonb_build_object('n', COALESCE((SELECT max(substring(data->>'code' from '[0-9]+$')::int) FROM sites WHERE data->>'code' ~ ${rx}), 0))
    ON CONFLICT (key) DO NOTHING`;
  const r = await s`UPDATE config SET data = jsonb_set(data, '{n}', to_jsonb((data->>'n')::int + 1)) WHERE key = ${key} RETURNING (data->>'n')::int AS n`;
  return parent.data.code + '-' + r[0].n;
}

export async function nextCode(s, site) {
  const yy = yearOf(site);
  await ensureCounter(s, yy);
  const r = await s`UPDATE config SET data = jsonb_set(data, '{n}', to_jsonb((data->>'n')::int + 1)) WHERE key = ${keyOf(yy)} RETURNING (data->>'n')::int AS n`;
  return pad(yy, r[0].n);
}

// Tek seferlik: yıl içermeyen eski kodlar (EKO-001) yıllı biçime çevrilir (EKO-26001); sıra numarası korunur.
const MIGRATE_KEY = 'migrate:code-year-2026-11-10';
let migrated = false;
async function migrateYearCodes(s) {
  if (migrated) return;
  const mark = await s`SELECT 1 FROM config WHERE key = ${MIGRATE_KEY}`;
  if (!mark.length) {
    await s`UPDATE sites SET data = jsonb_set(data, '{code}', to_jsonb(
        'EKO-' || right(substring(coalesce(nullif(data->>'recordDate', ''), nullif(data->>'createdAt', ''), to_char(now(), 'YYYY')) from 1 for 4), 2)
        || lpad(substring(data->>'code' from 5), 3, '0')))
      WHERE data->>'code' ~ '^EKO-[0-9]{1,4}$'`;
    await s`INSERT INTO config (key, data) VALUES (${MIGRATE_KEY}, ${JSON.stringify({ at: new Date().toISOString() })}::jsonb) ON CONFLICT (key) DO NOTHING`;
  }
  migrated = true;
}

// Kodu olmayan projelere eklenme sırasıyla kod verir (her sunucu örneğinde bir kez çalışır).
let done = false;
export async function backfillCodes(s) {
  if (done) return;
  await migrateYearCodes(s);
  const todo = await s`SELECT id, data FROM sites WHERE coalesce(data->>'code', '') = '' ORDER BY data->>'createdAt', id`;
  for (const row of todo) {
    const code = await nextCode(s, row.data);
    await s`UPDATE sites SET data = jsonb_set(data, '{code}', to_jsonb(${code}::text)) WHERE id = ${row.id} AND coalesce(data->>'code', '') = ''`;
  }
  done = true;
}
