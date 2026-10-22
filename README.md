# Saha Değerlendirme Aracı

EV şarj sahası değerlendirme, AMG/StarCharge saha keşif skorlaması ve 7 yıllık gelir/finansman modelleme aracı. Tek sayfa vanilla JS uygulama + Vercel serverless API + Neon Postgres.

## Yapı

```
index.html        Uygulama (UI + tüm hesap motoru). Senkron katmanı /api'ye konuşur.
login.html        Giriş ekranı
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

## Kimlik doğrulama

E-posta + şifre ile giriş. **Kayıt formu yok**: hesapları siz tanımlarsınız. `/api/sites` ve `/api/team` oturum çerezi olmadan 401 döner; `login.html` ve `/api/auth/*` dışında her şey korumalıdır.

```
login.html            Giriş ekranı (/login adresi de çalışır)
api/auth/login.js     POST  e-posta+şifre → HttpOnly çerez (7 gün)
api/auth/logout.js    POST  çerezi siler
api/auth/me.js        GET   oturum varsa { email }
lib/auth.js           İmzalı oturum çerezi, deneme sınırı, requireAuth()
lib/password.js       scrypt ile şifre hash'i
scripts/hash-password.mjs   AUTH_USERS satırı üretir
```

**Kurulum (Vercel → Settings → Environment Variables, Production + Preview):**

1. `SESSION_SECRET`: en az 32 karakter rastgele metin.
   `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
2. `AUTH_USERS`: kullanıcılar, `;` ile ayrılmış. Her kullanıcı için:
   `node scripts/hash-password.mjs ad@firma.com` (şifreyi sorar, en az 10 karakter) çıktıyı ekleyin.
   Örnek: `ali@firma.com:scrypt:<salt>:<hash>;veli@firma.com:scrypt:<salt>:<hash>`
3. Değişkenleri ekledikten sonra **Redeploy**.

Kullanıcı eklemek/çıkarmak/şifre değiştirmek: `AUTH_USERS`'ı düzenleyip redeploy edin. Çıkarılan kullanıcının açık oturumları da geçersiz olur.

**Güvenlik notları:** şifreler scrypt ile hashlenir ve ortam değişkeninde düz metin tutulmaz. Çerez `HttpOnly`, `SameSite=Lax`, HTTPS'te `Secure`. Yazma uçları başka siteden gelen istekleri reddeder. Giriş denemeleri e-posta başına 8, IP başına 20 ile 15 dakikada sınırlıdır (sayaç Neon'da). Oturum belirteci durumsuzdur; çıkış çerezi siler, ama çalınmış bir belirteç süresi (7 gün) dolana kadar ya da `SESSION_SECRET` değişene kadar geçerlidir.

`SESSION_SECRET` veya `AUTH_USERS` tanımlı değilse API'ler 503, giriş sayfası "yapılandırılmamış" uyarısı verir (kapalı başarısız olur).
