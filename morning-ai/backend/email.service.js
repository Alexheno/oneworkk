'use strict';

const nodemailer = require('nodemailer');

// ─── Template HTML ────────────────────────────────────────────────────────────
function buildWaitlistEmail({ position }) {
    return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>OneWork — Inscription confirmée</title>
</head>
<body style="margin:0;padding:0;background:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Helvetica Neue',Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">

  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#ffffff;padding:48px 20px 64px;">
    <tr>
      <td align="center">
        <table width="680" cellpadding="0" cellspacing="0" border="0" style="max-width:680px;width:100%;">

          <!-- LOGO NAV -->
          <tr>
            <td align="center" style="padding-bottom:44px;">
              <table cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" valign="middle" style="padding-right:10px;">
                    <div style="width:28px;height:28px;border-radius:50%;background:linear-gradient(135deg,#8ECDF8 0%,#6B8EF5 22%,#9B35FF 45%,#F472B6 70%,#FB923C 100%);padding:5px;box-sizing:border-box;display:inline-block;"><div style="width:18px;height:18px;border-radius:50%;background:#f4f1ff;"></div></div>
                  </td>
                  <td style="font-size:17px;font-weight:700;color:#0f172a;letter-spacing:-0.4px;">OneWork</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- MAIN CARD -->
          <tr>
            <td style="background:#ffffff;border-radius:28px;overflow:hidden;box-shadow:0 2px 40px rgba(99,102,241,0.10),0 1px 4px rgba(0,0,0,0.06);">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">

                <!-- HERO -->
                <tr>
                  <td align="center" style="background:linear-gradient(160deg,#f8f6ff 0%,#eef2ff 40%,#fdf4ff 100%);padding:56px 56px 48px;border-radius:28px 28px 0 0;">

                    <div style="width:72px;height:72px;border-radius:50%;background:linear-gradient(135deg,#8ECDF8 0%,#6B8EF5 22%,#9B35FF 45%,#F472B6 70%,#FB923C 100%);padding:13px;box-sizing:border-box;margin:0 auto 28px;"><div style="width:46px;height:46px;border-radius:50%;background:linear-gradient(160deg,#f8f6ff,#eef2ff);"></div></div>

                    <div style="display:inline-block;background:rgba(99,102,241,0.08);border:1px solid rgba(99,102,241,0.2);border-radius:100px;padding:6px 16px;margin-bottom:24px;">
                      <span style="font-size:11px;font-weight:700;color:#6366f1;letter-spacing:0.08em;text-transform:uppercase;">✦ Accès anticipé confirmé</span>
                    </div>

                    <h1 style="margin:0 0 4px;font-size:46px;font-weight:800;color:#0f172a;letter-spacing:-1.5px;line-height:1.1;">
                      Vous êtes
                    </h1>
                    <h1 style="margin:0 0 0;font-size:46px;font-weight:800;letter-spacing:-1.5px;line-height:1.1;">
                      <span style="color:#6366f1;">s</span><span style="color:#7B55F4;">u</span><span style="color:#9244F6;">r</span> <span style="color:#A855F7;">l</span><span style="color:#BF4FD8;">a</span> <span style="color:#D44BB8;">l</span><span style="color:#E44D96;">i</span><span style="color:#EF5E6A;">s</span><span style="color:#F56D42;">t</span><span style="color:#F97316;">e.</span>
                    </h1>

                  </td>
                </tr>

                <!-- BODY -->
                <tr>
                  <td style="background:#ffffff;padding:48px 56px 56px;">

                    <p style="margin:0 0 12px;font-size:17px;font-weight:600;color:#0f172a;line-height:1.6;text-align:center;">
                      Vous serez parmi les premiers à découvrir<br>une nouvelle façon de travailler.
                    </p>
                    <p style="margin:0 0 44px;font-size:15px;color:#64748b;line-height:1.7;text-align:center;">
                      On vous contacte dès que votre accès est prêt.
                    </p>

                    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:44px;">
                      <tr>
                        <td style="border-top:1px solid #f1f5f9;font-size:0;line-height:0;">&nbsp;</td>
                      </tr>
                    </table>

                    <table cellpadding="0" cellspacing="0" border="0" width="100%">
                      <tr>
                        <td align="center">
                          <a href="https://build-two-cyan.vercel.app" style="display:inline-block;background:linear-gradient(135deg,#6366f1,#a855f7);color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;padding:18px 56px;border-radius:980px;letter-spacing:-0.1px;box-shadow:0 8px 32px rgba(99,102,241,0.35);">
                            OneWork
                          </a>
                        </td>
                      </tr>
                    </table>

                  </td>
                </tr>

              </table>
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td align="center" style="padding-top:32px;">
              <p style="margin:0;font-size:12px;color:#94a3b8;">
                © 2026 OneWork
                &nbsp;·&nbsp;
                <a href="https://build-two-cyan.vercel.app" style="color:#6366f1;text-decoration:none;">Visiter le site</a>
                &nbsp;·&nbsp;
                <a href="mailto:Henoumontalex@gmail.com" style="color:#6366f1;text-decoration:none;">Nous contacter</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>`;
}

// ─── Transporter Gmail ────────────────────────────────────────────────────────
function createTransporter() {
    return nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.GMAIL_USER,
            pass: process.env.GMAIL_APP_PASSWORD,
        },
    });
}

// ─── Send waitlist confirmation email via Gmail ───────────────────────────────
async function sendWaitlistEmail(email, position) {
    if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
        console.warn('[Email] GMAIL_USER ou GMAIL_APP_PASSWORD manquant — email non envoyé');
        return;
    }

    try {
        const transporter = createTransporter();
        await transporter.sendMail({
            from:    `"OneWork" <${process.env.GMAIL_USER}>`,
            to:      email,
            subject: 'Vous êtes sur la liste — OneWork',
            html:    buildWaitlistEmail({ position }),
        });
        console.log(`[Email] Confirmation envoyée → ${email} (position #${position})`);
    } catch (err) {
        console.error('[Email] Erreur Gmail:', err.message);
    }
}

module.exports = { sendWaitlistEmail };
