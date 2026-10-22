// POST /api/auth/logout — oturum çerezini siler
import { clearSession, sameOrigin } from '../../lib/auth.js';

export default function handler(req, res) {
  res.setHeader('cache-control', 'no-store');
  if (req.method !== 'POST') {
    res.setHeader('allow', 'POST');
    return res.status(405).json({ error: 'Yöntem desteklenmiyor' });
  }
  if (!sameOrigin(req)) return res.status(403).json({ error: 'Geçersiz istek kaynağı' });
  clearSession(req, res);
  return res.status(200).json({ ok: true });
}
