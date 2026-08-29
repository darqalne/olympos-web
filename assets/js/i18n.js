/* =========================================================
   OLYMPOS LEATHER — i18n engine
   Client-side language switch (tr default, en, de). No page
   reload: data-i18n[-html/-placeholder/-aria-label/-title]
   attributes get re-applied in place, and an
   'olympos:langchange' event lets site.js re-paint any
   JS-rendered content (product cards, cart lines, etc.) in
   the new language.
   ========================================================= */
window.OLYMPOS_I18N = (() => {

  const LANG_KEY = 'olympos_lang_v1';
  const DEFAULT_LANG = 'tr';
  const LOCALES = { tr: 'tr-TR', en: 'en-US', de: 'de-DE' };

  /* ---------------- localized URL slugs ----------------
     Page URLs are Turkish by default (e.g. /magaza). When the site
     is switched to English, the address bar (and every internal
     link) swaps to the matching English slug (e.g. /shop) via
     vercel.json rewrites — no page reload, no separate /en/ tree.
     German keeps the Turkish slugs; only English was asked for. */
  const EN_ALIAS_OF = {
    magaza: 'shop', hakkimizda: 'about', iletisim: 'contact', sss: 'faq',
    'gizlilik-politikasi': 'privacy-policy', 'teslimat-ve-iade': 'shipping-returns',
    'mesafeli-satis-sozlesmesi': 'distance-sales-agreement', 'on-bilgilendirme-formu': 'pre-contract-information',
    giris: 'login', kayit: 'register', sepet: 'cart', odeme: 'checkout',
    hesabim: 'account', bilgilerim: 'my-info', 'siparis-takip': 'track-order', urun: 'product'
  };
  const TR_OF_EN_ALIAS = Object.fromEntries(Object.entries(EN_ALIAS_OF).map(([tr, en]) => [en, tr]));

  function canonicalSlug(path) { return TR_OF_EN_ALIAS[path] || path; }
  function localizedSlug(trSlug, lang) {
    lang = lang || getLang();
    return (lang === 'en' && EN_ALIAS_OF[trSlug]) ? EN_ALIAS_OF[trSlug] : trSlug;
  }
  // for JS-built markup (product cards, search results, redirects)
  function href(trSlug) { return localizedSlug(trSlug, getLang()); }

  // rewrites every internal <a href> in root whose path is a known
  // canonical page slug to match the current language, in place.
  function localizeStaticLinks(root) {
    const lang = getLang();
    root.querySelectorAll('a[href]').forEach(a => {
      const raw = a.getAttribute('href');
      if (!raw || raw === '/' || /^(https?:|mailto:|tel:|#)/i.test(raw)) return;
      const qIdx = raw.indexOf('?');
      const path = qIdx === -1 ? raw : raw.slice(0, qIdx);
      const query = qIdx === -1 ? '' : raw.slice(qIdx);
      const trSlug = canonicalSlug(path);
      if (!EN_ALIAS_OF[trSlug]) return;
      const newHref = localizedSlug(trSlug, lang) + query;
      if (newHref !== raw) a.setAttribute('href', newHref);
    });
  }

  // keeps the current page's own address bar in sync when the
  // language is switched in place (no reload).
  function syncCurrentUrl(lang) {
    const path = window.location.pathname.replace(/^\//, '');
    if (path === '') return; // home stays at "/" regardless of language
    const trSlug = canonicalSlug(path);
    if (!EN_ALIAS_OF[trSlug]) return; // not a localizable page (e.g. admin panel)
    const newPath = '/' + localizedSlug(trSlug, lang);
    if (newPath !== window.location.pathname) {
      history.replaceState(null, '', newPath + window.location.search);
    }
  }

  // if a page is reached directly via its English URL (a shared
  // link, a search result), show it in English from the start.
  function detectLangFromUrl() {
    const path = window.location.pathname.replace(/^\//, '');
    if (TR_OF_EN_ALIAS[path]) setLang('en');
  }

  /* ---------------- product field translations ----------------
     PRODUCTS in site.js carries the Turkish text as the base/
     source of truth. This only needs the EN/DE overrides — 'tr'
     is read straight off the product object. */
  const PRODUCT_I18N = {
    original: {
      en: {
        name: 'Original', categoryLabel: 'Cardholders', color: 'Black / Mustard Yellow',
        size: '7.5 × 10.5 cm', material: '100% cowhide', slots: '4 card slots, 1 hidden pocket',
        tagline: 'The signature cut carrying the Olympos silhouette', badge: 'Bestseller',
        description: "The collection's first piece. Cut from a single piece of vegetable-tanned cowhide; the mountain-shaped negative cut on the front reveals the mustard-yellow leather beneath. Hand-stitched, hand-painted edges."
      },
      de: {
        name: 'Original', categoryLabel: 'Kartenetuis', color: 'Schwarz / Senfgelb',
        size: '7,5 × 10,5 cm', material: '100% Rindsleder', slots: '4 Kartenfächer, 1 verstecktes Fach',
        tagline: 'Der Signatur-Schnitt im Olympos-Silhouettenstil', badge: 'Bestseller',
        description: 'Das erste Stück der Kollektion. Aus einem einzigen Stück pflanzlich gegerbtem Rindsleder geschnitten; der bergförmige Negativschnitt auf der Vorderseite gibt das senfgelbe Leder darunter frei. Handgenäht, Kanten von Hand gefärbt.'
      }
    },
    eclipse: {
      en: {
        name: 'Eclipse', categoryLabel: 'Cardholders', color: 'Black',
        size: '8 × 10 cm', material: '100% cowhide', slots: '5 card slots, coin pocket',
        tagline: 'The sharp contrast of matte and patent texture', badge: null,
        description: 'Two different faces of the same leather — matte-tanned and high-gloss patent — cross diagonally on a single body. Simple, low-profile, made for everyday carry.'
      },
      de: {
        name: 'Eclipse', categoryLabel: 'Kartenetuis', color: 'Schwarz',
        size: '8 × 10 cm', material: '100% Rindsleder', slots: '5 Kartenfächer, Münzfach',
        tagline: 'Der scharfe Kontrast von Matt und Lack', badge: null,
        description: 'Zwei verschiedene Seiten desselben Leders — matt gegerbt und hochglänzendes Lackleder — kreuzen sich diagonal auf einem Körper. Schlicht, flach, für den täglichen Gebrauch gemacht.'
      }
    },
    flare: {
      en: {
        name: 'Flare', categoryLabel: 'Cardholders', color: 'Black',
        size: '7 × 9.5 cm', material: '100% cowhide', slots: '3 card slots',
        tagline: 'Simplicity at its finest', badge: 'New',
        description: 'A minimal cardholder cut from a single piece of leather, stripped of ornament. One seam running the length of the body — understated but built to last a day-to-day carry.'
      },
      de: {
        name: 'Flare', categoryLabel: 'Kartenetuis', color: 'Schwarz',
        size: '7 × 9,5 cm', material: '100% Rindsleder', slots: '3 Kartenfächer',
        tagline: 'Schlichtheit in ihrer feinsten Form', badge: 'Neu',
        description: 'Ein minimalistisches, aus einem Stück Leder geschnittenes Kartenetui, ganz ohne Schmuck. Eine einzige Nahtlinie über die gesamte Länge — unauffällig, aber für den täglichen Gebrauch gemacht.'
      }
    },
    classy: {
      en: {
        name: 'Classy', categoryLabel: 'Wallets', color: 'Black',
        size: '9 × 11 cm (folded)', material: '100% cowhide', slots: '8 card slots, 2 hidden pockets, bill compartment',
        tagline: 'Traditional bifold cut, single piece of leather', badge: null,
        description: "The Olympos take on the familiar bifold wallet. Cut from a single piece of leather — the inside and outside come from the same hide — it shapes itself to its owner's hand and develops a patina over time."
      },
      de: {
        name: 'Classy', categoryLabel: 'Geldbörsen', color: 'Schwarz',
        size: '9 × 11 cm (gefaltet)', material: '100% Rindsleder', slots: '8 Kartenfächer, 2 versteckte Fächer, Scheinfach',
        tagline: 'Klassischer Bifold-Schnitt, aus einem Stück Leder', badge: null,
        description: 'Olymposs Interpretation der klassischen Bifold-Geldbörse. Aus einem einzigen Stück Leder geschnitten — Innen- und Außenseite stammen von derselben Haut — passt sie sich mit der Zeit der Hand ihres Besitzers an und entwickelt eine Patina.'
      }
    }
  };

  const T = {
    tr: {
      announce: { handmade: 'El Yapımı', material: '%100 Dana Derisi', tagline: 'Zamansız Kesimler' },
      nav: { home: 'Ana Sayfa', shop: 'Mağaza', about: 'Hakkımızda', contact: 'İletişim', faq: 'SSS', account: 'Hesabım', cart: 'Sepetim', track: 'Sipariş Takip' },
      header: { searchAria: 'Ara', accountAria: 'Hesabım', cartAria: 'Sepeti aç', menuOpenAria: 'Menüyü aç', menuCloseAria: 'Menüyü kapat', homeAria: 'Olympos Leather anasayfa', langAria: 'Dil seçimi' },
      search: { dialogAria: 'Ürün Ara', placeholder: 'Ürün ara…', closeAria: 'Aramayı kapat', emptyState: 'Sonuç bulunamadı.', hint: 'Yazmaya başlayın…' },
      cart: {
        title: 'Sepetiniz', closeAria: 'Sepeti kapat', emptyMsg: 'Sepetiniz şu an boş.', browseShop: 'Mağazaya Göz At',
        subtotal: 'Ara Toplam', myCart: 'Sepetim', checkout: 'Ödemeye Geç', shippingNote: 'Kargo ve vergiler ödeme sırasında hesaplanır.',
        removeAria: 'Kaldır', decreaseAria: 'Azalt', increaseAria: 'Artır', addedToast: '{name} sepete eklendi'
      },
      footer: {
        tagline: "İzmir'de, tek parça dana derisinden elde üretilen kartlık ve cüzdanlar.",
        explore: 'Keşfet', categories: 'Kategoriler', cardholders: 'Kartlık', wallets: 'Cüzdan',
        contactUs: 'Bize Ulaşın', location: 'İzmir, Türkiye', rights: 'Tüm hakları saklıdır.',
        privacy: 'Gizlilik Politikası', delivery: 'Teslimat ve İade', terms: 'Mesafeli Satış Sözleşmesi', preinfo: 'Ön Bilgilendirme Formu',
        handmade: 'Elde imal edildi', securePayment: 'Güvenli Ödeme',
        wordmarkSrc: 'assets/img/brand/payment/iyzico-ile-ode-white-horizontal.svg'
      },
      breadcrumbAria: 'Sayfa izi',
      product: {
        addToCart: 'Sepete Ekle', viewProductAria: '{name} ürününü görüntüle', imageAria: 'Görsel {n}',
        material: 'Malzeme', size: 'Ölçü', slots: 'Bölmeler', decreaseAria: 'Azalt', increaseAria: 'Artır',
        stockNote: 'Stokta — 2-4 iş günü içinde kargoya verilir.',
        detailTitle: 'Ürün Detayı', detailText: 'Kalıp elde kesilir, kenarlar elle boyanır ve cilalanır. Dikişler mumlu iplikle, saddle-stitch tekniğiyle atılır. Doğal deri olduğu için desen ve tonda hafif farklılıklar olabilir — bu bir kusur değil, deriye özgü bir imzadır.',
        careTitle: 'Bakım Önerileri', careText: 'Sudan ve doğrudan güneş ışığından koruyun. Yumuşak kuru bir bezle silin, 3-6 ayda bir renksiz deri bakım kremi uygulayın. Zamanla oluşan patina, derinin doğal olgunlaşmasıdır.',
        shippingTitle: 'Kargo & İade', shippingText: 'Siparişler 2-4 iş günü içinde kargoya teslim edilir. Kullanılmamış ürünlerde teslimattan itibaren 14 gün içinde iade hakkınız vardır.',
        relatedEyebrow: 'Birlikte İyi Gider', relatedTitle: 'Benzer Parçalar'
      },
      home: {
        heroBadge: 'El İşçiliği Deri Atölyesi', heroTitleHtml: 'DERİNİN<br>EN ÖZEL<br>HALİ',
        heroSubtitle: "Tek parça dana derisinden, elde dikilen kartlıklar ve cüzdanlar — Olympos'un zirvesinden ilham alan kesimlerle.",
        cta1: 'Koleksiyonu Keşfet', cta2: 'Hikayemiz', videoBadge: 'El Yapımı — Tanıtım',
        trustHandstitch: 'Elde Dikim & Kesim', trustMadeIn: 'Türkiye\'de Üretim', trustGift: 'Özenli Hediye Paketi',
        featuredEyebrow: 'Koleksiyon', featuredTitle: 'Öne Çıkan Parçalar', allProducts: 'Tüm Ürünler',
        craftEyebrow: 'Atölyeden', craftTitleHtml: 'Her dikiş,<br>elle atılır.',
        craftText: "Kalıp kesiminden kenar boyamaya, mumlu iplikle atılan saddle stitch dikişe kadar her adım İzmir'deki atölyemizde, tek tek elden geçer.",
        craftCta: 'Hikayemizi Okuyun', moodHandle: '@olymposleather', moodContact: 'Bize Ulaşın',
        newsletterEyebrow: 'Bültenimize Katılın', newsletterTitle: 'Yeni koleksiyonlardan ilk siz haberdar olun',
        newsletterPlaceholder: 'E-posta adresiniz', newsletterSubmit: 'Abone Ol', newsletterToast: 'Abone oldunuz — teşekkürler.',
        taglineQuote: '"Her parça, bir deri postundan doğar — iki eş yoktur."', taglineCta: 'Atölyeyi Tanıyın'
      },
      shop: {
        eyebrow: 'Tüm Ürünler', title: 'Mağaza',
        subtitle: 'Her parça tek bir deri postundan kesilir, elde dikilir ve elde kenar boyanır. Doğal deri olduğu için desende hafif renk farkları görülebilir.',
        filterAll: 'Tümü', filterKartlik: 'Kartlık', filterCuzdan: 'Cüzdan', filterGroupAria: 'Kategori filtrele',
        sortAria: 'Sırala', sortFeatured: 'Öne Çıkanlar', sortPriceAsc: 'Fiyat: Düşükten Yükseğe', sortPriceDesc: 'Fiyat: Yüksekten Düşüğe', sortName: 'İsim: A–Z',
        resultCount: '{n} ürün'
      },
      about: {
        heroTitleHtml: 'Zirveden Doğan<br>Bir Zanaat',
        heroText: 'Olympos, Antalya kıyılarındaki antik kentin adını taşır — zamana direnen taşlar gibi, zamana direnen deri işçiliği için.',
        originEyebrow: 'Başlangıç', originTitle: 'Bir isim, iki anlam taşır.',
        originP1: 'Olympos, Likya kıyısında, dağın eteğinden denize uzanan antik bir kent. Kesme taşları bugün de ayakta — ustalıkla işlenmiş her yüzey, zamana rağmen duruyor.',
        originP2: 'Biz de aynı sabrı deriye uyguluyoruz: kalıptan kesime, dikişten kenar boyamaya kadar her adım elden geçiyor. Seri üretim hızının değil, zanaatkârın elinin izini taşıyan parçalar üretiyoruz.',
        valuesEyebrow: 'Değerlerimiz', valuesTitle: 'Neye Değer Veriyoruz',
        craftTitle: 'El İşçiliği', craftText: 'Her kalıp elle kesilir, her dikiş mumlu iplikle elle atılır. Makine dikişi kullanmıyoruz.',
        leatherTitle: 'Seçilmiş Deri', leatherText: 'Yalnızca tam tane (full-grain) %100 dana derisi kullanıyoruz — dayanıklı, nefes alan, zamanla güzelleşen.',
        designTitle: 'Zamansız Tasarım', designText: 'Trend değil, sadelik. Negatif kesimlerimiz süs için değil, formun kendisi için var.',
        processQuote: '"Bir kartlık bizim elimizden kaç dakikada değil, kaç yıl taşınacağı düşünülerek çıkar."',
        cutTitle: 'Kesim', cutText: 'Her kalıp, deri postundaki en kaliteli bölgeden elle seçilir ve kesilir.',
        stitchTitle: 'Dikiş', stitchText: 'Saddle-stitch tekniğiyle, iki iğneyle karşılıklı atılan mumlu iplik dikişi.',
        edgeTitle: 'Kenar', edgeText: 'Kenarlar zımparalanır, elle boyanır ve cilalanarak pürüzsüz hale getirilir.',
        checkTitle: 'Kontrol', checkText: 'Kargoya çıkmadan önce her parça elden geçirilerek tek tek kontrol edilir.',
        ctaEyebrow: 'Koleksiyon', ctaTitle: 'Elinizde taşıyarak tanıyın', ctaButton: 'Mağazaya Git'
      },
      contact: {
        eyebrow: 'İletişim', title: 'Bize Ulaşın', subtitle: 'Sorularınız, özel sipariş talepleriniz ya da toptan işbirlikleri için buradayız.',
        emailLabel: 'E-posta', workshopLabel: 'Atölye', hoursLabel: 'Çalışma Saatleri', hoursValue: 'Pazartesi – Cumartesi, 09:00 – 18:00',
        socialLabel: 'Sosyal Medya', mapTitle: 'Olympos Leather — Google Harita',
        formName: 'Ad Soyad', formEmail: 'E-posta', formSubject: 'Konu',
        subjGeneral: 'Genel Soru', subjOrder: 'Sipariş Durumu', subjCustom: 'Özel Sipariş', subjWholesale: 'Toptan İşbirliği',
        formMessage: 'Mesajınız', formSubmit: 'Mesaj Gönder', formSending: 'Gönderiliyor…',
        formSuccessToast: 'Mesajınız alındı. En kısa sürede dönüş yapacağız.'
      },
      faq: {
        eyebrow: 'Yardım', title: 'Sıkça Sorulan Sorular', subtitle: 'Malzeme, kargo, iade ve bakım hakkında en çok sorulan sorular.',
        q1: 'Ürünleriniz hangi malzemeden ve nasıl üretiliyor?',
        a1: 'Her parça %100 dana derisinden, tek bir posttan elle kesilir. Kalıp elde kesilir, kenarlar elle boyanır ve cilalanır; dikişler mumlu iplikle, saddle-stitch tekniğiyle atılır. Doğal deri olduğu için desen ve tonda hafif farklılıklar olabilir — bu bir kusur değil, deriye özgü bir imzadır.',
        q2: 'Kargo süresi ne kadar sürer?', a2: 'Siparişler 2-4 iş günü içinde kargoya teslim edilir. Kargo ücreti ödeme adımında hesaplanır ve gösterilir.',
        q3: 'İade hakkım var mı?', a3: 'Kullanılmamış ürünlerde teslimattan itibaren 14 gün içinde iade hakkınız vardır.',
        q4: 'Deri ürünlerimin bakımını nasıl yapmalıyım?', a4: 'Sudan ve doğrudan güneş ışığından koruyun. Yumuşak kuru bir bezle silin, 3-6 ayda bir renksiz deri bakım kremi uygulayın. Zamanla oluşan patina, derinin doğal olgunlaşmasıdır.',
        q5: 'Siparişimi nasıl takip edebilirim?',
        a5Html: 'Sipariş numaranız ve siparişte kullandığınız e-posta adresiyle <a href="siparis-takip" class="underline hover:text-umber-800">Sipariş Takip</a> sayfasından anlık durumu görebilirsiniz. Hesabınıza giriş yaptıysanız geçmiş siparişlerinizi <a href="hesabim" class="underline hover:text-umber-800">Hesabım</a> sayfasında da bulabilirsiniz.'
      },
      notFound: { eyebrow: '404', title: 'Sayfa Bulunamadı', text: 'Aradığınız sayfa taşınmış, kaldırılmış olabilir ya da hiç var olmadı. Ama koleksiyonumuz yerinde duruyor.', home: 'Ana Sayfaya Dön', shop: 'Mağazaya Göz At' },
      privacy: {
        eyebrow: 'Yasal', title: 'Gizlilik Politikası', updated: 'Son güncelleme: 27 Ağustos 2026',
        s1Title: '1. Veri Sorumlusu',
        s1Html: 'Bu internet sitesi, Buca, İzmir\'de esnaf faaliyet belgesi ve esnaf vergi muafiyeti kapsamında, ticari satış izniyle faaliyet gösteren <strong>OLYMPOS Leather</strong> ("biz", "Olympos Leather") tarafından işletilmektedir. Kişisel verilerinizle ilgili sorularınız için <a href="mailto:info@olymposleather.com" class="underline hover:text-umber-800">info@olymposleather.com</a> adresinden bize ulaşabilirsiniz.',
        s2Title: '2. Hangi Verileri Topluyoruz',
        s2Text: 'Sipariş verdiğinizde veya bizimle iletişime geçtiğinizde ad-soyad, e-posta adresi, telefon numarası, teslimat adresi ve sipariş içeriği gibi bilgileri topluyoruz. Ödeme sırasında girilen kart bilgileri tarafımızca saklanmaz; ödeme, sitemizin ödeme altyapısı üzerinden güvenli şekilde işlenir.',
        s3Title: '3. Verilerinizi Neden Topluyoruz',
        s3Text: 'Topladığımız verileri; siparişinizi hazırlamak ve kargoya vermek, sizinle sipariş durumu hakkında iletişim kurmak, hesabınızı ve sipariş geçmişinizi yönetmenizi sağlamak, yasal yükümlülüklerimizi (örneğin fatura/irsaliye düzenleme) yerine getirmek amacıyla kullanırız. Verileriniz pazarlama amacıyla üçüncü taraflara satılmaz veya kiralanmaz.',
        s4Title: '4. Verilerin Paylaşımı',
        s4Text: 'Siparişinizi teslim edebilmek için ad, adres ve telefon bilginiz anlaşmalı kargo firmasıyla paylaşılır. Bunun dışında verileriniz, yasal bir zorunluluk olmadıkça üçüncü taraflarla paylaşılmaz.',
        s5Title: '5. Çerezler ve Yerel Depolama',
        s5Text: 'Sepetinizdeki ürünleri ve oturum bilginizi hatırlayabilmek için tarayıcınızın yerel depolama (localStorage) alanını kullanırız. Bu veriler yalnızca kendi cihazınızda tutulur ve tarayıcı ayarlarınızdan istediğiniz zaman temizlenebilir.',
        s6Title: '6. Veri Güvenliği',
        s6Text: 'Kişisel verilerinizi korumak için makul teknik ve idari önlemleri alırız. Buna rağmen internet üzerinden hiçbir veri iletiminin %100 güvenli olmadığını hatırlatmak isteriz.',
        s7Title: '7. Haklarınız',
        s7Html: '6698 sayılı Kişisel Verilerin Korunması Kanunu (KVKK) kapsamında; işlenen verileriniz hakkında bilgi talep etme, verilerinizin düzeltilmesini veya silinmesini isteme ve verilerinizin işlenmesine itiraz etme hakkına sahipsiniz. Bu haklarınızı kullanmak için <a href="mailto:info@olymposleather.com" class="underline hover:text-umber-800">info@olymposleather.com</a> adresinden bize yazabilirsiniz.',
        s8Title: '8. Değişiklikler',
        s8Text: 'Bu gizlilik politikası zaman zaman güncellenebilir. Güncel sürüm her zaman bu sayfada yayınlanır.'
      },
      delivery: {
        eyebrow: 'Yasal', title: 'Teslimat ve İade', updated: 'Son güncelleme: 29 Ağustos 2026',
        s1Title: '1. Teslimat Süresi',
        s1Text: 'Siparişleriniz, ödemenin onaylanmasının ardından 2-4 iş günü içinde anlaşmalı kargo firmasına teslim edilir. Yoğun dönemlerde (kampanya, bayram öncesi vb.) bu süre uzayabilir; böyle bir durumda sipariş takip sayfasından bilgilendirilirsiniz.',
        s2Title: '2. Kargo Ücreti ve Bölgeler',
        s2Text: 'Kargo ücreti, sipariş tutarı ve teslimat adresine göre ödeme adımında hesaplanır ve gösterilir. Şu an için yalnızca Türkiye sınırları içine gönderim yapılmaktadır.',
        s3Title: '3. Sipariş Takibi',
        s3Text: 'Kargoya verilen siparişler için tarafınıza takip numarası e-posta ile iletilir. Sipariş numaranız ve sipariş e-postanızla Sipariş Takip sayfasından güncel durumu görebilirsiniz.',
        s4Title: '4. Cayma Hakkı',
        s4Html: '6502 sayılı Tüketicinin Korunması Hakkında Kanun ve Mesafeli Sözleşmeler Yönetmeliği uyarınca, ürünü teslim aldığınız tarihten itibaren 14 gün içinde herhangi bir gerekçe göstermeksizin ve cezai şart ödemeksizin sözleşmeden cayma hakkınız bulunmaktadır. Detaylı şartlar için <a href="mesafeli-satis-sozlesmesi" class="underline hover:text-umber-800">Mesafeli Satış Sözleşmesi</a> sayfamızı inceleyebilirsiniz.',
        s5Title: '5. İade Şartları',
        s5Text: 'İade edilecek ürünün kullanılmamış, orijinal ambalajında ve tüm etiketleriyle birlikte eksiksiz olması gerekir. Kişiye özel olarak üretilen veya siparişe göre kesilen ürünler cayma hakkı kapsamı dışındadır.',
        s6Title: '6. İade Süreci',
        s6Text: 'İade talebinizi info@olymposleather.com adresine sipariş numaranızla birlikte iletmeniz yeterlidir. Talebiniz onaylandıktan sonra ürünü anlaşmalı kargo firmasına teslim edebilirsiniz; iade kargo bedeli ve ödeme iadesi süreci tarafınıza e-posta ile bildirilir. Onaylanan iadelerin bedeli, ürünün tarafımıza ulaşmasını takip eden 14 gün içinde ödemeyi yaptığınız yönteme iade edilir.',
        s7Title: '7. Değişim',
        s7Text: 'Farklı bir model veya renk talebiniz için önce ürünü iade sürecine dahil etmeniz, ardından tercih ettiğiniz parça için yeni bir sipariş oluşturmanız gerekir.',
        s8Title: '8. İletişim',
        s8Text: 'Teslimat ve iade süreciyle ilgili tüm sorularınız için info@olymposleather.com adresinden bize ulaşabilirsiniz.'
      },
      terms: {
        eyebrow: 'Yasal', title: 'Mesafeli Satış Sözleşmesi', updated: 'Son güncelleme: 29 Ağustos 2026',
        s1Title: '1. Taraflar',
        s1Html: 'İşbu Mesafeli Satış Sözleşmesi ("Sözleşme"), bir tarafta Buca, İzmir\'de esnaf faaliyet belgesi ve esnaf vergi muafiyeti kapsamında, ticari satış izniyle faaliyet gösteren <strong>OLYMPOS Leather</strong> ("Satıcı" — <a href="mailto:info@olymposleather.com" class="underline hover:text-umber-800">info@olymposleather.com</a> / <a href="tel:+905377876857" class="underline hover:text-umber-800">0537 787 68 57</a>) ile diğer tarafta olymposleather.com üzerinden sipariş veren müşteri ("Alıcı") arasında, aşağıdaki şartlarla akdedilmiştir.',
        s2Title: '2. Sözleşmenin Konusu',
        s2Text: 'İşbu Sözleşme\'nin konusu, Alıcı\'nın Satıcı\'ya ait internet sitesinden elektronik ortamda sipariş verdiği ürünün satışı ve teslimi ile ilgili olarak 6502 sayılı Tüketicinin Korunması Hakkında Kanun ve Mesafeli Sözleşmeler Yönetmeliği hükümleri gereğince tarafların hak ve yükümlülüklerinin belirlenmesidir.',
        s3Title: '3. Sözleşme Konusu Ürün ve Ödeme Bilgileri',
        s3Text: 'Sipariş edilen ürünün türü, adedi, satış bedeli, ödeme şekli ve teslimat adresi, siparişin verildiği anda sipariş özeti ekranında ve sipariş onay e-postasında Alıcı\'ya bildirilir; bu bilgiler işbu Sözleşme\'nin ayrılmaz bir parçasıdır. Ödeme, sitemizin iyzico altyapısı üzerinden kredi/banka kartı ile alınır.',
        s4Title: '4. Teslimat',
        s4Text: 'Ürün, Satıcı\'nın anlaşmalı olduğu kargo firması aracılığıyla, Alıcı\'nın sipariş sırasında belirttiği adrese, ödemenin onaylanmasından itibaren yasal 30 günlük süreyi aşmayacak şekilde teslim edilir. Teslimat süresince oluşabilecek gecikmeler Sipariş Takip sayfasından Alıcı\'ya bildirilir.',
        s5Title: '5. Cayma Hakkı',
        s5Text: 'Alıcı, ürünün kendisine veya gösterdiği adresteki kişiye teslim edildiği tarihten itibaren 14 (on dört) gün içinde, herhangi bir gerekçe göstermeksizin ve cezai şart ödemeksizin sözleşmeden cayma hakkına sahiptir. Cayma hakkının kullanılması için bu süre içinde info@olymposleather.com adresine yazılı bildirimde bulunulması yeterlidir. Cayma hakkının kullanılması halinde ürün Satıcı\'ya iade edilir ve tahsil edilen bedel, yasal 14 günlük süre içinde Alıcı\'ya ödemeyi yaptığı yöntemle iade edilir.',
        s6Title: '6. Cayma Hakkının Kullanılamayacağı Haller',
        s6Text: 'Mesafeli Sözleşmeler Yönetmeliği\'nin 15. maddesi uyarınca, Alıcı\'nın istekleri veya kişisel ihtiyaçları doğrultusunda özel olarak üretilen veya kişiselleştirilen ürünlerde cayma hakkı kullanılamaz.',
        s7Title: '7. Temerrüt Hali ve Hukuki Sonuçları',
        s7Text: 'Alıcı\'nın kredi/banka kartı ile yaptığı ödemelerde temerrüde düşmesi halinde, kart sahibi ile banka arasındaki kredi kartı sözleşmesi hükümleri geçerlidir. Satıcı, temerrüt halinde alacağın tahsili amacıyla yasal yollara başvurabilir.',
        s8Title: '8. Yetkili Mahkeme',
        s8Text: 'İşbu Sözleşme\'den doğabilecek uyuşmazlıklarda, Ticaret Bakanlığı\'nca ilan edilen değere kadar Alıcı\'nın veya Satıcı\'nın yerleşim yerindeki Tüketici Hakem Heyetleri; bu değerin üzerindeki uyuşmazlıklarda ise Tüketici Mahkemeleri yetkilidir.',
        s9Title: '9. Yürürlük',
        s9Text: 'Alıcı, sitemiz üzerinden verdiği siparişi onaylamakla işbu Sözleşme\'nin tüm şartlarını kabul etmiş sayılır.'
      },
      preinfo: {
        eyebrow: 'Yasal', title: 'Ön Bilgilendirme Formu', updated: 'Son güncelleme: 29 Ağustos 2026',
        s1Title: '1. Satıcı Bilgileri',
        s1Html: '<strong>OLYMPOS Leather</strong>, Buca, İzmir\'de esnaf faaliyet belgesi ve esnaf vergi muafiyeti kapsamında, ticari satış izniyle faaliyet göstermektedir. Sorularınız için <a href="mailto:info@olymposleather.com" class="underline hover:text-umber-800">info@olymposleather.com</a> adresinden veya <a href="tel:+905377876857" class="underline hover:text-umber-800">0537 787 68 57</a> numaralı telefondan bize ulaşabilirsiniz.',
        s2Title: '2. Ürün ve Fiyat Bilgisi',
        s2Text: 'Sipariş edeceğiniz ürünün temel özellikleri, adedi ve KDV dahil satış fiyatı, siparişi onaylamadan önce sipariş özeti ekranında gösterilir. Gösterilen fiyata kargo ücreti dahil değildir; kargo ücreti ödeme adımında ayrıca hesaplanır ve toplam tutara eklenir.',
        s3Title: '3. Ödeme Şekli',
        s3Text: 'Ödemeniz, kredi veya banka kartınızla iyzico\'nun güvenli ödeme altyapısı üzerinden tek seferde veya bankanızın sunduğu taksit seçenekleriyle alınır. Kart bilgileriniz tarafımızca saklanmaz.',
        s4Title: '4. Teslimat Bilgisi',
        s4Html: 'Siparişiniz, ödemenin onaylanmasının ardından 2-4 iş günü içinde anlaşmalı kargo firmasına teslim edilir. Şu an için yalnızca Türkiye sınırları içine gönderim yapılmaktadır. Detaylı bilgi için <a href="teslimat-ve-iade" class="underline hover:text-umber-800">Teslimat ve İade</a> sayfamızı inceleyebilirsiniz.',
        s5Title: '5. Cayma Hakkı',
        s5Text: '6502 sayılı Tüketicinin Korunması Hakkında Kanun uyarınca, ürünü teslim aldığınız tarihten itibaren 14 gün içinde herhangi bir gerekçe göstermeksizin ve cezai şart ödemeksizin sözleşmeden cayma hakkınız bulunmaktadır.',
        s6Title: '6. Cayma Hakkının Kullanılamayacağı Haller',
        s6Text: 'Alıcı\'nın istekleri veya kişisel ihtiyaçları doğrultusunda özel olarak üretilen veya kişiselleştirilen ürünlerde cayma hakkı kullanılamaz.',
        s7Title: '7. Şikayet ve İtirazlar',
        s7Text: 'Bu sözleşmeyle ilgili şikayet ve itirazlarınızı, Ticaret Bakanlığı\'nca ilan edilen değere kadar yerleşim yerinizdeki Tüketici Hakem Heyeti\'ne, bu değerin üzerindeki uyuşmazlıklarda ise Tüketici Mahkemesi\'ne iletebilirsiniz.',
        s8Title: '8. Bu Formun Niteliği',
        s8Html: 'İşbu Ön Bilgilendirme Formu, siparişinizi onayladığınızda akdedilecek <a href="mesafeli-satis-sozlesmesi" class="underline hover:text-umber-800">Mesafeli Satış Sözleşmesi</a>\'nin eki ve ayrılmaz bir parçasıdır.'
      },
      account: {
        eyebrow: 'Hesap', title: 'Hesabım', linkInfo: 'Bilgilerim', linkCart: 'Sepetim', linkTrack: 'Sipariş Takibi',
        welcome: 'Hoş Geldiniz', editProfile: 'Bilgilerimi Düzenle', logout: 'Çıkış Yap',
        ordersTitle: 'Siparişlerim', ordersEmpty: 'Henüz bir siparişiniz yok.', browseShop: 'Mağazaya Göz At',
        statusReceived: 'Alındı', statusPreparing: 'Hazırlanıyor', statusShipped: 'Kargoya Verildi', statusDelivered: 'Teslim Edildi',
        itemsUnit: 'ürün'
      },
      profile: {
        backToAccount: "Hesabım'a Dön", eyebrow: 'Hesap', title: 'Bilgilerim',
        subtitle: 'Ad soyad, e-posta, şifre ve teslimat adresinizi buradan güncelleyebilirsiniz.',
        personalTitle: 'Kişisel Bilgiler', nameLabel: 'Ad Soyad', emailLabel: 'E-posta', phoneLabel: 'Telefon',
        passwordTitle: 'Şifre', passwordHint: 'Şifrenizi değiştirmek istemiyorsanız bu alanı boş bırakın.',
        newPasswordLabel: 'Yeni Şifre', newPasswordPlaceholder: 'En az 6 karakter',
        addressTitle: 'Teslimat Adresi', addressLabel: 'Adres', cityLabel: 'Şehir', zipLabel: 'Posta Kodu',
        saveButton: 'Değişiklikleri Kaydet', saving: 'Kaydediliyor…', successMsg: 'Bilgileriniz güncellendi.'
      },
      cartPage: {
        backToAccount: "Hesabım'a Dön", eyebrow: 'Sepet', title: 'Sepetim', emptyMsg: 'Sepetiniz şu an boş.', browseShop: 'Mağazaya Göz At',
        summaryTitle: 'Sipariş Özeti', subtotal: 'Ara Toplam', shippingNote: 'Kargo ve vergiler ödeme sırasında hesaplanır.',
        checkout: 'Ödemeye Geç', continueShopping: 'Alışverişe Devam Et'
      },
      checkout: {
        eyebrow: 'Ödeme', title: 'Siparişi Tamamla', emptyMsg: 'Sepetiniz boş, ödeme adımına geçemezsiniz.', browseShop: 'Mağazaya Göz At',
        step1Label: 'Teslimat', step2Label: 'Ödeme',
        deliveryTitle: 'Teslimat Bilgileri', nameLabel: 'Ad Soyad', emailLabel: 'E-posta', phoneLabel: 'Telefon',
        addressLabel: 'Adres', cityLabel: 'Şehir', zipLabel: 'Posta Kodu',
        agreeTermsHtml: '<a href="on-bilgilendirme-formu" target="_blank" rel="noopener">Ön Bilgilendirme Formu</a>\'nu ve <a href="mesafeli-satis-sozlesmesi" target="_blank" rel="noopener">Mesafeli Satış Sözleşmesi</a>\'ni okudum, onaylıyorum.',
        agreeMarketing: 'Olympos Leather e-posta ve SMS gönderimleri aracılığıyla yeni koleksiyonlardan ve kampanyalardan haberdar olmak istiyorum.',
        agreeError: 'Devam etmek için Ön Bilgilendirme Formu\'nu ve Mesafeli Satış Sözleşmesi\'ni onaylamanız gerekiyor.',
        toPayment: 'Ödemeye Geç', backToDelivery: 'Teslimat bilgilerine dön',
        cardTitle: 'Kart Bilgileri', cardDisclaimer: 'Bu bir vitrin ortamıdır — gerçek bir kart ile ödeme alınmaz. Test için herhangi bir kart numarası kullanabilirsiniz.',
        secureNote: 'iyzico güvenli ödeme altyapısı ile 256-bit SSL şifrelemesi altında korunur.',
        wordmarkSrc: 'assets/img/brand/payment/iyzico-ile-ode-colored-horizontal.svg', acceptedNetworks: 'Mastercard · Visa · American Express · Troy',
        badgeOneClick: 'Tek Tıkla Hızlı Ödeme', badgeInstallment: 'Taksit Avantajı', badgePoints: 'Kart Puan Kullanımı', badgeProtected: 'Korumalı Alışveriş',
        whatIsTitle: 'iyzico ile Öde nedir?',
        whatIsText: 'iyzico ile Öde, kart bilgilerinizi iyzico\'nun güvenli altyapısında saklayarak sonraki alışverişlerinizde tek tıkla, hızlı ve güvenli ödeme yapmanızı sağlar. Kart bilgileriniz Olympos Leather ile paylaşılmaz.',
        cardNameLabel: 'Kart Üzerindeki İsim', cardNumberLabel: 'Kart Numarası', cardExpLabel: 'Son Kullanma (AA/YY)', cardCvcLabel: 'CVC',
        submit: 'Öde', processing: 'İşleniyor…',
        summaryTitle: 'Sipariş Özeti', editCart: 'Sepeti Düzenle', subtotal: 'Ara Toplam',
        successTitle: 'Siparişiniz Alındı', successOrderNumber: 'Sipariş numaranız:', successNote: 'Bu numarayı sipariş takip sayfasında kullanabilirsiniz.',
        trackOrder: 'Siparişimi Takip Et', continueShopping: 'Alışverişe Devam Et',
        genericError: 'Ödeme işlenemedi. Lütfen tekrar deneyin.'
      },
      track: {
        backToAccount: "Hesabım'a Dön", eyebrow: 'Sipariş Takip', title: 'Siparişinizi Takip Edin',
        subtitle: 'Sipariş numaranızı ve siparişte kullandığınız e-posta adresini girin.',
        numberLabel: 'Sipariş Numarası', numberPlaceholder: 'OLY-XXXXXXXX', emailLabel: 'E-posta', submit: 'Siparişi Bul',
        notFound: 'Bu bilgilerle bir sipariş bulunamadı.', itemsUnit: 'ürün',
        stepReceived: 'Sipariş Alındı', stepPreparing: 'Hazırlanıyor', stepShipped: 'Kargoya Verildi', stepDelivered: 'Teslim Edildi'
      },
      login: {
        eyebrow: 'Hesap', title: 'Giriş Yap', noAccount: 'Hesabınız yok mu?', createAccount: 'Hesap oluşturun',
        emailLabel: 'E-posta', passwordLabel: 'Şifre', submit: 'Giriş Yap', loggingIn: 'Giriş yapılıyor…',
        guestTrack: 'Hesap açmadan mı sipariş verdiniz?', trackLink: 'Sipariş takip edin'
      },
      register: {
        eyebrow: 'Hesap', title: 'Hesap Oluştur', haveAccount: 'Zaten hesabınız var mı?', loginLink: 'Giriş yapın',
        nameLabel: 'Ad Soyad', emailLabel: 'E-posta', passwordLabel: 'Şifre', password2Label: 'Şifre (Tekrar)',
        submit: 'Hesap Oluştur', creating: 'Oluşturuluyor…', passwordMismatch: 'Şifreler eşleşmiyor.'
      },
      backend: {
        missingFields: 'Tüm alanları doldurun.', weakPassword: 'Şifre en az 6 karakter olmalı.', emailExists: 'Bu e-posta ile zaten bir hesap var.',
        loginMissingFields: 'E-posta ve şifre gerekli.', invalidCredentials: 'E-posta veya şifre hatalı.', notConfigured: 'Firebase auth henüz yapılandırılmadı.',
        notAuthenticated: 'Oturum bulunamadı.', profileMissingFields: 'Ad soyad ve e-posta gerekli.', userNotFound: 'Kullanıcı bulunamadı.',
        invalidCard: 'Kart numarası geçersiz.', cardDeclined: 'Kart reddedildi.', paymentFailed: 'Ödeme başarısız. Lütfen tekrar deneyin.',
        genericError: 'Bir şeyler ters gitti.'
      }
    },

    en: {
      announce: { handmade: 'Handmade', material: '100% Cowhide', tagline: 'Timeless Cuts' },
      nav: { home: 'Home', shop: 'Shop', about: 'About', contact: 'Contact', faq: 'FAQ', account: 'Account', cart: 'Cart', track: 'Track Order' },
      header: { searchAria: 'Search', accountAria: 'Account', cartAria: 'Open cart', menuOpenAria: 'Open menu', menuCloseAria: 'Close menu', homeAria: 'Olympos Leather home', langAria: 'Language selection' },
      search: { dialogAria: 'Search Products', placeholder: 'Search products…', closeAria: 'Close search', emptyState: 'No results found.', hint: 'Start typing…' },
      cart: {
        title: 'Your Cart', closeAria: 'Close cart', emptyMsg: 'Your cart is empty right now.', browseShop: 'Browse the Shop',
        subtotal: 'Subtotal', myCart: 'My Cart', checkout: 'Checkout', shippingNote: 'Shipping and taxes are calculated at checkout.',
        removeAria: 'Remove', decreaseAria: 'Decrease', increaseAria: 'Increase', addedToast: '{name} added to cart'
      },
      footer: {
        tagline: 'Cardholders and wallets, handmade in İzmir from a single hide.',
        explore: 'Explore', categories: 'Categories', cardholders: 'Cardholders', wallets: 'Wallets',
        contactUs: 'Get in Touch', location: 'İzmir, Turkey', rights: 'All rights reserved.',
        privacy: 'Privacy Policy', delivery: 'Shipping & Returns', terms: 'Distance Sales Agreement', preinfo: 'Pre-Contract Information Form',
        handmade: 'Handmade', securePayment: 'Secure Payment',
        wordmarkSrc: 'assets/img/brand/payment/pay-with-iyzico-white-horizontal.svg'
      },
      breadcrumbAria: 'Breadcrumb',
      product: {
        addToCart: 'Add to Cart', viewProductAria: 'View {name}', imageAria: 'Image {n}',
        material: 'Material', size: 'Size', slots: 'Slots', decreaseAria: 'Decrease', increaseAria: 'Increase',
        stockNote: 'In stock — ships within 2-4 business days.',
        detailTitle: 'Product Details', detailText: 'The pattern is hand-cut, edges hand-painted and burnished. Seams are hand-stitched with waxed thread using the saddle-stitch technique. Because it’s natural leather, slight variations in grain and tone can occur — not a flaw, but a signature of the hide.',
        careTitle: 'Care Instructions', careText: 'Keep away from water and direct sunlight. Wipe with a soft, dry cloth and apply a colorless leather conditioner every 3-6 months. The patina that develops over time is the leather naturally maturing.',
        shippingTitle: 'Shipping & Returns', shippingText: 'Orders ship within 2-4 business days. Unused items can be returned within 14 days of delivery.',
        relatedEyebrow: 'Pairs Well With', relatedTitle: 'Similar Pieces'
      },
      home: {
        heroBadge: 'A Handcraft Leather Workshop', heroTitleHtml: 'THE FINEST<br>SIDE OF<br>LEATHER',
        heroSubtitle: 'Hand-stitched cardholders and wallets cut from a single piece of cowhide — cuts inspired by the summit of Olympos.',
        cta1: 'Explore the Collection', cta2: 'Our Story', videoBadge: 'Handmade — Showcase',
        trustHandstitch: 'Hand-Stitched & Cut', trustMadeIn: 'Made in Turkey', trustGift: 'Thoughtful Gift Wrapping',
        featuredEyebrow: 'Collection', featuredTitle: 'Featured Pieces', allProducts: 'All Products',
        craftEyebrow: 'From the Workshop', craftTitleHtml: 'Every stitch,<br>by hand.',
        craftText: 'From cutting the pattern to painting the edges, every step — down to the waxed-thread saddle stitch — passes through our İzmir workshop, one piece at a time.',
        craftCta: 'Read Our Story', moodHandle: '@olymposleather', moodContact: 'Get in Touch',
        newsletterEyebrow: 'Join Our Newsletter', newsletterTitle: 'Be the first to hear about new collections',
        newsletterPlaceholder: 'Your email address', newsletterSubmit: 'Subscribe', newsletterToast: "You're subscribed — thank you.",
        taglineQuote: '"Every piece is born of a single hide — no two are alike."', taglineCta: 'Get to Know the Workshop'
      },
      shop: {
        eyebrow: 'All Products', title: 'Shop',
        subtitle: 'Every piece is cut from a single hide, hand-stitched, and hand-painted at the edges. Because it’s natural leather, slight color variation can occur across the grain.',
        filterAll: 'All', filterKartlik: 'Cardholders', filterCuzdan: 'Wallets', filterGroupAria: 'Filter by category',
        sortAria: 'Sort', sortFeatured: 'Featured', sortPriceAsc: 'Price: Low to High', sortPriceDesc: 'Price: High to Low', sortName: 'Name: A–Z',
        resultCount: '{n} products'
      },
      about: {
        heroTitleHtml: 'A Craft Born<br>from a Summit',
        heroText: 'Olympos carries the name of the ancient city on the shores of Antalya — for leatherwork that, like weathered stone, resists time.',
        originEyebrow: 'Beginning', originTitle: 'One name, two meanings.',
        originP1: 'Olympos is an ancient city on the Lycian coast, stretching from the foot of the mountain down to the sea. Its cut stones still stand today — every masterfully worked surface enduring despite the passage of time.',
        originP2: 'We apply the same patience to leather: from cutting the pattern to stitching, to painting the edges — every step passes through human hands. We make pieces that carry the mark of a craftsman’s hand, not the speed of mass production.',
        valuesEyebrow: 'Our Values', valuesTitle: 'What We Value',
        craftTitle: 'Handcraft', craftText: 'Every pattern is hand-cut, every seam hand-stitched with waxed thread. We don’t use machine stitching.',
        leatherTitle: 'Selected Leather', leatherText: 'We use only full-grain 100% cowhide — durable, breathable, and it only gets better with age.',
        designTitle: 'Timeless Design', designText: 'Not trend, but simplicity. Our negative-space cuts exist for the form itself, not for decoration.',
        processQuote: '“A cardholder doesn’t leave our hands based on how many minutes it took, but on how many years it will be carried.”',
        cutTitle: 'Cutting', cutText: 'Every pattern is hand-selected and cut from the finest region of the hide.',
        stitchTitle: 'Stitching', stitchText: 'Waxed-thread stitching with the saddle-stitch technique, sewn back and forth with two needles.',
        edgeTitle: 'Edges', edgeText: 'Edges are sanded, hand-painted, and burnished smooth.',
        checkTitle: 'Inspection', checkText: 'Every piece is individually inspected by hand before it ships.',
        ctaEyebrow: 'Collection', ctaTitle: 'Get to know it by holding it', ctaButton: 'Go to the Shop'
      },
      contact: {
        eyebrow: 'Contact', title: 'Get in Touch', subtitle: 'We’re here for your questions, custom order requests, or wholesale partnerships.',
        emailLabel: 'Email', workshopLabel: 'Workshop', hoursLabel: 'Working Hours', hoursValue: 'Monday – Saturday, 09:00 – 18:00',
        socialLabel: 'Social Media', mapTitle: 'Olympos Leather — Google Map',
        formName: 'Full Name', formEmail: 'Email', formSubject: 'Subject',
        subjGeneral: 'General Question', subjOrder: 'Order Status', subjCustom: 'Custom Order', subjWholesale: 'Wholesale Partnership',
        formMessage: 'Your Message', formSubmit: 'Send Message', formSending: 'Sending…',
        formSuccessToast: 'Your message has been received. We’ll get back to you shortly.'
      },
      faq: {
        eyebrow: 'Help', title: 'Frequently Asked Questions', subtitle: 'The most common questions about materials, shipping, returns, and care.',
        q1: 'What materials are your products made from, and how?',
        a1: 'Every piece is hand-cut from a single hide of 100% cowhide. The pattern is hand-cut, edges hand-painted and burnished; seams are hand-stitched with waxed thread using the saddle-stitch technique. Because it’s natural leather, slight variations in grain and tone can occur — not a flaw, but a signature of the hide.',
        q2: 'How long does shipping take?', a2: 'Orders ship within 2-4 business days. Shipping cost is calculated and shown at checkout.',
        q3: 'Do I have a right to return?', a3: 'Unused items can be returned within 14 days of delivery.',
        q4: 'How should I care for my leather goods?', a4: 'Keep away from water and direct sunlight. Wipe with a soft, dry cloth and apply a colorless leather conditioner every 3-6 months. The patina that develops over time is the leather naturally maturing.',
        q5: 'How can I track my order?',
        a5Html: 'You can see the current status any time on the <a href="siparis-takip" class="underline hover:text-umber-800">Track Order</a> page using your order number and the email address you used to order. If you’re signed in, you can also find your past orders on the <a href="hesabim" class="underline hover:text-umber-800">Account</a> page.'
      },
      notFound: { eyebrow: '404', title: 'Page Not Found', text: 'The page you’re looking for may have moved, been removed, or never existed. But our collection is right where you left it.', home: 'Back to Home', shop: 'Browse the Shop' },
      privacy: {
        eyebrow: 'Legal', title: 'Privacy Policy', updated: 'Last updated: August 27, 2026',
        s1Title: '1. Data Controller',
        s1Html: 'This website is operated by <strong>OLYMPOS Leather</strong> ("we", "Olympos Leather"), which trades under a Turkish craftsman’s (esnaf) trade registration and tax-exemption status, with a valid commercial sales license, in Buca, İzmir. For questions about your personal data, you can reach us at <a href="mailto:info@olymposleather.com" class="underline hover:text-umber-800">info@olymposleather.com</a>.',
        s2Title: '2. What Data We Collect',
        s2Text: 'When you place an order or contact us, we collect information such as your full name, email address, phone number, delivery address, and order contents. Card details entered at payment are not stored by us; payment is processed securely through our site’s payment infrastructure.',
        s3Title: '3. Why We Collect Your Data',
        s3Text: 'We use the data we collect to prepare and ship your order, to communicate with you about order status, to let you manage your account and order history, and to fulfil legal obligations (such as issuing invoices). We do not sell or rent your data to third parties for marketing purposes.',
        s4Title: '4. Sharing Your Data',
        s4Text: 'To deliver your order, your name, address, and phone number are shared with our contracted courier company. Beyond that, your data is not shared with third parties unless legally required.',
        s5Title: '5. Cookies & Local Storage',
        s5Text: 'We use your browser’s local storage (localStorage) to remember the items in your cart and your session. This data is kept only on your own device and can be cleared at any time from your browser settings.',
        s6Title: '6. Data Security',
        s6Text: 'We take reasonable technical and administrative measures to protect your personal data. That said, no data transmission over the internet can be guaranteed 100% secure.',
        s7Title: '7. Your Rights',
        s7Html: 'Under Turkey’s Personal Data Protection Law No. 6698 (KVKK), you have the right to request information about your processed data, to request its correction or deletion, and to object to its processing. You can exercise these rights by writing to us at <a href="mailto:info@olymposleather.com" class="underline hover:text-umber-800">info@olymposleather.com</a>.',
        s8Title: '8. Changes',
        s8Text: 'This privacy policy may be updated from time to time. The current version is always published on this page.'
      },
      delivery: {
        eyebrow: 'Legal', title: 'Shipping & Returns', updated: 'Last updated: August 29, 2026',
        s1Title: '1. Delivery Time',
        s1Text: "Once payment is confirmed, your order is handed to our contracted courier within 2-4 business days. This can take longer during busy periods (campaigns, holidays); you'll be notified on the order tracking page if that happens.",
        s2Title: '2. Shipping Cost & Regions',
        s2Text: 'Shipping cost is calculated based on your order total and delivery address, and shown at checkout. We currently ship within Turkey only.',
        s3Title: '3. Order Tracking',
        s3Text: 'Once your order ships, we email you a tracking number. You can also check the current status anytime on the Track Order page using your order number and email address.',
        s4Title: '4. Right of Withdrawal',
        s4Html: "Under Turkey's Law on the Protection of Consumers No. 6502 and the Distance Contracts Regulation, you have the right to withdraw from the contract within 14 days of receiving your order, without giving any reason and without penalty. See our <a href=\"mesafeli-satis-sozlesmesi\" class=\"underline hover:text-umber-800\">Distance Sales Agreement</a> for the full terms.",
        s5Title: '5. Return Conditions',
        s5Text: 'Returned items must be unused, in their original packaging, and with all tags intact. Products custom-made or cut to a personal request are excluded from the right of withdrawal.',
        s6Title: '6. Return Process',
        s6Text: 'Simply email your return request and order number to info@olymposleather.com. Once approved, hand the item to our contracted courier; return shipping and refund details will be sent to you by email. Approved refunds are issued to your original payment method within 14 days of the item reaching us.',
        s7Title: '7. Exchanges',
        s7Text: "For a different model or color, please complete the return process first, then place a new order for the item you'd prefer.",
        s8Title: '8. Contact',
        s8Text: 'For any questions about shipping or returns, reach us at info@olymposleather.com.'
      },
      terms: {
        eyebrow: 'Legal', title: 'Distance Sales Agreement', updated: 'Last updated: August 29, 2026',
        s1Title: '1. Parties',
        s1Html: 'This Distance Sales Agreement ("Agreement") is entered into between <strong>OLYMPOS Leather</strong> ("Seller" — <a href="mailto:info@olymposleather.com" class="underline hover:text-umber-800">info@olymposleather.com</a> / <a href="tel:+905377876857" class="underline hover:text-umber-800">+90 537 787 68 57</a>), which trades under a Turkish craftsman\'s (esnaf) trade registration and tax-exemption status, with a valid commercial sales license, in Buca, İzmir, and the customer placing an order through olymposleather.com ("Buyer"), under the terms set out below.',
        s2Title: '2. Subject of the Agreement',
        s2Text: "This Agreement sets out the rights and obligations of the parties regarding the sale and delivery of the product ordered electronically by the Buyer through the Seller's website, in accordance with Turkey's Law on the Protection of Consumers No. 6502 and the Distance Contracts Regulation.",
        s3Title: '3. Product and Payment Information',
        s3Text: "The type, quantity, price, payment method, and delivery address of the ordered product are shown to the Buyer on the order summary screen and in the order confirmation email at the time of order; this information forms an integral part of this Agreement. Payment is collected by credit/debit card through our site's iyzico infrastructure.",
        s4Title: '4. Delivery',
        s4Text: "The product is delivered by the Seller's contracted courier to the address the Buyer provides at checkout, within the legal maximum of 30 days from payment confirmation. Any delays are communicated to the Buyer via the Track Order page.",
        s5Title: '5. Right of Withdrawal',
        s5Text: 'The Buyer has the right to withdraw from this Agreement within 14 (fourteen) days of the product being delivered to them or to the person they designated, without giving any reason and without penalty. To exercise this right, a written notice to info@olymposleather.com within this period is sufficient. Upon withdrawal, the product is returned to the Seller and the amount collected is refunded to the Buyer, via the same payment method used, within the legal 14-day period.',
        s6Title: '6. Exceptions to the Right of Withdrawal',
        s6Text: "Under Article 15 of the Distance Contracts Regulation, the right of withdrawal does not apply to products made to the Buyer's specifications or clearly personalized.",
        s7Title: '7. Default and Its Legal Consequences',
        s7Text: 'In the event the Buyer defaults on payments made by credit/debit card, the terms of the credit card agreement between the cardholder and the issuing bank apply. In the event of default, the Seller may pursue legal remedies to collect the amount owed.',
        s8Title: '8. Competent Court',
        s8Text: "For disputes arising from this Agreement up to the value announced by the Ministry of Trade, the Consumer Arbitration Committees at the Buyer's or Seller's place of residence are competent; for disputes above this value, the Consumer Courts are competent.",
        s9Title: '9. Effective Date',
        s9Text: 'By confirming an order through our site, the Buyer is deemed to have accepted all terms of this Agreement.'
      },
      preinfo: {
        eyebrow: 'Legal', title: 'Pre-Contract Information Form', updated: 'Last updated: August 29, 2026',
        s1Title: '1. Seller Information',
        s1Html: '<strong>OLYMPOS Leather</strong> operates in Buca, İzmir under a Turkish craftsman\'s (esnaf) trade registration and tax-exemption status, with a valid commercial sales license. For questions, reach us at <a href="mailto:info@olymposleather.com" class="underline hover:text-umber-800">info@olymposleather.com</a> or by phone at <a href="tel:+905377876857" class="underline hover:text-umber-800">+90 537 787 68 57</a>.',
        s2Title: '2. Product and Price Information',
        s2Text: 'The essential characteristics, quantity, and VAT-inclusive price of the product you order are shown on the order summary screen before you confirm your order. The price shown does not include shipping; shipping cost is calculated separately at checkout and added to the total.',
        s3Title: '3. Payment Method',
        s3Text: "Payment is collected by credit or debit card through iyzico's secure payment infrastructure, either as a single payment or through installment options offered by your bank. We do not store your card details.",
        s4Title: '4. Delivery Information',
        s4Html: 'Once payment is confirmed, your order is handed to our contracted courier within 2-4 business days. We currently ship within Turkey only. See our <a href="teslimat-ve-iade" class="underline hover:text-umber-800">Shipping & Returns</a> page for details.',
        s5Title: '5. Right of Withdrawal',
        s5Text: "Under Turkey's Law on the Protection of Consumers No. 6502, you have the right to withdraw from the contract within 14 days of receiving your order, without giving any reason and without penalty.",
        s6Title: '6. Exceptions to the Right of Withdrawal',
        s6Text: "The right of withdrawal does not apply to products made to the Buyer's specifications or clearly personalized.",
        s7Title: '7. Complaints and Objections',
        s7Text: 'You can direct complaints and objections about this agreement to the Consumer Arbitration Committee at your place of residence, up to the value announced by the Ministry of Trade; disputes above this value go to the Consumer Court.',
        s8Title: '8. Nature of This Form',
        s8Html: 'This Pre-Contract Information Form is an annex to, and an integral part of, the <a href="mesafeli-satis-sozlesmesi" class="underline hover:text-umber-800">Distance Sales Agreement</a> that will be concluded once you confirm your order.'
      },
      account: {
        eyebrow: 'Account', title: 'My Account', linkInfo: 'My Info', linkCart: 'My Cart', linkTrack: 'Track Order',
        welcome: 'Welcome', editProfile: 'Edit My Info', logout: 'Log Out',
        ordersTitle: 'My Orders', ordersEmpty: 'You don’t have any orders yet.', browseShop: 'Browse the Shop',
        statusReceived: 'Received', statusPreparing: 'Preparing', statusShipped: 'Shipped', statusDelivered: 'Delivered',
        itemsUnit: 'items'
      },
      profile: {
        backToAccount: 'Back to My Account', eyebrow: 'Account', title: 'My Info',
        subtitle: 'Update your name, email, password, and delivery address here.',
        personalTitle: 'Personal Information', nameLabel: 'Full Name', emailLabel: 'Email', phoneLabel: 'Phone',
        passwordTitle: 'Password', passwordHint: 'Leave this blank if you don’t want to change your password.',
        newPasswordLabel: 'New Password', newPasswordPlaceholder: 'At least 6 characters',
        addressTitle: 'Delivery Address', addressLabel: 'Address', cityLabel: 'City', zipLabel: 'Postal Code',
        saveButton: 'Save Changes', saving: 'Saving…', successMsg: 'Your info has been updated.'
      },
      cartPage: {
        backToAccount: 'Back to My Account', eyebrow: 'Cart', title: 'My Cart', emptyMsg: 'Your cart is empty right now.', browseShop: 'Browse the Shop',
        summaryTitle: 'Order Summary', subtotal: 'Subtotal', shippingNote: 'Shipping and taxes are calculated at checkout.',
        checkout: 'Checkout', continueShopping: 'Continue Shopping'
      },
      checkout: {
        eyebrow: 'Checkout', title: 'Complete Your Order', emptyMsg: 'Your cart is empty, so you can’t proceed to checkout.', browseShop: 'Browse the Shop',
        step1Label: 'Delivery', step2Label: 'Payment',
        deliveryTitle: 'Delivery Information', nameLabel: 'Full Name', emailLabel: 'Email', phoneLabel: 'Phone',
        addressLabel: 'Address', cityLabel: 'City', zipLabel: 'Postal Code',
        agreeTermsHtml: 'I have read and agree to the <a href="on-bilgilendirme-formu" target="_blank" rel="noopener">Pre-Contract Information Form</a> and the <a href="mesafeli-satis-sozlesmesi" target="_blank" rel="noopener">Distance Sales Agreement</a>.',
        agreeMarketing: 'I want to hear about new collections and campaigns from Olympos Leather by email and SMS.',
        agreeError: 'You need to agree to the Pre-Contract Information Form and the Distance Sales Agreement to continue.',
        toPayment: 'Proceed to Payment', backToDelivery: 'Back to delivery details',
        cardTitle: 'Card Information', cardDisclaimer: 'This is a showcase environment — no real card is charged. You can use any card number for testing.',
        secureNote: "Protected with 256-bit SSL encryption via iyzico's secure payment infrastructure.",
        wordmarkSrc: 'assets/img/brand/payment/pay-with-iyzico-colored-horizontal.svg', acceptedNetworks: 'Mastercard · Visa · American Express · Troy',
        badgeOneClick: 'One-Click Fast Checkout', badgeInstallment: 'Installment Options', badgePoints: 'Use Card Points', badgeProtected: 'Protected Shopping',
        whatIsTitle: 'What is Pay with iyzico?',
        whatIsText: "Pay with iyzico stores your card details on iyzico's secure infrastructure so future purchases are fast, one-click, and secure. Your card details are never shared with Olympos Leather.",
        cardNameLabel: 'Name on Card', cardNumberLabel: 'Card Number', cardExpLabel: 'Expiry (MM/YY)', cardCvcLabel: 'CVC',
        submit: 'Pay', processing: 'Processing…',
        summaryTitle: 'Order Summary', editCart: 'Edit Cart', subtotal: 'Subtotal',
        successTitle: 'Your Order Was Received', successOrderNumber: 'Your order number:', successNote: 'You can use this number on the order tracking page.',
        trackOrder: 'Track My Order', continueShopping: 'Continue Shopping',
        genericError: 'Payment could not be processed. Please try again.'
      },
      track: {
        backToAccount: 'Back to My Account', eyebrow: 'Track Order', title: 'Track Your Order',
        subtitle: 'Enter your order number and the email address you used to order.',
        numberLabel: 'Order Number', numberPlaceholder: 'OLY-XXXXXXXX', emailLabel: 'Email', submit: 'Find Order',
        notFound: 'No order was found with this information.', itemsUnit: 'items',
        stepReceived: 'Order Received', stepPreparing: 'Preparing', stepShipped: 'Shipped', stepDelivered: 'Delivered'
      },
      login: {
        eyebrow: 'Account', title: 'Sign In', noAccount: 'Don’t have an account?', createAccount: 'Create one',
        emailLabel: 'Email', passwordLabel: 'Password', submit: 'Sign In', loggingIn: 'Signing in…',
        guestTrack: 'Ordered without an account?', trackLink: 'Track your order'
      },
      register: {
        eyebrow: 'Account', title: 'Create Account', haveAccount: 'Already have an account?', loginLink: 'Sign in',
        nameLabel: 'Full Name', emailLabel: 'Email', passwordLabel: 'Password', password2Label: 'Confirm Password',
        submit: 'Create Account', creating: 'Creating…', passwordMismatch: 'Passwords don’t match.'
      },
      backend: {
        missingFields: 'Please fill in all fields.', weakPassword: 'Password must be at least 6 characters.', emailExists: 'An account with this email already exists.',
        loginMissingFields: 'Email and password are required.', invalidCredentials: 'Incorrect email or password.', notConfigured: 'Firebase auth is not configured yet.',
        notAuthenticated: 'No active session found.', profileMissingFields: 'Full name and email are required.', userNotFound: 'User not found.',
        invalidCard: 'Invalid card number.', cardDeclined: 'The card was declined.', paymentFailed: 'Payment failed. Please try again.',
        genericError: 'Something went wrong.'
      }
    },

    de: {
      announce: { handmade: 'Handgefertigt', material: '100% Rindsleder', tagline: 'Zeitlose Schnitte' },
      nav: { home: 'Startseite', shop: 'Shop', about: 'Über uns', contact: 'Kontakt', faq: 'FAQ', account: 'Konto', cart: 'Warenkorb', track: 'Bestellung verfolgen' },
      header: { searchAria: 'Suchen', accountAria: 'Konto', cartAria: 'Warenkorb öffnen', menuOpenAria: 'Menü öffnen', menuCloseAria: 'Menü schließen', homeAria: 'Olympos Leather Startseite', langAria: 'Sprachauswahl' },
      search: { dialogAria: 'Produkte suchen', placeholder: 'Produkte suchen…', closeAria: 'Suche schließen', emptyState: 'Keine Ergebnisse gefunden.', hint: 'Beginnen Sie zu tippen…' },
      cart: {
        title: 'Ihr Warenkorb', closeAria: 'Warenkorb schließen', emptyMsg: 'Ihr Warenkorb ist derzeit leer.', browseShop: 'Shop durchsuchen',
        subtotal: 'Zwischensumme', myCart: 'Warenkorb', checkout: 'Zur Kasse', shippingNote: 'Versand und Steuern werden an der Kasse berechnet.',
        removeAria: 'Entfernen', decreaseAria: 'Verringern', increaseAria: 'Erhöhen', addedToast: '{name} in den Warenkorb gelegt'
      },
      footer: {
        tagline: 'Kartenetuis und Geldbörsen, handgefertigt in İzmir aus einem einzigen Stück Leder.',
        explore: 'Entdecken', categories: 'Kategorien', cardholders: 'Kartenetuis', wallets: 'Geldbörsen',
        contactUs: 'Kontakt', location: 'İzmir, Türkei', rights: 'Alle Rechte vorbehalten.',
        privacy: 'Datenschutzerklärung', delivery: 'Versand & Rückgabe', terms: 'Fernabsatzvertrag', preinfo: 'Vorabinformationsformular',
        handmade: 'Handgefertigt', securePayment: 'Sichere Zahlung',
        wordmarkSrc: 'assets/img/brand/payment/pay-with-iyzico-white-horizontal.svg'
      },
      breadcrumbAria: 'Breadcrumb',
      product: {
        addToCart: 'In den Warenkorb', viewProductAria: '{name} ansehen', imageAria: 'Bild {n}',
        material: 'Material', size: 'Größe', slots: 'Fächer', decreaseAria: 'Verringern', increaseAria: 'Erhöhen',
        stockNote: 'Auf Lager — Versand innerhalb von 2-4 Werktagen.',
        detailTitle: 'Produktdetails', detailText: 'Das Schnittmuster wird von Hand geschnitten, die Kanten von Hand gefärbt und poliert. Die Nähte werden mit gewachstem Faden in Sattlernaht-Technik von Hand genäht. Da es sich um Naturleder handelt, können leichte Unterschiede in Maserung und Farbton auftreten — kein Makel, sondern die Signatur des Leders.',
        careTitle: 'Pflegehinweise', careText: 'Vor Wasser und direkter Sonneneinstrahlung schützen. Mit einem weichen, trockenen Tuch abwischen und alle 3-6 Monate eine farblose Lederpflegecreme auftragen. Die mit der Zeit entstehende Patina ist die natürliche Reifung des Leders.',
        shippingTitle: 'Versand & Rückgabe', shippingText: 'Bestellungen werden innerhalb von 2-4 Werktagen versandt. Unbenutzte Artikel können innerhalb von 14 Tagen nach Lieferung zurückgegeben werden.',
        relatedEyebrow: 'Passt gut dazu', relatedTitle: 'Ähnliche Stücke'
      },
      home: {
        heroBadge: 'Handwerkliche Lederwerkstatt', heroTitleHtml: 'DIE FEINSTE<br>SEITE DES<br>LEDERS',
        heroSubtitle: 'Handgenähte Kartenetuis und Geldbörsen aus einem einzigen Stück Rindsleder — Schnitte, inspiriert vom Gipfel des Olympos.',
        cta1: 'Kollektion entdecken', cta2: 'Unsere Geschichte', videoBadge: 'Handgefertigt — Vorstellung',
        trustHandstitch: 'Handgenäht & Geschnitten', trustMadeIn: 'Hergestellt in der Türkei', trustGift: 'Sorgfältige Geschenkverpackung',
        featuredEyebrow: 'Kollektion', featuredTitle: 'Ausgewählte Stücke', allProducts: 'Alle Produkte',
        craftEyebrow: 'Aus der Werkstatt', craftTitleHtml: 'Jede Naht,<br>von Hand gesetzt.',
        craftText: 'Vom Zuschnitt des Musters bis zur Kantenfärbung — jeder Schritt, bis hin zur Sattlernaht mit gewachstem Faden, durchläuft unsere Werkstatt in İzmir, Stück für Stück.',
        craftCta: 'Unsere Geschichte lesen', moodHandle: '@olymposleather', moodContact: 'Kontakt',
        newsletterEyebrow: 'Newsletter abonnieren', newsletterTitle: 'Erfahren Sie als Erste von neuen Kollektionen',
        newsletterPlaceholder: 'Ihre E-Mail-Adresse', newsletterSubmit: 'Abonnieren', newsletterToast: 'Sie sind angemeldet — vielen Dank.',
        taglineQuote: '„Jedes Stück entsteht aus einer einzigen Haut — keine zwei sind gleich.“', taglineCta: 'Lernen Sie die Werkstatt kennen'
      },
      shop: {
        eyebrow: 'Alle Produkte', title: 'Shop',
        subtitle: 'Jedes Stück wird aus einer einzigen Haut geschnitten, von Hand genäht und an den Kanten von Hand gefärbt. Da es sich um Naturleder handelt, können leichte Farbunterschiede in der Maserung auftreten.',
        filterAll: 'Alle', filterKartlik: 'Kartenetuis', filterCuzdan: 'Geldbörsen', filterGroupAria: 'Nach Kategorie filtern',
        sortAria: 'Sortieren', sortFeatured: 'Empfohlen', sortPriceAsc: 'Preis: Aufsteigend', sortPriceDesc: 'Preis: Absteigend', sortName: 'Name: A–Z',
        resultCount: '{n} Produkte'
      },
      about: {
        heroTitleHtml: 'Ein Handwerk,<br>geboren aus einem Gipfel',
        heroText: 'Olympos trägt den Namen der antiken Stadt an der Küste von Antalya — für eine Lederverarbeitung, die wie verwitterter Stein der Zeit trotzt.',
        originEyebrow: 'Anfang', originTitle: 'Ein Name, zwei Bedeutungen.',
        originP1: 'Olympos ist eine antike Stadt an der lykischen Küste, die sich vom Fuß des Berges bis zum Meer erstreckt. Ihre behauenen Steine stehen noch heute — jede meisterhaft bearbeitete Oberfläche besteht trotz der Zeit fort.',
        originP2: 'Dieselbe Geduld wenden wir beim Leder an: vom Zuschnitt des Musters über die Naht bis zur Kantenfärbung geht jeder Schritt durch Menschenhand. Wir fertigen Stücke, die die Spur einer Handwerkerhand tragen — nicht das Tempo der Massenproduktion.',
        valuesEyebrow: 'Unsere Werte', valuesTitle: 'Worauf wir Wert legen',
        craftTitle: 'Handarbeit', craftText: 'Jedes Schnittmuster wird von Hand geschnitten, jede Naht von Hand mit gewachstem Faden genäht. Wir verwenden keine Maschinennähte.',
        leatherTitle: 'Ausgewähltes Leder', leatherText: 'Wir verwenden ausschließlich Full-Grain 100% Rindsleder — strapazierfähig, atmungsaktiv und mit der Zeit immer schöner.',
        designTitle: 'Zeitloses Design', designText: 'Kein Trend, sondern Schlichtheit. Unsere Negativschnitte existieren für die Form selbst, nicht als Verzierung.',
        processQuote: '„Ein Kartenetui verlässt unsere Hände nicht danach, wie viele Minuten es gedauert hat, sondern danach, wie viele Jahre es getragen werden wird.“',
        cutTitle: 'Zuschnitt', cutText: 'Jedes Schnittmuster wird von Hand aus dem hochwertigsten Bereich der Haut ausgewählt und geschnitten.',
        stitchTitle: 'Naht', stitchText: 'Sattlernaht-Technik mit gewachstem Faden, mit zwei Nadeln gegeneinander genäht.',
        edgeTitle: 'Kante', edgeText: 'Kanten werden geschliffen, von Hand gefärbt und glatt poliert.',
        checkTitle: 'Kontrolle', checkText: 'Jedes Stück wird vor dem Versand einzeln von Hand geprüft.',
        ctaEyebrow: 'Kollektion', ctaTitle: 'Lernen Sie es kennen, indem Sie es tragen', ctaButton: 'Zum Shop'
      },
      contact: {
        eyebrow: 'Kontakt', title: 'Kontaktieren Sie uns', subtitle: 'Wir sind für Ihre Fragen, individuellen Bestellwünsche oder Großhandelspartnerschaften da.',
        emailLabel: 'E-Mail', workshopLabel: 'Werkstatt', hoursLabel: 'Öffnungszeiten', hoursValue: 'Montag – Samstag, 09:00 – 18:00',
        socialLabel: 'Soziale Medien', mapTitle: 'Olympos Leather — Google Maps',
        formName: 'Vor- und Nachname', formEmail: 'E-Mail', formSubject: 'Betreff',
        subjGeneral: 'Allgemeine Frage', subjOrder: 'Bestellstatus', subjCustom: 'Sonderanfertigung', subjWholesale: 'Großhandelspartnerschaft',
        formMessage: 'Ihre Nachricht', formSubmit: 'Nachricht senden', formSending: 'Wird gesendet…',
        formSuccessToast: 'Ihre Nachricht ist eingegangen. Wir melden uns in Kürze bei Ihnen.'
      },
      faq: {
        eyebrow: 'Hilfe', title: 'Häufig gestellte Fragen', subtitle: 'Die häufigsten Fragen zu Material, Versand, Rückgabe und Pflege.',
        q1: 'Aus welchem Material werden Ihre Produkte hergestellt, und wie?',
        a1: 'Jedes Stück wird von Hand aus einer einzigen Haut aus 100% Rindsleder geschnitten. Das Schnittmuster wird von Hand geschnitten, die Kanten von Hand gefärbt und poliert; die Nähte werden mit gewachstem Faden in Sattlernaht-Technik genäht. Da es sich um Naturleder handelt, können leichte Unterschiede in Maserung und Farbton auftreten — kein Makel, sondern die Signatur des Leders.',
        q2: 'Wie lange dauert der Versand?', a2: 'Bestellungen werden innerhalb von 2-4 Werktagen versandt. Die Versandkosten werden an der Kasse berechnet und angezeigt.',
        q3: 'Habe ich ein Rückgaberecht?', a3: 'Unbenutzte Artikel können innerhalb von 14 Tagen nach Lieferung zurückgegeben werden.',
        q4: 'Wie sollte ich meine Lederprodukte pflegen?', a4: 'Vor Wasser und direkter Sonneneinstrahlung schützen. Mit einem weichen, trockenen Tuch abwischen und alle 3-6 Monate eine farblose Lederpflegecreme auftragen. Die mit der Zeit entstehende Patina ist die natürliche Reifung des Leders.',
        q5: 'Wie kann ich meine Bestellung verfolgen?',
        a5Html: 'Mit Ihrer Bestellnummer und der bei der Bestellung verwendeten E-Mail-Adresse können Sie den aktuellen Status jederzeit auf der Seite <a href="siparis-takip" class="underline hover:text-umber-800">Bestellung verfolgen</a> einsehen. Wenn Sie angemeldet sind, finden Sie Ihre früheren Bestellungen auch auf der Seite <a href="hesabim" class="underline hover:text-umber-800">Konto</a>.'
      },
      notFound: { eyebrow: '404', title: 'Seite nicht gefunden', text: 'Die gesuchte Seite wurde möglicherweise verschoben, entfernt oder hat nie existiert. Aber unsere Kollektion ist noch genau dort, wo Sie sie verlassen haben.', home: 'Zur Startseite', shop: 'Shop durchsuchen' },
      privacy: {
        eyebrow: 'Rechtliches', title: 'Datenschutzerklärung', updated: 'Zuletzt aktualisiert: 27. August 2026',
        s1Title: '1. Verantwortlicher',
        s1Html: 'Diese Website wird von <strong>OLYMPOS Leather</strong> ("wir", "Olympos Leather") betrieben, das unter einer türkischen Gewerbeanmeldung (esnaf) mit entsprechender Steuerbefreiung und gültiger Gewerbeerlaubnis für den Handel in Buca, İzmir tätig ist. Bei Fragen zu Ihren personenbezogenen Daten erreichen Sie uns unter <a href="mailto:info@olymposleather.com" class="underline hover:text-umber-800">info@olymposleather.com</a>.',
        s2Title: '2. Welche Daten wir erheben',
        s2Text: 'Wenn Sie eine Bestellung aufgeben oder uns kontaktieren, erheben wir Daten wie Ihren vollständigen Namen, Ihre E-Mail-Adresse, Telefonnummer, Lieferadresse und den Bestellinhalt. Bei der Zahlung eingegebene Kartendaten werden von uns nicht gespeichert; die Zahlung wird sicher über die Zahlungsinfrastruktur unserer Website abgewickelt.',
        s3Title: '3. Warum wir Ihre Daten erheben',
        s3Text: 'Wir verwenden die erhobenen Daten, um Ihre Bestellung vorzubereiten und zu versenden, mit Ihnen über den Bestellstatus zu kommunizieren, Ihnen die Verwaltung Ihres Kontos und Ihrer Bestellhistorie zu ermöglichen und gesetzlichen Verpflichtungen (z. B. Rechnungsstellung) nachzukommen. Wir verkaufen oder vermieten Ihre Daten nicht zu Marketingzwecken an Dritte.',
        s4Title: '4. Weitergabe Ihrer Daten',
        s4Text: 'Um Ihre Bestellung zuzustellen, werden Ihr Name, Ihre Adresse und Telefonnummer an unser beauftragtes Kurierunternehmen weitergegeben. Darüber hinaus werden Ihre Daten nicht an Dritte weitergegeben, es sei denn, dies ist gesetzlich vorgeschrieben.',
        s5Title: '5. Cookies & lokaler Speicher',
        s5Text: 'Wir nutzen den lokalen Speicher (localStorage) Ihres Browsers, um die Artikel in Ihrem Warenkorb und Ihre Sitzung zu merken. Diese Daten werden ausschließlich auf Ihrem eigenen Gerät gespeichert und können jederzeit über Ihre Browsereinstellungen gelöscht werden.',
        s6Title: '6. Datensicherheit',
        s6Text: 'Wir treffen angemessene technische und organisatorische Maßnahmen zum Schutz Ihrer personenbezogenen Daten. Dennoch kann keine Datenübertragung über das Internet als 100% sicher garantiert werden.',
        s7Title: '7. Ihre Rechte',
        s7Html: 'Gemäß dem türkischen Gesetz Nr. 6698 zum Schutz personenbezogener Daten (KVKK) haben Sie das Recht, Auskunft über Ihre verarbeiteten Daten zu verlangen, deren Berichtigung oder Löschung zu beantragen und der Verarbeitung zu widersprechen. Sie können diese Rechte ausüben, indem Sie uns unter <a href="mailto:info@olymposleather.com" class="underline hover:text-umber-800">info@olymposleather.com</a> schreiben.',
        s8Title: '8. Änderungen',
        s8Text: 'Diese Datenschutzerklärung kann von Zeit zu Zeit aktualisiert werden. Die aktuelle Fassung wird stets auf dieser Seite veröffentlicht.'
      },
      delivery: {
        eyebrow: 'Rechtliches', title: 'Versand & Rückgabe', updated: 'Zuletzt aktualisiert: 29. August 2026',
        s1Title: '1. Lieferzeit',
        s1Text: 'Nach Zahlungsbestätigung übergeben wir Ihre Bestellung innerhalb von 2-4 Werktagen an unser beauftragtes Kurierunternehmen. In stark frequentierten Zeiten (Aktionen, Feiertage) kann sich dies verlängern; Sie werden in diesem Fall über die Seite zur Sendungsverfolgung informiert.',
        s2Title: '2. Versandkosten & Regionen',
        s2Text: 'Die Versandkosten werden anhand des Bestellwerts und der Lieferadresse berechnet und an der Kasse angezeigt. Derzeit versenden wir ausschließlich innerhalb der Türkei.',
        s3Title: '3. Sendungsverfolgung',
        s3Text: 'Sobald Ihre Bestellung versandt wurde, senden wir Ihnen die Sendungsnummer per E-Mail. Den aktuellen Status können Sie jederzeit auf der Seite zur Sendungsverfolgung mit Ihrer Bestellnummer und E-Mail-Adresse einsehen.',
        s4Title: '4. Widerrufsrecht',
        s4Html: 'Gemäß dem türkischen Verbraucherschutzgesetz Nr. 6502 und der Fernabsatzverordnung haben Sie das Recht, den Vertrag innerhalb von 14 Tagen nach Erhalt der Ware ohne Angabe von Gründen und ohne Vertragsstrafe zu widerrufen. Die vollständigen Bedingungen finden Sie in unserem <a href="mesafeli-satis-sozlesmesi" class="underline hover:text-umber-800">Fernabsatzvertrag</a>.',
        s5Title: '5. Rückgabebedingungen',
        s5Text: 'Zurückgegebene Artikel müssen unbenutzt, in der Originalverpackung und mit allen Etiketten vollständig sein. Speziell angefertigte oder nach persönlichem Wunsch zugeschnittene Produkte sind vom Widerrufsrecht ausgeschlossen.',
        s6Title: '6. Rückgabeprozess',
        s6Text: 'Senden Sie Ihre Rückgabeanfrage mit Ihrer Bestellnummer einfach an info@olymposleather.com. Nach Genehmigung übergeben Sie den Artikel unserem beauftragten Kurierunternehmen; Details zu Rücksendung und Rückerstattung erhalten Sie per E-Mail. Genehmigte Rückerstattungen erfolgen innerhalb von 14 Tagen nach Eingang des Artikels bei uns auf Ihre ursprüngliche Zahlungsmethode.',
        s7Title: '7. Umtausch',
        s7Text: 'Für ein anderes Modell oder eine andere Farbe schließen Sie bitte zunächst den Rückgabeprozess ab und geben Sie anschließend eine neue Bestellung für den gewünschten Artikel auf.',
        s8Title: '8. Kontakt',
        s8Text: 'Bei Fragen zu Versand oder Rückgabe erreichen Sie uns unter info@olymposleather.com.'
      },
      terms: {
        eyebrow: 'Rechtliches', title: 'Fernabsatzvertrag', updated: 'Zuletzt aktualisiert: 29. August 2026',
        s1Title: '1. Vertragsparteien',
        s1Html: 'Dieser Fernabsatzvertrag ("Vertrag") wird zwischen <strong>OLYMPOS Leather</strong> ("Verkäufer" — <a href="mailto:info@olymposleather.com" class="underline hover:text-umber-800">info@olymposleather.com</a> / <a href="tel:+905377876857" class="underline hover:text-umber-800">+90 537 787 68 57</a>), das unter einer türkischen Gewerbeanmeldung (esnaf) mit entsprechender Steuerbefreiung und gültiger Gewerbeerlaubnis für den Handel in Buca, İzmir tätig ist, und dem Kunden, der über olymposleather.com eine Bestellung aufgibt ("Käufer"), zu den nachstehenden Bedingungen geschlossen.',
        s2Title: '2. Vertragsgegenstand',
        s2Text: 'Dieser Vertrag regelt die Rechte und Pflichten der Parteien in Bezug auf den Verkauf und die Lieferung des vom Käufer elektronisch über die Website des Verkäufers bestellten Produkts, gemäß dem türkischen Verbraucherschutzgesetz Nr. 6502 und der Fernabsatzverordnung.',
        s3Title: '3. Produkt- und Zahlungsinformationen',
        s3Text: 'Art, Menge, Preis, Zahlungsart und Lieferadresse des bestellten Produkts werden dem Käufer zum Zeitpunkt der Bestellung auf dem Bestellübersichtsbildschirm sowie in der Bestellbestätigungs-E-Mail mitgeteilt; diese Angaben sind fester Bestandteil dieses Vertrags. Die Zahlung erfolgt per Kredit-/Debitkarte über die iyzico-Infrastruktur unserer Website.',
        s4Title: '4. Lieferung',
        s4Text: 'Das Produkt wird vom beauftragten Kurierunternehmen des Verkäufers an die vom Käufer bei der Bestellung angegebene Adresse geliefert, innerhalb der gesetzlichen Höchstfrist von 30 Tagen ab Zahlungsbestätigung. Etwaige Verzögerungen werden dem Käufer über die Seite zur Sendungsverfolgung mitgeteilt.',
        s5Title: '5. Widerrufsrecht',
        s5Text: 'Der Käufer hat das Recht, innerhalb von 14 (vierzehn) Tagen nach Lieferung des Produkts an ihn oder die von ihm benannte Person, ohne Angabe von Gründen und ohne Vertragsstrafe, von diesem Vertrag zurückzutreten. Zur Ausübung dieses Rechts genügt eine schriftliche Mitteilung an info@olymposleather.com innerhalb dieser Frist. Im Falle des Widerrufs wird das Produkt an den Verkäufer zurückgesandt, und der eingezogene Betrag wird dem Käufer innerhalb der gesetzlichen Frist von 14 Tagen über dieselbe Zahlungsmethode erstattet.',
        s6Title: '6. Ausnahmen vom Widerrufsrecht',
        s6Text: 'Gemäß Artikel 15 der Fernabsatzverordnung gilt das Widerrufsrecht nicht für Produkte, die nach den Vorgaben des Käufers angefertigt oder eindeutig personalisiert wurden.',
        s7Title: '7. Verzug und seine rechtlichen Folgen',
        s7Text: 'Gerät der Käufer bei per Kredit-/Debitkarte geleisteten Zahlungen in Verzug, gelten die Bestimmungen des Kreditkartenvertrags zwischen Karteninhaber und ausgebender Bank. Im Verzugsfall kann der Verkäufer zur Beitreibung der Forderung rechtliche Schritte einleiten.',
        s8Title: '8. Zuständiges Gericht',
        s8Text: 'Für Streitigkeiten aus diesem Vertrag bis zu dem vom türkischen Handelsministerium bekanntgegebenen Wert sind die Verbraucherschlichtungsstellen am Wohnsitz des Käufers oder Verkäufers zuständig; bei Streitigkeiten über diesem Wert sind die Verbrauchergerichte zuständig.',
        s9Title: '9. Inkrafttreten',
        s9Text: 'Mit der Bestätigung einer Bestellung über unsere Website gilt dieser Vertrag vom Käufer in allen Punkten als akzeptiert.'
      },
      preinfo: {
        eyebrow: 'Rechtliches', title: 'Vorabinformationsformular', updated: 'Zuletzt aktualisiert: 29. August 2026',
        s1Title: '1. Verkäuferinformationen',
        s1Html: '<strong>OLYMPOS Leather</strong> ist in Buca, İzmir unter einer türkischen Gewerbeanmeldung (esnaf) mit entsprechender Steuerbefreiung und gültiger Gewerbeerlaubnis für den Handel tätig. Bei Fragen erreichen Sie uns unter <a href="mailto:info@olymposleather.com" class="underline hover:text-umber-800">info@olymposleather.com</a> oder telefonisch unter <a href="tel:+905377876857" class="underline hover:text-umber-800">+90 537 787 68 57</a>.',
        s2Title: '2. Produkt- und Preisinformationen',
        s2Text: 'Die wesentlichen Eigenschaften, die Menge und der Preis inklusive MwSt. des von Ihnen bestellten Produkts werden vor Bestätigung Ihrer Bestellung auf dem Bestellübersichtsbildschirm angezeigt. Der angezeigte Preis enthält keine Versandkosten; diese werden separat an der Kasse berechnet und dem Gesamtbetrag hinzugefügt.',
        s3Title: '3. Zahlungsart',
        s3Text: 'Die Zahlung erfolgt per Kredit- oder Debitkarte über die sichere Zahlungsinfrastruktur von iyzico, entweder als Einmalzahlung oder über die von Ihrer Bank angebotenen Ratenzahlungsoptionen. Wir speichern Ihre Kartendaten nicht.',
        s4Title: '4. Lieferinformationen',
        s4Html: 'Nach Zahlungsbestätigung übergeben wir Ihre Bestellung innerhalb von 2-4 Werktagen an unser beauftragtes Kurierunternehmen. Wir versenden derzeit ausschließlich innerhalb der Türkei. Details finden Sie auf unserer Seite <a href="teslimat-ve-iade" class="underline hover:text-umber-800">Versand & Rückgabe</a>.',
        s5Title: '5. Widerrufsrecht',
        s5Text: 'Gemäß dem türkischen Verbraucherschutzgesetz Nr. 6502 haben Sie das Recht, den Vertrag innerhalb von 14 Tagen nach Erhalt der Ware ohne Angabe von Gründen und ohne Vertragsstrafe zu widerrufen.',
        s6Title: '6. Ausnahmen vom Widerrufsrecht',
        s6Text: 'Das Widerrufsrecht gilt nicht für Produkte, die nach den Vorgaben des Käufers angefertigt oder eindeutig personalisiert wurden.',
        s7Title: '7. Beschwerden und Einwände',
        s7Text: 'Beschwerden und Einwände zu diesem Vertrag können Sie bis zu dem vom türkischen Handelsministerium bekanntgegebenen Wert an die Verbraucherschlichtungsstelle an Ihrem Wohnsitz richten; bei Streitigkeiten über diesem Wert ist das Verbrauchergericht zuständig.',
        s8Title: '8. Charakter dieses Formulars',
        s8Html: 'Dieses Vorabinformationsformular ist eine Anlage zum und fester Bestandteil des <a href="mesafeli-satis-sozlesmesi" class="underline hover:text-umber-800">Fernabsatzvertrags</a>, der mit der Bestätigung Ihrer Bestellung geschlossen wird.'
      },
      account: {
        eyebrow: 'Konto', title: 'Mein Konto', linkInfo: 'Meine Daten', linkCart: 'Warenkorb', linkTrack: 'Bestellung verfolgen',
        welcome: 'Willkommen', editProfile: 'Daten bearbeiten', logout: 'Abmelden',
        ordersTitle: 'Meine Bestellungen', ordersEmpty: 'Sie haben noch keine Bestellungen.', browseShop: 'Shop durchsuchen',
        statusReceived: 'Eingegangen', statusPreparing: 'Wird vorbereitet', statusShipped: 'Versandt', statusDelivered: 'Zugestellt',
        itemsUnit: 'Artikel'
      },
      profile: {
        backToAccount: 'Zurück zu meinem Konto', eyebrow: 'Konto', title: 'Meine Daten',
        subtitle: 'Aktualisieren Sie hier Ihren Namen, Ihre E-Mail-Adresse, Ihr Passwort und Ihre Lieferadresse.',
        personalTitle: 'Persönliche Daten', nameLabel: 'Vor- und Nachname', emailLabel: 'E-Mail', phoneLabel: 'Telefon',
        passwordTitle: 'Passwort', passwordHint: 'Lassen Sie dieses Feld leer, wenn Sie Ihr Passwort nicht ändern möchten.',
        newPasswordLabel: 'Neues Passwort', newPasswordPlaceholder: 'Mindestens 6 Zeichen',
        addressTitle: 'Lieferadresse', addressLabel: 'Adresse', cityLabel: 'Stadt', zipLabel: 'Postleitzahl',
        saveButton: 'Änderungen speichern', saving: 'Wird gespeichert…', successMsg: 'Ihre Daten wurden aktualisiert.'
      },
      cartPage: {
        backToAccount: 'Zurück zu meinem Konto', eyebrow: 'Warenkorb', title: 'Mein Warenkorb', emptyMsg: 'Ihr Warenkorb ist derzeit leer.', browseShop: 'Shop durchsuchen',
        summaryTitle: 'Bestellübersicht', subtotal: 'Zwischensumme', shippingNote: 'Versand und Steuern werden an der Kasse berechnet.',
        checkout: 'Zur Kasse', continueShopping: 'Weiter einkaufen'
      },
      checkout: {
        eyebrow: 'Kasse', title: 'Bestellung abschließen', emptyMsg: 'Ihr Warenkorb ist leer, Sie können nicht zur Kasse gehen.', browseShop: 'Shop durchsuchen',
        step1Label: 'Lieferung', step2Label: 'Zahlung',
        deliveryTitle: 'Lieferinformationen', nameLabel: 'Vor- und Nachname', emailLabel: 'E-Mail', phoneLabel: 'Telefon',
        addressLabel: 'Adresse', cityLabel: 'Stadt', zipLabel: 'Postleitzahl',
        agreeTermsHtml: 'Ich habe das <a href="on-bilgilendirme-formu" target="_blank" rel="noopener">Vorabinformationsformular</a> und den <a href="mesafeli-satis-sozlesmesi" target="_blank" rel="noopener">Fernabsatzvertrag</a> gelesen und stimme zu.',
        agreeMarketing: 'Ich möchte per E-Mail und SMS über neue Kollektionen und Kampagnen von Olympos Leather informiert werden.',
        agreeError: 'Um fortzufahren, müssen Sie dem Vorabinformationsformular und dem Fernabsatzvertrag zustimmen.',
        toPayment: 'Weiter zur Zahlung', backToDelivery: 'Zurück zu den Lieferdaten',
        cardTitle: 'Kartendaten', cardDisclaimer: 'Dies ist eine Vorführumgebung — es wird keine echte Karte belastet. Sie können zum Testen eine beliebige Kartennummer verwenden.',
        secureNote: 'Geschützt durch 256-Bit-SSL-Verschlüsselung über die sichere Zahlungsinfrastruktur von iyzico.',
        wordmarkSrc: 'assets/img/brand/payment/pay-with-iyzico-colored-horizontal.svg', acceptedNetworks: 'Mastercard · Visa · American Express · Troy',
        badgeOneClick: 'Schnelle 1-Klick-Zahlung', badgeInstallment: 'Ratenzahlungsvorteil', badgePoints: 'Kartenpunkte nutzen', badgeProtected: 'Geschütztes Einkaufen',
        whatIsTitle: 'Was ist "Bezahlen mit iyzico"?',
        whatIsText: 'Bezahlen mit iyzico speichert Ihre Kartendaten auf der sicheren Infrastruktur von iyzico, damit künftige Einkäufe schnell, mit einem Klick und sicher ablaufen. Ihre Kartendaten werden nicht an Olympos Leather weitergegeben.',
        cardNameLabel: 'Name auf der Karte', cardNumberLabel: 'Kartennummer', cardExpLabel: 'Gültig bis (MM/JJ)', cardCvcLabel: 'CVC',
        submit: 'Bezahlen', processing: 'Wird verarbeitet…',
        summaryTitle: 'Bestellübersicht', editCart: 'Warenkorb bearbeiten', subtotal: 'Zwischensumme',
        successTitle: 'Ihre Bestellung ist eingegangen', successOrderNumber: 'Ihre Bestellnummer:', successNote: 'Sie können diese Nummer auf der Seite zur Sendungsverfolgung verwenden.',
        trackOrder: 'Meine Bestellung verfolgen', continueShopping: 'Weiter einkaufen',
        genericError: 'Die Zahlung konnte nicht verarbeitet werden. Bitte versuchen Sie es erneut.'
      },
      track: {
        backToAccount: 'Zurück zu meinem Konto', eyebrow: 'Bestellung verfolgen', title: 'Verfolgen Sie Ihre Bestellung',
        subtitle: 'Geben Sie Ihre Bestellnummer und die bei der Bestellung verwendete E-Mail-Adresse ein.',
        numberLabel: 'Bestellnummer', numberPlaceholder: 'OLY-XXXXXXXX', emailLabel: 'E-Mail', submit: 'Bestellung suchen',
        notFound: 'Mit diesen Angaben wurde keine Bestellung gefunden.', itemsUnit: 'Artikel',
        stepReceived: 'Bestellung eingegangen', stepPreparing: 'Wird vorbereitet', stepShipped: 'Versandt', stepDelivered: 'Zugestellt'
      },
      login: {
        eyebrow: 'Konto', title: 'Anmelden', noAccount: 'Noch kein Konto?', createAccount: 'Konto erstellen',
        emailLabel: 'E-Mail', passwordLabel: 'Passwort', submit: 'Anmelden', loggingIn: 'Wird angemeldet…',
        guestTrack: 'Ohne Konto bestellt?', trackLink: 'Bestellung verfolgen'
      },
      register: {
        eyebrow: 'Konto', title: 'Konto erstellen', haveAccount: 'Bereits ein Konto?', loginLink: 'Anmelden',
        nameLabel: 'Vor- und Nachname', emailLabel: 'E-Mail', passwordLabel: 'Passwort', password2Label: 'Passwort (Wiederholen)',
        submit: 'Konto erstellen', creating: 'Wird erstellt…', passwordMismatch: 'Die Passwörter stimmen nicht überein.'
      },
      backend: {
        missingFields: 'Bitte füllen Sie alle Felder aus.', weakPassword: 'Das Passwort muss mindestens 6 Zeichen lang sein.', emailExists: 'Für diese E-Mail-Adresse existiert bereits ein Konto.',
        loginMissingFields: 'E-Mail und Passwort sind erforderlich.', invalidCredentials: 'E-Mail oder Passwort ist falsch.', notConfigured: 'Firebase Auth ist noch nicht konfiguriert.',
        notAuthenticated: 'Keine aktive Sitzung gefunden.', profileMissingFields: 'Vor- und Nachname sowie E-Mail sind erforderlich.', userNotFound: 'Benutzer nicht gefunden.',
        invalidCard: 'Ungültige Kartennummer.', cardDeclined: 'Die Karte wurde abgelehnt.', paymentFailed: 'Zahlung fehlgeschlagen. Bitte versuchen Sie es erneut.',
        genericError: 'Etwas ist schiefgelaufen.'
      }
    }
  };

  function getLang() {
    try { return localStorage.getItem(LANG_KEY) || DEFAULT_LANG; } catch { return DEFAULT_LANG; }
  }
  function setLang(lang) {
    try { localStorage.setItem(LANG_KEY, lang); } catch {}
  }
  function getLocale(lang) { return LOCALES[lang || getLang()] || LOCALES[DEFAULT_LANG]; }

  function resolve(dict, key) {
    const parts = key.split('.');
    let cur = dict;
    for (const p of parts) { if (cur == null) return undefined; cur = cur[p]; }
    return cur;
  }

  function t(key, vars, lang) {
    if (typeof vars === 'string') { lang = vars; vars = undefined; }
    lang = lang || getLang();
    let val = resolve(T[lang], key);
    if (val == null) val = resolve(T[DEFAULT_LANG], key);
    if (val == null) return key;
    if (vars) {
      Object.keys(vars).forEach(k => { val = val.replace(new RegExp('\\{' + k + '\\}', 'g'), vars[k]); });
    }
    return val;
  }

  // returns the product's translated field, falling back to the
  // language-neutral base object (Turkish source of truth) for 'tr'
  // or any field/id the override table doesn't cover.
  function tProduct(product, lang) {
    lang = lang || getLang();
    if (!product) return product;
    const override = PRODUCT_I18N[product.id] && PRODUCT_I18N[product.id][lang];
    if (!override) return product;
    return { ...product, ...override };
  }

  function injectAttr(root, attr, apply) {
    root.querySelectorAll(`[${attr}]`).forEach(el => apply(el, el.getAttribute(attr)));
  }

  function applyToDOM(root) {
    root = root || document;
    const lang = getLang();
    if (root === document) document.documentElement.lang = lang;
    injectAttr(root, 'data-i18n', (el, key) => { el.textContent = t(key, lang); });
    injectAttr(root, 'data-i18n-html', (el, key) => { el.innerHTML = t(key, lang); });
    injectAttr(root, 'data-i18n-placeholder', (el, key) => { el.setAttribute('placeholder', t(key, lang)); });
    injectAttr(root, 'data-i18n-aria-label', (el, key) => { el.setAttribute('aria-label', t(key, lang)); });
    injectAttr(root, 'data-i18n-title', (el, key) => { el.setAttribute('title', t(key, lang)); });
    injectAttr(root, 'data-i18n-src', (el, key) => { el.setAttribute('src', t(key, lang)); });
    localizeStaticLinks(root);
  }

  function initSwitcher() {
    document.querySelectorAll('[data-lang-switch]').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.langSwitch === getLang());
      btn.addEventListener('click', () => changeLang(btn.dataset.langSwitch));
    });
  }

  function changeLang(lang) {
    if (!T[lang] || lang === getLang()) { syncSwitcherUI(); return; }
    setLang(lang);
    syncCurrentUrl(lang);
    applyToDOM();
    syncSwitcherUI();
    window.dispatchEvent(new CustomEvent('olympos:langchange', { detail: { lang } }));
  }

  function syncSwitcherUI() {
    const lang = getLang();
    document.querySelectorAll('[data-lang-switch]').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.langSwitch === lang);
    });
  }

  function init() {
    detectLangFromUrl();
    applyToDOM();
    initSwitcher();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  return { t, tProduct, getLang, setLang, getLocale, changeLang, applyToDOM, PRODUCT_I18N, href };
})();
