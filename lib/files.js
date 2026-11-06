// Proje dosyaları: sabit klasör listesi, izin verilen türler ve Vercel Blob (private) sarmalayıcıları.
// Testte _deps değiştirilerek gerçek Blob'a gitmeden denenir.
import { handleUpload } from '@vercel/blob/client';
import { del, get, head, issueSignedToken, presignUrl } from '@vercel/blob';

export const _deps = { handleUpload, del, get, head, issueSignedToken, presignUrl };

export const MAX_BYTES = 25 * 1024 * 1024;

// uzantı -> içerik türü (excel, pdf, word, resim)
export const TYPES = {
  pdf: 'application/pdf',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  csv: 'text/csv',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
};
// Tarayıcılar aynı uzantı için farklı tür bildirebilir (örn. csv için application/vnd.ms-excel); hepsine izin verilir.
export const ALLOWED_TYPES = [...new Set([...Object.values(TYPES), 'application/csv', 'application/x-csv', 'text/plain', 'application/octet-stream'])];

// Her projede varsayılan gelen klasörler (sıra korunur). Yeni klasör eklenebilir.
export const DEFAULT_FOLDERS = ['Sözleşme', 'Teklifler', 'Sunumlar', 'Toplantı Notları', 'Saha Fotoğrafları', 'Elektrik / Trafo', 'Rakip Analizi (TomTom)', 'İzinler', 'Diğer'];

export const extOf = (name) => {
  const m = /\.([A-Za-z0-9]{1,8})$/.exec(String(name || ''));
  return m ? m[1].toLowerCase() : '';
};
export const isAllowedName = (name) => Object.prototype.hasOwnProperty.call(TYPES, extOf(name));

// Dosya adı: yol ayracı ve denetim karakterleri temizlenir, en fazla 180 karakter.
export function cleanName(name) {
  const base = String(name || '').split(/[\\/]/).pop().replace(/[\u0000-\u001f\u007f]/g, '').replace(/\s+/g, ' ').trim();
  if (base.length <= 180) return base;
  const ext = extOf(base);
  return base.slice(0, 180 - (ext ? ext.length + 1 : 0)).trim() + (ext ? '.' + ext : '');
}

// Klasör adı: 1–60 karakter, düz metin.
export function cleanFolder(name) {
  return String(name || '').replace(/[\u0000-\u001f\u007f<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, 60);
}

// İndirme: önce süreli imzalı adres (tarayıcı doğrudan Blob'dan indirir); olmazsa sunucudan akıtılır.
export async function signedGetUrl(pathname, { download = false, seconds = 300 } = {}) {
  const validUntil = Date.now() + seconds * 1000;
  const token = await _deps.issueSignedToken({ pathname, operations: ['get'], validUntil });
  const { presignedUrl } = await _deps.presignUrl(token, { operation: 'get', pathname, access: 'private', validUntil });
  if (!download) return presignedUrl;
  return presignedUrl + (presignedUrl.includes('?') ? '&' : '?') + 'download=1';
}
