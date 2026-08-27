/* =========================================================
   OLYMPOS LEATHER — shared site logic
   Product data, cart (localStorage), header/menu, reveals,
   toasts, and page-specific renderers (shop grid / product detail).
   ========================================================= */

const OLYMPOS = (() => {

  const PRODUCTS = [
    {
      id: 'original',
      name: 'Original',
      category: 'kartlik',
      categoryLabel: 'Kartlık',
      price: 1450,
      compareAt: 1690,
      color: 'Siyah / Hardal Sarısı',
      swatch: '#C6872E',
      size: '7,5 × 10,5 cm',
      material: '%100 dana derisi',
      slots: '4 kart bölmesi, 1 gizli bölme',
      tagline: 'Olympos silüetini taşıyan imza kesim',
      description: 'Koleksiyonun ilk parçası. Tek parça bitkisel tabaklanmış dana derisinden kesilir; ön yüzdeki dağ formundaki negatif kesim, altındaki hardal sarısı deriyi ortaya çıkarır. Elde dikilir, elde kenar boyanır.',
      badge: 'Çok Satan',
      images: [
        'assets/img/products/original-1.jpg',
        'assets/img/products/original-2.jpg',
        'assets/img/products/original-3.jpg',
        'assets/img/products/original-4.jpg',
        'assets/img/products/original-5.jpg'
      ]
    },
    {
      id: 'eclipse',
      name: 'Eclipse',
      category: 'kartlik',
      categoryLabel: 'Kartlık',
      price: 1290,
      compareAt: null,
      color: 'Siyah',
      swatch: '#241811',
      size: '8 × 10 cm',
      material: '%100 dana derisi',
      slots: '5 kart bölmesi, para bölmesi',
      tagline: 'Mat ve rugan dokunun keskin karşıtlığı',
      description: 'Aynı derinin iki farklı yüzeyi — mat tabaklı ve yüksek parlak rugan — tek bir gövdede diyagonal olarak kesişir. Sade, düşük profilli, günlük taşıma için tasarlandı.',
      badge: null,
      images: [
        'assets/img/products/eclipse-1.jpg',
        'assets/img/products/eclipse-2.jpg',
        'assets/img/products/eclipse-3.jpg',
        'assets/img/products/eclipse-4.jpg',
        'assets/img/products/eclipse-5.jpg',
        'assets/img/products/eclipse-6.jpg'
      ]
    },
    {
      id: 'flare',
      name: 'Flare',
      category: 'kartlik',
      categoryLabel: 'Kartlık',
      price: 1190,
      compareAt: 1390,
      color: 'Siyah',
      swatch: '#241811',
      size: '7 × 9,5 cm',
      material: '%100 dana derisi',
      slots: '3 kart bölmesi',
      tagline: 'Sadeliğin en ince hali',
      description: 'Süsten arınmış, tek parça deriden kesilen minimal kartlık. Gövde boyunca tek bir dikiş hattı, gösterişsiz ama zamana dayanıklı bir günlük taşıyıcı.',
      badge: 'Yeni',
      images: [
        'assets/img/products/flare-1.jpg',
        'assets/img/products/flare-2.jpg'
      ]
    },
    {
      id: 'classy',
      name: 'Classy',
      category: 'cuzdan',
      categoryLabel: 'Cüzdan',
      price: 1690,
      compareAt: null,
      color: 'Siyah',
      swatch: '#241811',
      size: '9 × 11 cm (katlı)',
      material: '%100 dana derisi',
      slots: '8 kart bölmesi, 2 gizli bölme, banknot bölmesi',
      tagline: 'Geleneksel körüklü kesim, tek parça deri',
      description: 'Bilinen körüklü (bifold) cüzdanın Olympos yorumu. Tek parça deriden kesilir, iç ve dış yüzey aynı posttan gelir; zamanla kullanıcının eliyle şekillenir ve patina yapar.',
      badge: null,
      images: [
        'assets/img/products/classy-1.jpg',
        'assets/img/products/classy-2.jpg',
        'assets/img/products/classy-3.jpg'
      ]
    }
  ];

  const CART_KEY = 'olympos_cart_v1';

  /* ---------------- product overrides (admin panel) ----------------
     yonetici.html edits products through the functions below rather
     than touching PRODUCTS directly, so the hand-authored catalog
     above stays the fallback/reset target. Two localStorage tables:
       - OVERRIDES: { [baseProductId]: { field: value, ..., hidden? } }
         patched onto the matching PRODUCTS entry.
       - CUSTOM: [ {..full product, hidden?} ] products admin added
         from scratch, no PRODUCTS entry to patch.
     An override field always wins over the PRODUCT_I18N table in
     i18n.js — an admin edit should show in every language, not get
     clobbered by the hardcoded EN/DE copy — see mergeTranslation(). */
  const OVERRIDES_KEY = 'olympos_product_overrides_v1';
  const CUSTOM_KEY = 'olympos_custom_products_v1';

  function readLS(key, fallback) {
    try { const v = JSON.parse(localStorage.getItem(key)); return v == null ? fallback : v; }
    catch { return fallback; }
  }
  function writeLS(key, val) { localStorage.setItem(key, JSON.stringify(val)); }
  function readOverrides() { return readLS(OVERRIDES_KEY, {}); }
  function writeOverrides(v) { writeLS(OVERRIDES_KEY, v); }
  function readCustom() { return readLS(CUSTOM_KEY, []); }
  function writeCustom(v) { writeLS(CUSTOM_KEY, v); }

  // maps Turkish letters to plain ASCII, then anything else non-alphanumeric
  // (accents included) is stripped by the final replace — no Unicode
  // normalization needed for the handful of characters this site uses.
  const SLUG_MAP = { 'ç': 'c', 'Ç': 'c', 'ğ': 'g', 'Ğ': 'g', 'ı': 'i', 'İ': 'i', 'ö': 'o', 'Ö': 'o', 'ş': 's', 'Ş': 's', 'ü': 'u', 'Ü': 'u' };
  function slugify(str) {
    const swapped = (str || '').split('').map(ch => SLUG_MAP[ch] || ch).join('');
    return swapped.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-+|-+$)/g, '') || 'urun';
  }

  // every product this store knows about — Turkish base + admin
  // overrides layered on, hidden ones included — for the admin panel.
  function allProductsRaw() {
    const overrides = readOverrides();
    const based = PRODUCTS.map(p => {
      const ov = overrides[p.id] || {};
      return { ...p, ...ov, _overrideKeys: Object.keys(ov).filter(k => k !== 'hidden'), _source: 'base', _hidden: !!ov.hidden };
    });
    const custom = readCustom().map(p => ({ ...p, _overrideKeys: Object.keys(p), _source: 'custom', _hidden: !!p.hidden }));
    return [...based, ...custom];
  }

  // i18n's tProduct() would otherwise let a hardcoded EN/DE translation
  // clobber a field the admin just edited — re-apply those fields after.
  function mergeTranslation(p) {
    const translated = window.OLYMPOS_I18N.tProduct(p);
    (p._overrideKeys || []).forEach(k => { translated[k] = p[k]; });
    const { _overrideKeys, _source, _hidden, ...clean } = translated;
    return clean;
  }

  // PRODUCTS above carries the Turkish source text; getProducts/getProduct
  // always hand back the copy localized for whatever language is active,
  // with any admin-panel edits layered on top.
  function getProducts() { return allProductsRaw().filter(p => !p._hidden).map(mergeTranslation); }
  function getProduct(id) {
    const p = allProductsRaw().find(p => p.id === id && !p._hidden) || null;
    return p ? mergeTranslation(p) : null;
  }

  /* ---------------- admin: product CRUD ---------------- */
  function adminListProducts() { return allProductsRaw(); }
  function adminGetProduct(id) { return allProductsRaw().find(p => p.id === id) || null; }

  function adminUpdateProduct(id, fields) {
    const customList = readCustom();
    const idx = customList.findIndex(p => p.id === id);
    if (idx !== -1) {
      customList[idx] = { ...customList[idx], ...fields };
      writeCustom(customList);
      return customList[idx];
    }
    const overrides = readOverrides();
    overrides[id] = { ...(overrides[id] || {}), ...fields };
    writeOverrides(overrides);
    return { ...PRODUCTS.find(p => p.id === id), ...overrides[id] };
  }

  function adminAddProduct(fields) {
    const base = {
      category: 'kartlik', categoryLabel: 'Kartlık', price: 0, compareAt: null,
      color: '', swatch: '#241811', size: '', material: '%100 dana derisi', slots: '',
      tagline: '', description: '', badge: null, images: [], hidden: false
    };
    const existingIds = new Set([...PRODUCTS.map(p => p.id), ...readCustom().map(p => p.id)]);
    let id = slugify(fields.name);
    while (existingIds.has(id)) id = slugify(fields.name) + '-' + Math.random().toString(36).slice(2, 5);
    const product = { ...base, ...fields, id };
    const customList = readCustom();
    customList.push(product);
    writeCustom(customList);
    return product;
  }

  function adminSetHidden(id, hidden) {
    const customList = readCustom();
    const idx = customList.findIndex(p => p.id === id);
    if (idx !== -1) { customList[idx].hidden = hidden; writeCustom(customList); return; }
    const overrides = readOverrides();
    overrides[id] = { ...(overrides[id] || {}), hidden };
    writeOverrides(overrides);
  }

  function adminResetProduct(id) {
    const overrides = readOverrides();
    delete overrides[id];
    writeOverrides(overrides);
  }

  function adminDeleteCustomProduct(id) {
    writeCustom(readCustom().filter(p => p.id !== id));
  }

  function formatPrice(n) {
    return n.toLocaleString(window.OLYMPOS_I18N.getLocale(), { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ₺';
  }

  /* ---------------- cart storage ---------------- */
  function readCart() {
    try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; }
    catch { return []; }
  }
  function writeCart(cart) {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
    renderCartDrawer();
    updateCartCount();
  }
  function cartCount() { return readCart().reduce((s, l) => s + l.qty, 0); }
  function cartLines() {
    return readCart().map(l => ({ ...l, product: getProduct(l.id) })).filter(l => l.product);
  }
  function cartSubtotal() {
    return cartLines().reduce((s, l) => s + l.product.price * l.qty, 0);
  }

  function addToCart(id, qty = 1) {
    const cart = readCart();
    const line = cart.find(l => l.id === id);
    if (line) line.qty += qty; else cart.push({ id, qty });
    writeCart(cart);
    openDrawer();
    const p = getProduct(id);
    if (p) toast(window.OLYMPOS_I18N.t('cart.addedToast', { name: p.name }), 'cart');
    pulseCartIcon();
  }
  function setQty(id, qty) {
    let cart = readCart();
    if (qty <= 0) { cart = cart.filter(l => l.id !== id); }
    else { const l = cart.find(l => l.id === id); if (l) l.qty = qty; }
    writeCart(cart);
  }
  function removeFromCart(id) { setQty(id, 0); }
  function clearCart() { writeCart([]); }

  function updateCartCount() {
    document.querySelectorAll('[data-cart-count]').forEach(el => {
      const n = cartCount();
      el.textContent = n;
      el.classList.toggle('show', n > 0);
    });
  }
  function pulseCartIcon() {
    document.querySelectorAll('[data-cart-count]').forEach(el => {
      el.classList.remove('pulse');
      void el.offsetWidth;
      el.classList.add('pulse');
    });
  }

  /* ---------------- toast ---------------- */
  function toast(message, kind = 'info') {
    let wrap = document.querySelector('.toast-wrap');
    if (!wrap) {
      wrap = document.createElement('div');
      wrap.className = 'toast-wrap';
      document.body.appendChild(wrap);
    }
    const el = document.createElement('div');
    el.className = 'toast';
    const icon = kind === 'cart'
      ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6 9 17l-5-5"/></svg>'
      : '<span class="glyph" style="--gsize:14px"></span>';
    el.innerHTML = `${icon}<span>${message}</span>`;
    wrap.appendChild(el);
    setTimeout(() => {
      el.classList.add('leave');
      setTimeout(() => el.remove(), 400);
    }, 2600);
  }

  /* ---------------- cart drawer ---------------- */
  function openDrawer() {
    document.getElementById('cart-drawer')?.classList.add('open');
    document.getElementById('drawer-backdrop')?.classList.add('open');
    document.body.style.overflow = 'hidden';
  }
  function closeDrawer() {
    document.getElementById('cart-drawer')?.classList.remove('open');
    document.getElementById('drawer-backdrop')?.classList.remove('open');
    document.body.style.overflow = '';
  }

  function renderCartDrawer() {
    const list = document.getElementById('cart-lines');
    const subtotalEl = document.getElementById('cart-subtotal');
    const emptyEl = document.getElementById('cart-empty');
    const footEl = document.getElementById('cart-foot');
    if (!list) return;
    const lines = cartLines();

    if (lines.length === 0) {
      list.innerHTML = '';
      if (emptyEl) emptyEl.style.display = 'flex';
      if (footEl) footEl.style.display = 'none';
      return;
    }
    if (emptyEl) emptyEl.style.display = 'none';
    if (footEl) footEl.style.display = 'block';

    const T = window.OLYMPOS_I18N;
    list.innerHTML = lines.map(l => `
      <div class="cart-line" data-line="${l.id}">
        <img src="${l.product.images[0]}" alt="${l.product.name}">
        <div style="flex:1; min-width:0;">
          <div style="display:flex; justify-content:space-between; gap:.5rem;">
            <p style="font-family:var(--font-display); font-size:.95rem; color:var(--umber-800);">${l.product.name}</p>
            <button aria-label="${T.t('cart.removeAria')}" data-remove="${l.id}" style="color:var(--umber-500);">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>
          </div>
          <p style="font-size:.78rem; color:var(--umber-500); margin-top:2px;">${l.product.color}</p>
          <div style="display:flex; align-items:center; justify-content:space-between; margin-top:.6rem;">
            <div class="qty-stepper">
              <button data-step="-1" data-id="${l.id}" aria-label="${T.t('cart.decreaseAria')}">−</button>
              <span>${l.qty}</span>
              <button data-step="1" data-id="${l.id}" aria-label="${T.t('cart.increaseAria')}">+</button>
            </div>
            <span style="font-size:.88rem; color:var(--umber-800); font-weight:500;">${formatPrice(l.product.price * l.qty)}</span>
          </div>
        </div>
      </div>
    `).join('');

    if (subtotalEl) subtotalEl.textContent = formatPrice(cartSubtotal());

    list.querySelectorAll('[data-step]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        const delta = parseInt(btn.dataset.step, 10);
        const current = readCart().find(l => l.id === id);
        if (current) setQty(id, current.qty + delta);
      });
    });
    list.querySelectorAll('[data-remove]').forEach(btn => {
      btn.addEventListener('click', () => removeFromCart(btn.dataset.remove));
    });
  }

  function initCartUI() {
    updateCartCount();
    renderCartDrawer();
    document.querySelectorAll('[data-open-cart]').forEach(el => el.addEventListener('click', (e) => { e.preventDefault(); openDrawer(); }));
    document.querySelectorAll('[data-close-cart]').forEach(el => el.addEventListener('click', closeDrawer));
    document.getElementById('drawer-backdrop')?.addEventListener('click', closeDrawer);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeDrawer(); });
    document.getElementById('checkout-btn')?.addEventListener('click', () => {
      if (readCart().length === 0) return;
      window.location.href = 'odeme.html';
    });
  }

  /* ---------------- product search ---------------- */
  let searchRender = null;
  function initSearch() {
    const overlay = document.getElementById('search-overlay');
    const backdrop = document.getElementById('search-backdrop');
    const input = document.getElementById('search-input');
    const resultsEl = document.getElementById('search-results');
    const emptyEl = document.getElementById('search-empty');
    const hintEl = document.getElementById('search-hint');
    if (!overlay || !input) return;

    function openSearch() {
      document.getElementById('mobile-menu')?.classList.remove('open');
      overlay.classList.add('open');
      backdrop.classList.add('open');
      document.body.style.overflow = 'hidden';
      setTimeout(() => input.focus(), 50);
    }
    function closeSearch() {
      overlay.classList.remove('open');
      backdrop.classList.remove('open');
      document.body.style.overflow = '';
    }

    function render() {
      const q = input.value.trim().toLowerCase();
      if (!q) {
        resultsEl.innerHTML = '';
        emptyEl.style.display = 'none';
        hintEl.style.display = 'block';
        return;
      }
      hintEl.style.display = 'none';
      const matches = getProducts().filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.categoryLabel.toLowerCase().includes(q) ||
        p.tagline.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.color.toLowerCase().includes(q)
      );
      if (matches.length === 0) {
        resultsEl.innerHTML = '';
        emptyEl.style.display = 'block';
        return;
      }
      emptyEl.style.display = 'none';
      resultsEl.innerHTML = matches.map(p => `
        <a href="urun.html?id=${p.id}" class="search-result">
          <img src="${p.images[0]}" alt="">
          <div>
            <p class="search-result-name">${p.name}</p>
            <p class="search-result-meta">${p.categoryLabel} · ${formatPrice(p.price)}</p>
          </div>
        </a>
      `).join('');
    }
    searchRender = render;

    document.querySelectorAll('[data-open-search]').forEach(el => el.addEventListener('click', (e) => { e.preventDefault(); openSearch(); }));
    document.querySelectorAll('[data-close-search]').forEach(el => el.addEventListener('click', closeSearch));
    backdrop?.addEventListener('click', closeSearch);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && overlay.classList.contains('open')) closeSearch(); });
    input.addEventListener('input', render);
  }

  /* ---------------- header / mobile menu ---------------- */
  function initHeader() {
    const header = document.querySelector('.site-header');
    const onScroll = () => { if (header) header.classList.toggle('scrolled', window.scrollY > 12); };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });

    const menuBtns = document.querySelectorAll('[data-menu-toggle]');
    const menu = document.getElementById('mobile-menu');
    menuBtns.forEach(btn => btn.addEventListener('click', () => {
      const open = menu.classList.toggle('open');
      document.body.style.overflow = open ? 'hidden' : '';
      menuBtns.forEach(b => b.setAttribute('aria-expanded', String(open)));
    }));
    menu?.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
      menu.classList.remove('open');
      document.body.style.overflow = '';
    }));
  }

  /* ---------------- scroll reveal ---------------- */
  function initReveal() {
    const targets = document.querySelectorAll('.reveal, .reveal-stagger');
    if (!('IntersectionObserver' in window) || targets.length === 0) {
      targets.forEach(t => t.classList.add('in-view'));
      return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -60px 0px' });
    targets.forEach(t => io.observe(t));
  }

  /* ---------------- product card markup ---------------- */
  function productCardHTML(p, opts = {}) {
    const T = window.OLYMPOS_I18N;
    const cmp = p.compareAt ? `<span class="price-strike">${formatPrice(p.compareAt)}</span> ` : '';
    return `
    <article class="product-card">
      <a href="urun.html?id=${p.id}" aria-label="${T.t('product.viewProductAria', { name: p.name })}">
        <div class="product-frame">
          ${p.badge ? `<span class="badge">${p.badge}</span>` : ''}
          <img src="${p.images[0]}" alt="${p.name} — ${p.tagline}" loading="lazy" width="800" height="1000" style="object-position:${p.imagePosition || 'center'};">
          <div class="frame-overlay"></div>
          <div class="quick-add">
            <button class="btn btn-accent btn-sm btn-block" data-quick-add="${p.id}">${T.t('product.addToCart')}</button>
          </div>
        </div>
      </a>
      <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-top:1rem; gap:.75rem;">
        <div>
          <a href="urun.html?id=${p.id}" style="display:block;">
            <h3 style="font-family:var(--font-display); font-size:1.05rem; color:var(--umber-800);">${p.name}</h3>
          </a>
          <p style="font-size:.78rem; color:var(--umber-500); margin-top:2px;">${p.categoryLabel}</p>
        </div>
        <span class="glyph card-glyph" style="margin-top:4px;"></span>
      </div>
      <p style="margin-top:.5rem; font-size:.92rem; color:var(--umber-800);">${cmp}${formatPrice(p.price)}</p>
    </article>`;
  }

  function bindQuickAdd(root = document) {
    root.querySelectorAll('[data-quick-add]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault(); e.stopPropagation();
        addToCart(btn.dataset.quickAdd, 1);
      });
    });
  }

  /* ---------------- shop grid stitch hover fx ----------------
     Coordinates are baked in (not left to the SVG's own scaling) so
     the thread sits snug against the card — and lands in the exact
     same spot — on every card everywhere, regardless of that card's
     own aspect ratio (shop grid cards are 3:4, homepage cards 4:5).
     preserveAspectRatio="none" makes the viewBox map to the card's
     box 1:1 on both axes, so a % is always the same % on any card. */
  function stitchBackLayerSVG() {
    return `
    <svg class="stitch-layer back-layer" viewBox="0 0 300 400" preserveAspectRatio="none" aria-hidden="true">
      <path class="stitch-path b0" d="M -1.9,23 C -1.9,31 14.1,38 23.4,38" />
      <path class="stitch-path b1" d="M -1.9,53 C -1.9,61 14.1,68 23.4,68" />
      <path class="stitch-path b2" d="M -1.9,83 C -1.9,91 14.1,98 23.4,98" />
      <path class="stitch-path b3" d="M -1.9,113 C -1.9,121 14.1,128 23.4,128" />
      <path class="stitch-path b4" d="M -1.9,143 C -1.9,151 14.1,158 23.4,158" />
      <path class="stitch-path b5" d="M -1.9,173 C -1.9,181 14.1,188 23.4,188" />
    </svg>`;
  }
  function stitchFrontLayerSVG() {
    return `
    <svg class="stitch-layer front-layer" viewBox="0 0 300 400" preserveAspectRatio="none" aria-hidden="true">
      <path class="stitch-path f1" d="M 23.4,38 C 14.1,38 -1.9,45 -1.9,53" />
      <path class="stitch-path f2" d="M 23.4,68 C 14.1,68 -1.9,75 -1.9,83" />
      <path class="stitch-path f3" d="M 23.4,98 C 14.1,98 -1.9,105 -1.9,113" />
      <path class="stitch-path f4" d="M 23.4,128 C 14.1,128 -1.9,135 -1.9,143" />
      <path class="stitch-path f5" d="M 23.4,158 C 14.1,158 -1.9,165 -1.9,173" />
      <path class="stitch-path f6" d="M 23.4,188 C 14.1,188 -1.9,195 -1.9,203" />
    </svg>`;
  }
  function stitchHolesWrapperHTML() {
    // matches the paths' touch point exactly: x=23.4, y=38/68/.../188
    // out of the stitch-layer's fixed 300x400px box (shifted down 7px,
    // same as .stitch-layer's top:7px) — plain px, not %, so the
    // first hole always lands exactly 45px below the card's top edge
    // on every card, everywhere, regardless of that card's own size.
    const ys = [38, 68, 98, 128, 158, 188];
    return `
    <div class="holes-wrapper">
      ${ys.map((y, i) => {
        const top = y + 7;
        return `<div class="punch-hole ph-${i + 1}" style="top: calc(${top}px - 3px); left: calc(23.4px - 3px);"></div>`;
      }).join('')}
    </div>`;
  }

  // attaches the wrap-around stitch/lacing hover fx to every .product-frame
  // inside the given grid container (used by both the shop grid and the
  // homepage featured grid)
  function attachStitchFX(grid) {
    if (!grid) return;
    grid.querySelectorAll('.product-frame').forEach(frame => {
      const wrap = document.createElement('div');
      wrap.className = 'olympos-card-wrapper';
      frame.parentNode.insertBefore(wrap, frame);
      wrap.insertAdjacentHTML('beforeend', stitchBackLayerSVG());
      wrap.appendChild(frame);
      wrap.insertAdjacentHTML('beforeend', stitchFrontLayerSVG());
      frame.insertAdjacentHTML('beforeend', stitchHolesWrapperHTML());
    });
  }

  /* ---------------- shop grid (magaza.html) ---------------- */
  let shopGridRender = null;
  function initShopGrid() {
    const grid = document.getElementById('shop-grid');
    if (!grid) return;
    const filterBtns = document.querySelectorAll('[data-filter]');
    const sortSelect = document.getElementById('sort-select');
    const countEl = document.getElementById('result-count');
    let activeFilter = 'all';

    function render() {
      let list = getProducts();
      if (activeFilter !== 'all') list = list.filter(p => p.category === activeFilter);
      const sortVal = sortSelect ? sortSelect.value : 'featured';
      list = [...list];
      if (sortVal === 'price-asc') list.sort((a, b) => a.price - b.price);
      if (sortVal === 'price-desc') list.sort((a, b) => b.price - a.price);
      if (sortVal === 'name') list.sort((a, b) => a.name.localeCompare(b.name, window.OLYMPOS_I18N.getLang()));

      grid.classList.remove('in-view');
      grid.innerHTML = list.map(p => productCardHTML(p)).join('');
      attachStitchFX(grid);
      requestAnimationFrame(() => grid.classList.add('in-view'));
      bindQuickAdd(grid);
      if (countEl) countEl.textContent = window.OLYMPOS_I18N.t('shop.resultCount', { n: list.length });
    }
    shopGridRender = render;

    filterBtns.forEach(btn => btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeFilter = btn.dataset.filter;
      render();
    }));
    sortSelect?.addEventListener('change', render);
    render();
  }

  /* ---------------- product detail (urun.html) ---------------- */
  let productDetailId = null;
  function paintProductDetail() {
    const root = document.getElementById('product-detail');
    if (!root || !productDetailId) return;
    const p = getProduct(productDetailId) || getProducts()[0];

    document.title = `${p.name} — Olympos Leather`;
    const metaDesc = `${p.name} — ${p.tagline} ${p.description}`.slice(0, 160);
    document.querySelector('meta[name="description"]')?.setAttribute('content', metaDesc);
    document.querySelector('meta[property="og:title"]')?.setAttribute('content', document.title);
    document.querySelector('meta[property="og:description"]')?.setAttribute('content', metaDesc);
    document.querySelector('meta[name="twitter:title"]')?.setAttribute('content', document.title);
    document.querySelector('meta[name="twitter:description"]')?.setAttribute('content', metaDesc);

    root.querySelectorAll('[data-field="name"]').forEach(el => el.textContent = p.name);
    root.querySelectorAll('[data-field="category"]').forEach(el => el.textContent = p.categoryLabel);
    root.querySelectorAll('[data-field="tagline"]').forEach(el => el.textContent = p.tagline);
    root.querySelectorAll('[data-field="description"]').forEach(el => el.textContent = p.description);
    root.querySelectorAll('[data-field="material"]').forEach(el => el.textContent = p.material);
    root.querySelectorAll('[data-field="size"]').forEach(el => el.textContent = p.size);
    root.querySelectorAll('[data-field="slots"]').forEach(el => el.textContent = p.slots);
    root.querySelectorAll('[data-field="color"]').forEach(el => el.textContent = p.color);
    root.querySelectorAll('[data-field="price"]').forEach(el => el.textContent = formatPrice(p.price));
    root.querySelectorAll('[data-field="swatch"]').forEach(el => el.style.background = p.swatch);

    const cmpWrap = root.querySelector('[data-field="compare-wrap"]');
    if (cmpWrap) {
      if (p.compareAt) { cmpWrap.style.display = ''; cmpWrap.textContent = formatPrice(p.compareAt); }
      else cmpWrap.style.display = 'none';
    }
    const badgeEl = root.querySelector('[data-field="badge"]');
    if (badgeEl) { if (p.badge) { badgeEl.textContent = p.badge; badgeEl.style.display = ''; } else badgeEl.style.display = 'none'; }

    // gallery
    const mainImg = document.getElementById('gallery-main');
    const thumbsWrap = document.getElementById('gallery-thumbs');
    const imgPos = p.imagePosition || 'center';
    if (mainImg) { mainImg.src = p.images[0]; mainImg.style.objectPosition = imgPos; }
    if (thumbsWrap) {
      thumbsWrap.innerHTML = p.images.map((src, i) => `
        <button class="gallery-thumb ${i === 0 ? 'active' : ''}" data-src="${src}" aria-label="${window.OLYMPOS_I18N.t('product.imageAria', { n: i + 1 })}">
          <img src="${src}" alt="${p.name} detay ${i + 1}" width="120" height="150" style="width:100%; height:100%; object-fit:cover; object-position:${imgPos};">
        </button>`).join('');
      thumbsWrap.querySelectorAll('.gallery-thumb').forEach(btn => {
        btn.addEventListener('click', () => {
          thumbsWrap.querySelectorAll('.gallery-thumb').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          if (mainImg) {
            mainImg.style.opacity = 0;
            setTimeout(() => { mainImg.src = btn.dataset.src; mainImg.style.opacity = 1; }, 180);
          }
        });
      });
    }

    // breadcrumb
    document.querySelectorAll('[data-field="breadcrumb"]').forEach(el => el.textContent = p.name);

    // related products
    const relatedWrap = document.getElementById('related-products');
    if (relatedWrap) {
      const related = getProducts().filter(x => x.id !== p.id && x.category === p.category).slice(0, 4);
      const fallback = getProducts().filter(x => x.id !== p.id).slice(0, 4);
      const list = related.length ? related : fallback;
      relatedWrap.innerHTML = list.map(x => productCardHTML(x)).join('');
      bindQuickAdd(relatedWrap);
    }

    const origin = window.location.origin;
    injectLD({
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: p.name,
      description: p.description,
      sku: p.id,
      image: p.images.map(src => origin + '/' + src),
      offers: {
        '@type': 'Offer',
        priceCurrency: 'TRY',
        price: p.price,
        availability: 'https://schema.org/InStock',
        url: origin + '/urun.html?id=' + p.id
      }
    }, 'product');
  }

  function initProductDetail() {
    const root = document.getElementById('product-detail');
    if (!root) return;
    const params = new URLSearchParams(window.location.search);
    productDetailId = params.get('id') || getProducts()[0].id;

    paintProductDetail();

    // quantity stepper + add-to-cart: bound once, read the live product
    // (via productDetailId, unaffected by later language switches) at
    // click-time so re-painting for a new language never double-binds.
    const qtyEl = document.getElementById('pdp-qty');
    document.getElementById('pdp-qty-minus')?.addEventListener('click', () => {
      qtyEl.textContent = Math.max(1, parseInt(qtyEl.textContent, 10) - 1);
    });
    document.getElementById('pdp-qty-plus')?.addEventListener('click', () => {
      qtyEl.textContent = Math.min(9, parseInt(qtyEl.textContent, 10) + 1);
    });
    document.getElementById('pdp-add-to-cart')?.addEventListener('click', () => {
      const qty = qtyEl ? parseInt(qtyEl.textContent, 10) : 1;
      addToCart(productDetailId, qty);
    });

    initReveal();
  }

  /* ---------------- accordion ---------------- */
  function initAccordion() {
    document.querySelectorAll('.accordion-item').forEach(item => {
      item.querySelector('.accordion-trigger')?.addEventListener('click', () => {
        const isOpen = item.classList.contains('open');
        item.parentElement?.querySelectorAll('.accordion-item').forEach(i => i.classList.remove('open'));
        if (!isOpen) item.classList.add('open');
      });
    });
  }

  /* ---------------- contact form ---------------- */
  function initContactForm() {
    const form = document.getElementById('contact-form');
    if (!form) return;
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const T = window.OLYMPOS_I18N;
      const btn = form.querySelector('button[type="submit"]');
      const original = btn.textContent;
      btn.textContent = T.t('contact.formSending');
      btn.disabled = true;
      setTimeout(() => {
        toast(T.t('contact.formSuccessToast'), 'info');
        form.reset();
        btn.textContent = original;
        btn.disabled = false;
      }, 900);
    });
  }

  /* ---------------- footer year ---------------- */
  function initFooterYear() {
    document.querySelectorAll('[data-year]').forEach(el => el.textContent = new Date().getFullYear());
  }

  /* ---------------- structured data (schema.org JSON-LD) ----------------
     Built from location.origin at runtime rather than a hardcoded domain,
     so it's correct on the live site, a preview deploy, or localhost
     without needing to bake a production URL into the page. */
  function injectLD(obj, id) {
    if (id) document.querySelector(`script[data-ld-id="${id}"]`)?.remove();
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    if (id) script.setAttribute('data-ld-id', id);
    script.textContent = JSON.stringify(obj);
    document.head.appendChild(script);
  }
  function initStructuredData() {
    const origin = window.location.origin;
    injectLD({
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: 'Olympos Leather',
      url: origin + '/index.html',
      logo: origin + '/assets/img/brand/logo.png',
      sameAs: ['https://www.instagram.com/olymposleathers/']
    }, 'organization');

    const crumbNav = document.querySelector('nav[aria-label="Breadcrumb"]');
    if (crumbNav) {
      const nodes = Array.from(crumbNav.querySelectorAll('a, span:not(:empty)')).filter(el => el.tagName !== 'SPAN' || el.textContent !== '/');
      const items = nodes.map((el, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: el.textContent.trim(),
        item: el.tagName === 'A' ? origin + '/' + el.getAttribute('href') : undefined
      }));
      injectLD({ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: items }, 'breadcrumb');
    }
  }

  /* ---------------- boot ---------------- */
  /* ---------------- hero intro video (index.html) ---------------- */
  function initHeroVideo() {
    const video = document.getElementById('hero-video');
    if (!video) return;
    const badge = document.getElementById('hero-video-badge');
    const scrim = document.getElementById('hero-video-scrim');
    const content = document.getElementById('hero-content');
    video.addEventListener('ended', () => {
      video.classList.add('is-hidden');
      if (badge) badge.classList.add('is-hidden');
      if (scrim) scrim.classList.add('is-hidden');
      if (content) content.classList.add('is-visible');
    });
  }

  function init() {
    initHeader();
    initCartUI();
    initSearch();
    bindQuickAdd(document);
    initReveal();
    initShopGrid();
    initProductDetail();
    initAccordion();
    initContactForm();
    initFooterYear();
    initHeroVideo();
    initStructuredData();

    // repaint anything site.js rendered in JS (product cards, cart
    // lines, PDP fields) whenever the language switcher fires —
    // static markup is handled separately by i18n.js itself.
    window.addEventListener('olympos:langchange', () => {
      renderCartDrawer();
      if (shopGridRender) shopGridRender();
      if (productDetailId) paintProductDetail();
      if (searchRender) searchRender();
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  return {
    getProducts, getProduct, formatPrice, addToCart, toast, productCardHTML, bindQuickAdd, attachStitchFX,
    cartLines, cartSubtotal, cartCount, clearCart, setQty, removeFromCart,
    adminListProducts, adminGetProduct, adminUpdateProduct, adminAddProduct, adminSetHidden, adminResetProduct, adminDeleteCustomProduct
  };
})();
