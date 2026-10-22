// GET /api/auth/me — oturum varsa { email }, yoksa 401
import { ConfigError, assertConfigured, sessionEmail } from '../../lib/auth.js';

export default function handler(req, res) {
  res.setHeader('cache-control', 'no-store');
  try {
    assertConfigured();
  } catch (e) {
    if (e instanceof ConfigError) return res.status(503).json({ error: 'Kimlik doğrulama yapılandırılmamış' });
    throw e;
  }
  const email = sessionEmail(req);
  if (!email) return res.status(401).json({ error: 'Oturum yok' });
  return res.status(200).json({ email });
}
