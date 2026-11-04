# EKONIX Saha Değerlendirme — çalışma kuralları

Bu depoda değişiklik yaparken (insan ya da yapay zekâ) şunlara uy.

## Tasarım
- Tek kaynak: `DESIGN.md` (design-v1 "Saha Defteri"). Yeni ekran/bileşen bu kurallara göre yapılır.
- **Yazı tipi: Plus Jakarta Sans** (MKT Motors ile aynı). Başka yazı tipi ekleme, mevcut olanı değiştirme.
  Yazı tipi yalnızca `--font` değişkeniyle verilir; satır içi ya da yeni `font-family` yazma.
  Dosyalar `/fonts/` altında (kendi sunucumuz), Google Fonts gibi dış kaynak kullanma.
- Renk, köşe, gölge, rozet, sekme stilleri `index.html` içindeki `design-v1` CSS jetonlarındandır; yeni renk uydurma.
- Arayüz %75 tarayıcı yakınlaştırmasına göre tasarlanır; üst çubuktaki `.zoom-note` uyarısını ve tablo başlıklarındaki `nowrap`'ı kaldırma. Başlık ile hücre aynı yana hizalı olmalı.
- Başlıklar Türkçe Başlık Düzeni (her kelime büyük; ve/ile/için küçük).

## Dil (TR / EN)
- Kaynak dil Türkçe; İngilizce `i18n.js` içindeki sözlükle çalışma anında çevrilir. Yeni bir ekran metni/mesaj eklenince `i18n.js`'e İngilizce karşılığı da eklenir (başlıklar English Title Case). Sözlükte olmayan metin Türkçe kalır.
- Tarih/sayı biçimi `LOC` değişkeniyle verilir; `'tr-TR'` yazma. Kullanıcı verisi (ad, not) çevrilmez.

## Proje
- Tek dosyalı uygulama: `index.html` (+ `login.html`), Vercel Functions `api/`, Neon Postgres.
- Hesaplar Neon `users` tablosunda; şifreler yalnızca hash. Şifreyi düz metin saklama/gösterme.
- Sahip hesabı (`furkan.kece@ekonix.com.tr`) korumalıdır; kodda kaldırma/zayıflatma.
- Her değişiklik `main`'e commit + push edilir, Vercel otomatik yayınlar.
