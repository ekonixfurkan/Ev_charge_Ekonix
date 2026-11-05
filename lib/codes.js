// Proje kodu: EKO-001, EKO-002 … Sunucuda tek sayaçtan (config tablosu) verilir; aynı kod iki kez verilmez.
const KEY = 'seq:project-code';
const pad = (n) => 'EKO-' + String(n).padStart(3, '0');

async function ensureCounter(s) {
  // Sayaç yoksa mevcut en büyük koddan başlat (hiç kod yoksa 0).
  await s`INSERT INTO config (key, data)
    SELECT ${KEY}, jsonb_build_object('n', COALESCE((SELECT max(substring(data->>'code' from 5)::int) FROM sites WHERE data->>'code' ~ '^EKO-[0-9]+$'), 0))
    ON CONFLICT (key) DO NOTHING`;
}

export async function nextCode(s) {
  await ensureCounter(s);
  const r = await s`UPDATE config SET data = jsonb_set(data, '{n}', to_jsonb((data->>'n')::int + 1)) WHERE key = ${KEY} RETURNING (data->>'n')::int AS n`;
  return pad(r[0].n);
}

// Kodu olmayan lokasyonlara eklenme sırasıyla kod verir (tek sorgu; her sunucu örneğinde bir kez çalışır).
let done = false;
export async function backfillCodes(s) {
  if (done) return;
  await ensureCounter(s);
  await s`WITH todo AS (
      SELECT id, row_number() OVER (ORDER BY data->>'createdAt', id) AS rn FROM sites WHERE coalesce(data->>'code', '') = ''
    ), cnt AS (SELECT count(*)::int AS c FROM todo),
    bump AS (
      UPDATE config SET data = jsonb_set(data, '{n}', to_jsonb((data->>'n')::int + (SELECT c FROM cnt)))
      WHERE key = ${KEY} AND (SELECT c FROM cnt) > 0 RETURNING (data->>'n')::int AS n
    )
    UPDATE sites s SET data = jsonb_set(s.data, '{code}', to_jsonb('EKO-' || lpad(((SELECT n FROM bump) - (SELECT c FROM cnt) + todo.rn)::text, greatest(3, length(((SELECT n FROM bump) - (SELECT c FROM cnt) + todo.rn)::text)), '0')))
    FROM todo WHERE s.id = todo.id AND coalesce(s.data->>'code', '') = '' AND EXISTS (SELECT 1 FROM bump)`;
  done = true;
}
