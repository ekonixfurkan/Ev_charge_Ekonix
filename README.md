# Saha Değerlendirme Aracı

EV şarj sahası değerlendirme, AMG/StarCharge saha keşif skorlaması ve 7 yıllık gelir/finansman modelleme aracı. Tek sayfa vanilla JS uygulama + Vercel serverless API + Neon Postgres.

## Yapı

```
index.html        Uygulama (UI + tüm hesap motoru). Senkron katmanı /api'ye konuşur.
api/sites.js      GET tüm lokasyon + ekip · PUT lokasyon upsert · DELETE ?id=
api/team.js       GET/PUT ekip üyesi listesi
lib/db.js         Neon bağlantısı (lazy), şema bootstrap, JSON gövde okuma
schema.sql        Referans şema (API otomatik kurar)
```

**Veri modeli:** site başına 1 satır `sites(id, data jsonb, updated_at)`. Ekip `config` tablosunda `team` anahtarı.

**Senkron:** tarayıcı 4 sn'de bir `GET /api/sites` ile tazeler; değişiklikler 600 ms debounce sonrası `PUT`/`DELETE` ile yazılır. DB/API erişilemezse otomatik `localStorage`'a düşer (yerelde anında çalışır).

## Yerelde çalıştırma

Sadece arayüz (DB'siz, localStorage): `index.html`'i tarayıcıda aç.

DB ile tam yığın:

```bash
npm install
npm i -g vercel@latest          # CLI güncel olsun
vercel link                     # projeyi Vercel'e bağla
vercel integration add neon     # Neon Postgres provision + DATABASE_URL enjekte
vercel env pull .env.local      # env'i yerele çek
vercel dev                      # http://localhost:3000
```

Şema ilk istekte otomatik kurulur; elle kuracaksan `schema.sql`'i Neon SQL editöründe çalıştır.

## Yayına alma

```bash
vercel --prod
```

Neon Marketplace üzerinden eklendiyse `DATABASE_URL` tüm ortamlara otomatik gelir; ekstra ayar gerekmez.

## Veri taşıma

Artifact sürümündeki kayıtları taşımak için: artifact'te **Yedek indir** (JSON) → bu uygulamada **Yedek yükle**.

## ⚠️ Kimlik doğrulama yok

Şu an `/api` uçları herkese açık — link'i olan herkes okur/yazar/siler. Gerçek kullanımdan önce auth ekle (Vercel `auth` skill / Clerk) ve `PUT`/`DELETE` uçlarını koru.
