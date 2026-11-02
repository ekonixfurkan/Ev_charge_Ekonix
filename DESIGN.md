# EKONIX · design-v1 — "Saha Defteri"

Saha tespit formu gibi okunan, düz ve çizgili bir panel. Süs yok: veri, çizgi ve işaret.

## Kurallar

- **Tek marka mürekkebi:** Ekonix lacivert `#0b2e57` (düğme, aktif sekme, odak). Teal `#13a08a` yalnızca işaret rengidir (aktif menü çizgisi, kart köşe işareti, toast kenarı). Yüzey rengi olarak kullanılmaz.
- **Düz:** gölge yok. Derinlik 1px çizgi (`--hair`) ve kartın sol üst köşesindeki teal köşe işaretiyle verilir.
- **Köşeler:** kart, düğme, alan 6px. Tam yuvarlak yalnızca rozetler (999px).
- **Zemin:** soğuk gri-mavi `#f2f5f8`, kart beyaz. Sıcak krem kullanılmaz.
- **Tipografi:** tek aile, Aptos (yoksa sistem fontu). Alan etiketleri ve tablo başlıkları 11–11.5px, büyük harf, 0.07–0.08em aralık. Sayılar `tabular-nums`.
- **Rozet (mühür):** 1.5px çerçeve + sol nokta + yumuşak zemin. Durum ve aşama için tek stil; ikinci bir hap stili eklenmez.
- **Sekmeler:** alt çizgili; aktif sekme lacivert alt çizgi.
- **Sol menü:** koyu lacivert zemin, aktif öğe %12 beyaz dolgu + 3px teal sol çizgi.
- **Başlıklar:** Türkçe Başlık Düzeni (her kelime büyük; ve/ile/için küçük).

## Renkler

| Rol | Değer |
|---|---|
| Sayfa | `#f2f5f8` |
| Kart | `#ffffff` |
| Çizgi | `#dde4eb` / güçlü `#c3ced9` |
| Yazı | `#10202e` / ikincil `#38485a` / soluk `#5b6a7a` |
| Lacivert | `#0b2e57` (üzerine gelince `#082244`) |
| Teal | `#13a08a` |
| Yeşil / Sarı / Kırmızı | `#1f7a4d` / `#8a5a12` / `#a33327` (yumuşak zeminleriyle) |
| Aşama rampası | 01 gri → 03 mavi → 05 teal → 06 yeşil → 08 amber → 10 koyu yeşil |

Koyu tema `prefers-color-scheme: dark` ve `data-theme="dark"` ile aynı jetonları değiştirir.

## Yapma

- Gölge, bulanıklık, gradyan, dekoratif doku ekleme.
- İkinci yazı tipi ekleme.
- Yeni durum rengi uydurma; mevcut yeşil/sarı/kırmızı/lacivert/gri jetonlarını kullan.
- Teal'i dolgu olarak kullanma.
