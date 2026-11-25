# EKONIX Saha Değerlendirme — çalışma kuralları

Bu depoda değişiklik yaparken (insan ya da yapay zekâ) şunlara uy.

## Tasarım
- Tek kaynak: `DESIGN.md` (design-v1 "Saha Defteri"). Yeni ekran/bileşen bu kurallara göre yapılır.
- **Yazı tipi: Plus Jakarta Sans** (MKT Motors ile aynı). Başka yazı tipi ekleme, mevcut olanı değiştirme.
  Yazı tipi yalnızca `--font` değişkeniyle verilir; satır içi ya da yeni `font-family` yazma.
  Dosyalar `/fonts/` altında (kendi sunucumuz), Google Fonts gibi dış kaynak kullanma.
- Renk, köşe, gölge, rozet, sekme stilleri `index.html` içindeki `design-v1` CSS jetonlarındandır; yeni renk uydurma.
- Arayüz %75 tarayıcı yakınlaştırmasına göre tasarlanır; sol menüdeki (dil seçicinin üstündeki çizginin üstü) `.zoom-note` uyarısını ve tablo başlıklarındaki `nowrap`'ı kaldırma. Başlık ile hücre aynı yana hizalı olmalı.
- Başlıklar Türkçe Başlık Düzeni (her kelime büyük; ve/ile/için küçük).

## Dil (TR / EN / 中文)
- Kaynak dil Türkçe; İngilizce `i18n.js` içindeki sözlükle çalışma anında çevrilir. Yeni bir ekran metni/mesaj eklenince `i18n.js`'e İngilizce karşılığı da eklenir (başlıklar English Title Case). Sözlükte olmayan metin Türkçe kalır.
- Çince (zh-CN) sözlüğü `i18n.zh.js` içindedir (`D`: Türkçe → Çince, `rules`: desenler) ve yalnızca Çince seçiliyken yüklenir. Yeni metne Çince karşılık da eklenir; eklenmezse o metin Çince arayüzde İngilizce görünür.
- Tarih/sayı biçimi `LOC` değişkeniyle verilir; `'tr-TR'` yazma. Kullanıcı verisi (ad, not) çevrilmez.

## Proje
- Tek dosyalı uygulama: `index.html` (+ `login.html`), Vercel Functions `api/`, Neon Postgres.
- Hesaplar Neon `users` tablosunda; şifreler yalnızca hash. Şifreyi düz metin saklama/gösterme.
- Sahip hesabı (`furkan.kece@ekonix.com.tr`) korumalıdır; kodda kaldırma/zayıflatma.
- Proje dosyaları Vercel Blob'da (private mağaza `ekonix-files`, `BLOB_READ_WRITE_TOKEN`); yükleme tarayıcıdan doğrudan Blob'a gider (`/api/files` jeton verir ve kaydı yazar; Hobby planda en fazla 12 Vercel işlevi olduğu için ayrı dosya açma). `vendor/vercel-blob-client.js`, `@vercel/blob/client`ın esbuild ile paketlenmiş halidir (CDN kullanılmaz).
- Çöp Kutusu (`lib/trash.js`, Yönetim > Çöp Kutusu, yalnızca sahip): proje, proje dosyası, şirket içi not, sevkiyat, sevkiyat belgesi ve aday müşteri silinirken önce `trashPut` ile kopyalanır, Blob dosyası hemen silinmez (30 gün). Bu kayıtlara yeni bir silme yolu eklenirse o da `trashPut`'tan geçer; bu tablolara bağlı yeni yan tablo eklenirse silme ve geri alma listesine yazılır.
- Her değişiklik `main`'e commit + push edilir, Vercel otomatik yayınlar.

## Hub (kutucuklu bölüm seçimi)
- Kullanıcı bir sayfanın içeriğini "kutucuklar" halinde ister: üstte tıklanabilir kutular (simge + başlık + alt satır), seçilen kutunun içeriği altında açılır. MKT Motors'ta aynı yapıya "hub" (HubCard) denir; burada da bu ad kullanılır: "hub yap" = bölümleri kutucuklara böl.
- Sol menü de hub'tır: yalnızca ana başlıklar (Ana Sayfa, Bildirimler, Projeler, Toplantılar, İş Geliştirme, Yönetim); alt sayfalar `HUBS` içinde tanımlı `.hub-card` kutucuklarından açılır, menüde ayrı madde olarak yer almaz. Yeni sayfa eklenince `HUBS` ve `HUB_VIEW`'a yazılır; görünürlük `hubCan()` ile verilir.
- Uygulama: `.hub-tiles` ızgarası içinde `.comp-tile` kutuları (Rakip Analizi: Analiz Yap / Geçmiş Analizler; Dosyalar: klasörler). Seçili kutu `.on`; içerik sayısı varsa simgenin köşesinde `.ct-n` rozeti ve alt satırda "N dosya" gibi sayı gösterilir. Yeni renk/yazı tipi eklenmez.

