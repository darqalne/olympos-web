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

  function getProducts() { return PRODUCTS; }
  function getProduct(id) { return PRODUCTS.find(p => p.id === id) || null; }

  function formatPrice(n) {
    return n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ₺';
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
    if (p) toast(`${p.name} sepete eklendi`, 'cart');
    pulseCartIcon();
  }
  function setQty(id, qty) {
    let cart = readCart();
    if (qty <= 0) { cart = cart.filter(l => l.id !== id); }
    else { const l = cart.find(l => l.id === id); if (l) l.qty = qty; }
    writeCart(cart);
  }
  function removeFromCart(id) { setQty(id, 0); }

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

    list.innerHTML = lines.map(l => `
      <div class="cart-line" data-line="${l.id}">
        <img src="${l.product.images[0]}" alt="${l.product.name}">
        <div style="flex:1; min-width:0;">
          <div style="display:flex; justify-content:space-between; gap:.5rem;">
            <p style="font-family:var(--font-display); font-size:.95rem; color:var(--umber-800);">${l.product.name}</p>
            <button aria-label="Kaldır" data-remove="${l.id}" style="color:var(--umber-500);">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>
          </div>
          <p style="font-size:.78rem; color:var(--umber-500); margin-top:2px;">${l.product.color}</p>
          <div style="display:flex; align-items:center; justify-content:space-between; margin-top:.6rem;">
            <div class="qty-stepper">
              <button data-step="-1" data-id="${l.id}" aria-label="Azalt">−</button>
              <span>${l.qty}</span>
              <button data-step="1" data-id="${l.id}" aria-label="Artır">+</button>
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
      toast('Ödeme altyapısı yakında entegre edilecek — bu bir vitrin demosudur.', 'info');
    });
  }

  /* ---------------- header / mobile menu ---------------- */
  function initHeader() {
    const header = document.querySelector('.site-header');
    const onScroll = () => { if (header) header.classList.toggle('scrolled', window.scrollY > 12); };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });

    const menuBtn = document.querySelector('[data-menu-toggle]');
    const menu = document.getElementById('mobile-menu');
    menuBtn?.addEventListener('click', () => {
      const open = menu.classList.toggle('open');
      document.body.style.overflow = open ? 'hidden' : '';
      menuBtn.setAttribute('aria-expanded', String(open));
    });
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
    const cmp = p.compareAt ? `<span class="price-strike">${formatPrice(p.compareAt)}</span> ` : '';
    return `
    <article class="product-card">
      <a href="urun.html?id=${p.id}" aria-label="${p.name} ürününü görüntüle">
        <div class="product-frame">
          ${p.badge ? `<span class="badge">${p.badge}</span>` : ''}
          <img src="${p.images[0]}" alt="${p.name} — ${p.tagline}" loading="lazy" width="800" height="1000" style="object-position:${p.imagePosition || 'center'};">
          <div class="frame-overlay"></div>
          <div class="quick-add">
            <button class="btn btn-accent btn-sm btn-block" data-quick-add="${p.id}">Sepete Ekle</button>
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

  /* ---------------- shop grid stitch hover fx ---------------- */
  function stitchBackLayerSVG() {
    return `
    <svg class="stitch-layer back-layer" viewBox="0 0 300 400" aria-hidden="true">
      <path class="stitch-path b0" d="M -12,23 C -12,31 5,38 15,38" />
      <path class="stitch-path b1" d="M -12,53 C -12,61 5,68 15,68" />
      <path class="stitch-path b2" d="M -12,83 C -12,91 5,98 15,98" />
      <path class="stitch-path b3" d="M -12,113 C -12,121 5,128 15,128" />
      <path class="stitch-path b4" d="M -12,143 C -12,151 5,158 15,158" />
      <path class="stitch-path b5" d="M -12,173 C -12,181 5,188 15,188" />
    </svg>`;
  }
  function stitchFrontLayerSVG() {
    return `
    <svg class="stitch-layer front-layer" viewBox="0 0 300 400" aria-hidden="true">
      <path class="stitch-path f1" d="M 15,38 C 5,38 -12,45 -12,53" />
      <path class="stitch-path f2" d="M 15,68 C 5,68 -12,75 -12,83" />
      <path class="stitch-path f3" d="M 15,98 C 5,98 -12,105 -12,113" />
      <path class="stitch-path f4" d="M 15,128 C 5,128 -12,135 -12,143" />
      <path class="stitch-path f5" d="M 15,158 C 5,158 -12,165 -12,173" />
      <path class="stitch-path f6" d="M 15,188 C 5,188 -12,195 -12,203" />
    </svg>`;
  }
  function stitchHolesWrapperHTML() {
    // must match the thread paths' entry point exactly: x=15,y=38/68/.../188
    // in the 300x400 viewBox, as a % of the wrapper so it tracks the SVG's
    // own scaling instead of drifting at real card sizes other than 300x400px
    const ys = [38, 68, 98, 128, 158, 188];
    return `
    <div class="holes-wrapper">
      ${ys.map((y, i) => {
        const top = (y / 400 * 100).toFixed(3);
        return `<div class="punch-hole ph-${i + 1}" style="top: calc(${top}% - 3px); left: calc(5% - 3px);"></div>`;
      }).join('')}
    </div>`;
  }

  /* ---------------- shop grid (magaza.html) ---------------- */
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
      if (sortVal === 'name') list.sort((a, b) => a.name.localeCompare(b.name, 'tr'));

      grid.classList.remove('in-view');
      grid.innerHTML = list.map(p => productCardHTML(p)).join('');
      grid.querySelectorAll('.product-frame').forEach(frame => {
        const wrap = document.createElement('div');
        wrap.className = 'olympos-card-wrapper';
        frame.parentNode.insertBefore(wrap, frame);
        wrap.insertAdjacentHTML('beforeend', stitchBackLayerSVG());
        wrap.appendChild(frame);
        wrap.insertAdjacentHTML('beforeend', stitchFrontLayerSVG());
        frame.insertAdjacentHTML('beforeend', stitchHolesWrapperHTML());
      });
      requestAnimationFrame(() => grid.classList.add('in-view'));
      bindQuickAdd(grid);
      if (countEl) countEl.textContent = `${list.length} ürün`;
    }

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
  function initProductDetail() {
    const root = document.getElementById('product-detail');
    if (!root) return;
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id') || getProducts()[0].id;
    const p = getProduct(id) || getProducts()[0];

    document.title = `${p.name} — Olympos Leather`;

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
        <button class="gallery-thumb ${i === 0 ? 'active' : ''}" data-src="${src}" aria-label="Görsel ${i + 1}">
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

    // quantity stepper on PDP
    const qtyEl = document.getElementById('pdp-qty');
    document.getElementById('pdp-qty-minus')?.addEventListener('click', () => {
      qtyEl.textContent = Math.max(1, parseInt(qtyEl.textContent, 10) - 1);
    });
    document.getElementById('pdp-qty-plus')?.addEventListener('click', () => {
      qtyEl.textContent = Math.min(9, parseInt(qtyEl.textContent, 10) + 1);
    });

    document.getElementById('pdp-add-to-cart')?.addEventListener('click', () => {
      const qty = qtyEl ? parseInt(qtyEl.textContent, 10) : 1;
      addToCart(p.id, qty);
    });

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
      const btn = form.querySelector('button[type="submit"]');
      const original = btn.textContent;
      btn.textContent = 'Gönderiliyor…';
      btn.disabled = true;
      setTimeout(() => {
        toast('Mesajınız alındı. En kısa sürede dönüş yapacağız.', 'info');
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

  /* ---------------- boot ---------------- */
  function init() {
    initHeader();
    initCartUI();
    bindQuickAdd(document);
    initReveal();
    initShopGrid();
    initProductDetail();
    initAccordion();
    initContactForm();
    initFooterYear();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  return { getProducts, getProduct, formatPrice, addToCart, toast, productCardHTML, bindQuickAdd };
})();
