// Vercel serverless function — real card charges must happen here,
// server-side, so the iyzico secret key never reaches the browser.
//
// Currently inactive: assets/js/backend.js only calls this endpoint
// when CONFIG.payment.mode is set to 'iyzico' (it defaults to a
// client-side mock and never hits this route). To activate:
//   1. npm install iyzipay (or call iyzico's REST API directly)
//   2. add IYZICO_API_KEY / IYZICO_SECRET_KEY / IYZICO_BASE_URL as
//      Vercel project environment variables (Settings -> Environment
//      Variables) — never hardcode them here
//   3. replace the body below with a real iyzico payment request
//   4. flip CONFIG.payment.mode to 'iyzico' in assets/js/backend.js
//
// No page or UI code needs to change for this — they already call
// OLYMPOS_BACKEND.processPayment(), which already posts here.

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method-not-allowed' });
  }

  if (!process.env.IYZICO_API_KEY || !process.env.IYZICO_SECRET_KEY) {
    return res.status(501).json({
      error: 'not-configured',
      message: 'iyzico kimlik bilgileri henüz tanımlanmadı (IYZICO_API_KEY / IYZICO_SECRET_KEY).'
    });
  }

  // TODO: real iyzico charge using req.body.amount / req.body.card /
  // req.body.orderDraft, then return { success: true, transactionId }
  return res.status(501).json({ error: 'not-implemented' });
}
