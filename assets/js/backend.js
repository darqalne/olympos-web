/* =========================================================
   OLYMPOS BACKEND — auth / orders / payment abstraction

   Every page talks to this module (window.OLYMPOS_BACKEND), never
   directly to localStorage/Firebase. CONFIG.auth.mode picks the
   backend: 'mock' (localStorage, browser-only, kept for reference/
   fallback) or 'firebase' (real, shared Firebase project — Auth +
   Firestore). Every exported function has the exact same name/shape
   in both modes, so no page needs to know which one is active.

   FIREBASE MODE
     - the Firebase compat SDK is loaded dynamically (see loadFirebaseSdk
       below) so no HTML file needs its own <script> tag for it.
     - users live in Firestore `users/{uid}`, mirroring Firebase Auth's
       account (uid/email) with the extra profile fields (name, phone,
       address, city, zip, isAdmin) this app needs.
     - orders live in Firestore `orders/{orderNumber}` — the order's
       own human-readable number IS the document id, which lets guest
       order-tracking (siparis-takip) do a plain by-id `get()`
       instead of a `list` query Firestore security rules can't safely
       scope to "only the matching email" for an unauthenticated caller.
     - products live in Firestore `products/{id}` (see site.js).
     - every page must `await OLYMPOS_BACKEND.ready()` once before
       calling currentUser()/requireAuth()/requireAdmin() — see the
       "bir kere yükle, senkron oku" note below.

   PAYMENT -> iyzico (unchanged, still mock — separate from this
   database work; see /api/create-payment.js for the real wiring plan)
   ========================================================= */
window.OLYMPOS_BACKEND = (() => {

  const CONFIG = {
    auth: { mode: 'firebase' },  // 'mock' | 'firebase'
    payment: { mode: 'mock' },   // 'mock' | 'iyzico'
    firebase: {
      apiKey: 'AIzaSyDWDf0hp6BD6RkB0zAo2RkGis2yKUE_94E',
      authDomain: 'olympos-web-panel.firebaseapp.com',
      projectId: 'olympos-web-panel',
      storageBucket: 'olympos-web-panel.firebasestorage.app',
      messagingSenderId: '357835769706',
      appId: '1:357835769706:web:1ace632a954fbd4bc3c713'
    }
  };

  // Accounts whose email matches this list get isAdmin:true on
  // registration and are routed straight to yonetici on login.
  // To promote someone else later, flip `isAdmin: true` by hand on
  // their users/{uid} document in the Firebase console instead —
  // this list only matters at the moment an account is first created.
  const ADMIN_EMAILS = ['picturesshadow0@gmail.com'];

  const USERS_KEY = 'olympos_users_v1';
  const SESSION_KEY = 'olympos_session_v1';
  const ORDERS_KEY = 'olympos_orders_v1';

  // Gates /api/send-email against random/automated abuse (see that
  // file's header comment). Must match its EMAIL_SITE_SECRET env var
  // exactly — it's not truly secret (this file is public), but it
  // stops drive-by scanners from using the endpoint as an open relay.
  const SITE_SECRET = 'NROsU7gPg0LPUz4h_nxlauPK2W-K3mfE';

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
  // (server-side, salted) replaces this entirely in firebase mode.
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

  /* ---------------- firebase bootstrap ---------------- */
  const FIREBASE_SDK_VERSION = '10.14.1';
  let fbApp = null, fbAuth = null, fbDb = null;
  let _cachedUser = null;
  let _readyResolve;
  const _readyPromise = new Promise(r => { _readyResolve = r; });
  let _readyFired = false;

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = src;
      s.onload = () => resolve();
      s.onerror = () => reject(fail('Firebase SDK yüklenemedi.', 'sdk-load-failed'));
      document.head.appendChild(s);
    });
  }

  async function loadFirebaseSdk() {
    if (window.firebase && window.firebase.apps) return;
    const base = `https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}/`;
    await loadScript(base + 'firebase-app-compat.js');
    await loadScript(base + 'firebase-auth-compat.js');
    await loadScript(base + 'firebase-firestore-compat.js');
  }

  // builds the same publicUser()-shaped object as mock mode, sourced
  // from the Firestore users/{uid} profile doc (falls back gracefully
  // if that doc doesn't exist yet, e.g. mid-registration race).
  async function buildUserFromFirebase(fbUser) {
    const snap = await fbDb.collection('users').doc(fbUser.uid).get();
    const data = snap.exists ? snap.data() : {};
    const email = (fbUser.email || data.email || '').toLowerCase();
    return {
      id: fbUser.uid,
      name: data.name || fbUser.displayName || '',
      email,
      phone: data.phone || '', address: data.address || '', city: data.city || '', zip: data.zip || '',
      addresses: data.addresses || [],
      createdAt: data.createdAt || null,
      isAdmin: !!data.isAdmin || ADMIN_EMAILS.includes(email)
    };
  }

  async function initFirebase() {
    await loadFirebaseSdk();
    fbApp = firebase.initializeApp(CONFIG.firebase);
    fbAuth = firebase.auth();
    fbDb = firebase.firestore();
    fbAuth.onAuthStateChanged(async (fbUser) => {
      _cachedUser = fbUser ? await buildUserFromFirebase(fbUser) : null;
      if (!_readyFired) { _readyFired = true; _readyResolve(); }
    });
  }

  if (CONFIG.auth.mode === 'firebase') initFirebase();

  // every page awaits this once before touching auth state — resolves
  // after the first auth check completes (persisted session restored
  // or confirmed signed-out). No-op in mock mode (already synchronous).
  function ready() {
    return CONFIG.auth.mode === 'firebase' ? _readyPromise : Promise.resolve();
  }

  // lets site.js's product layer share the same Firestore instance
  // without loading/initializing Firebase a second time.
  function getDb() { return fbDb; }

  /* ---------------- auth ---------------- */
  async function register({ name, email, password }) {
    if (!name || !email || !password) throw fail(bt('missingFields'), 'missing-fields');
    if (password.length < 6) throw fail(bt('weakPassword'), 'weak-password');
    const normalizedEmail = email.toLowerCase();

    if (CONFIG.auth.mode === 'firebase') {
      let cred;
      try {
        cred = await fbAuth.createUserWithEmailAndPassword(normalizedEmail, password);
      } catch (e) {
        if (e.code === 'auth/email-already-in-use') throw fail(bt('emailExists'), 'email-exists');
        throw fail(e.message, e.code);
      }
      await cred.user.updateProfile({ displayName: name });
      const profile = {
        name, email: normalizedEmail, phone: '', address: '', city: '', zip: '',
        createdAt: Date.now(), isAdmin: ADMIN_EMAILS.includes(normalizedEmail)
      };
      await fbDb.collection('users').doc(cred.user.uid).set(profile);
      _cachedUser = { id: cred.user.uid, ...profile };
      return _cachedUser;
    }

    await fakeLatency();
    const users = readJSON(USERS_KEY, []);
    if (users.some(u => u.email === normalizedEmail)) {
      throw fail(bt('emailExists'), 'email-exists');
    }
    const user = { id: uid(), name, email: normalizedEmail, passwordHash: await hash(password), createdAt: Date.now() };
    users.push(user);
    writeJSON(USERS_KEY, users);
    writeJSON(SESSION_KEY, { userId: user.id });
    return publicUser(user);
  }

  async function login({ email, password }) {
    if (!email || !password) throw fail(bt('loginMissingFields'), 'missing-fields');
    const normalizedEmail = email.toLowerCase();

    if (CONFIG.auth.mode === 'firebase') {
      let cred;
      try {
        cred = await fbAuth.signInWithEmailAndPassword(normalizedEmail, password);
      } catch (e) {
        throw fail(bt('invalidCredentials'), 'invalid-credentials');
      }
      _cachedUser = await buildUserFromFirebase(cred.user);
      return _cachedUser;
    }

    await fakeLatency();
    const users = readJSON(USERS_KEY, []);
    const pwHash = await hash(password);
    const user = users.find(u => u.email === normalizedEmail && u.passwordHash === pwHash);
    if (!user) throw fail(bt('invalidCredentials'), 'invalid-credentials');
    writeJSON(SESSION_KEY, { userId: user.id });
    return publicUser(user);
  }

  async function logout() {
    if (CONFIG.auth.mode === 'firebase') {
      // must finish before the caller navigates away, or the sign-out
      // can get cut off mid-flight and the next page still sees a
      // signed-in session.
      await fbAuth.signOut();
      _cachedUser = null;
      return;
    }
    localStorage.removeItem(SESSION_KEY);
  }

  function currentUser() {
    if (CONFIG.auth.mode === 'firebase') return _cachedUser;
    const session = readJSON(SESSION_KEY, null);
    if (!session) return null;
    const user = readJSON(USERS_KEY, []).find(u => u.id === session.userId);
    return user ? publicUser(user) : null;
  }

  function requireAuth() {
    const user = currentUser();
    if (!user) {
      const back = encodeURIComponent(window.location.pathname + window.location.search);
      window.location.href = `${window.OLYMPOS_I18N.href('giris')}?sonra=${back}`;
    }
    return user;
  }

  // guards yonetici: sends signed-out visitors to login (returning
  // here after), and signed-in non-admins back to the storefront —
  // never leaks that an admin panel exists to a regular shopper.
  function requireAdmin() {
    const user = currentUser();
    if (!user) {
      const back = encodeURIComponent(window.location.pathname + window.location.search);
      window.location.href = `${window.OLYMPOS_I18N.href('giris')}?sonra=${back}`;
      return null;
    }
    if (!user.isAdmin) {
      window.location.href = '/';
      return null;
    }
    return user;
  }

  async function updateProfile({ name, email, password, phone, address, city, zip }) {
    if (!name || !email) throw fail(bt('profileMissingFields'), 'missing-fields');
    if (password && password.length < 6) throw fail(bt('weakPassword'), 'weak-password');
    const normalizedEmail = email.toLowerCase();

    if (CONFIG.auth.mode === 'firebase') {
      if (!_cachedUser) throw fail(bt('notAuthenticated'), 'not-authenticated');
      let emailVerificationSent = false;
      try {
        if (normalizedEmail !== _cachedUser.email) {
          // Firebase no longer allows an instant email swap — it requires
          // verifying ownership of the new address first. The address only
          // actually changes once the shopper clicks the link it emails
          // them, so we deliberately do NOT write it to Firestore yet.
          await fbAuth.currentUser.verifyBeforeUpdateEmail(normalizedEmail);
          emailVerificationSent = true;
        }
        if (password) await fbAuth.currentUser.updatePassword(password);
      } catch (e) {
        if (e.code === 'auth/requires-recent-login') {
          throw fail('Bu işlem için tekrar giriş yapmanız gerekiyor. Çıkış yapıp yeniden giriş yapın.', 'requires-recent-login');
        }
        if (e.code === 'auth/email-already-in-use') throw fail(bt('emailExists'), 'email-exists');
        throw fail(e.message, e.code);
      }
      const fields = { name, phone: phone || '', address: address || '', city: city || '', zip: zip || '' };
      await fbDb.collection('users').doc(_cachedUser.id).update(fields);
      _cachedUser = { ..._cachedUser, ...fields };
      return { ..._cachedUser, emailVerificationSent };
    }

    const session = readJSON(SESSION_KEY, null);
    if (!session) throw fail(bt('notAuthenticated'), 'not-authenticated');
    await fakeLatency();
    const users = readJSON(USERS_KEY, []);
    const user = users.find(u => u.id === session.userId);
    if (!user) throw fail(bt('userNotFound'), 'not-found');
    if (users.some(u => u.id !== user.id && u.email === normalizedEmail)) {
      throw fail(bt('emailExists'), 'email-exists');
    }

    user.name = name;
    user.email = normalizedEmail;
    user.phone = phone || '';
    user.address = address || '';
    user.city = city || '';
    user.zip = zip || '';
    if (password) user.passwordHash = await hash(password);

    writeJSON(USERS_KEY, users);
    return publicUser(user);
  }

  /* ---------------- saved addresses (Adreslerim) ----------------
     Stored as an array field on the user doc — a handful of addresses
     per shopper is nowhere near Firestore's 1MB document cap, so this
     avoids the extra security-rules surface a subcollection would need. */
  function addrId() { return 'a' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

  function getAddresses() {
    const user = currentUser();
    return (user && user.addresses) || [];
  }

  async function saveAddresses(addresses) {
    if (CONFIG.auth.mode === 'firebase') {
      if (!_cachedUser) throw fail(bt('notAuthenticated'), 'not-authenticated');
      await fbDb.collection('users').doc(_cachedUser.id).update({ addresses });
      _cachedUser = { ..._cachedUser, addresses };
      return addresses;
    }
    const session = readJSON(SESSION_KEY, null);
    if (!session) throw fail(bt('notAuthenticated'), 'not-authenticated');
    const users = readJSON(USERS_KEY, []);
    const user = users.find(u => u.id === session.userId);
    if (!user) throw fail(bt('userNotFound'), 'not-found');
    user.addresses = addresses;
    writeJSON(USERS_KEY, users);
    return addresses;
  }

  async function addAddress(address) {
    const addresses = getAddresses().slice();
    addresses.push({ id: addrId(), ...address });
    await saveAddresses(addresses);
    return addresses;
  }

  async function updateAddress(id, address) {
    const addresses = getAddresses().map(a => (a.id === id ? { ...a, ...address, id } : a));
    await saveAddresses(addresses);
    return addresses;
  }

  async function deleteAddress(id) {
    const addresses = getAddresses().filter(a => a.id !== id);
    await saveAddresses(addresses);
    return addresses;
  }

  /* ---------------- transactional email ----------------
     Posts to /api/send-email (Gmail SMTP, see that file's header for
     activation). Always fire-and-forget from the caller's point of
     view — a failed or not-yet-configured send is logged and
     swallowed here, never allowed to block an order or status update
     that already succeeded in Firestore. */
  function bt2(key, vars) { return window.OLYMPOS_I18N.t('email.' + key, vars); }
  function escHtml(str) {
    return String(str == null ? '' : str).replace(/[&<>"']/g, ch => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[ch]));
  }

  // Table-based markup throughout — div/flexbox-style CSS is
  // unreliable in email clients (Outlook desktop especially), tables
  // with inline styles are the one layout approach every client
  // renders consistently. Fonts fall back to system serif/sans stacks
  // that approximate the site's Cinzel/Jost pairing, since web fonts
  // don't load reliably in most inboxes either.
  function emailWrapper(bodyHtml) {
    const origin = window.location.origin;
    const headerImgUrl = origin + '/assets/img/brand/email-header.png';
    return `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F7F1E4; padding:36px 16px;">
  <tr><td align="center">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px; background:#FFFFFF; border:1px solid rgba(74,51,32,0.12); border-radius:8px; overflow:hidden;">
      <tr><td style="background:#F7F1E4;">
        <img src="${headerImgUrl}" width="560" height="93" alt="OLYMPOS Leather" style="display:block; width:100%; max-width:560px; height:auto; border:0;">
      </td></tr>
      <tr><td style="height:3px; line-height:3px; font-size:0; background:#C6872E;">&nbsp;</td></tr>
      <tr><td style="padding:32px 32px 6px; font-family:'Segoe UI',Arial,Helvetica,sans-serif; color:#4A3320; font-size:15px; line-height:1.65;">
        ${bodyHtml}
      </td></tr>
      <tr><td style="padding:22px 32px 28px; border-top:1px solid rgba(74,51,32,0.1); margin-top:20px; font-family:Arial,Helvetica,sans-serif; font-size:12px; color:#8A6644; line-height:1.7;">
        ${bt2('footerNote')}<br>
        <strong style="color:#4A3320;">OLYMPOS Leather</strong> · Buca, İzmir<br>
        <a href="mailto:info@olymposleather.com.tr" style="color:#A96E22; text-decoration:none;">info@olymposleather.com.tr</a>
      </td></tr>
    </table>
  </td></tr>
</table>`;
  }

  function greetingHtml(name, message) {
    return `
      <p style="margin:0 0 6px; font-family:Georgia,'Times New Roman',serif; font-size:23px; color:#241811; letter-spacing:0.01em;">${escHtml(name ? bt2('confirmGreeting', { name }) : '')}</p>
      <p style="margin:0 0 22px; font-size:15px; color:#6B4A2F;">${message}</p>`;
  }

  function orderNumberBoxHtml(number) {
    return `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F7F1E4; border-radius:5px; margin:0 0 22px;">
        <tr><td style="padding:14px 18px; font-family:Arial,Helvetica,sans-serif;">
          <span style="display:block; text-transform:uppercase; letter-spacing:0.08em; font-size:11px; color:#A96E22; margin-bottom:3px;">${bt2('confirmOrderNumber')}</span>
          <strong style="font-size:16px; color:#241811;">${escHtml(number)}</strong>
        </td></tr>
      </table>`;
  }

  function orderItemsHtml(items, subtotal) {
    const fmt = window.OLYMPOS.formatPrice;
    const rows = items.map(it => `
      <tr>
        <td style="padding:9px 0; border-bottom:1px solid rgba(74,51,32,0.08); font-family:Arial,Helvetica,sans-serif; font-size:14px; color:#241811;">${escHtml(it.name)} <span style="color:#8A6644;">× ${it.qty}</span></td>
        <td style="padding:9px 0; border-bottom:1px solid rgba(74,51,32,0.08); font-family:Arial,Helvetica,sans-serif; font-size:14px; color:#241811; text-align:right; white-space:nowrap;">${fmt(it.price * it.qty)}</td>
      </tr>`).join('');
    return `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse; margin:0 0 4px;">
        ${rows}
        <tr>
          <td style="padding:14px 0 0; font-family:Georgia,'Times New Roman',serif; font-size:16px; color:#241811; font-weight:bold;">${bt2('confirmTotal')}</td>
          <td style="padding:14px 0 0; font-family:Georgia,'Times New Roman',serif; font-size:18px; color:#241811; font-weight:bold; text-align:right;">${fmt(subtotal)}</td>
        </tr>
      </table>`;
  }

  async function sendTransactionalEmail(to, subject, html) {
    try {
      await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-site-secret': SITE_SECRET },
        body: JSON.stringify({ to, subject, html })
      });
    } catch (err) {
      console.error('sendTransactionalEmail failed', err);
    }
  }

  function trackOrderUrl() {
    return window.location.origin + '/' + window.OLYMPOS_I18N.href('siparis-takip');
  }
  function trackCtaHtml() {
    return `
      <table role="presentation" cellpadding="0" cellspacing="0" style="margin:26px 0 4px;">
        <tr><td style="border-radius:4px; background:#4A3320;">
          <a href="${trackOrderUrl()}" target="_blank" style="display:inline-block; padding:13px 26px; font-family:Arial,Helvetica,sans-serif; font-size:13px; letter-spacing:0.04em; color:#FBF7EF; text-decoration:none; font-weight:600;">${bt2('confirmTrackCta')}</a>
        </td></tr>
      </table>`;
  }

  async function sendOrderConfirmation(order) {
    const html = emailWrapper(`
      ${greetingHtml(order.shipping.name, escHtml(bt2('confirmBody')))}
      ${orderNumberBoxHtml(order.number)}
      ${orderItemsHtml(order.items, order.subtotal)}
      ${trackCtaHtml()}
    `);
    await sendTransactionalEmail(order.email, bt2('confirmSubject', { number: order.number }), html);
  }

  async function sendOrderStatusEmail(order, status) {
    const key = { received: 'Received', preparing: 'Preparing', shipped: 'Shipped', delivered: 'Delivered' }[status];
    if (!key) return;
    const html = emailWrapper(`
      ${greetingHtml(order.shipping.name, escHtml(bt2('statusBody' + key)))}
      ${orderNumberBoxHtml(order.number)}
      ${trackCtaHtml()}
    `);
    await sendTransactionalEmail(order.email, bt2('statusSubject' + key, { number: order.number }), html);
  }

  // admin-only broadcast to many/all users at once (yonetici.html) —
  // proves the caller is a signed-in admin via their live Firebase ID
  // token, which /api/send-email verifies itself before sending.
  async function broadcastNotification({ to, subject, message }) {
    if (CONFIG.auth.mode !== 'firebase' || !fbAuth.currentUser) {
      throw fail('Bu işlem için yönetici girişi gerekiyor.', 'not-authorized');
    }
    const idToken = await fbAuth.currentUser.getIdToken();
    const html = emailWrapper(`<div style="white-space:pre-wrap; font-family:'Segoe UI',Arial,Helvetica,sans-serif; font-size:15px; color:#4A3320;">${escHtml(message)}</div>`);
    const res = await fetch('/api/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-site-secret': SITE_SECRET },
      body: JSON.stringify({ to, subject, html, idToken })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw fail(data.message || 'E-posta gönderilemedi.', data.error || 'send-failed');
    return data;
  }

  /* ---------------- orders ---------------- */
  function makeOrderNumber() {
    return 'OLY-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).slice(2, 6).toUpperCase();
  }

  async function createOrder({ items, subtotal, shipping }) {
    const user = currentUser();

    if (CONFIG.auth.mode === 'firebase') {
      const number = makeOrderNumber();
      const order = {
        id: number, number,
        userId: user ? user.id : null,
        email: shipping.email, items, subtotal, shipping,
        status: 'received', createdAt: Date.now(),
        history: [{ status: 'received', at: Date.now() }]
      };
      await fbDb.collection('orders').doc(number).set(order);
      sendOrderConfirmation(order);
      return order;
    }

    await fakeLatency();
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
    sendOrderConfirmation(order);
    return order;
  }

  async function getOrdersForUser(userId) {
    if (CONFIG.auth.mode === 'firebase') {
      const snap = await fbDb.collection('orders').where('userId', '==', userId).get();
      return snap.docs.map(d => d.data()).sort((a, b) => b.createdAt - a.createdAt);
    }
    return readJSON(ORDERS_KEY, [])
      .filter(o => o.userId === userId)
      .sort((a, b) => b.createdAt - a.createdAt);
  }

  async function findOrder({ number, email }) {
    if (!number || !email) return null;

    if (CONFIG.auth.mode === 'firebase') {
      const doc = await fbDb.collection('orders').doc(number.trim().toUpperCase()).get();
      if (!doc.exists) return null;
      const order = doc.data();
      return order.email.toLowerCase() === email.trim().toLowerCase() ? order : null;
    }

    return readJSON(ORDERS_KEY, []).find(o =>
      o.number.toLowerCase() === number.trim().toLowerCase() &&
      o.email.toLowerCase() === email.trim().toLowerCase()
    ) || null;
  }

  /* ---------------- admin ---------------- */
  // every function below is admin-only data access (yonetici
  // guards the page itself with requireAdmin() before ever calling
  // these, and Firestore security rules enforce the same on the
  // server side regardless of what the client does).

  async function getAllUsers() {
    if (CONFIG.auth.mode === 'firebase') {
      const [usersSnap, ordersSnap] = await Promise.all([
        fbDb.collection('users').get(),
        fbDb.collection('orders').get()
      ]);
      const orders = ordersSnap.docs.map(d => d.data());
      return usersSnap.docs.map(doc => {
        const data = doc.data();
        const email = (data.email || '').toLowerCase();
        const own = orders.filter(o => o.userId === doc.id);
        return {
          id: doc.id, name: data.name, email,
          phone: data.phone || '', address: data.address || '', city: data.city || '', zip: data.zip || '',
          createdAt: data.createdAt || null,
          isAdmin: !!data.isAdmin || ADMIN_EMAILS.includes(email),
          orderCount: own.length,
          totalSpent: own.reduce((s, o) => s + o.subtotal, 0)
        };
      }).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    }

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

  async function getAllOrders() {
    if (CONFIG.auth.mode === 'firebase') {
      const snap = await fbDb.collection('orders').get();
      return snap.docs.map(d => d.data()).sort((a, b) => b.createdAt - a.createdAt);
    }
    return readJSON(ORDERS_KEY, []).sort((a, b) => b.createdAt - a.createdAt);
  }

  async function updateOrderStatus(orderId, status) {
    if (CONFIG.auth.mode === 'firebase') {
      const ref = fbDb.collection('orders').doc(orderId);
      const snap = await ref.get();
      if (!snap.exists) throw fail('Sipariş bulunamadı.', 'not-found');
      const order = snap.data();
      const history = [...(order.history || []), { status, at: Date.now() }];
      await ref.update({ status, history });
      const updated = { ...order, status, history };
      sendOrderStatusEmail(updated, status);
      return updated;
    }

    const orders = readJSON(ORDERS_KEY, []);
    const order = orders.find(o => o.id === orderId);
    if (!order) throw fail('Sipariş bulunamadı.', 'not-found');
    order.status = status;
    order.history = order.history || [];
    order.history.push({ status, at: Date.now() });
    writeJSON(ORDERS_KEY, orders);
    sendOrderStatusEmail(order, status);
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
    ready, getDb,
    register, login, logout, currentUser, requireAuth, requireAdmin, updateProfile,
    getAddresses, addAddress, updateAddress, deleteAddress,
    createOrder, getOrdersForUser, findOrder,
    processPayment,
    getAllUsers, getAllOrders, updateOrderStatus,
    broadcastNotification
  };
})();
