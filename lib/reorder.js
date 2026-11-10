// Tek seferlik sıra değişikliği: "IKEA Ankara" ile "YEDPA Commercial Center" listede yer değiştirir.
// Liste sırası eklenme zamanına (createdAt) göre olduğu için iki projenin createdAt değerleri takas edilir.
// config tablosundaki işaretle bir kez çalışır; iki proje de tek eşleşmeyle bulunamazsa hiçbir şey yapmaz ve sonra tekrar dener.
const KEY = 'reorder:ikea-ankara-yedpa-2026-11-10';
let done = false;

export async function reorderOnce(s) {
  if (done) return;
  const mark = await s`SELECT 1 FROM config WHERE key = ${KEY}`;
  if (mark.length) { done = true; return; }
  const a = await s`SELECT id, data->>'createdAt' AS c FROM sites WHERE data->>'name' ILIKE 'ikea ankara' ORDER BY id`;
  const b = await s`SELECT id, data->>'createdAt' AS c FROM sites WHERE data->>'name' ILIKE 'yedpa commercial center' ORDER BY id`;
  if (a.length !== 1 || b.length !== 1 || !a[0].c || !b[0].c) return;
  await s`UPDATE sites SET data = jsonb_set(data, '{createdAt}', to_jsonb(${b[0].c}::text)) WHERE id = ${a[0].id}`;
  await s`UPDATE sites SET data = jsonb_set(data, '{createdAt}', to_jsonb(${a[0].c}::text)) WHERE id = ${b[0].id}`;
  await s`INSERT INTO config (key, data) VALUES (${KEY}, ${JSON.stringify({ a: a[0].id, b: b[0].id, at: new Date().toISOString() })}::jsonb) ON CONFLICT (key) DO NOTHING`;
  done = true;
}
