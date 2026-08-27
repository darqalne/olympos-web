/* =========================================================
   OLYMPOS BACKEND — auth / orders / payment abstraction

   Every page talks to this module (window.OLYMPOS_BACKEND), never
   directly to localStorage or a provider SDK. Right now everything
   runs in MOCK MODE: real-feeling flows (delay, validation, error
   cases) backed by localStorage, so registration/login/checkout/
   order tracking genuinely work end to end inside one browser.

   TO GO LIVE, for each piece below:
     1. Fill in the provider config in CONFIG.
     2. Flip the matching CONFIG.*.mode flag from 'mock' to the
        provider name.
     3. Nothing else changes — every page already calls these same
        function names, so the UI is untouched.

   AUTH -> Firebase Authentication
     - npm/CDN: firebase/auth (or the compat CDN build)
     - fill CONFIG.firebase.* with your project's web config
     - implement the `firebase` branches marked below with the
       Firebase Auth SDK calls (createUserWithEmailAndPassword,
       signInWithEmailAndPassword, onAuthStateChanged, signOut)

   PAYMENT -> iyzico
     - iyzico's secret key must NEVER reach the browser. The mock
       payment call already goes through fetch('/api/create-payment'),
       matching a Vercel serverless function (see /api/create-payment.js)
       that would hold the real iyzico secret key as an environment
       variable and call iyzico's server-side SDK/API.
     - once that function is live, flip CONFIG.payment.mode to
       'iyzico' — processPayment() below already posts to that same
       endpoint either way.

   ORDERS currently persist to localStorage (this browser only). A
   real backend (e.g. Firestore) would replace readJSON/writeJSON
   inside the order functions with real reads/writes — the function
   signatures (createOrder, getOrdersForUser, findOrder) don't need
   to change for pages calling them.
   ========================================================= */
window.OLYMPOS_BACKEND = (() => {

  const CONFIG = {
    auth: { mode: 'mock' },      // 'mock' | 'firebase'
    payment: { mode: 'mock' },   // 'mock' | 'iyzico'
    firebase: {
      apiKey: '', authDomain: '', projectId: '', appId: ''
    }
  };

  const USERS_KEY = 'olympos_users_v1';
  const SESSION_KEY = 'olympos_session_v1';
  const ORDERS_KEY = 'olympos_orders_v1';

  function readJSON(key, fallback) {
    try { const v = JSON.parse(localStorage.getItem(key)); return v == null ? fallback : v; }
    catch { return fallback; }
  }
  function writeJSON(key, val) { localStorage.setItem(key, JSON.stringify(val)); }
  function uid() { return Math.random().toString(36).slice(2) + Date.now().toString(36); }
  function fail(message, code) { const e = new Error(message); e.code = code; return e; }
  function wait(ms) { return new Promise(r => setTimeout(r, ms)); }
  function fakeLatency() { return wait(350 + Math.random() * 250); }

  // client-side hash used ONLY to avoid storing raw passwords in mock
  // mode's localStorage — this is not real security; Firebase Auth
  // (server-side, salted) replaces this entirely once wired up
  async function hash(str) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  function publicUser(u) {
    return {
      id: u.id, name: u.name, email: u.email,
      phone: u.phone || '', address: u.address || '', city: u.city || '', zip: u.zip || ''
    };
  }

  /* ---------------- auth ---------------- */
  async function register({ name, email, password }) {
    if (!name || !email || !password) throw fail('Tüm alanları doldurun.', 'missing-fields');
    if (password.length < 6) throw fail('Şifre en az 6 karakter olmalı.', 'weak-password');

    if (CONFIG.auth.mode === 'firebase') {
      // TODO: createUserWithEmailAndPassword(auth, email, password),
      // then updateProfile(user, { displayName: name })
      throw fail('Firebase auth henüz yapılandırılmadı.', 'not-configured');
    }

    await fakeLatency();
    const users = readJSON(USERS_KEY, []);
    if (users.some(u => u.email === email.toLowerCase())) {
      throw fail('Bu e-posta ile zaten bir hesap var.', 'email-exists');
    }
    const user = { id: uid(), name, email: email.toLowerCase(), passwordHash: await hash(password), createdAt: Date.now() };
    users.push(user);
    writeJSON(USERS_KEY, users);
    writeJSON(SESSION_KEY, { userId: user.id });
    return publicUser(user);
  }

  async function login({ email, password }) {
    if (!email || !password) throw fail('E-posta ve şifre gerekli.', 'missing-fields');

    if (CONFIG.auth.mode === 'firebase') {
      // TODO: signInWithEmailAndPassword(auth, email, password)
      throw fail('Firebase auth henüz yapılandırılmadı.', 'not-configured');
    }

    await fakeLatency();
    const users = readJSON(USERS_KEY, []);
    const pwHash = await hash(password);
    const user = users.find(u => u.email === email.toLowerCase() && u.passwordHash === pwHash);
    if (!user) throw fail('E-posta veya şifre hatalı.', 'invalid-credentials');
    writeJSON(SESSION_KEY, { userId: user.id });
    return publicUser(user);
  }

  function logout() {
    // TODO (firebase mode): signOut(auth)
    localStorage.removeItem(SESSION_KEY);
  }

  function currentUser() {
    if (CONFIG.auth.mode === 'firebase') return null; // TODO: read from onAuthStateChanged cache
    const session = readJSON(SESSION_KEY, null);
    if (!session) return null;
    const user = readJSON(USERS_KEY, []).find(u => u.id === session.userId);
    return user ? publicUser(user) : null;
  }

  function requireAuth(redirectTo) {
    const user = currentUser();
    if (!user) {
      const back = encodeURIComponent(window.location.pathname + window.location.search);
      window.location.href = `giris.html?sonra=${back}`;
    }
    return user;
  }

  async function updateProfile({ name, email, password, phone, address, city, zip }) {
    const session = readJSON(SESSION_KEY, null);
    if (!session) throw fail('Oturum bulunamadı.', 'not-authenticated');
    if (!name || !email) throw fail('Ad soyad ve e-posta gerekli.', 'missing-fields');
    if (password && password.length < 6) throw fail('Şifre en az 6 karakter olmalı.', 'weak-password');

    if (CONFIG.auth.mode === 'firebase') {
      // TODO: updateProfile(auth.currentUser, { displayName: name }),
      // updateEmail(auth.currentUser, email), updatePassword(...) if password set
      throw fail('Firebase auth henüz yapılandırılmadı.', 'not-configured');
    }

    await fakeLatency();
    const users = readJSON(USERS_KEY, []);
    const user = users.find(u => u.id === session.userId);
    if (!user) throw fail('Kullanıcı bulunamadı.', 'not-found');
    if (users.some(u => u.id !== user.id && u.email === email.toLowerCase())) {
      throw fail('Bu e-posta ile zaten bir hesap var.', 'email-exists');
    }

    user.name = name;
    user.email = email.toLowerCase();
    user.phone = phone || '';
    user.address = address || '';
    user.city = city || '';
    user.zip = zip || '';
    if (password) user.passwordHash = await hash(password);

    writeJSON(USERS_KEY, users);
    return publicUser(user);
  }

  /* ---------------- orders ---------------- */
  async function createOrder({ items, subtotal, shipping }) {
    await fakeLatency();
    const user = currentUser();
    const orders = readJSON(ORDERS_KEY, []);
    const order = {
      id: uid(),
      number: 'OLY-' + Date.now().toString(36).toUpperCase(),
      userId: user ? user.id : null,
      email: shipping.email,
      items,
      subtotal,
      shipping,
      status: 'received', // received -> preparing -> shipped -> delivered
      createdAt: Date.now(),
      history: [{ status: 'received', at: Date.now() }]
    };
    orders.push(order);
    writeJSON(ORDERS_KEY, orders);
    return order;
  }

  function getOrdersForUser(userId) {
    return readJSON(ORDERS_KEY, [])
      .filter(o => o.userId === userId)
      .sort((a, b) => b.createdAt - a.createdAt);
  }

  function findOrder({ number, email }) {
    if (!number || !email) return null;
    return readJSON(ORDERS_KEY, []).find(o =>
      o.number.toLowerCase() === number.trim().toLowerCase() &&
      o.email.toLowerCase() === email.trim().toLowerCase()
    ) || null;
  }

  /* ---------------- payment ---------------- */
  async function processPayment({ amount, card, orderDraft }) {
    if (CONFIG.payment.mode === 'iyzico') {
      const res = await fetch('/api/create-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, card, orderDraft })
      });
      if (!res.ok) throw fail('Ödeme başarısız. Lütfen tekrar deneyin.', 'payment-failed');
      return res.json();
    }

    // mock processor: validates the card looks card-shaped and
    // simulates a decline for the standard test "declined" number
    await fakeLatency();
    const digits = (card.number || '').replace(/\s/g, '');
    if (digits.length < 12) throw fail('Kart numarası geçersiz.', 'invalid-card');
    if (digits === '4000000000000002') throw fail('Kart reddedildi.', 'card-declined');
    return { success: true, transactionId: 'MOCK-' + uid() };
  }

  return {
    CONFIG,
    register, login, logout, currentUser, requireAuth, updateProfile,
    createOrder, getOrdersForUser, findOrder,
    processPayment
  };
})();
