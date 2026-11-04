// POST /api/auth/logout — oturum çerezini siler
import { clearSession, sameOrigin, sessionEmail } from '../../lib/auth.js';
import { logActivity } from '../../lib/activity.js';

export default async function handler(req, res) {
  res.setHeader('cache-control', 'no-store');
  if (req.method !== 'POST') {
    res.setHeader('allow', 'POST');
    return res.status(405).json({ error: 'Yöntem desteklenmiyor' });
  }
  if (!sameOrigin(req)) return res.status(403).json({ error: 'Geçersiz istek kaynağı' });
  let email = null;
  try { email = sessionEmail(req); } catch { /* yapılandırma yok */ }
  clearSession(req, res);
  if (email) await logActivity({ actor: email, action: 'cikis', entity: 'oturum', entityName: email, summary: 'Çıkış yapıldı' });
  return res.status(200).json({ ok: true });
}
