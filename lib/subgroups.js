// Grup = ana proje + alt projeler. Bir grubun ana projesi, gruptaki kodu en küçük (ana) projedir; diğer üyeler onun alt projesi olur
// ve kodlarını ana proje kodundan alır (EKO-26001-1, -2…). Eski kod site.oldCodes içinde saklanır.
import { nextSubCode } from './codes.js';

const cmp = (a, b) => String(a).localeCompare(String(b), 'tr', { numeric: true });
const grpOf = (d) => String(d?.group || '').trim();

async function makeSub(s, site, main) {
  if (site.parent === main.id) return;
  if (site.code) site.oldCodes = [...new Set([...(site.oldCodes || []), site.code])];
  site.code = await nextSubCode(s, main);
  site.parent = main.id;
}

// PUT sırasında: projenin grubu değiştiyse ana/alt konumunu ayarlar (site yerinde değiştirilir). prev: kayıttaki önceki veri.
export async function applyGroup(s, site, prev) {
  if (!prev && site.parent) return;                 // alt proje olarak oluşturuluyor: kod zaten verildi
  const g = grpOf(site);
  if (g === grpOf(prev)) return;
  if (!g) { site.parent = ''; return; }              // gruptan çıktı: kod kalır, bağ kalkar
  const kids = await s`SELECT 1 FROM sites WHERE data->>'parent' = ${site.id} LIMIT 1`;
  if (kids.length) return;                           // kendi alt projeleri olan ana proje taşınmaz
  const rows = await s`SELECT id, data FROM sites WHERE data->>'group' = ${g} AND id <> ${site.id}`;
  const main = rows.filter((r) => !r.data.parent && r.data.code).sort((a, b) => cmp(a.data.code, b.data.code))[0];
  if (!main) { site.parent = ''; return; }           // grubun ilk üyesi: ana proje olur
  await makeSub(s, site, main);
}

// Tek seferlik: var olan gruplar bu kurala göre kodlanır (grup başına en küçük kodlu proje ana, diğerleri alt).
const MARK = 'migrate:group-subcodes-2026-11-13';
let migrated = false;
export async function groupSubcodesOnce(s) {
  if (migrated) return;
  const mark = await s`SELECT 1 FROM config WHERE key = ${MARK}`;
  if (!mark.length) {
    const rows = await s`SELECT id, data FROM sites WHERE coalesce(trim(data->>'group'), '') <> ''`;
    const groups = new Map();
    for (const r of rows) (groups.get(grpOf(r.data)) || groups.set(grpOf(r.data), []).get(grpOf(r.data))).push(r);
    for (const members of groups.values()) {
      if (members.length < 2) continue;
      const mains = members.filter((r) => !r.data.parent && r.data.code).sort((a, b) => cmp(a.data.code, b.data.code));
      const main = mains[0];
      if (!main) continue;
      for (const r of mains.slice(1)) {
        const hasKids = (await s`SELECT 1 FROM sites WHERE data->>'parent' = ${r.id} LIMIT 1`).length;
        if (hasKids) continue;
        const site = { ...r.data };
        await makeSub(s, site, main);
        await s`UPDATE sites SET data = ${JSON.stringify(site)}::jsonb, updated_at = now() WHERE id = ${r.id}`;
      }
    }
    await s`INSERT INTO config (key, data) VALUES (${MARK}, ${JSON.stringify({ at: new Date().toISOString() })}::jsonb) ON CONFLICT (key) DO NOTHING`;
  }
  migrated = true;
}
