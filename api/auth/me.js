// GET /api/auth/me — oturum varsa { email, name, role }, yoksa 401. ?seen=1: kullanıcı siteyi açtı/kullanıyor (son görülme güncellenir).
import { ConfigError, assertConfigured, sessionUser } from '../../lib/auth.js';
import { touchSeen } from '../../lib/users.js';

export default async function handler(req, res) {
  res.setHeader('cache-control', 'no-store');
  try {
    assertConfigured();
    const user = await sessionUser(req);
    if (!user) return res.status(401).json({ error: 'Oturum yok' });
    if (req.query?.seen === '1') await touchSeen(user.email);
    return res.status(200).json(user);
  } catch (e) {
    if (e instanceof ConfigError) return res.status(503).json({ error: 'Kimlik doğrulama yapılandırılmamış' });
    return res.status(500).json({ error: 'Oturum doğrulanamadı' });
  }
}
