// Tek seferlik: kullanıcının verdiği başlangıç lokasyonlarını ekler. config tablosundaki işaretle bir kez çalışır,
// sonradan silinen lokasyonlar geri gelmez. Aynı adlı lokasyon varsa atlanır.
import { logActivity } from './activity.js';

const KEY = 'seed:baslangic-lokasyonlari-2026-11-04';
const NAMES = [
  'IKEA Ankara', 'Gungoren Auto Industry Site', 'DERSANKOOP Industry Site', 'YEDPA Commercial Center', 'ModaFen City Club',
  'NOVADA Edremit', 'SANPARK Bakırköy', 'SANPARK Gaziosmanpaşa', 'Bozcaada Municipality', 'Giyim Sanatkarları Industry Site',
  'Sakarya Hub', 'Afyonkarahisar Şarj AVM', 'Aksaray Benzin İstasyonu', 'Düzce AVM',
];
const norm = (v) => String(v || '').replace(/[İIı]/g, 'i').toLowerCase().replace(/\s+/g, ' ').trim();
const slug = (v) => norm(v).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export async function seedOnce(s) {
  const done = await s`SELECT 1 FROM config WHERE key = ${KEY}`;
  if (done.length) return;
  const have = new Set((await s`SELECT data->>'name' AS n FROM sites`).map((r) => norm(r.n)));
  const base = Date.now();
  let added = 0;
  for (let i = 0; i < NAMES.length; i++) {
    const name = NAMES[i];
    if (have.has(norm(name))) continue;
    const created = new Date(base + i).toISOString();
    const updated = new Date(base - i).toISOString(); // listede verilen sıra korunsun
    const doc = {
      id: 'seed-' + slug(name), name, city: '', district: '', address: '', type: 'Other', host: '', contact: '',
      status: 'active', stage: '01', score: '', nextAction: '', nextActionDate: '', blocker: '', blockerTr: '', statusTr: '',
      needs: '', siteFiles: '', manHours: '', evseKw: '', pvbess: '', approvalDate: '', cpoPartner: '', fx: {},
      gridKva: 0, gridNote: '', contractYears: 0, notes: '', units: [], dd: {}, survey: {}, amg: { scores: {}, notes: {} },
      att: {}, sign: {}, createdAt: created, updatedAt: updated,
    };
    const r = await s`INSERT INTO sites (id, data, updated_at) VALUES (${doc.id}, ${JSON.stringify(doc)}::jsonb, ${updated})
      ON CONFLICT (id) DO NOTHING RETURNING id`;
    if (r.length) {
      added++;
      await logActivity({ actor: 'Sistem', action: 'olustur', entity: 'lokasyon', entityId: doc.id, entityName: name, summary: 'Lokasyon oluşturuldu (başlangıç listesi)' });
    }
  }
  await s`INSERT INTO config (key, data) VALUES (${KEY}, ${JSON.stringify({ added, at: new Date().toISOString() })}::jsonb) ON CONFLICT (key) DO NOTHING`;
}
