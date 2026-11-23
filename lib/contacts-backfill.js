// Tek seferlik: projelerde yazılı iletişim kişilerinden Müşteri Bilgileri'nde (contacts) karşılığı olmayanlar kişiler rehberine eklenir.
// Eşleşme: ad soyad (büyük/küçük harf ve fazla boşluk yok sayılır) ya da telefon (son 10 hane). Aynı kişi birden çok projede varsa bir kez eklenir.
import { logActivity } from './activity.js';

const KEY = 'migrate:site-contacts-2026-11-23';
const nm = (v) => String(v || '').normalize('NFC').replace(/\s+/g, ' ').trim().toLocaleLowerCase('tr-TR');
const ph = (v) => String(v || '').replace(/\D/g, '').slice(-10);
const JUNK = new Set(['', '-', '–', '—', 'yok', 'bilinmiyor', 'belirtilmemiş', 'n/a', 'na']);

// Saf hesap: { sites:[{contact,phone,company,code}], contacts:[{first_name,last_name,phone}] } -> eklenecek kişiler
export function missingContacts(sites, contacts) {
  const names = new Set(contacts.map((c) => nm([c.first_name, c.last_name].filter(Boolean).join(' '))).filter(Boolean));
  const phones = new Set(contacts.map((c) => ph(c.phone)).filter((p) => p.length === 10));
  const out = [];
  for (const s of sites) {
    const full = String(s.contact || '').replace(/\s+/g, ' ').trim();
    const key = nm(full), p = ph(s.phone);
    if (JUNK.has(key) || key.length < 2) continue;
    if (names.has(key) || (p.length === 10 && phones.has(p))) continue;
    const parts = full.split(' ');
    const last = parts.length > 1 ? parts[parts.length - 1] : '';
    out.push({ firstName: parts.length > 1 ? parts.slice(0, -1).join(' ') : full, lastName: last, phone: String(s.phone || '').trim(), company: String(s.company || '').trim(), code: s.code || '' });
    names.add(key); if (p.length === 10) phones.add(p);
  }
  return out;
}

let done = false;
export async function backfillSiteContacts(s) {
  if (done) return;
  const mark = await s`SELECT 1 FROM config WHERE key = ${KEY}`;
  if (!mark.length) {
    const sites = await s`SELECT data->>'contact' AS contact, data->>'phone' AS phone, data->>'contactCompany' AS company, data->>'code' AS code FROM sites ORDER BY data->>'createdAt', id`;
    const contacts = await s`SELECT first_name, last_name, phone FROM contacts`;
    const add = missingContacts(sites, contacts);
    for (const c of add) {
      await s`INSERT INTO contacts (company, first_name, last_name, phone, created_by, updated_by)
        VALUES (${c.company.slice(0, 120)}, ${c.firstName.slice(0, 80)}, ${c.lastName.slice(0, 80)}, ${c.phone.slice(0, 30)}, 'sistem (projelerden)', 'sistem (projelerden)')`;
    }
    await s`INSERT INTO config (key, data) VALUES (${KEY}, ${JSON.stringify({ at: new Date().toISOString(), added: add.length })}::jsonb) ON CONFLICT (key) DO NOTHING`;
    if (add.length) {
      try { await logActivity({ actor: 'sistem', action: 'olustur', entity: 'kisi', entityId: '', entityName: 'Projelerden aktarım', summary: `Projelerde yazılı ${add.length} kişi Müşteri Bilgileri'ne eklendi: ` + add.slice(0, 5).map((c) => [c.firstName, c.lastName].filter(Boolean).join(' ')).join(', ') + (add.length > 5 ? '…' : '') }); } catch { /* günlük yazılamazsa aktarım yine geçerli */ }
    }
  }
  done = true;
}
