// Vercel serverless function — initializes a real iyzico Checkout Form
// session (PRODUCTION keys) using the official iyzipay Node SDK.
//
// Flow:
//   1. odeme.html posts { orderDraft: { items, shipping } } here (no
//      client-supplied price is trusted — see below).
//   2. We look up each item's real price in Firestore ourselves and
//      recompute the total server-side, so a tampered request can't
//      buy something for less than its real price.
//   3. We call iyzico's Checkout Form Initialize API and return
//      { checkoutFormContent, token } to the client.
//   4. The client injects checkoutFormContent into the page — iyzico's
//      own JS renders its hosted payment popup on top of our page.
//   5. When the shopper finishes (or cancels), iyzico's popup does a
//      real top-level browser redirect (POST) to /api/iyzico-callback
//      (see that file), which verifies the result and sends the
//      browser back to odeme.html to actually record the order.
//
// To activate:
//   1. In Vercel project settings -> Environment Variables, add:
//        IYZICO_API_KEY = <from iyzico merchant panel>
//        IYZICO_SECRET_KEY = <from iyzico merchant panel>
//        IYZICO_BASE_URL = https://api.iyzipay.com
//      (use https://sandbox-api.iyzipay.com instead for test keys)
//   2. Redeploy. No code change needed — this activates automatically
//      once both keys are present.

import Iyzipay from 'iyzipay';

const FIREBASE_PROJECT_ID = 'olympos-web-panel';

function client() {
  return new Iyzipay({
    apiKey: process.env.IYZICO_API_KEY,
    secretKey: process.env.IYZICO_SECRET_KEY,
    uri: process.env.IYZICO_BASE_URL || 'https://api.iyzipay.com'
  });
}

// Never trust a client-supplied price for a real charge — look each
// item up in Firestore (public read, same as the storefront's own
// product listing) and use that price instead.
async function fetchProductPrice(id) {
  const res = await fetch(
    `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/products/${encodeURIComponent(id)}`
  );
  if (!res.ok) return null;
  const doc = await res.json();
  const priceField = doc.fields && doc.fields.price;
  if (!priceField) return null;
  const price = Number(priceField.doubleValue ?? priceField.integerValue);
  return Number.isFinite(price) && price > 0 ? price : null;
}

function splitName(fullName) {
  const parts = String(fullName || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { name: 'Müşteri', surname: '-' };
  if (parts.length === 1) return { name: parts[0], surname: parts[0] };
  return { name: parts.slice(0, -1).join(' '), surname: parts[parts.length - 1] };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method-not-allowed' });
  }

  if (!process.env.IYZICO_API_KEY || !process.env.IYZICO_SECRET_KEY) {
    return res.status(501).json({
      error: 'not-configured',
      message: 'Ödeme altyapısı henüz yapılandırılmadı (IYZICO_API_KEY / IYZICO_SECRET_KEY).'
    });
  }

  const { orderDraft } = req.body || {};
  const items = orderDraft && orderDraft.items;
  const shipping = orderDraft && orderDraft.shipping;
  if (!Array.isArray(items) || items.length === 0 || !shipping || !shipping.email || !shipping.name) {
    return res.status(400).json({ error: 'invalid-request', message: 'Sepet veya teslimat bilgileri eksik.' });
  }
  if (!/^\d{11}$/.test(String(shipping.identityNumber || ''))) {
    return res.status(400).json({ error: 'invalid-identity', message: 'Geçerli bir T.C. Kimlik Numarası giriniz.' });
  }

  let subtotal = 0;
  const basketItems = [];
  for (const it of items) {
    const realPrice = await fetchProductPrice(it.id);
    const qty = Number(it.qty);
    if (realPrice == null || !(qty > 0)) {
      return res.status(400).json({ error: 'invalid-item', message: `Sepetteki bir ürün artık mevcut değil (${it.id}).` });
    }
    const lineTotal = realPrice * qty;
    subtotal += lineTotal;
    basketItems.push({
      id: it.id,
      name: it.name || 'Ürün',
      category1: 'Deri Aksesuar',
      itemType: Iyzipay.BASKET_ITEM_TYPE.PHYSICAL,
      price: lineTotal.toFixed(2)
    });
  }
  if (!(subtotal > 0)) {
    return res.status(400).json({ error: 'invalid-request', message: 'Geçersiz tutar.' });
  }

  const conversationId = 'OLY-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).slice(2, 8).toUpperCase();
  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || '85.34.78.112';
  const origin = `https://${req.headers.host}`;
  const { name, surname } = splitName(shipping.name);
  const address = {
    contactName: shipping.name,
    city: shipping.city || 'İstanbul',
    country: 'Turkey',
    address: shipping.address || '-',
    zipCode: shipping.zip || '00000'
  };

  const request = {
    locale: Iyzipay.LOCALE.TR,
    conversationId,
    price: subtotal.toFixed(2),
    paidPrice: subtotal.toFixed(2),
    currency: Iyzipay.CURRENCY.TRY,
    basketId: conversationId,
    paymentGroup: Iyzipay.PAYMENT_GROUP.PRODUCT,
    callbackUrl: `${origin}/api/iyzico-callback`,
    enabledInstallments: [1],
    buyer: {
      id: conversationId,
      name,
      surname,
      identityNumber: shipping.identityNumber,
      email: shipping.email,
      gsmNumber: shipping.phone || '',
      registrationAddress: shipping.address || '-',
      city: shipping.city || 'İstanbul',
      country: 'Turkey',
      zipCode: shipping.zip || '00000',
      ip
    },
    shippingAddress: address,
    billingAddress: address,
    basketItems
  };

  try {
    const result = await new Promise((resolve, reject) => {
      client().checkoutFormInitialize.create(request, (err, result) => {
        if (err) reject(err); else resolve(result);
      });
    });
    if (result.status !== 'success') {
      console.error('iyzico initialize failed', result);
      return res.status(502).json({ error: 'iyzico-error', message: result.errorMessage || 'Ödeme başlatılamadı.' });
    }
    return res.status(200).json({ checkoutFormContent: result.checkoutFormContent, token: result.token });
  } catch (err) {
    console.error('iyzico initialize exception', err);
    return res.status(502).json({ error: 'iyzico-error', message: 'Ödeme başlatılamadı.' });
  }
}
