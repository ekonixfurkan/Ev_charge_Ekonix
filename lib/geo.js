// Google Haritalar bağlantısından koordinat çıkarır. Kısa bağlantılar (maps.app.goo.gl) tarayıcıdan çözülemez (CORS);
// sunucu yalnızca izinli Google adreslerini, yalnızca https ile ve en fazla 6 yönlendirme boyunca izler.
const OK_HOST = /^(maps\.app\.goo\.gl|goo\.gl|g\.co|(www\.|maps\.)?google\.[a-z.]{2,6})$/i;

export function coordsFromText(t) {
  const s = String(t || '');
  const m = s.match(/@(-?\d{1,2}\.\d+),(-?\d{1,3}\.\d+)/)
    || s.match(/!3d(-?\d{1,2}\.\d+)!4d(-?\d{1,3}\.\d+)/)
    || s.match(/[?&](?:q|ll|query|destination|center|daddr)=(-?\d{1,2}\.\d+)(?:,|%2C)\s*\+?(-?\d{1,3}\.\d+)/)
    || s.match(/\/place\/(-?\d{1,2}\.\d{3,}),\+?(-?\d{1,3}\.\d{3,})/)
    || s.match(/\[null,null,(-?\d{1,2}\.\d+),(-?\d{1,3}\.\d+)\]/);
  if (!m) return null;
  const lat = +m[1], lon = +m[2];
  return lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180 ? { lat, lon } : null;
}

export async function resolveMapsLink(raw) {
  let url;
  try { url = new URL(String(raw || '').trim()); } catch { return { error: 'Geçersiz bağlantı' }; }
  for (let i = 0; i < 7; i++) {
    if (url.protocol !== 'https:' || !OK_HOST.test(url.hostname)) return { error: 'Desteklenmeyen bağlantı' };
    const direct = coordsFromText(url.href);
    if (direct) return direct;
    let r;
    try {
      r = await fetch(url, { redirect: 'manual', headers: { 'user-agent': 'Mozilla/5.0 (compatible; EkonixSaha/1.0)', 'accept-language': 'tr,en' }, signal: AbortSignal.timeout(6000) });
    } catch { return { error: 'Bağlantı açılamadı' }; }
    const loc = r.headers.get('location');
    if (loc) { try { url = new URL(loc, url); } catch { return { error: 'Geçersiz yönlendirme' }; } continue; }
    if (!r.ok) return { error: 'Bağlantı açılamadı' };
    const body = (await r.text()).slice(0, 400000);
    return coordsFromText(body) || { error: 'Bağlantıda koordinat bulunamadı' };
  }
  return { error: 'Çok fazla yönlendirme' };
}
