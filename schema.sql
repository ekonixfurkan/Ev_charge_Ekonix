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
