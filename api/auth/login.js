// POST /api/auth/login  { email, password } → HttpOnly oturum çerezi
import { readJson } from '../../lib/db.js';
import { ConfigError, assertConfigured, attempt, clearAttempts, checkLogin, clientIp, sameOrigin, setSession } from '../../lib/auth.js';

const MAX_PER_EMAIL = 8;
const MAX_PER_IP = 20;

export default async function handler(req, res) {
  res.setHeader('cache-control', 'no-store');
  if (req.method !== 'POST') {
    res.setHeader('allow', 'POST');
    return res.status(405).json({ error: 'Yöntem desteklenmiyor' });
  }
  if (!sameOrigin(req)) return res.status(403).json({ error: 'Geçersiz istek kaynağı' });
  try {
    assertConfigured();
    const body = await readJson(req);
    const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
    const password = typeof body?.password === 'string' ? body.password : '';
    if (!email || !password || email.length > 254 || password.length > 200) {
      return res.status(400).json({ error: 'E-posta ve şifre gerekli' });
    }

    const ipKey = `ip:${clientIp(req)}`, emKey = `em:${email}`;
    const [nIp, nEm] = await Promise.all([attempt(ipKey), attempt(emKey)]);
    if (nIp > MAX_PER_IP || nEm > MAX_PER_EMAIL) {
      res.setHeader('retry-after', '900');
      return res.status(429).json({ error: 'Çok fazla deneme. 15 dakika sonra tekrar deneyin.' });
    }

    const user = await checkLogin(email, password);
    if (!user) return res.status(401).json({ error: 'E-posta veya şifre hatalı' });
    await clearAttempts(emKey);
    setSession(req, res, email);
    return res.status(200).json({ ok: true, email, role: user.role });
  } catch (e) {
    if (e instanceof ConfigError) return res.status(503).json({ error: 'Kimlik doğrulama yapılandırılmamış' });
    return res.status(500).json({ error: 'Giriş yapılamadı' });
  }
}
