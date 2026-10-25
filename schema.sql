-- Referans şema. API (lib/db.js → ensureSchema) bunu otomatik kurar;
-- elle kurmak istersen Neon SQL editöründe çalıştır.

CREATE TABLE IF NOT EXISTS sites (
  id         text PRIMARY KEY,
  data       jsonb NOT NULL,          -- site başına tam JSON belge
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS config (
  key  text PRIMARY KEY,              -- 'team' → {"names": [...]}
  data jsonb NOT NULL
);

-- Kullanıcı hesapları (API ilk kullanımda kurar; AUTH_USERS tablo boşken yönetici olarak aktarılır).
CREATE TABLE IF NOT EXISTS users (
  email      text PRIMARY KEY,
  name       text NOT NULL DEFAULT '',
  role       text NOT NULL DEFAULT 'user',   -- 'admin' | 'user'
  pass       text NOT NULL,                  -- scrypt:<salt>:<hash>
  active     boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by text,
  last_login timestamptz
);
