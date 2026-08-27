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

  // Accounts whose email matches this list get isAdmin:true and are
  // routed straight to yonetici.html on login/register. Add more
  // emails here (lowercase) to grant a teammate admin access — once
  // a real database is wired up, this becomes a role column instead.
  const ADMIN_EMAILS = ['picturesshadow0@gmail.com'];

  const USERS_KEY = 'olympos_users_v1';
  const SESSION_KEY = 'olympos_session_v1';
  const ORDERS_KEY = 'olympos_orders_v1';

  function readJSON(key, fallback) {
    try { const v = JSON.parse(localStorage.getItem(key)); return v == null ? fallback : v; }
    catch { return fallback; }
  }
  function writeJSON(key, val) { localStorage.setItem(key, JSON.stringify(val)); }
  function uid() { return Math.random().toString(36).slice(2) + Date.now().toString(36); }
  function bt(key) { return window.OLYMPOS_I18N.t('backend.' + key); }
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
      phone: u.phone || '', address: u.address || '', city: u.city || '', zip: u.zip || '',
      createdAt: u.createdAt || null,
      isAdmin: ADMIN_EMAILS.includes(u.email)
    };
  }

  /* ---------------- auth ---------------- */
  async function register({ name, email, password }) {
    if (!name || !email || !password) throw fail(bt('missingFields'), 'missing-fields');
    if (password.length < 6) throw fail(bt('weakPassword'), 'weak-password');

    if (CONFIG.auth.mode === 'firebase') {
      // TODO: createUserWithEmailAndPassword(auth, email, password),
      // then updateProfile(user, { displayName: name })
      throw fail(bt('notConfigured'), 'not-configured');
    }

    await fakeLatency();
    const users = readJSON(USERS_KEY, []);
    if (users.some(u => u.email === email.toLowerCase())) {
      throw fail(bt('emailExists'), 'email-exists');
    }
    const user = { id: uid(), name, email: email.toLowerCase(), passwordHash: await hash(password), createdAt: Date.now() };
    users.push(user);
    writeJSON(USERS_KEY, users);
    writeJSON(SESSION_KEY, { userId: user.id });
    return publicUser(user);
  }

  async function login({ email, password }) {
    if (!email || !password) throw fail(bt('loginMissingFields'), 'missing-fields');

    if (CONFIG.auth.mode === 'firebase') {
      // TODO: signInWithEmailAndPassword(auth, email, password)
      throw fail(bt('notConfigured'), 'not-configured');
    }

    await fakeLatency();
    const users = readJSON(USERS_KEY, []);
    const pwHash = await hash(password);
    const user = users.find(u => u.email === email.toLowerCase() && u.passwordHash === pwHash);
    if (!user) throw fail(bt('invalidCredentials'), 'invalid-credentials');
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

  // guards yonetici.html: sends signed-out visitors to login (returning
  // here after), and signed-in non-admins back to the storefront —
  // never leaks that an admin panel exists to a regular shopper.
  function requireAdmin() {
    const user = currentUser();
    if (!user) {
      const back = encodeURIComponent(window.location.pathname + window.location.search);
      window.location.href = `giris.html?sonra=${back}`;
      return null;
    }
    if (!user.isAdmin) {
      window.location.href = 'index.html';
      return null;
    }
    return user;
  }

  async function updateProfile({ name, email, password, phone, address, city, zip }) {
    const session = readJSON(SESSION_KEY, null);
    if (!session) throw fail(bt('notAuthenticated'), 'not-authenticated');
    if (!name || !email) throw fail(bt('profileMissingFields'), 'missing-fields');
    if (password && password.length < 6) throw fail(bt('weakPassword'), 'weak-password');

    if (CONFIG.auth.mode === 'firebase') {
      // TODO: updateProfile(auth.currentUser, { displayName: name }),
      // updateEmail(auth.currentUser, email), updatePassword(...) if password set
      throw fail(bt('notConfigured'), 'not-configured');
    }

    await fakeLatency();
    const users = readJSON(USERS_KEY, []);
    const user = users.find(u => u.id === session.userId);
    if (!user) throw fail(bt('userNotFound'), 'not-found');
    if (users.some(u => u.id !== user.id && u.email === email.toLowerCase())) {
      throw fail(bt('emailExists'), 'email-exists');
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

  /* ---------------- admin ---------------- */
  // every function below is admin-only data access (yonetici.html
  // guards the page itself with requireAdmin() before ever calling
  // these) — reads straight through the same USERS_KEY/ORDERS_KEY
  // localStorage this whole mock backend already uses, so a real
  // database swap-in later just replaces these bodies, same as above.

  function getAllUsers() {
    const users = readJSON(USERS_KEY, []);
    const orders = readJSON(ORDERS_KEY, []);
    return users.map(u => {
      const own = orders.filter(o => o.userId === u.id);
      return {
        ...publicUser(u),
        orderCount: own.length,
        totalSpent: own.reduce((s, o) => s + o.subtotal, 0)
      };
    }).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  }

  function getAllOrders() {
    return readJSON(ORDERS_KEY, []).sort((a, b) => b.createdAt - a.createdAt);
  }

  function updateOrderStatus(orderId, status) {
    const orders = readJSON(ORDERS_KEY, []);
    const order = orders.find(o => o.id === orderId);
    if (!order) throw fail('Sipariş bulunamadı.', 'not-found');
    order.status = status;
    order.history = order.history || [];
    order.history.push({ status, at: Date.now() });
    writeJSON(ORDERS_KEY, orders);
    return order;
  }

  /* ---------------- payment ---------------- */
  async function processPayment({ amount, card, orderDraft }) {
    if (CONFIG.payment.mode === 'iyzico') {
      const res = await fetch('/api/create-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, card, orderDraft })
      });
      if (!res.ok) throw fail(bt('paymentFailed'), 'payment-failed');
      return res.json();
    }

    // mock processor: validates the card looks card-shaped and
    // simulates a decline for the standard test "declined" number
    await fakeLatency();
    const digits = (card.number || '').replace(/\s/g, '');
    if (digits.length < 12) throw fail(bt('invalidCard'), 'invalid-card');
    if (digits === '4000000000000002') throw fail(bt('cardDeclined'), 'card-declined');
    return { success: true, transactionId: 'MOCK-' + uid() };
  }

  return {
    CONFIG,
    register, login, logout, currentUser, requireAuth, requireAdmin, updateProfile,
    createOrder, getOrdersForUser, findOrder,
    processPayment,
    getAllUsers, getAllOrders, updateOrderStatus
  };
})();
