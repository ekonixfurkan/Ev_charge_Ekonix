// TomTom EV şarj istasyonu analizi (anlık). Yalnızca sunucuda çalışır; API anahtarı ortam değişkenindedir (TOMTOM_API_KEY).
// 1) nearbySearch: çaptaki istasyonlar  2) chargingAvailability: istasyon başına anlık soket durumu.
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

const BASE = () => process.env.TOMTOM_BASE || 'https://api.tomtom.com';
const MAX_STATIONS = 60;      // tek analizde en fazla bu kadar istasyonun doluluğu sorgulanır (kota koruması)
const CONCURRENCY = 6;
const TIMEOUT_MS = 9000;

const num = (v) => (Number.isFinite(+v) ? +v : 0);

async function getJson(url, f = fetch) {
  const r = await f(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!r.ok) {
    const e = new Error('TomTom ' + r.status);
    e.status = r.status;
    throw e;
  }
  return r.json();
}

// Doluluk yanıtı: connectors[].availability.current {available, occupied, reserved, unknown, outOfService}; toplamlar soket sayısıdır.
export function sumAvailability(d) {
  const t = { total: 0, available: 0, occupied: 0, reserved: 0, outOfService: 0, unknown: 0 };
  for (const c of d?.connectors || []) {
    const cur = c?.availability?.current || {};
    t.available += num(cur.available);
    t.occupied += num(cur.occupied);
    t.reserved += num(cur.reserved);
    t.outOfService += num(cur.outOfService);
    t.unknown += num(cur.unknown);
    t.total += num(c.total) || num(cur.available) + num(cur.occupied) + num(cur.reserved) + num(cur.outOfService) + num(cur.unknown);
  }
  return t;
}

function connectorsOf(poi) {
  const out = [];
  for (const c of poi?.chargingPark?.connectors || []) {
    out.push({ type: String(c.connectorType || ''), kw: num(c.ratedPowerKW), current: String(c.currentType || '') });
  }
  return out;
}

export function shapeStation(r, avail) {
  const conns = connectorsOf(r);
  const maxKw = conns.reduce((m, c) => Math.max(m, c.kw), 0);
  const dc = conns.some((c) => /dc/i.test(c.current));
  return {
    id: r.id || '',
    name: r.poi?.name || '—',
    operator: r.poi?.brands?.[0]?.name || '',
    address: r.address?.freeformAddress || '',
    distance: Math.round(num(r.dist)),
    lat: r.position?.lat ?? null,
    lon: r.position?.lon ?? null,
    connectors: conns,
    maxKw,
    kind: conns.length ? (dc ? 'DC' : 'AC') : '',
    sockets: avail ? avail.total : conns.length,
    available: avail ? avail.available : null,
    occupied: avail ? avail.occupied : null,
    reserved: avail ? avail.reserved : null,
    outOfService: avail ? avail.outOfService : null,
    live: Boolean(avail),
  };
}

// Aynı anda en fazla CONCURRENCY istek.
async function pool(items, fn) {
  const res = new Array(items.length);
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, items.length) }, async () => {
    while (i < items.length) {
      const k = i++;
      res[k] = await fn(items[k], k);
    }
  }));
  return res;
}

export function validArea({ lat, lon, radius }) {
  const la = +lat, lo = +lon, ra = +radius;
  if (!(la >= -90 && la <= 90) || !(lo >= -180 && lo <= 180)) return null;
  if (!(ra >= 500 && ra <= 5000)) return null;
  return { lat: la, lon: lo, radius: Math.round(ra) };
}

// Kaç TomTom isteği harcayacağı (kota kontrolü için üst sınır): 1 arama + istasyon başına 1 doluluk.
export const maxRequests = () => 2 + MAX_STATIONS;   // arama + adres + istasyon başına doluluk

// Koordinattan adres (il, ilçe, mahalle, cadde): TomTom ters geokodlama. Başarısız olursa analiz yine çalışır.
export function shapeAddress(a) {
  const x = a || {};
  const il = x.countrySubdivision || x.municipality || '';
  let ilce = x.countrySecondarySubdivision || '';
  if (!ilce && x.municipality && x.municipality !== il) ilce = x.municipality;
  const mahalle = x.municipalitySubdivision || x.localName || '';
  return { il, ilce, mahalle, cadde: x.streetName || '', postaKodu: x.postalCode || '', adres: x.freeformAddress || '' };
}
export async function reverseGeocode(lat, lon, key, f = fetch) {
  try {
    const d = await getJson(`${BASE()}/search/2/reverseGeocode/${encodeURIComponent(lat + ',' + lon)}.json?${new URLSearchParams({ key, language: 'tr-TR' })}`, f);
    return shapeAddress(d?.addresses?.[0]?.address);
  } catch { return null; }
}

export async function analyze({ lat, lon, radius, key, f = fetch }) {
  if (!key) { const e = new Error('TomTom anahtarı tanımlı değil'); e.status = 503; throw e; }
  const q = new URLSearchParams({ lat: String(lat), lon: String(lon), radius: String(radius), categorySet: '7309', limit: '100', key });
  const [search, address] = await Promise.all([getJson(`${BASE()}/search/2/nearbySearch/.json?${q}`, f), reverseGeocode(lat, lon, key, f)]);
  const results = (search.results || []).slice().sort((a, b) => num(a.dist) - num(b.dist));
  const withAvail = results.filter((r) => r.dataSources?.chargingAvailability?.id);
  const queried = withAvail.slice(0, MAX_STATIONS);
  let failed = 0;
  const avail = await pool(queried, async (r) => {
    try {
      const d = await getJson(`${BASE()}/search/2/chargingAvailability.json?${new URLSearchParams({ chargingAvailability: r.dataSources.chargingAvailability.id, key })}`, f);
      return sumAvailability(d);
    } catch { failed++; return null; }
  });
  const byId = new Map(queried.map((r, i) => [r.id, avail[i]]));
  const stations = results.map((r) => shapeStation(r, byId.get(r.id) || null));
  const live = stations.filter((s) => s.live);
  const sum = (k) => live.reduce((a, s) => a + (s[k] || 0), 0);
  const totalSockets = stations.reduce((a, s) => a + (s.sockets || 0), 0);
  const liveSockets = sum('sockets');
  const occ = sum('occupied');
  return {
    area: { lat: +lat, lon: +lon, radius: +radius },
    fetchedAt: new Date().toISOString(),
    totals: {
      stations: stations.length,
      totalResults: num(search.summary?.totalResults) || stations.length,
      truncated: num(search.summary?.totalResults) > results.length,
      liveStations: live.length,
      sockets: totalSockets,
      liveSockets,
      available: sum('available'),
      occupied: occ,
      reserved: sum('reserved'),
      outOfService: sum('outOfService'),
      occupancyPct: liveSockets ? Math.round((occ / liveSockets) * 1000) / 10 : null,
      failed,
      skipped: Math.max(0, withAvail.length - queried.length),
    },
    stations,
    address,
    requests: 2 + queried.length,
  };
}

// ---- Anahtarın sistemden girilmesi: veritabanında AES-256-GCM ile şifreli saklanır (anahtar SESSION_SECRET'tan türetilir) ----
const kek = () => {
  const s = process.env.SESSION_SECRET;
  if (!s) throw new Error('SESSION_SECRET tanımlı değil');
  return createHash('sha256').update('tomtom-key:' + s).digest();
};
export function sealKey(plain) {
  const iv = randomBytes(12);
  const c = createCipheriv('aes-256-gcm', kek(), iv);
  const ct = Buffer.concat([c.update(String(plain), 'utf8'), c.final()]);
  return { iv: iv.toString('base64'), tag: c.getAuthTag().toString('base64'), ct: ct.toString('base64') };
}
export function openKey(box) {
  try {
    if (!box?.iv || !box?.tag || !box?.ct) return '';
    const d = createDecipheriv('aes-256-gcm', kek(), Buffer.from(box.iv, 'base64'));
    d.setAuthTag(Buffer.from(box.tag, 'base64'));
    return Buffer.concat([d.update(Buffer.from(box.ct, 'base64')), d.final()]).toString('utf8');
  } catch { return ''; }   // SESSION_SECRET değiştiyse çözülemez: "tanımlı değil" sayılır
}
export const keyLooksValid = (k) => /^[A-Za-z0-9_-]{16,80}$/.test(String(k || ''));

// Anahtarı 1 istekle dener (kota: 1). 401/403 ise geçersiz.
export async function testKey(key, f = fetch) {
  const q = new URLSearchParams({ lat: '41.0', lon: '29.0', radius: '500', limit: '1', categorySet: '7309', key });
  const r = await f(`${BASE()}/search/2/nearbySearch/.json?${q}`, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  return r.ok ? 'ok' : r.status === 401 || r.status === 403 ? 'invalid' : 'error';
}
