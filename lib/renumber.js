// Tek seferlik: tüm proje kodları Proje Listesi'nin varsayılan sırasına (Aşamaya Göre: aşama büyükten küçüğe, sonra eklenme zamanı, sonra id) göre yıl başına 001'den yeniden verilir (EKO-26001…).
// Alt proje denemesinden kalan parent/oldCodes alanları silinir; yıl sayaçları son numaraya ayarlanır. Kod tekil olduğu için önce geçici kodlar yazılır.
import { yearOf } from './codes.js';

const MARK = 'migrate:renumber-codes-by-list-2026-11-13';
let done = false;
export async function renumberOnce(s) {
  if (done) return;
  const mark = await s`SELECT 1 FROM config WHERE key = ${MARK}`;
  if (!mark.length) {
    const rows = await s`SELECT id, data FROM sites`;
    const t = (v) => String(v ?? '');
    rows.sort((a, b) => t(b.data.stage).localeCompare(t(a.data.stage)) || t(a.data.createdAt).localeCompare(t(b.data.createdAt)) || a.id.localeCompare(b.id));
    const seq = new Map(), plan = [];
    for (const r of rows) {
      const yy = yearOf(r.data), n = (seq.get(yy) || 0) + 1;
      seq.set(yy, n);
      plan.push({ id: r.id, code: 'EKO-' + yy + String(n).padStart(3, '0') });
    }
    const stamp = Date.now();
    for (const p of plan) await s`UPDATE sites SET data = jsonb_set(data, '{code}', to_jsonb(${'EKO-TMP-' + stamp + '-' + p.id}::text)) WHERE id = ${p.id}`;
    for (const p of plan) {
      await s`UPDATE sites SET data = jsonb_set((data - 'parent') - 'oldCodes', '{code}', to_jsonb(${p.code}::text)), updated_at = now() WHERE id = ${p.id}`;
    }
    await s`DELETE FROM config WHERE key LIKE 'seq:project-code:%' OR key LIKE 'seq:subcode:%'`;
    for (const [yy, n] of seq) await s`INSERT INTO config (key, data) VALUES (${'seq:project-code:' + yy}, ${JSON.stringify({ n })}::jsonb) ON CONFLICT (key) DO UPDATE SET data = EXCLUDED.data`;
    await s`INSERT INTO config (key, data) VALUES (${MARK}, ${JSON.stringify({ at: new Date().toISOString(), count: plan.length })}::jsonb) ON CONFLICT (key) DO NOTHING`;
  }
  done = true;
}
