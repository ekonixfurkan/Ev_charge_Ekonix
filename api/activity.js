// GET /api/activity — işlem geçmişi (yalnızca yönetici). ?limit&before&actor&entity&q
import { requireAdmin } from '../lib/auth.js';
import { listActivity, activityActors } from '../lib/activity.js';

export default async function handler(req, res) {
  res.setHeader('cache-control', 'no-store');
  try {
    if (!(await requireAdmin(req, res))) return;
    if (!process.env.DATABASE_URL) return res.status(503).json({ error: 'İşlem geçmişi için veritabanı gerekli' });
    if (req.method !== 'GET') {
      res.setHeader('allow', 'GET');
      return res.status(405).json({ error: 'Yöntem desteklenmiyor' });
    }
    const { limit, before, actor, entity, q } = req.query || {};
    const beforeId = before && /^\d+$/.test(String(before)) ? String(before) : null;
    const [list, actors] = await Promise.all([
      listActivity({ limit, before: beforeId, actor: String(actor || ''), entity: String(entity || ''), q: String(q || '').slice(0, 100) }),
      activityActors(),
    ]);
    return res.status(200).json({ ...list, actors });
  } catch (e) {
    return res.status(500).json({ error: 'İşlem geçmişi okunamadı' });
  }
}
