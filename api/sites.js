// /api/sites — GET (tüm projeler + ekip), PUT (proje upsert), DELETE (?id=)
// Ek uç noktalar (Hobby planda 12 işlev sınırı nedeniyle burada): GET ?kur=usd (TCMB dolar kuru), GET ?ev=1&lat&lon&radius (TomTom çevre şarj istasyonları, anlık),
// ?evkey=1: TomTom anahtarı (yalnızca sahip hesap) GET durum · POST {key} kaydet · DELETE sil,
// ?evh=…: Rakip Analizi geçmişi (bkz. lib/evhistory.js)
import { sql, ensureSchema, readJson } from '../lib/db.js';
import { requireAuth } from '../lib/auth.js';
import { logActivity, diffSite, summarize } from '../lib/activity.js';
import { seedOnce } from '../lib/seed.js';
import { nextCode, backfillCodes } from '../lib/codes.js';
import { renumberOnce } from '../lib/renumber.js';
import { reorderOnce, swapCodesOnce } from '../lib/reorder.js';
import { _deps as _filesDeps } from '../lib/files.js';
import { analyze, validArea, maxRequests, sealKey, openKey, keyLooksValid, testKey } from '../lib/tomtom.js';
import { saveAnalysis, handleHistory } from '../lib/evhistory.js';

// TCMB günlük kurlar: USD döviz satış kuru, 3 saat önbellekte tutulur.
// Anahtar: önce Vercel ortam değişkeni, yoksa sistemden girilmiş (şifreli) kayıt.
async function tomtomKey(s) {
  if (process.env.TOMTOM_API_KEY) return { key: process.env.TOMTOM_API_KEY, source: 'env' };
  const r = await s`SELECT data FROM config WHERE key = 'tomtom_key'`;
  const key = r[0] ? openKey(r[0].data) : '';
  return { key, source: key ? 'db' : '' };
}
let usdCache = null;
const evCache = new Map();  // TomTom analiz önbelleği (3 dk; sıcak işlev örneğinde)
async function usdSelling() {
  if (usdCache && Date.now() - usdCache.at < 3 * 3600e3) return usdCache;
  const r = await fetch('https://www.tcmb.gov.tr/kurlar/today.xml', { signal: AbortSignal.timeout(8000) });
  if (!r.ok) throw new Error('TCMB ' + r.status);
  const xml = await r.text();
  const blk = xml.match(/<Currency[^>]*Kod="USD"[\s\S]*?<\/Currency>/)?.[0] || '';
  const rate = parseFloat(blk.match(/<ForexSelling>([\d.]+)<\/ForexSelling>/)?.[1]);
  if (!(rate > 0)) throw new Error('Kur okunamadı');
  const date = xml.match(/<Tarih_Date[^>]*\sTarih="([^"]+)"/)?.[1] || '';
  usdCache = { rate, date, at: Date.now() };
  return usdCache;
}

export default async function handler(req, res) {
  try {
    const user = await requireAuth(req, res);
    if (!user) return;

    if (req.method === 'GET' && req.query?.kur === 'usd') {
      try {
        const k = await usdSelling();
        res.setHeader('cache-control', 'no-store');
        return res.status(200).json({ rate: k.rate, date: k.date, source: 'TCMB' });
      } catch {
        return res.status(502).json({ error: 'Kur alınamadı' });
      }
    }
    await ensureSchema();
    const s = sql();

    // TomTom anahtarı yönetimi: yalnızca sahip hesap. Anahtar şifreli saklanır ve tarayıcıya hiçbir zaman geri gönderilmez (yalnızca son 4 hane).
    if (req.query?.evkey === '1') {
      res.setHeader('cache-control', 'no-store');
      if (!user.owner) return res.status(403).json({ error: 'Bu işlem yalnızca sahip hesaba açık' });
      if (req.method === 'GET') {
        const k = await tomtomKey(s);
        return res.status(200).json({ set: Boolean(k.key), source: k.source, last4: k.key ? k.key.slice(-4) : '' });
      }
      if (req.method === 'POST') {
        const b = await readJson(req);
        const key = String(b?.key || '').trim();
        if (!keyLooksValid(key)) return res.status(400).json({ error: 'Anahtar biçimi geçersiz (harf ve rakamlardan oluşan 16-80 karakter)' });
        const chk = await testKey(key).catch(() => 'error');
        if (chk === 'invalid') return res.status(400).json({ error: 'TomTom bu anahtarı kabul etmedi' });
        if (chk !== 'ok') return res.status(502).json({ error: 'TomTom şu an doğrulanamadı; biraz sonra tekrar deneyin' });
        await s`INSERT INTO config (key, data) VALUES ('tomtom_key', ${JSON.stringify(sealKey(key))}::jsonb) ON CONFLICT (key) DO UPDATE SET data = EXCLUDED.data`;
        evCache.clear();
        return res.status(200).json({ set: true, source: 'db', last4: key.slice(-4) });
      }
      if (req.method === 'DELETE') {
        await s`DELETE FROM config WHERE key = 'tomtom_key'`;
        evCache.clear();
        const k = await tomtomKey(s);
        return res.status(200).json({ set: Boolean(k.key), source: k.source, last4: k.key ? k.key.slice(-4) : '' });
      }
      return res.status(405).json({ error: 'Yöntem desteklenmiyor' });
    }

    // Rakip Analizi geçmişi: liste, yeniden açma, adlandırma, silme
    if (req.query?.evh) { res.setHeader('cache-control', 'no-store'); return await handleHistory(req, res, user, s); }

    // TomTom çevre şarj istasyonu analizi (her yeni analiz geçmişe kaydedilir). Ücretsiz katman günde 2.500 istek: günlük sayaç ve 3 dk önbellek ile korunur.
    if (req.method === 'GET' && req.query?.ev === '1') {
      const area = validArea(req.query);
      if (!area) return res.status(400).json({ error: 'Geçersiz konum veya yarıçap (500–5000 m)' });
      const key = (await tomtomKey(s)).key;
      if (!key) return res.status(503).json({ error: 'TomTom anahtarı tanımlı değil; sahip hesap Rakip Analizi sekmesinden girebilir' });
      res.setHeader('cache-control', 'no-store');
      const ck = `${area.lat.toFixed(4)},${area.lon.toFixed(4)},${area.radius}`;
      const hit = evCache.get(ck);
      if (hit && Date.now() - hit.at < 3 * 60e3) return res.status(200).json({ ...hit.data, cached: true });   // önbellekten gelen yeniden kaydedilmez
      const day = new Date().toISOString().slice(0, 10);
      const limit = Number(process.env.TOMTOM_DAILY_LIMIT) || 2000;
      const u = await s`SELECT data FROM config WHERE key = 'tomtom_usage'`;
      const used = u[0]?.data?.day === day ? Number(u[0].data.n) || 0 : 0;
      if (used + maxRequests() > limit) return res.status(429).json({ error: 'Günlük TomTom kotası doldu; yarın yeniden deneyin', used, limit });
      let data;
      try {
        data = await analyze({ ...area, key });
      } catch (e) {
        return res.status(e.status === 503 ? 503 : 502).json({ error: e.status === 403 || e.status === 401 ? 'TomTom anahtarı geçersiz veya yetkisiz' : e.status === 429 ? 'TomTom kotası doldu' : 'TomTom verisi alınamadı' });
      }
      await s`INSERT INTO config (key, data) VALUES ('tomtom_usage', ${JSON.stringify({ day, n: data.requests })}::jsonb)
        ON CONFLICT (key) DO UPDATE SET data = jsonb_build_object('day', ${day}::text, 'n', (CASE WHEN config.data->>'day' = ${day} THEN (config.data->>'n')::int ELSE 0 END) + ${data.requests}::int)`;
      data.usage = { used: used + data.requests, limit };
      try { data.analysisId = await saveAnalysis(s, user, data, { label: String(req.query?.label || ''), siteId: String(req.query?.site || '') }); } catch { /* geçmiş kaydedilemese de sonuç gösterilir */ }
      evCache.set(ck, { at: Date.now(), data });
      if (evCache.size > 200) evCache.delete(evCache.keys().next().value);
      return res.status(200).json(data);
    }

    if (req.method === 'GET') {
      try { await seedOnce(s); } catch { /* başlangıç listesi eklenemezse okuma bozulmasın */ }
      try { await backfillCodes(s); } catch { /* kod verilemezse okuma bozulmasın */ }
      try { await reorderOnce(s); } catch { /* sıra değişmezse okuma bozulmasın */ }
      try { await swapCodesOnce(s); } catch { /* kodlar değişmezse okuma bozulmasın */ }
      try { await renumberOnce(s); } catch { /* kodlar değişmezse okuma bozulmasın */ }
      const rows = await s`SELECT data FROM sites ORDER BY updated_at`;
      const cfg = await s`SELECT data FROM config WHERE key = 'team'`;
      const team = cfg[0]?.data?.names;
      res.setHeader('cache-control', 'no-store');
      return res.status(200).json({
        sites: rows.map((r) => r.data),
        team: Array.isArray(team) ? team : [],
      });
    }

    if (req.method === 'PUT') {
      const site = await readJson(req);
      if (!site || typeof site.id !== 'string' || !site.id) {
        return res.status(400).json({ error: 'Geçersiz proje' });
      }
      const prev = await s`SELECT data FROM sites WHERE id = ${site.id}`;
      // Proje kodu yalnızca sunucudan gelir: varsa korunur, yoksa sıradaki numara verilir (istemcinin gönderdiği değer yok sayılır).
      site.code = prev[0]?.data?.code || (await nextCode(s, site));
      await s`INSERT INTO sites (id, data, updated_at)
              VALUES (${site.id}, ${JSON.stringify(site)}::jsonb, now())
              ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = now()`;
      const old = prev[0]?.data;
      if (!old) {
        await logActivity({ actor: user.email, action: 'olustur', entity: 'lokasyon', entityId: site.id, entityName: site.name, summary: 'Proje oluşturuldu' });
      } else {
        const changes = diffSite(old, site);
        if (changes.length) await logActivity({ actor: user.email, action: 'guncelle', entity: 'lokasyon', entityId: site.id, entityName: site.name, summary: summarize(changes), changes });
      }
      return res.status(200).json({ ok: true, code: site.code });
    }

    if (req.method === 'DELETE') {
      // Excel'deki kural: kayıt silinmez, Durum ile kapatılır. Silme yalnızca yönetici.
      if (!user.owner) return res.status(403).json({ error: 'Silme yetkisi yalnızca sahip hesaptadır' });
      const id = req.query?.id;
      if (!id) return res.status(400).json({ error: 'id gerekli' });
      const prev = await s`SELECT data FROM sites WHERE id = ${id}`;
      await s`DELETE FROM sites WHERE id = ${id}`;
      try { await s`DELETE FROM site_notes WHERE site_id = ${id}`; } catch { /* not tablosu henüz yoksa */ }
      try {
        // Projenin dosyaları da silinir (Blob + kayıtlar).
        const files = await s`SELECT pathname FROM site_files WHERE site_id = ${id}`;
        if (files.length) await _filesDeps.del(files.map((f) => f.pathname));
        await s`DELETE FROM site_files WHERE site_id = ${id}`;
        await s`DELETE FROM site_folders WHERE site_id = ${id}`;
      } catch { /* dosya tabloları henüz yoksa */ }
      await logActivity({ actor: user.email, action: 'sil', entity: 'lokasyon', entityId: id, entityName: prev[0]?.data?.name || id, summary: 'Proje silindi' });
      return res.status(204).end();
    }

    res.setHeader('allow', 'GET, PUT, DELETE');
    return res.status(405).json({ error: 'Yöntem desteklenmiyor' });
  } catch (e) {
    return res.status(500).json({ error: String(e?.message || e) });
  }
}
