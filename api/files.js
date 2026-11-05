// /api/files — proje dosyaları.
//   GET ?site=ID                     klasörler + dosyalar
//   GET ?download=ID[&inline=1]      dosyayı indir/aç (giriş şart; imzalı adrese yönlendirir)
//   POST {type:'blob.generate-client-token', payload}         tarayıcıdan doğrudan Blob'a yükleme için kısa ömürlü jeton (Hobby planda işlev sayısı sınırlı olduğu için burada)
//   POST {action:'register', site, folder, name, pathname}   istemci yüklemesi bitince kaydı yazar
//   POST {action:'folder', site, name}                        yeni klasör
//   DELETE ?id=ID                    dosyayı sil (yükleyen veya yönetici)
//   DELETE ?site=ID&folder=AD        boş özel klasörü sil
import { sql, readJson } from '../lib/db.js';
import { requireAuth } from '../lib/auth.js';
import { ensureUsers } from '../lib/users.js';
import { logActivity } from '../lib/activity.js';
import { _deps, MAX_BYTES, ALLOWED_TYPES, DEFAULT_FOLDERS, TYPES, cleanName, cleanFolder, extOf, isAllowedName, signedGetUrl } from '../lib/files.js';

let _ready = null;
export function ensureFiles() {
  if (_ready) return _ready;
  const s = sql();
  _ready = (async () => {
    await s`CREATE TABLE IF NOT EXISTS site_files (
      id bigserial PRIMARY KEY,
      site_id text NOT NULL,
      folder text NOT NULL,
      name text NOT NULL,
      size bigint NOT NULL DEFAULT 0,
      mime text NOT NULL DEFAULT '',
      pathname text NOT NULL UNIQUE,
      uploaded_by text NOT NULL DEFAULT '',
      uploaded_at timestamptz NOT NULL DEFAULT now()
    )`;
    await s`CREATE INDEX IF NOT EXISTS site_files_site_idx ON site_files (site_id, id)`;
    await s`CREATE TABLE IF NOT EXISTS site_folders (
      site_id text NOT NULL,
      name text NOT NULL,
      created_by text NOT NULL DEFAULT '',
      PRIMARY KEY (site_id, name)
    )`;
    await ensureUsers();
  })().catch((e) => { _ready = null; throw e; });
  return _ready;
}

const shape = (r) => ({
  id: String(r.id), folder: r.folder, name: r.name, size: Number(r.size), mime: r.mime,
  uploadedBy: r.uploaded_by, uploadedByName: r.uploaded_by_name || '', uploadedAt: r.uploaded_at,
});

async function siteName(s, id) {
  const r = await s`SELECT data->>'name' AS name FROM sites WHERE id = ${id}`;
  return r.length ? r[0].name || id : null;
}

export default async function handler(req, res) {
  res.setHeader('cache-control', 'no-store');
  try {
    const user = await requireAuth(req, res);
    if (!user) return;
    if (!process.env.DATABASE_URL) return res.status(503).json({ error: 'Dosyalar için veritabanı gerekli' });
    await ensureFiles();
    const s = sql();
    const q = req.query || {};

    if (req.method === 'GET' && q.download) {
      const id = String(q.download);
      if (!/^\d+$/.test(id)) return res.status(400).json({ error: 'id gerekli' });
      const r = await s`SELECT name, mime, pathname FROM site_files WHERE id = ${id}::bigint`;
      if (!r.length) return res.status(404).json({ error: 'Dosya bulunamadı' });
      const inline = q.inline === '1';
      try {
        const url = await signedGetUrl(r[0].pathname, { download: !inline });
        res.setHeader('location', url);
        return res.status(302).end();
      } catch (e) {
        // İmzalı adres alınamazsa dosya sunucudan akıtılır (küçük dosyalar için yeterli).
        const got = await _deps.get(r[0].pathname, { access: 'private' });
        if (!got || !got.stream) return res.status(404).json({ error: 'Dosya bulunamadı' });
        res.setHeader('content-type', r[0].mime || 'application/octet-stream');
        res.setHeader('content-disposition', `${inline ? 'inline' : 'attachment'}; filename*=UTF-8''${encodeURIComponent(r[0].name)}`);
        res.status(200);
        const reader = got.stream.getReader();
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          res.write(Buffer.from(value));
        }
        return res.end();
      }
    }

    if (req.method === 'GET') {
      const site = String(q.site || '');
      if (!site) return res.status(400).json({ error: 'site gerekli' });
      const files = await s`SELECT f.*, NULLIF(u.name, '') AS uploaded_by_name FROM site_files f LEFT JOIN users u ON u.email = f.uploaded_by
        WHERE f.site_id = ${site} ORDER BY f.id DESC`;
      const custom = await s`SELECT name FROM site_folders WHERE site_id = ${site} ORDER BY lower(name)`;
      const folders = [...DEFAULT_FOLDERS];
      for (const c of custom) if (!folders.includes(c.name)) folders.push(c.name);
      for (const f of files) if (!folders.includes(f.folder)) folders.push(f.folder);
      return res.status(200).json({ folders, defaults: DEFAULT_FOLDERS, files: files.map(shape), max: MAX_BYTES, me: user.email, admin: user.role === 'admin' });
    }

    if (req.method === 'POST') {
      const b = (await readJson(req)) || {};
      if (typeof b.type === 'string' && b.type.startsWith('blob.')) {
        if (!process.env.BLOB_READ_WRITE_TOKEN) return res.status(503).json({ error: 'Dosya deposu yapılandırılmamış' });
        try {
          const json = await _deps.handleUpload({
            body: b,
            request: req,
            onBeforeGenerateToken: async (pathname) => {
              // yol biçimi: sites/{lokasyon id}/{rastgele}-{dosya adı}
              const m = /^sites\/([^/]+)\/([^/]+)$/.exec(pathname);
              if (!m || !isAllowedName(m[2])) throw new Error('Bu dosya türü desteklenmiyor (Excel, PDF, Word, JPG, PNG)');
              if ((await siteName(s, m[1])) == null) throw new Error('Lokasyon bulunamadı');
              return { allowedContentTypes: ALLOWED_TYPES, maximumSizeInBytes: MAX_BYTES, addRandomSuffix: false, allowOverwrite: false, tokenPayload: JSON.stringify({ by: user.email }) };
            },
          });
          return res.status(200).json(json);
        } catch (e) {
          return res.status(400).json({ error: String(e && e.message ? e.message : 'Yükleme başlatılamadı') });
        }
      }
      const site = typeof b.site === 'string' ? b.site : '';
      const name = await siteName(s, site);
      if (name == null) return res.status(404).json({ error: 'Lokasyon bulunamadı' });

      if (b.action === 'folder') {
        const folder = cleanFolder(b.name);
        if (!folder) return res.status(400).json({ error: 'Klasör adı gerekli' });
        if (!DEFAULT_FOLDERS.includes(folder)) await s`INSERT INTO site_folders (site_id, name, created_by) VALUES (${site}, ${folder}, ${user.email}) ON CONFLICT DO NOTHING`;
        return res.status(201).json({ ok: true, folder });
      }

      if (b.action === 'register') {
        const folder = cleanFolder(b.folder);
        const fname = cleanName(b.name);
        const pathname = typeof b.pathname === 'string' ? b.pathname : '';
        if (!folder || !fname) return res.status(400).json({ error: 'Klasör ve dosya adı gerekli' });
        if (!isAllowedName(fname)) return res.status(400).json({ error: 'Bu dosya türü desteklenmiyor (Excel, PDF, Word, JPG, PNG)' });
        if (!pathname.startsWith(`sites/${site}/`)) return res.status(400).json({ error: 'Geçersiz dosya yolu' });
        let meta;
        try { meta = await _deps.head(pathname); } catch { return res.status(400).json({ error: 'Yüklenen dosya bulunamadı' }); }
        if (meta.size > MAX_BYTES) {
          try { await _deps.del(pathname); } catch { /* yok say */ }
          return res.status(400).json({ error: 'Dosya 25 MB sınırını aşıyor' });
        }
        const mime = TYPES[extOf(fname)] || meta.contentType || '';
        if (!DEFAULT_FOLDERS.includes(folder)) await s`INSERT INTO site_folders (site_id, name, created_by) VALUES (${site}, ${folder}, ${user.email}) ON CONFLICT DO NOTHING`;
        const r = await s`INSERT INTO site_files (site_id, folder, name, size, mime, pathname, uploaded_by)
          VALUES (${site}, ${folder}, ${fname}, ${meta.size}, ${mime}, ${pathname}, ${user.email}) ON CONFLICT (pathname) DO NOTHING RETURNING id`;
        if (!r.length) return res.status(200).json({ ok: true, duplicate: true });
        await logActivity({ actor: user.email, action: 'dosya-ekle', entity: 'lokasyon', entityId: site, entityName: name, summary: `${fname} (${folder})` });
        return res.status(201).json({ ok: true, id: String(r[0].id) });
      }
      return res.status(400).json({ error: 'Geçersiz istek' });
    }

    if (req.method === 'DELETE') {
      if (q.id) {
        const id = String(q.id);
        if (!/^\d+$/.test(id)) return res.status(400).json({ error: 'id gerekli' });
        const r = await s`SELECT * FROM site_files WHERE id = ${id}::bigint`;
        if (!r.length) return res.status(404).json({ error: 'Dosya bulunamadı' });
        const f = r[0];
        if (f.uploaded_by !== user.email && user.role !== 'admin') return res.status(403).json({ error: 'Dosyayı yalnızca yükleyen veya yönetici silebilir' });
        try { await _deps.del(f.pathname); } catch { /* Blob'da yoksa kayıt yine de silinir */ }
        await s`DELETE FROM site_files WHERE id = ${id}::bigint`;
        const name = (await siteName(s, f.site_id)) || f.site_id;
        await logActivity({ actor: user.email, action: 'dosya-sil', entity: 'lokasyon', entityId: f.site_id, entityName: name, summary: `${f.name} (${f.folder})` });
        return res.status(200).json({ ok: true });
      }
      if (q.site && q.folder) {
        const folder = cleanFolder(q.folder);
        if (DEFAULT_FOLDERS.includes(folder)) return res.status(400).json({ error: 'Varsayılan klasör silinemez' });
        const used = await s`SELECT 1 FROM site_files WHERE site_id = ${String(q.site)} AND folder = ${folder} LIMIT 1`;
        if (used.length) return res.status(400).json({ error: 'Klasörde dosya var; önce dosyaları silin' });
        await s`DELETE FROM site_folders WHERE site_id = ${String(q.site)} AND name = ${folder}`;
        return res.status(200).json({ ok: true });
      }
      return res.status(400).json({ error: 'id gerekli' });
    }

    res.setHeader('allow', 'GET, POST, DELETE');
    return res.status(405).json({ error: 'Yöntem desteklenmiyor' });
  } catch (e) {
    return res.status(500).json({ error: 'Dosyalar işlenemedi' });
  }
}
