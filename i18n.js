/* EKONIX · Türkçe / English dil desteği.
   Kaynak dil Türkçe. İngilizce seçilince ekrandaki Türkçe metinler bu sözlükten çevrilir
   (metin düğümleri + placeholder/title/aria-label). Sözlükte olmayan metin Türkçe kalır.
   Dil tercihi tarayıcıda saklanır (localStorage "lang"); değiştirince sayfa yenilenir. */
(function () {
  'use strict';
  var LANG = 'tr';
  try { var saved = localStorage.getItem('lang'); if (saved === 'en' || saved === 'tr') LANG = saved; } catch (e) {}

  var I18N = { lang: LANG, loc: LANG === 'en' ? 'en-US' : 'tr-TR' };
  window.I18N = I18N;
  window.LOC = I18N.loc;
  I18N.set = function (l) {
    try { localStorage.setItem('lang', l); } catch (e) {}
    location.reload();
  };
  document.documentElement.lang = LANG;
  if (LANG !== 'en') { I18N.t = function (s) { return s; }; return; }

  /* ---------- Sözlük (tam eşleşme) ---------- */
  var D = {
    /* menü ve genel */
    'Genel Bakış / Ana Sayfa': 'Overview / Home', 'Bildirimler': 'Notifications', 'İşlem Geçmişi': 'Activity Log',
    'Saha & Lokasyon Yönetimi': 'Site & Location Management', 'Saha &amp; Lokasyon Yönetimi': 'Site & Location Management',
    'Portföy Özeti': 'Portfolio Summary', 'Lokasyon Listesi': 'Location List', 'Kullanıcı Yönetimi': 'User Management',
    'Yönetim': 'Administration', 'Çıkış Yap': 'Log Out', 'Ana menü': 'Main menu', 'Ana gezinme': 'Main navigation',
    'Menüyü daralt': 'Collapse menu', 'Menüyü genişlet': 'Expand menu', 'Yükleniyor…': 'Loading…',
    'Saha Değerlendirme': 'Site Assessment', 'Saha Değerlendirme Aracı': 'Site Assessment Tool', 'Saha Değerlendirme Portalı': 'Site Assessment Portal',
    'Adsız Lokasyon': 'Unnamed Location', 'Ekonix Logo': 'Ekonix Logo',
    'Web site yakınlaştırma ayarı %75\'e göre tasarlanmıştır. Verimli kullanılabilmek adına ayarlarınızı kontrol ediniz.': 'This site is designed for a 75% browser zoom. For best results, please check your zoom setting.',
    'Sunucuda kayıtlı': 'Saved on server', 'Kayıt başarısız': 'Save failed', 'Kayıt yapılamıyor': 'Cannot save',
    'Kaydediliyor…': 'Saving…', 'Kayıt bekliyor · tekrar deneniyor': 'Save pending · retrying',
    'Sunucuya bağlanılamadı · bu tarayıcıya kaydediliyor': 'Cannot reach server · saving to this browser',
    'Sunucuya ulaşılamadı. Bağlantınızı kontrol edin.': 'Cannot reach the server. Check your connection.',

    /* genel eylemler */
    'Düzenle': 'Edit', 'Yazdır': 'Print', 'Değişiklikleri Kaydet': 'Save Changes', 'İptal': 'Cancel', 'Vazgeç': 'Cancel', 'Tamam': 'OK',
    'Sil': 'Delete', 'Ekle': 'Add', 'Kapat': 'Close', 'Gönder': 'Send', 'Ara': 'Search', 'Seçin': 'Select', 'Tümü': 'All', 'Uygula': 'Apply',
    'Üret': 'Generate', 'Gerekli': 'Required', 'Opsiyonel': 'Optional', 'Kayıt': 'Record', 'Kaydet': 'Save', 'Evet': 'Yes', 'Hayır': 'No',
    'Daha Fazla Yükle': 'Load More', 'Filtreleri Temizle': 'Clear Filters', 'Sırala': 'Sort by', 'Katalogdan Seç': 'Pick from Catalog',
    'Değişiklikleri At': 'Discard Changes', 'Üniteyi sil': 'Delete unit', 'Kalemi sil': 'Delete item',
    'A4 dikey yazdır': 'Print A4 portrait', 'Yok': 'None', 'Var': 'Yes', 'Siz': 'You', 'Önce': 'Before', 'Sonra': 'After',
    'Gösterge': 'Legend',

    /* lokasyon listesi / ana sayfa */
    'Lokasyonlar': 'Locations', 'Lokasyon': 'Location', 'Lokasyon adı': 'Location Name', 'Lokasyon adı *': 'Location Name *',
    'Yeni Lokasyon': 'New Location', 'Yeni Lokasyon Ekle': 'Add New Location', 'Lokasyon ekle': 'Add location', 'Lokasyonu ekle': 'Add Location',
    'Qualified Lead': 'Qualified Lead', 'Aktif': 'Active', 'Pasif': 'Inactive', 'Beklemede': 'On Hold', 'Kuruldu': 'Live',
    'Uygun Değil': 'DD Failed', 'Uygun değil': 'Not suitable', 'Kaybedildi': 'Lost', 'İptal Edildi': 'Cancelled',
    'Aşama': 'Stage', 'Durum': 'Status', 'Skor': 'Score', 'Toplam Güç': 'Total Power', 'Toplam kW': 'Total kW', 'Toplam': 'Total',
    'Sorumlu': 'Owner', 'Sorumlu / Ortak': 'Owner / Partner', 'Yerel Ortak': 'Local Partner', 'Yerel ortak': 'Local partner',
    'Sıradaki İş': 'Next Action', 'Sıradaki iş': 'Next action', 'Sıradaki İş Tarihi': 'Next Action Date', 'Sıradaki iş tarihi': 'Next action date',
    'Engel': 'Blocker', 'Engel / Risk': 'Blocker / Risk', 'Güncellendi': 'Updated', 'Son Güncelleme': 'Last Updated', 'Son güncelleme:': 'Last updated:',
    'Ada Göre (A–Z)': 'By Name (A–Z)', 'Liste Sırası': 'List Order', 'Ana Sayfa': 'Home', 'Proje Kodu': 'Project Code', 'Proje kodu': 'Project code', 'Sunucu tarafından verilir; değiştirilemez': 'Assigned by the server; cannot be changed', 'Sayfalar': 'Pages', 'Önceki Sayfa': 'Previous page', 'Sonraki Sayfa': 'Next page', 'Aşamaya Göre': 'By Stage', 'Skora Göre (Yüksek–Düşük)': 'By Score (High–Low)',
    'Sadece Engelli': 'Blocked Only', 'Satıra tıklayarak detayı açın': 'Click a row to open details',
    'Lokasyonlar Yükleniyor': 'Loading Locations', 'Kayıtlı lokasyonlar buluttan getiriliyor.': 'Fetching saved locations from the cloud.',
    'İlk Lokasyonu Ekleyin': 'Add Your First Location',
    'Gelen saha tekliflerini buraya kaydedin; üniteleri ve kontrol listesini lokasyon detayında doldurun.': 'Record incoming site offers here; fill in the units and the checklist on the location page.',
    'Ad, şehir, mal sahibi, ortak, sıradaki iş…': 'Name, city, owner, partner, next action…',
    'Lokasyon, kullanıcı veya özet…': 'Location, user or summary…', 'Model ara…': 'Search model…',
    'Lokasyonların durum dağılımı': 'Status distribution of locations', 'Lokasyon bölümleri': 'Location sections', 'Portföy bölümleri': 'Portfolio sections',
    'Finansman bölümleri': 'Financing sections',
    'Aktif lokasyonları göster (tekrar tıklayınca tümü)': 'Show active locations (click again for all)',
    'Pasif lokasyonları göster (tekrar tıklayınca tümü)': 'Show inactive locations (click again for all)',
    'Temel bilgileri girin. Üniteler, altyapı ve finansman detayı kayıttan sonra lokasyon sayfasında doldurulur.': 'Enter the basics. Units, infrastructure and financing details are filled in on the location page after saving.',
    'Önce bir lokasyon ekleyin.': 'Add a location first.', 'Lokasyon adı zorunlu.': 'Location name is required.', 'Lokasyon silindi.': 'Location deleted.',
    'Lokasyon bilgileri güncellendi.': 'Location details updated.', 'Bu lokasyon silinmiş.': 'This location has been deleted.', 'Lokasyon bulunamadı.': 'Location not found.',

    /* aşamalar */
    '01 Lokasyon Önerisi': '01 Location Proposal', '02 Ön Değerlendirme': '02 Pre-Assessment', '03 Fizibilite': '03 Feasibility',
    '04 StarCharge Değerlendirmesi': '04 StarCharge Review', '05 Sözleşme Süreci': '05 Contracting', '06 Sözleşme İmzalandı': '06 Contract Signed',
    '07 Proje Geliştirme ve İzinler': '07 Project Development & Permits', '08 Kurulum': '08 Installation', '09 Devreye Alma': '09 Commissioning', '10 İşletme': '10 Operation',
    'Lokasyon Önerisi': 'Location Proposal', 'Ön Değerlendirme': 'Pre-Assessment', 'Fizibilite': 'Feasibility', 'StarCharge Değerlendirmesi': 'StarCharge Review',
    'Sözleşme Süreci': 'Contracting', 'Sözleşme İmzalandı': 'Contract Signed', 'Proje Geliştirme ve İzinler': 'Project Development & Permits',
    'Kurulum': 'Installation', 'Devreye Alma': 'Commissioning', 'İşletme': 'Operation',

    /* lokasyon detay sekmeleri ve başlıklar */
    'Genel': 'General', 'Şarj Üniteleri': 'Charging Units', 'Altyapı & Güç': 'Infrastructure & Power', 'Finansman': 'Financing', 'Skor Hesaplama': 'Score Calculation',
    'Lokasyon Bilgileri': 'Location Details', 'Takip ve Durum': 'Tracking & Status', 'Proje Bilgileri': 'Project Details', 'Saha Keşfi': 'Site Survey',
    'Saha Koşulları ve Teknik Yapılabilirlik': 'Site Conditions & Technical Feasibility', 'İmza ve Katılımcılar': 'Signatures & Participants',
    'Ek Kontroller': 'Additional Checks', 'Ekler ve Onay': 'Attachments & Approval', 'Şebeke Kapasitesi': 'Grid Capacity', 'Hesaplama Esasları': 'Calculation Basis',
    'Skor Nasıl Hesaplanır': 'How the Score Is Calculated', 'Şirket İçi Bilgilendirme': 'Internal Notes', 'Şirket İçi': 'Internal',
    'Şirket içi bilgilendirme': 'Internal notes', 'Şirket içi notlar': 'Internal notes', 'Bilgilendirme': 'Notes',
    'Genel Notlar': 'General Notes', 'Genel notlar': 'General notes', 'Ek notlar': 'Additional notes', 'Diğer katılımcılar': 'Other participants',
    'Bu lokasyon için henüz not yok.': 'No notes for this location yet.', 'İlk notu aşağıdan yazın.': 'Write the first note below.',
    'Not yazın… (Ctrl+Enter ile gönder)': 'Write a note… (Ctrl+Enter to send)',
    'Düzenleme modu': 'Edit mode', 'Düzenleme modu: değişiklikler Kaydet\'e basana kadar sunucuya gönderilmez.': 'Edit mode: changes are not sent to the server until you press Save.',
    'Düzenleme iptal edildi.': 'Editing cancelled.', 'Değişiklikler geri alındı.': 'Changes reverted.',
    'Kaydedilmemiş değişiklikler var': 'You have unsaved changes', 'Kaydedilmemiş değişiklikler var. Vazgeçip çıkılsın mı?': 'You have unsaved changes. Discard them and leave?',
    'Hatalı alanlar var; düzeltip tekrar kaydedin.': 'Some fields are invalid; fix them and save again.',
    'Bu sayfada değişiklik kaydetme yetkiniz yok': 'You do not have permission to save changes on this page',
    'Bir sonraki aşama; aşama değişince kendiliğinden güncellenir': 'The next stage; updates automatically when the stage changes',
    'Skor Hesaplama sekmesindeki 8 kriterin toplamından gelir; elle değiştirilemez': 'Comes from the sum of the 8 criteria on the Score Calculation tab; cannot be edited by hand',
    'Puanlanmadı': 'Not scored', 'Yüksek': 'High', 'Orta': 'Medium', '75 Altı': 'Below 75',

    /* alanlar */
    'Ad soyad': 'Full name', 'Ad soyad ekle': 'Add full name', 'Adres': 'Address', 'Telefon': 'Phone', 'İletişim kişisi': 'Contact person', 'İl': 'Province', 'İlçe': 'District', 'Şehir': 'City',
    'Saha Tipi': 'Site Type', 'Saha tipi': 'Site type', 'İlk süre (yıl)': 'Initial term (years)', 'Uzatma (yıl)': 'Extension (years)', 'İlk süre ile uzatmanın toplamı': 'Sum of initial term and extension',
    'İlk süre ile uzatmanın toplamı; elle değiştirilemez': 'Sum of initial term and extension; cannot be edited by hand',
    'Yer Sağlayıcı': 'Landowner', 'Yer sağlayıcı': 'Landowner', 'Tarih': 'Date', 'Keşif tarihi': 'Survey date', 'Son durum': 'Latest status',
    'Not / kanıt': 'Note / evidence', 'Değerlendirme notu': 'Assessment note', 'Tip': 'Type', 'Adet': 'Qty', 'Model': 'Model', 'Marka / Model': 'Brand / Model',
    'Konnektör': 'Connector', 'Voltaj / Akım': 'Voltage / Current', 'IP': 'IP', 'Soket': 'Sockets', 'Güç (kW)': 'Power (kW)', 'Gerilim (V)': 'Voltage (V)',
    'Ünite Gücü kW': 'Unit Power kW', 'Ünite Başına Soket': 'Sockets per Unit', 'Şarj Noktası': 'Charging Points', 'DC Ünite': 'DC Units', 'AC Ünite': 'AC Units',
    '+ DC ünite': '+ DC unit', '+ AC ünite': '+ AC unit', '+ Finansman kalemi': '+ Financing item', 'Tamam.': 'Done.',
    'Henüz ünite yok. Aşağıdan DC veya AC ünite ekleyin.': 'No units yet. Add a DC or AC unit below.',
    'Ünite girilince sonuçlar burada görünür.': 'Results appear here once units are entered.', 'Şarj potansiyeli ünite tablosundan alınır.': 'Charging potential is taken from the unit table.',
    'Park yeri, toplam': 'Parking spaces, total', 'Park yeri, ayrılmış': 'Parking spaces, reserved', 'Park yeri, ortak': 'Parking spaces, shared',
    'Park ücreti kuralı': 'Parking fee rule', 'Rakip konnektör sayısı': 'Competitor connector count', 'Rakip fiyat / hizmet / kullanım notları': 'Competitor price / service / usage notes',
    '3 km içindeki hızlı şarj sahası': 'Fast-charging sites within 3 km', 'Erişim ve yol durumu': 'Access and road conditions', 'Ana kapsam': 'Main scope',
    'Kablo döşeme': 'Cable laying', 'Yük yönetimi': 'Load management', 'İstasyona kablo mesafesi (m)': 'Cable distance to station (m)', 'Trafo gücü (kVA)': 'Transformer power (kVA)',
    'Kullanılabilir güç (kW/kVA)': 'Available power (kW/kVA)', 'Şebeke notu (trafo, dağıtım şirketi)': 'Grid note (transformer, distribution company)',
    'GPS / harita bağlantısı': 'GPS / map link', 'PV potansiyeli': 'PV potential', 'Saha ziyareti, finansör geri bildirimi, açık sorular': 'Site visit, financier feedback, open questions',
    'Kullanım': 'Utilization', 'Kurulu gücün şebeke kapasitesine oranı': 'Installed power as a share of grid capacity',
    'Zemin / inşaat işleri': 'Groundwork / civil works', 'Saha işleri (EPC)': 'Site works (EPC)', 'Donanım': 'Hardware', 'Şebeke bağlantısı': 'Grid connection',
    'Saha işleri dış fon kredisi': 'Site works external-fund loan', 'Diğer': 'Other',
    'Keşif mühendisi': 'Survey engineer', 'İşletme sahibi': 'Operator', 'Saha sahibi': 'Site owner',
    'Keşif mühendisi, ad': 'Survey engineer, name', 'İşletme sahibi, ad': 'Operator, name', 'Yerel ortak, ad': 'Local partner, name', 'Saha sahibi, ad': 'Site owner, name',
    'AMG saha keşif formu, bölüm 1–2': 'AMG site survey form, sections 1–2',

    /* saha tipleri */
    'Otel': 'Hotel', 'Hastane': 'Hospital', 'AVM': 'Mall', 'Ofis': 'Office', 'Sanayi Sitesi': 'Industrial Zone', 'Konut': 'Residential', 'Ticari Merkez': 'Commercial Center',
    'Araç Muayene İstasyonu': 'Vehicle Inspection Station', 'Otopark': 'Car Park', 'Lise': 'High School', 'Üniversite': 'University', 'Spor Salonu ve Restoran': 'Gym & Restaurant',
    'Akaryakıt İstasyonu': 'Fuel Station', 'Lojistik Merkezi': 'Logistics Center',

    /* kontrol listesi seçenekleri */
    'EV şarj': 'EV charging', 'Ana yoldan görünür': 'Visible from main road', 'Kolay giriş': 'Easy entry', 'Kısıtlı giriş': 'Restricted entry',
    'Beton': 'Concrete', 'Asfalt': 'Asphalt', 'Kilitli taş': 'Interlocking paving', 'Toprak / yeşil alan': 'Soil / green area', 'Çatı / kanopi': 'Roof / canopy',
    'Kanal (hendek)': 'Trench', 'Kablo tavası': 'Cable tray', 'Boru': 'Conduit', 'Duvar': 'Wall', 'Yol geçişi': 'Road crossing',
    'Otopark kanopisi': 'Car park canopy', 'Çatı': 'Roof', 'Mevcut yapıya ek': 'Add-on to existing structure', 'Aydınlatma': 'Lighting', 'Yangın ekipmanı': 'Fire equipment',
    'Güvenlik personeli': 'Security staff', 'Mevcut güvenlik': 'Existing security', 'Mevcut, ekte': 'Available, attached', 'Mevcut değil': 'Not available', 'Uygulanamaz': 'Not applicable',
    'Uygun': 'Suitable', 'Riskli': 'Risky',

    /* skor kriterleri */
    'Konum, trafik ve talep': 'Location, Traffic & Demand', 'Rekabet ve fiyat alanı': 'Competition & Price Room', 'Mülkiyet / yetki': 'Property / Authorization',
    'Ticari koşullar': 'Commercial Terms', 'Güç uygunluğu': 'Power Availability', 'İnşaat yapılabilirliği': 'Construction Feasibility',
    'PV/BESS ölçeklenebilirliği': 'PV/BESS Scalability', 'İşletme kontrolü': 'Operation Control', 'İzinler': 'Permits', 'EPDK uygunluğu': 'EPDK Compliance',
    'Ana yol erişimi, görünürlük, giriş güzergâhı, müşteri bekleme süresi ve tekrar eden talep senaryosu.': 'Main-road access, visibility, entry route, customer dwell time and repeat-demand scenario.',
    'Yakındaki şarj yoğunluğu, güç seviyesi, park ücreti, hizmet ücreti ve fiyat rekabeti.': 'Nearby charging density, power level, parking fee, service fee and price competition.',
    'Net malik veya hak sahibi, saha sınırı, kira ya da yetkilendirme yapılabilirliği.': 'Clear owner or rights holder, site boundary, lease or authorization feasibility.',
    'Gelir paylaşımı, sabit kira, kirasız dönem, işbirliği süresi ve işletme sorumluluğu.': 'Revenue share, fixed rent, rent-free period, cooperation term and operating responsibility.',
    'Mevcut trafo kapasitesi, AG bağlantı noktası, kesici, sayaç ve yükseltme yükü.': 'Existing transformer capacity, LV connection point, breaker, meter and upgrade burden.',
    'Mesafe, kablo güzergâhı, zemin onarımı, temel, çalışma saati kısıtları ve güvenlik.': 'Distance, cable route, surface repair, foundations, working-hour restrictions and safety.',
    'PV alanı, BESS yeri, şebekeye verme / öz tüketim mantığı ve faz genişlemesi.': 'PV area, BESS location, grid export / self-consumption logic and phase expansion.',
    'Benzinli araç işgalinin önlenmesi, bariyer/kilit, aydınlatma, CCTV, olanaklar ve saha yönetimi.': 'Preventing ICE vehicle blocking, barrier/lock, lighting, CCTV, amenities and site management.',
    'Belediye, bina yönetimi ve imar açısından engel yok': 'No obstacle from municipality, building management or zoning',
    'Şarj hizmeti lisansı ve ağ kaydı açısından uygun': 'Compliant for charging service license and network registration',
    'Her kriteri 0 ile ağırlığı arasında puanlayın': 'Score each criterion between 0 and its weight',
    '85 ve üzeri: ilerlet': '85 and above: advance', '75–84: eksikleri gider': '75–84: resolve gaps', '75 altı: öncelik dışı': 'Below 75: deprioritize',
    'İlerlet': 'Advance', 'Eksikleri Gider': 'Resolve Gaps', 'Öncelik Dışı': 'Deprioritize',
    'Saha ve park yeri fotoğrafları': 'Site and parking photos', 'Trafo / AG pano fotoğrafları': 'Transformer / LV panel photos', 'Kablo güzergâhı / zemin fotoğrafları': 'Cable route / ground photos',
    'Rakip araştırması ekran görüntüleri veya notları': 'Competitor research screenshots or notes', 'Elektrik faturaları / tarife belgeleri': 'Electricity bills / tariff documents',
    'Mülkiyet / kira / yetki belgeleri': 'Ownership / lease / authorization documents', 'PV/BESS yapısal, yangın veya şebeke belgeleri': 'PV/BESS structural, fire or grid documents',
    'Ek Türü': 'Attachment Type',
    'Skorlama, AMG / StarCharge saha keşif ve yeterlilik formundaki 8 kriteri ve ağırlıkları birebir kullanır: konum 15, rekabet 10, mülkiyet 12, ticari koşullar 12, güç 14, inşaat 12, PV/BESS 10, işletme kontrolü 15; toplam 100. Her kriter 0 ile ağırlığı arasında puanlanır. Karar kılavuzu (Excel takip dosyasıyla aynı): 85 ve üzeri ilerlet, 75–84 eksikleri gider, 75 altı öncelik dışı. Karar yalnızca 8 kriterin tamamı puanlanınca gösterilir. İzinler ve EPDK ayrıca işaretlenir; “Uygun değil” olanlar engel olarak görünür. Durum alanını (Aday → Kredilendirilebilir) siz belirlersiniz.':
      'Scoring uses the 8 criteria and weights from the AMG / StarCharge site survey and qualification form exactly: location 15, competition 10, property 12, commercial terms 12, power 14, construction 12, PV/BESS 10, operation control 15; total 100. Each criterion is scored between 0 and its weight. Decision guide (same as the Excel tracker): 85 and above advance, 75–84 resolve gaps, below 75 deprioritize. The decision is shown only when all 8 criteria are scored. Permits and EPDK are marked separately; items marked “Not suitable” appear as blockers. You set the Status field yourself.',

    /* finansman */
    'Finansman Yapısı': 'Financing Structure', 'Finansman yapısı': 'Financing structure', 'Finansman Özeti': 'Financing Summary', 'Toplam Finansman': 'Total Financing',
    'Gelir Modeli': 'Revenue Model', 'Fiyatlar': 'Prices', 'Fiyat Artışları ve İşletme Gideri': 'Price Increases & Operating Cost', 'Paylaşım': 'Revenue Sharing',
    'Taraflara Göre Getiri': 'Returns by Party', 'Taraflara göre kümülatif nakit': 'Cumulative cash by party', 'Kümülatif Nakit': 'Cumulative Cash',
    'Detaylı Sonuçlar': 'Detailed Results', 'Detaylı Sonuçlar ve Notlar': 'Detailed Results & Notes', 'Özet': 'Summary', 'Yıllık Sonuçlar': 'Annual Results',
    'Geri Dönüş': 'Payback', 'Geri dönüş': 'Payback', 'Geri Ödeyen': 'Repaying Party', 'Geri ödeyen': 'Repaying party', 'Finansör': 'Financier', 'Kalem': 'Item',
    'Tutar TL': 'Amount TL', 'Tutar girilmedi': 'No amount entered', 'Vade Yıl': 'Term (Years)', 'Vade yıl': 'Term (years)', 'Faiz %': 'Interest %', 'Faiz yüzde': 'Interest percent',
    'Yıllık Taksit': 'Annual Installment', 'Yıllık Taksit TL': 'Annual Installment TL', 'En Düşük DSCR': 'Lowest DSCR', 'Kredi': 'Loan', 'Gelir payı ile': 'Via revenue share',
    'Kredi kalemi yok': 'No loan items', 'Finansman kalemi yok. Hazır yapılardan birini seçin veya kalem ekleyin.': 'No financing items. Pick a preset structure or add an item.',
    'Finansman tanımsız': 'Financing undefined', 'Hazır yapı:': 'Preset structure:', 'Tüm lokasyonlara aktar:': 'Apply to all locations:',
    'Tamamı StarCharge (AMG)': 'All StarCharge (AMG)', 'Tamamı StarCharge': 'All StarCharge', 'Donanım StarCharge, saha işleri Co-CPO': 'Hardware StarCharge, site works Co-CPO',
    'Finansman yapısı uygulandı; tutarları kontrol edin.': 'Financing structure applied; check the amounts.',
    'Finansman tutarları girilmedi; taraf getirileri hesaplanamıyor.': 'No financing amounts entered; party returns cannot be calculated.',
    'Henüz pay veya finansman girilmedi.': 'No share or financing entered yet.',
    'Satış fiyatı (TL/kWh)': 'Sale price (TL/kWh)', 'Elektrik tarifesi (TL/kWh)': 'Electricity tariff (TL/kWh)', 'Elektrik maliyeti (TL/kWh)': 'Electricity cost (TL/kWh)',
    'Satış fiyatı yıllık artışı (%)': 'Sale price annual increase (%)', 'Elektrik maliyeti yıllık artışı (%)': 'Electricity cost annual increase (%)',
    'İlk yıl işletme gideri (TL)': 'First-year operating cost (TL)', 'İşletme gideri yıllık artışı (%)': 'Operating cost annual increase (%)',
    'İlk yıl kapasite kullanımı (%)': 'First-year capacity utilization (%)', 'Yıllık kullanım artışı (puan)': 'Annual utilization increase (points)',
    'Yer sağlayıcı payı (%)': 'Landowner share (%)', 'Co-CPO payı (%)': 'Co-CPO share (%)', 'StarCharge payı (%)': 'StarCharge share (%)', 'EKONİX payı (%)': 'EKONİX share (%)',
    'Diğer fon payı (%)': 'Other fund share (%)', 'Diğer fonun adı': 'Other fund name', 'ör. yerli banka, yatırım fonu': 'e.g. local bank, investment fund',
    'Co-CPO ödeme komisyonu (hasılatın %)': 'Co-CPO payment commission (% of revenue)', 'Diğer Fon': 'Other Fund', 'Co-CPO': 'Co-CPO',
    'Elektrik sonrası taban': 'Post-electricity base', 'Elektrik Sonrası TL': 'Post-Electricity TL', 'Hasılat TL': 'Revenue TL', 'İlk Yıl Hasılat': 'First-Year Revenue',
    'İlk Yıl Enerji': 'First-Year Energy', 'Enerji kWh': 'Energy kWh', 'Komisyon TL': 'Commission TL', 'İşletme Gideri TL': 'Operating Cost TL', 'Dağıtılmayan TL': 'Undistributed TL',
    'Yer Sağlayıcı TL': 'Landowner TL', 'Co-CPO Payı TL': 'Co-CPO Share TL', 'StarCharge TL': 'StarCharge TL', 'EKONİX TL': 'EKONİX TL', 'Diğer Fon TL': 'Other Fund TL',
    'Başlangıç': 'Start', 'Yıl': 'Year', 'Toplam (yıl)': 'Total (years)', 'Elektrik sonrası 0 TL': 'Post-electricity 0 TL', '0 kWh': '0 kWh',
    'Tutarlar TL. Paylar elektrik sonrası taban üzerinden; komisyon ve işletme gideri Co-CPO payından düşülür.': 'Amounts in TL. Shares are taken from the post-electricity base; commission and operating cost are deducted from the Co-CPO share.',
    'Komisyon ve işletme gideri Co-CPO payından düşülür. Varsayılan fiyatlar örnektir, tarife teklifi değildir.': 'Commission and operating cost are deducted from the Co-CPO share. Default prices are examples, not a tariff offer.',
    'Paylaşım tabanı = hasılat − elektrik maliyeti. Yer sağlayıcı, Co-CPO, StarCharge, EKONİX ve diğer fon oranları aynı tabana uygulanır. Komisyon toplam hasılattan hesaplanır; komisyon ve işletme gideri yalnız Co-CPO payından düşülür.':
      'Sharing base = revenue − electricity cost. Landowner, Co-CPO, StarCharge, EKONİX and other fund percentages apply to the same base. Commission is calculated on total revenue; commission and operating cost are deducted from the Co-CPO share only.',
    'Enerji = lokasyondaki tüm ünitelerin toplam gücü (ünite kW × adet) × 8.760 saat × kapasite kullanımı. Soket sayısı enerjiyi çarpmaz. DC ve AC için ortak kullanım oranı uygulanır; kullanım her yıl girilen puan kadar artar ve %0–100 ile sınırlanır. Satış ve elektrik fiyatı artışları ayrı ayrı bileşik uygulanır.':
      'Energy = total power of all units at the location (unit kW × quantity) × 8,760 hours × capacity utilization. The number of sockets does not multiply energy. One shared utilization rate applies to DC and AC; utilization rises each year by the entered points and is capped at 0–100%. Sale and electricity price increases are compounded separately.',
    'Finansman kalem kalem girilir (donanım, saha işleri, şebeke bağlantısı). “Gelir payı ile” kalemlerde finansör yatırımını kendi gelir payından geri alır. “Kredi” kalemlerinde geri ödeyen taraf eşit taksit (anüite) öder; taksit onun nakdinden düşülür, finansörün nakdine eklenir. DSCR = geri ödeyen tarafın kredi öncesi yıllık nakdi / o yılki taksitleri. İç verim ve geri dönüş süresi her tarafın kendi nakit akışından, iskontosuz ve 7 yıl ile sınırlı hesaplanır. Vergi, finansman, amortisman ve enerji kayıpları hesaba girmez; sonuçlar gelir garantisi değildir.':
      'Financing is entered item by item (hardware, site works, grid connection). For “via revenue share” items, the financier recovers its investment from its own revenue share. For “loan” items, the repaying party pays equal installments (annuity); the installment is deducted from its cash and added to the financier’s cash. DSCR = the repaying party’s pre-loan annual cash / that year’s installments. IRR and payback are calculated from each party’s own cash flow, undiscounted and limited to 7 years. Taxes, financing costs, depreciation and energy losses are not included; results are not a revenue guarantee.',
    'Gelir payı ile: finansör yatırımını kendi gelir payından geri alır. Kredi: geri ödeyen taraf eşit yıllık taksit öder; taksit onun nakdinden düşülür ve finansöre gider.':
      'Via revenue share: the financier recovers its investment from its own revenue share. Loan: the repaying party pays equal annual installments; the installment is deducted from its cash and goes to the financier.',

    /* kullanıcı yönetimi / giriş */
    'Kayıtlı Kullanıcılar': 'Registered Users', 'Yeni Kullanıcı Ekle': 'Add New User', '+ Yeni Kullanıcı Ekle': '+ Add New User', 'Kullanıcıyı Ekle': 'Add User', 'E-posta': 'E-mail',
    'Rol': 'Role', 'Yönetici': 'Administrator', 'Kullanıcı': 'User', 'Son Giriş': 'Last Login', 'Şifre Değişti': 'Password Changed', 'Rol ve İşlemler': 'Role & Actions',
    'Aktifleştir': 'Activate', 'Pasifleştir': 'Deactivate', 'Şifre belirle': 'Set password', 'Şifre (en az 8)': 'Password (min. 8)', 'Şifre': 'Password',
    'Bu hesabın rolü değiştirilemez': 'This account’s role cannot be changed',
    'Hesabı yönetici açar; kendi kendine kayıt yok': 'Accounts are created by an administrator; no self-registration',
    'Yönetici: kullanıcıları yönetebilir. Kullanıcı: sadece saha verisiyle çalışır. Şifre yalnızca burada görünür, kaydedilmiş hâli geri okunamaz; kullanıcıya ilettikten sonra değiştirmesini isteyin.':
      'Administrator: can manage users. User: works only with site data. The password is shown only here and the saved version cannot be read back; ask the user to change it after you pass it on.',
    'Ad güncellendi.': 'Name updated.', 'Rol güncellendi.': 'Role updated.', 'Hesap aktifleştirildi.': 'Account activated.', 'Hesap pasifleştirildi.': 'Account deactivated.',
    'Kullanıcı eklendi: ': 'User added: ', 'E-posta ve şifre gerekli.': 'E-mail and password are required.', 'Şifreyi göster': 'Show password', 'Şifreyi gizle': 'Hide password',
    'Çıkış yapıldı.': 'Logged out.', 'Giriş yap': 'Log in', 'Giriş yapılıyor…': 'Logging in…', 'Giriş yapılamadı. Lütfen tekrar deneyin.': 'Could not log in. Please try again.',
    'Hesabınıza erişmek için e-posta ve şifrenizi girin.': 'Enter your e-mail and password to access your account.',
    'Giriş · Saha Değerlendirme Portalı': 'Log In · Site Assessment Portal', 'Oturum gerekli': 'Login required',
    'Bu işlem için yönetici yetkisi gerekli': 'Administrator permission is required for this action',

    /* işlem geçmişi */
    'Zaman': 'Time', 'İşlem': 'Action', 'Özet ': 'Summary ', 'Tür': 'Type', 'Kayıt yok.': 'No records.',
    'Kim, ne zaman, neyi değiştirdi': 'Who changed what, and when', 'İşlem Detayı': 'Action Details', 'Alan': 'Field', 'Oturum': 'Session',
    'Oluşturuldu': 'Created', 'Güncellendi ': 'Updated ', 'Silindi': 'Deleted', 'Giriş': 'Login', 'Çıkış': 'Logout', 'Başarısız Giriş': 'Failed Login',
    'Not Eklendi': 'Note Added', 'Not Silindi': 'Note Deleted', 'Giriş yapıldı': 'Logged in',
    'Günlük sunucuda tutulur; kayıtlar arayüzden silinemez veya düzenlenemez.': 'The log is kept on the server; records cannot be deleted or edited from the interface.',
    ' Bu sayfada lokasyon işlemleri görünür.': ' Only location actions are visible on this page.',
    'Bu sayfada lokasyon işlemleri görünür.': 'Only location actions are visible on this page.',

    /* katalog */
    'StarCharge Ürün Kataloğu': 'StarCharge Product Catalog',
    'Satıra "Ekle" diyerek ünite listesine direkt ekleyin; marka/model, tip, güç ve soket sayısı otomatik dolar.': 'Click “Add” on a row to add it straight to the unit list; brand/model, type, power and socket count fill in automatically.',
    'Kaynak: starcharge.com ürün sayfaları. Güç yazmayan dispenser modellerinde (Hydrus, Aries, Triton) güç, bağlı güç kabinine göre belirlenir; kW elle girilir.':
      'Source: starcharge.com product pages. For dispenser models with no stated power (Hydrus, Aries, Triton), power depends on the connected power cabinet; enter kW by hand.',
    'Eşleşen ürün yok.': 'No matching products.', 'Tek gövde': 'Single body', 'Tek gövde (duvar/ayaklı)': 'Single body (wall/floor)', 'AC çift soketli': 'AC dual socket',
    'AC şarj ünitesi': 'AC charging unit', 'Güç kabini': 'Power cabinet', 'Güç kabini (ayrık tip)': 'Power cabinet (split type)', 'Sıvı soğutmalı güç kabini': 'Liquid-cooled power cabinet',
    'Dispenser (ayrık tip)': 'Dispenser (split type)', 'Dispenser (güç kabinine bağlı)': 'Dispenser (connected to power cabinet)', 'Dispenser (otobüs depoları için)': 'Dispenser (for bus depots)',
    'Dispenser (sıvı soğutmalı)': 'Dispenser (liquid-cooled)', 'Dispenser bağlantılı': 'Dispenser-connected', 'Halo (V2G çift yönlü)': 'Halo (V2G bidirectional)',
    'Çift yönlü DC wallbox (V2G)': 'Bidirectional DC wallbox (V2G)', 'Güç kabinine göre': 'Depends on power cabinet', 'ürün sayfası': 'product page',
    '12 çıkış portuna kadar': 'Up to 12 output ports', '1 × Tip 2': '1 × Type 2', '2 × Tip 2 (2 × 22 kW)': '2 × Type 2 (2 × 22 kW)', 'CCS2 + CCS2 (eş zamanlı)': 'CCS2 + CCS2 (simultaneous)',
    'Ekle ': 'Add ',


    /* sunucu hata mesajları */
    'Bildirimler için veritabanı gerekli': 'A database is required for notifications', 'Bildirimler okunamadı': 'Could not load notifications',
    'Çok fazla deneme. 15 dakika sonra tekrar deneyin.': 'Too many attempts. Try again in 15 minutes.', 'E-posta ve şifre gerekli': 'E-mail and password are required',
    'E-posta veya şifre hatalı': 'Incorrect e-mail or password', 'Geçersiz istek kaynağı': 'Invalid request origin', 'Geçersiz lokasyon': 'Invalid location',
    'Giriş yapılamadı': 'Could not log in', 'İşlem geçmişi için veritabanı gerekli': 'A database is required for the activity log', 'İşlem geçmişi okunamadı': 'Could not load the activity log',
    'Kimlik doğrulama yapılandırılmamış': 'Authentication is not configured', 'Kişiler okunamadı': 'Could not load people', 'Lokasyon bulunamadı': 'Location not found',
    'Not 1–2000 karakter olmalı': 'Note must be 1–2000 characters', 'Not bulunamadı': 'Note not found', 'Notlar için veritabanı gerekli': 'A database is required for notes',
    'Notlar işlenemedi': 'Could not process notes', 'Notu yalnızca yazan kişi veya yönetici silebilir': 'Only the author or an administrator can delete a note',
    'Oturum doğrulanamadı': 'Session could not be verified', 'Oturum yok': 'No session', 'Silme için yönetici yetkisi gerekli': 'Administrator permission is required to delete',
    'Veritabanı gerekli': 'A database is required', 'Yöntem desteklenmiyor': 'Method not supported',
    'Kimlik doğrulama henüz yapılandırılmamış. Yöneticinizle iletişime geçin.': 'Authentication is not configured yet. Contact your administrator.',
    'Silinsin mi?': 'Delete?', 'Bu geri alınamaz.': 'This cannot be undone.',
    /* diyaloglar */
    ' hesabı silinsin mi? Bu geri alınamaz.': ' account will be deleted. This cannot be undone.',
    'Bu şifre bir daha gösterilmez; kopyalayın.': 'This password will not be shown again; copy it.',

    /* contact rehberi */
    'Contact': 'Contacts', 'Kişiler': 'Contacts', 'Kişiler rehberi için sunucu bağlantısı gerekli.': 'A server connection is required for the contacts directory.', 'Listede yoksa Kişiler sayfasından ekleyin.': 'If not listed, add it on the Contacts page.', 'Kişiler için veritabanı gerekli': 'A database is required for Contacts', 'Kişiler işlenemedi': 'Could not process Contacts', 'Şirket': 'Company', 'Ad': 'First Name', 'Soyad': 'Last Name', 'Unvan': 'Job Title', 'Ad Soyad': 'Full Name', 'Kişi': 'Contact',
    'Şirket, kişi ve telefon rehberi': 'Company, people and phone directory', 'Şirket, kişi veya telefon…': 'Company, person or phone…',
    'Şirkete Göre Grupla': 'Group by Company', '+ Yeni Kişi': '+ New Contact', 'Şirket Belirtilmemiş': 'No Company', '+ Kişi Ekle': '+ Add Contact',
    'Kişiyi sil': 'Delete contact', 'Kişi silindi.': 'Contact deleted.', 'Eşleşen kişi yok.': 'No matching contacts.',
    'Henüz kişi yok. “Yeni Kişi” ile ekleyin.': 'No contacts yet. Add one with “New Contact”.',
    'Contact rehberi için sunucu bağlantısı gerekli.': 'A server connection is required for the contact directory.',
    'Hücreye tıklayıp yazın; değişiklikler kendiliğinden kaydedilir. Bu kişiler lokasyon girişinde “Kişilerden Seç” ile kullanılabilir.': 'Click a cell and type; changes are saved automatically. These contacts can be used when entering a location via “Pick from Contacts”.',
    'Kişilerden Seç': 'Pick from Contacts', 'Satıra tıklayın; ad, telefon ve şirket lokasyona işlenir.': 'Click a row; the name, phone and company are filled into the location.',
    'Listede yoksa Contact sayfasından ekleyin.': 'If not listed, add it on the Contact page.', 'Kaydedildi': 'Saved', 'Kaydedilemedi': 'Could not save',
    'Contact için veritabanı gerekli': 'A database is required for Contacts', 'Contact işlenemedi': 'Could not process Contacts', 'Kişi bulunamadı': 'Contact not found',
    'Kişiyi yalnızca ekleyen veya yönetici silebilir': 'Only the person who added the contact or an administrator can delete it',
    'Contact silindi': 'Contact deleted',

    /* enlem/boylam, kayıt tarihi, bağlantı şekli, dağıtım kabini, gelir paylaşım oranı */
    'Enlem': 'Latitude', 'Boylam': 'Longitude', 'Kayıt tarihi': 'Record date', 'Kayıt Tarihi': 'Record Date',
    'Bağlantı şekli': 'Connection type', 'Dağıtım Kabini': 'Distribution Cabinet', '+ Dağıtım Kabini': '+ Distribution Cabinet',
    'ör. dağıtım kabini modeli': 'e.g. distribution cabinet model',
    'Gelir Paylaşım Oranı %': 'Revenue Share Rate %',
    'Finansör yatırımını kendi gelir payından geri alır. Gelir Paylaşım Oranı, Gelir Modeli sekmesindeki Paylaşım bölümünden gelir; burada değiştirilmez.': 'The financier recovers its investment from its own revenue share. The Revenue Share Rate comes from the Revenue Sharing section on the Revenue Model tab and cannot be changed here.',
    'Finansman kalem kalem girilir (donanım, saha işleri, şebeke bağlantısı). Finansör yatırımını kendi gelir payından geri alır; Gelir Paylaşım Oranı, Paylaşım bölümündeki finansör payıdır. İç verim ve geri dönüş süresi her tarafın kendi nakit akışından, iskontosuz ve 7 yıl ile sınırlı hesaplanır. Vergi, finansman, amortisman ve enerji kayıpları hesaba girmez; sonuçlar gelir garantisi değildir.': 'Financing is entered item by item (hardware, site works, grid connection). The financier recovers its investment from its own revenue share; the Revenue Share Rate is the financier’s share in the Revenue Sharing section. IRR and payback are calculated from each party’s own cash flow, undiscounted and limited to 7 years. Taxes, financing costs, depreciation and energy losses are not included; results are not a revenue guarantee.',
    'Nakit girişi: gelir payı (Co-CPO için komisyon ve işletme gideri düşülmüş). İç verim yalnız 7 yıllık nakde dayanır; ekipmanın kalan değeri ve sözleşme sonrası gelir dahil değildir.': 'Cash inflow: revenue share (commission and operating cost deducted for Co-CPO). IRR is based only on 7-year cash; residual equipment value and post-contract revenue are not included.',
    'İletişim kişisi *': 'Contact person *', 'Telefon *': 'Phone *', 'İletişim kişisi zorunlu.': 'Contact person is required.',
    'Telefon numarasını +90 (5xx) xxx xx xx biçiminde eksiksiz girin.': 'Enter the full phone number as +90 (5xx) xxx xx xx.',
    /* yazdırma / diğer */
    'Lokasyon Raporu': 'Location Report', 'Girilmesi gereken bölümler': 'Sections to complete',
    'Pay toplamı %100\'ü aşan lokasyonlar toplama dahil edilmedi': 'Locations whose share total exceeds 100% were excluded from the sum'
  };

  /* ---------- Desenler (sayı/ad içeren metinler) ---------- */
  var tr; // aşağıda tanımlı
  function sub(s) { return tr(String(s).trim()); }
  var P = [
    [/^(.+) hesabı silinsin mi\? Bu geri alınamaz\.$/, function (m) { return 'Delete the account ' + m[1] + '? This cannot be undone.'; }],
    [/^(\d+) kişi$/, function (m) { return m[1] + (m[1] === '1' ? ' person' : ' people'); }],
    [/^Kişi eklendi(?:: (.+))?$/, function (m) { return 'Contact added' + (m[1] ? ': ' + m[1] : ''); }],
    [/^Kişi silindi(?:: (.+))?$/, function (m) { return 'Contact deleted' + (m[1] ? ': ' + m[1] : ''); }],
    [/^Contact eklendi(?:: (.+))?$/, function (m) { return 'Contact added' + (m[1] ? ': ' + m[1] : ''); }],
    [/^Contact silindi(?:: (.+))?$/, function (m) { return 'Contact deleted' + (m[1] ? ': ' + m[1] : ''); }],
    [/^Kaydedildi · (.+)$/, function (m) { return 'Saved · ' + m[1]; }],
    [/^(.+) silinsin mi\? Bu işlem herkes için geçerli olur ve geri alınamaz\.$/, function (m) { return 'Delete ' + m[1] + '? This applies to everyone and cannot be undone.'; }],
    [/^Hatalı giriş: (.*)$/, function (m) { return 'Invalid entry: ' + m[1]; }],
    [/^Tamamı StarCharge, toplam (.+)$/, function (m) { return 'All StarCharge, total ' + m[1]; }],
    [/^(\d+)\. Yıl$/, function (m) { return 'Year ' + m[1]; }],
    [/^(\d+) Yıl (.+)$/, function (m) { return m[1] + '-Year ' + sub(m[2]); }],
    [/^(\d+) yıl toplam$/, function (m) { return m[1] + '-year total'; }],
    [/^(\d+) yıl, nominal TL; enerji yukarıdaki ünitelerden hesaplanır$/, function (m) { return m[1] + ' years, nominal TL; energy is calculated from the units above'; }],
    [/^(\d+) yıl, nominal TL$/, function (m) { return m[1] + ' years, nominal TL'; }],
    [/^(\d+) lokasyon, (\d+) yıl, nominal TL$/, function (m) { return m[1] + (m[1] === '1' ? ' location, ' : ' locations, ') + m[2] + ' years, nominal TL'; }],
    [/^(\d+) \/ (\d+) lokasyon$/, function (m) { return m[1] + ' / ' + m[2] + ' locations'; }],
    [/^(\d+) lokasyon$/, function (m) { return m[1] + (m[1] === '1' ? ' location' : ' locations'); }],
    [/^(\d+) hesap$/, function (m) { return m[1] + (m[1] === '1' ? ' account' : ' accounts'); }],
    [/^(\d+) kalem$/, function (m) { return m[1] + (m[1] === '1' ? ' item' : ' items'); }],
    [/^(\d+) alan$/, function (m) { return m[1] + (m[1] === '1' ? ' field' : ' fields'); }],
    [/^(\d+)\/(\d+) ek işaretlendi$/, function (m) { return m[1] + '/' + m[2] + ' attachments marked'; }],
    [/^(\d+)\/(\d+) kriter puanlandı$/, function (m) { return m[1] + '/' + m[2] + ' criteria scored'; }],
    [/^(\d+) kriter daha puanlanınca karar gösterilir$/, function (m) { return 'Decision shown after ' + m[1] + ' more criteria are scored'; }],
    [/^%([\d.,]+) kullanım$/, function (m) { return m[1] + '% utilization'; }],
    [/^(\d+) DC \((\d+) soket\) · (\d+) AC \((\d+) soket\)(?: · (\d+) Dağıtım Kabini)?$/, function (m) { return m[1] + ' DC (' + m[2] + ' sockets) · ' + m[3] + ' AC (' + m[4] + ' sockets)' + (m[5] ? ' · ' + m[5] + ' Distribution Cabinet' : ''); }],
    [/^Pay toplamı %([\d.,]+): dağıtılmayan %([\d.,-]+)$/, function (m) { return 'Share total ' + m[1] + '%: undistributed ' + m[2] + '%'; }],
    [/^Pay toplamı %([\d.,]+)$/, function (m) { return 'Share total ' + m[1] + '%'; }],
    [/^Sunucuda kayıtlı · (.+)$/, function (m) { return 'Saved on server · ' + m[1]; }],
    [/^Bu tarayıcıya kaydedildi · (.+)$/, function (m) { return 'Saved to this browser · ' + m[1]; }],
    [/^(.+) · Saha Değerlendirme$/, function (m) { return sub(m[1]) + ' · Site Assessment'; }],
    [/^(.+) · Lokasyon Raporu$/, function (m) { return sub(m[1]) + ' · Location Report'; }],
    [/^(.+) · ağırlık (\d+)$/, function (m) { return m[1] + ' · weight ' + m[2]; }],
    [/^(.+) puanı, en fazla (\d+)$/, function (m) { return sub(m[1]) + ' score, max ' + m[2]; }],
    [/^(.+) notu$/, function (m) { var x = sub(m[1]); return x !== m[1] ? x + ' note' : null; }],
    [/^(.+) durumu$/, function (m) { var x = sub(m[1]); return x !== m[1] ? x + ' status' : null; }],
    [/^(.+), ad$/, function (m) { var x = sub(m[1]); return x !== m[1] ? x + ', name' : null; }],
    [/^(\d+) yeni işlem · Bildirimler$/, function (m) { return m[1] + ' new action' + (m[1] === '1' ? '' : 's') + ' · Notifications'; }],
    [/^Kullanıcı eklendi: (.+)$/, function (m) { return 'User added: ' + m[1]; }],
    [/^(\d+) lokasyona uygulandı\.$/, function (m) { return 'Applied to ' + m[1] + ' location' + (m[1] === '1' ? '' : 's') + '.'; }],
    [/^Skor (\d+(?:,\d+)?) \(75 altı\) olduğu için durum otomatik “Uygun Değil” yapıldı\. Skor 75’e çıkarsa Aktif’e döner; Durum’u elle de değiştirebilirsiniz\.$/, function (m) { return 'Because the score is ' + m[1] + ' (below 75), the status was automatically set to “DD Failed”. If the score rises to 75 it returns to Active; you can also change Status by hand.'; }],
    [/^Skor (\d+(?:,\d+)?); 75 altı\. Sahayla devam edilip edilmeyeceği değerlendirilmeli\.$/, function (m) { return 'Score ' + m[1] + '; below 75. Decide whether to continue with this site.'; }],
    [/^Girilmesi gereken bölümler: (.+)\. Lütfen giriniz\.$/, function (m) { return 'Sections to complete: ' + m[1].split(', ').map(sub).join(', ') + '. Please fill them in.'; }],
    [/^Engel: (.+) uygun değil\.$/, function (m) { return 'Blocker: ' + m[1].split(', ').map(sub).join(', ') + ' not suitable.'; }],
    [/^Pay toplamı %100'ü aşan lokasyonlar toplama dahil edilmedi: (.+)\.$/, function (m) { return 'Locations whose share total exceeds 100% were excluded from the sum: ' + m[1] + '.'; }],
    [/^Gelir paylaşımı toplamı %100'ü aşıyor\.$/, function () { return 'Revenue share total exceeds 100%.'; }],
    [/^(.+) lokasyonları göster \(tekrar tıklayınca tümü\)$/, function (m) { return 'Show ' + sub(m[1]).toLowerCase() + ' locations (click again for all)'; }],
    [/^(.+) filtresi uygulanıyor$/, function (m) { return sub(m[1]) + ' filter applied'; }],
    [/^(.+): (.+) → (.+)$/, function (m) { return sub(m[1]) + ': ' + sub(m[2]) + ' → ' + sub(m[3]); }],
    [/^(0[1-9]|10) (.+)$/, function (m) { var x = sub(m[2]); return x !== m[2] ? m[1] + ' ' + x : null; }],
    [/^(.+?), (\d+)\. Yıl: (.+)$/, function (m) { return sub(m[1]) + ', Year ' + m[2] + ': ' + m[3]; }],
    [/^Yeni şifre \((.+)\)(.*)$/, function (m) { return 'New password (' + m[1] + ')' + m[2]; }]
  ];

  /* Etiket = değer biçimi: "Alan: eski → yeni" özetlerinde alan adları da çevrilsin */
  var FIELD = {
    'Lokasyon Adı': 'Location Name', 'İl': 'Province', 'İlçe': 'District', 'Adres': 'Address', 'Saha Tipi': 'Site Type', 'İletişim Kişisi': 'Contact Person', 'Telefon': 'Phone',
    'İlk Süre (Yıl)': 'Initial Term (Years)', 'Uzatma (Yıl)': 'Extension (Years)', 'Toplam Süre (Yıl)': 'Total Term (Years)', 'Aşama': 'Stage', 'Durum': 'Status', 'Skor': 'Score',
    'Sıradaki İş': 'Next Action', 'Engel (TR)': 'Blocker', 'Son Durum (TR)': 'Latest Status', 'Sorumlu': 'Owner', 'Yerel Ortak': 'Local Partner', 'Şarj Üniteleri': 'Charging Units',
    'Finansman Kalemleri': 'Financing Items', 'Gelir Modeli / Paylaşım': 'Revenue Model / Sharing', 'Skor Hesaplama': 'Score Calculation', 'Saha Keşfi': 'Site Survey',
    'Trafo kVA': 'Transformer kVA', 'Notlar': 'Notes'
  };
  Object.keys(FIELD).forEach(function (k) { if (!D[k]) D[k] = FIELD[k]; });
  /* sunucudaki özet değerleri */
  var V = {
    'önceki': 'previous', 'değişti': 'changed', 'güncellendi': 'updated', 'Şirket içi not eklendi': 'Internal note added', 'Lokasyon oluşturuldu': 'Location created',
    'Lokasyon silindi': 'Location deleted'
  };
  Object.keys(V).forEach(function (k) { if (!D[k]) D[k] = V[k]; });

  /* ---------- Çeviri ---------- */
  tr = function (s) {
    if (s == null) return s;
    var key = String(s);
    if (Object.prototype.hasOwnProperty.call(D, key)) return D[key];
    var t = key.trim();
    if (!t) return s;
    var lead = key.slice(0, key.indexOf(t.charAt(0))), tail = key.slice(key.lastIndexOf(t.charAt(t.length - 1)) + 1);
    if (Object.prototype.hasOwnProperty.call(D, t)) return lead + D[t] + tail;
    for (var i = 0; i < P.length; i++) {
      var m = P[i][0].exec(t);
      if (m) { var r = P[i][1](m); if (r != null && r !== t) return lead + r + tail; }
    }
    // "a; b; c" biçimindeki özetler
    if (t.indexOf('; ') > 0) {
      var parts = t.split('; '), out = parts.map(function (x) { return tr(x); });
      if (out.join('; ') !== t) return lead + out.join('; ') + tail;
    }
    return s;
  };
  I18N.t = tr;

  var ATTRS = ['placeholder', 'title', 'aria-label', 'alt', 'data-tip'];
  var SKIP = { SCRIPT: 1, STYLE: 1, TEXTAREA: 1, CODE: 1 };
  function skip(el) {
    for (; el && el.nodeType === 1; el = el.parentElement) {
      if (SKIP[el.tagName] || el.getAttribute('translate') === 'no') return true;
    }
    return false;
  }
  function doText(n) {
    var p = n.parentElement;
    if (!p || skip(p)) return;
    var v = n.nodeValue;
    if (!v || !v.trim()) return;
    var r = tr(v);
    if (r !== v) n.nodeValue = r;
  }
  function doEl(e) {
    if (e.nodeType !== 1 || e.getAttribute('translate') === 'no' || (e.parentElement && skip(e.parentElement))) return;
    for (var i = 0; i < ATTRS.length; i++) {
      var a = ATTRS[i], v = e.getAttribute(a);
      if (v) { var r = tr(v); if (r !== v) e.setAttribute(a, r); }
    }
  }
  function walk(root) {
    if (!root) return;
    if (root.nodeType === 3) { doText(root); return; }
    if (root.nodeType !== 1) return;
    doEl(root);
    var w = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, null), n;
    while ((n = w.nextNode())) { if (n.nodeType === 3) doText(n); else doEl(n); }
  }
  function titleFix() { var t = document.title; if (t) { var r = tr(t); if (r !== t) document.title = r; } }

  function start() {
    walk(document.body); titleFix();
    new MutationObserver(function (list) {
      for (var i = 0; i < list.length; i++) {
        var m = list[i];
        try {
          if (m.type === 'childList') { for (var j = 0; j < m.addedNodes.length; j++) walk(m.addedNodes[j]); }
          else if (m.type === 'characterData') doText(m.target);
          else if (m.type === 'attributes') doEl(m.target);
        } catch (e) { (window.__i18nErr = window.__i18nErr || []).push(String(e && e.message)); }
      }
      try { titleFix(); } catch (e) {}
    }).observe(document.documentElement, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
