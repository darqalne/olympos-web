// Vercel serverless function — sends real email through the business's
// own Google Workspace account (Gmail SMTP), via nodemailer. Mirrors
// /api/create-payment.js's activation pattern: the code is complete and
// live, but returns 501 until the required env vars exist.
//
// Two call shapes, both POST here, both requiring the shared
// x-site-secret header (see step 3 below) — without it this is an
// open relay: anyone who finds the URL could send arbitrary mail
// through the business's own Gmail account to any address. The
// secret is embedded in assets/js/backend.js (so it's visible to
// anyone who reads that file — this stops casual/automated abuse,
// not a determined attacker; rotate EMAIL_SITE_SECRET if it's ever
// leaked/abused, no code change needed):
//   - Transactional (order confirmation / status update): { to, subject, html }
//     where `to` is a single email address. No admin login required —
//     this just emails a customer about their own order.
//   - Broadcast (admin notifying many/all users): { to: [...], subject,
//     html, idToken } where `to` is an array. ADDITIONALLY requires a
//     valid Firebase ID token for a signed-in admin (verified against
//     Google's own accounts:lookup endpoint — no firebase-admin/
//     service-account needed, just the same public Firebase Web API
//     key the storefront already ships). Sent as BCC so recipients
//     don't see each other.
//
// To activate:
//   1. Turn on 2-Step Verification on info@olymposleather.com.tr
//      (myaccount.google.com/security)
//   2. Generate an App Password at myaccount.google.com/apppasswords
//      (app: "Mail", device: e.g. "Olympos Website")
//   3. In Vercel project settings -> Environment Variables, add:
//        SMTP_USER = info@olymposleather.com.tr
//        SMTP_PASS = <the 16-character app password, no spaces>
//        EMAIL_SITE_SECRET = NROsU7gPg0LPUz4h_nxlauPK2W-K3mfE
//      (that exact value — it must match the one already hardcoded
//      into assets/js/backend.js's SITE_SECRET constant; change both
//      together if you ever rotate it)
//   4. Redeploy. No code change needed — this activates automatically
//      once all three vars are present.
//
// Called from assets/js/backend.js's sendOrderConfirmation() /
// sendOrderStatusEmail() / broadcastNotification() helpers — no page
// calls this endpoint directly.

import nodemailer from 'nodemailer';

// Mirrors backend.js's ADMIN_EMAILS — kept in sync by hand, same as
// that file's own comment describes for promoting a new admin.
const ADMIN_EMAILS = ['picturesshadow0@gmail.com'];
const FIREBASE_API_KEY = 'AIzaSyDWDf0hp6BD6RkB0zAo2RkGis2yKUE_94E';
const MAX_RECIPIENTS = 50;

let cachedTransporter = null;
function getTransporter() {
  if (!cachedTransporter) {
    cachedTransporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
    });
  }
  return cachedTransporter;
}

// Verifies a Firebase Auth ID token belongs to a real, currently valid
// session, using Google's own public token-lookup endpoint (no
// firebase-admin / service-account key needed). Returns the verified
// email on success, or null.
async function verifiedAdminEmail(idToken) {
  if (!idToken) return null;
  try {
    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${FIREBASE_API_KEY}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idToken }) }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const email = (data.users && data.users[0] && data.users[0].email || '').toLowerCase();
    return ADMIN_EMAILS.includes(email) ? email : null;
  } catch {
    return null;
  }
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method-not-allowed' });
  }

  if (!process.env.SMTP_USER || !process.env.SMTP_PASS || !process.env.EMAIL_SITE_SECRET) {
    return res.status(501).json({
      error: 'not-configured',
      message: 'E-posta gönderimi henüz yapılandırılmadı (SMTP_USER / SMTP_PASS / EMAIL_SITE_SECRET).'
    });
  }

  if (req.headers['x-site-secret'] !== process.env.EMAIL_SITE_SECRET) {
    return res.status(403).json({ error: 'forbidden' });
  }

  const { to, subject, html, idToken } = req.body || {};
  const recipients = (Array.isArray(to) ? to : [to])
    .filter(Boolean)
    .map(e => String(e).trim().toLowerCase())
    .filter(e => EMAIL_RE.test(e));

  if (recipients.length === 0 || !subject || !html) {
    return res.status(400).json({ error: 'invalid-request', message: 'to, subject ve html alanları gerekli.' });
  }
  if (recipients.length > MAX_RECIPIENTS) {
    return res.status(400).json({ error: 'too-many-recipients', message: `Tek seferde en fazla ${MAX_RECIPIENTS} alıcıya gönderim yapılabilir.` });
  }
  if (String(subject).length > 200 || String(html).length > 20000) {
    return res.status(400).json({ error: 'too-large', message: 'Konu veya içerik çok uzun.' });
  }

  const isBroadcast = Array.isArray(to) && recipients.length > 1;
  if (isBroadcast) {
    const adminEmail = await verifiedAdminEmail(idToken);
    if (!adminEmail) {
      return res.status(403).json({ error: 'not-authorized', message: 'Bu işlem için yönetici girişi gerekiyor.' });
    }
  }

  try {
    const transporter = getTransporter();
    const mail = {
      from: `"Olympos Leather" <${process.env.SMTP_USER}>`,
      subject,
      html
    };
    if (isBroadcast) {
      mail.to = process.env.SMTP_USER;
      mail.bcc = recipients;
    } else {
      mail.to = recipients[0];
    }
    await transporter.sendMail(mail);
    return res.status(200).json({ success: true, sent: recipients.length });
  } catch (err) {
    console.error('send-email failed', err);
    return res.status(502).json({ error: 'send-failed', message: 'E-posta gönderilemedi.' });
  }
}
