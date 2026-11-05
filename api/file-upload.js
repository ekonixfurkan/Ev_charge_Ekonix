// /api/file-upload — tarayıcıdan doğrudan Blob'a yükleme için kısa ömürlü jeton verir (giriş şart).
// Dosya sunucudan geçmez, bu yüzden 25 MB'a kadar yüklenebilir. Kayıt /api/files ile yazılır.
import { sql, readJson } from '../lib/db.js';
import { requireAuth } from '../lib/auth.js';
import { _deps, MAX_BYTES, ALLOWED_TYPES, isAllowedName } from '../lib/files.js';

export default async function handler(req, res) {
  res.setHeader('cache-control', 'no-store');
  try {
    const user = await requireAuth(req, res);
    if (!user) return;
    if (req.method !== 'POST') {
      res.setHeader('allow', 'POST');
      return res.status(405).json({ error: 'Yöntem desteklenmiyor' });
    }
    if (!process.env.DATABASE_URL || !process.env.BLOB_READ_WRITE_TOKEN) return res.status(503).json({ error: 'Dosya deposu yapılandırılmamış' });
    const body = await readJson(req);
    if (!body) return res.status(400).json({ error: 'Geçersiz istek' });
    const json = await _deps.handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async (pathname) => {
        // yol biçimi: sites/{lokasyon id}/{rastgele}-{dosya adı}
        const m = /^sites\/([^/]+)\/([^/]+)$/.exec(pathname);
        if (!m || !isAllowedName(m[2])) throw new Error('Bu dosya türü desteklenmiyor (Excel, PDF, Word, JPG, PNG)');
        const found = await sql()`SELECT 1 FROM sites WHERE id = ${m[1]}`;
        if (!found.length) throw new Error('Lokasyon bulunamadı');
        return { allowedContentTypes: ALLOWED_TYPES, maximumSizeInBytes: MAX_BYTES, addRandomSuffix: false, allowOverwrite: false, tokenPayload: JSON.stringify({ by: user.email }) };
      },
    });
    return res.status(200).json(json);
  } catch (e) {
    return res.status(400).json({ error: String(e && e.message ? e.message : 'Yükleme başlatılamadı') });
  }
}
