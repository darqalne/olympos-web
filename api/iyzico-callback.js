// Vercel serverless function — iyzico's hosted Checkout Form popup does a
// real top-level browser POST redirect here once the shopper finishes (or
// cancels/fails). We verify the result server-side with iyzico (never trust
// the redirect alone) and send the browser back to odeme.html, which then
// reads the pending order out of sessionStorage and actually records it.

import Iyzipay from 'iyzipay';

function client() {
  return new Iyzipay({
    apiKey: process.env.IYZICO_API_KEY,
    secretKey: process.env.IYZICO_SECRET_KEY,
    uri: process.env.IYZICO_BASE_URL || 'https://api.iyzipay.com'
  });
}

export default async function handler(req, res) {
  const origin = `https://${req.headers.host}`;
  const token = (req.body && req.body.token) || req.query.token;

  if (!token || !process.env.IYZICO_API_KEY || !process.env.IYZICO_SECRET_KEY) {
    res.writeHead(302, { Location: `${origin}/odeme?iyzico=failed` });
    return res.end();
  }

  try {
    const result = await new Promise((resolve, reject) => {
      client().checkoutForm.retrieve({ locale: Iyzipay.LOCALE.TR, token }, (err, result) => {
        if (err) reject(err); else resolve(result);
      });
    });

    if (result.status === 'success' && result.paymentStatus === 'SUCCESS') {
      res.writeHead(302, { Location: `${origin}/odeme?iyzico=success&token=${encodeURIComponent(token)}` });
    } else {
      res.writeHead(302, { Location: `${origin}/odeme?iyzico=failed` });
    }
    return res.end();
  } catch (err) {
    console.error('iyzico callback verify failed', err);
    res.writeHead(302, { Location: `${origin}/odeme?iyzico=failed` });
    return res.end();
  }
}
