// Neon Postgres — lazy init (build-time safe) + schema bootstrap.
import { neon } from '@neondatabase/serverless';

let _sql = null;
let _ready = null;

export function sql() {
  if (!_sql) {
    if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL tanımlı değil');
    _sql = neon(process.env.DATABASE_URL);
  }
  return _sql;
}

// Idempotent; runs once per warm instance.
export function ensureSchema() {
  if (_ready) return _ready;
  const s = sql();
  _ready = (async () => {
    await s`CREATE TABLE IF NOT EXISTS sites (
      id text PRIMARY KEY,
      data jsonb NOT NULL,
      updated_at timestamptz NOT NULL DEFAULT now()
    )`;
    await s`CREATE TABLE IF NOT EXISTS config (
      key text PRIMARY KEY,
      data jsonb NOT NULL
    )`;
  })().catch((e) => { _ready = null; throw e; });
  return _ready;
}

// Read a JSON body across runtimes (Vercel auto-parses, but be defensive).
export async function readJson(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string' && req.body) {
    try { return JSON.parse(req.body); } catch { return null; }
  }
  const chunks = [];
  for await (const c of req) chunks.push(c);
  if (!chunks.length) return null;
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { return null; }
}
