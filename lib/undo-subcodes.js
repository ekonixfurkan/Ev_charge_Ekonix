// Tek seferlik geri alma: alt proje denemesinde (EKO-26001-1 gibi) yeniden kodlanan projeler özgün kodlarına döner; parent/oldCodes alanları silinir.
const MARK = 'migrate:undo-group-subcodes-2026-11-13';
let done = false;
export async function undoSubcodesOnce(s) {
  if (done) return;
  const mark = await s`SELECT 1 FROM config WHERE key = ${MARK}`;
  if (!mark.length) {
    const rows = await s`SELECT id, data FROM sites WHERE jsonb_array_length(coalesce(data->'oldCodes', '[]'::jsonb)) > 0`;
    for (const r of rows) {
      const d = { ...r.data };
      const orig = String(d.oldCodes[0] || '');
      if (orig) d.code = orig;
      delete d.oldCodes;
      delete d.parent;
      await s`UPDATE sites SET data = ${JSON.stringify(d)}::jsonb, updated_at = now() WHERE id = ${r.id}`;
    }
    await s`INSERT INTO config (key, data) VALUES (${MARK}, ${JSON.stringify({ at: new Date().toISOString(), restored: rows.length })}::jsonb) ON CONFLICT (key) DO NOTHING`;
  }
  done = true;
}
