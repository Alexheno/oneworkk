'use strict';

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
                  <td align="center" style="background:linear-gradient(160deg,#f8f6ff 0%,#eef2ff 40%,#fdf4ff 100%);padding:64px 56px 52px;border-radius:28px 28px 0 0;">

                    <div style="display:inline-block;background:rgba(99,102,241,0.08);border:1px solid rgba(99,102,241,0.2);border-radius:100px;padding:6px 16px;margin-bottom:32px;">
                      <span style="font-size:11px;font-weight:700;color:#6366f1;letter-spacing:0.08em;text-transform:uppercase;">✦ Accès anticipé confirmé</span>
                    </div>

                    <div style="font-size:13px;font-weight:600;color:#94a3b8;letter-spacing:0.12em;text-transform:uppercase;margin-bottom:16px;">OneWork</div>

                    <h1 style="margin:0 0 0;font-size:52px;font-weight:900;color:#0f172a;letter-spacing:-2px;line-height:1.05;">
                      Vous êtes<br>
                      <span style="background:linear-gradient(135deg,#6366f1 0%,#a855f7 50%,#f97316 100%);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;">sur la liste.</span>
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

                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="border-top:1px solid #f1f5f9;font-size:0;line-height:0;">&nbsp;</td>
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
                <a href="https://oneworkkfront.vercel.app" style="color:#6366f1;text-decoration:none;">Visiter le site</a>
                &nbsp;·&nbsp;
                <a href="mailto:ge0.pro860@gmail.com" style="color:#6366f1;text-decoration:none;">Nous contacter</a>
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

// ─── Send waitlist confirmation email via Brevo ───────────────────────────────
async function sendWaitlistEmail(email, position) {
    console.log(`[Email] Tentative envoi → ${email} | BREVO_API_KEY=${process.env.BREVO_API_KEY ? 'ok' : 'MANQUANT'}`);
    if (!process.env.BREVO_API_KEY) {
        console.warn('[Email] BREVO_API_KEY manquante — email non envoyé');
        return false;
    }

    try {
        const res = await fetch('https://api.brevo.com/v3/smtp/email', {
            method: 'POST',
            headers: {
                'api-key':      process.env.BREVO_API_KEY,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                sender:      { name: 'OneWork', email: 'onework.365@hotmail.com' },
                to:          [{ email }],
                subject:     'Vous êtes sur la liste — OneWork',
                htmlContent: buildWaitlistEmail({ position }),
            }),
        });

        const data = await res.json();
        if (!res.ok) {
            console.error('[Email] Brevo error:', res.status, JSON.stringify(data));
            return false;
        }
        console.log(`[Email] Confirmation envoyée → ${email} (position #${position}) messageId=${data.messageId}`);
        return true;
    } catch (err) {
        console.error('[Email] Erreur Brevo:', err.message);
        return false;
    }
}

module.exports = { sendWaitlistEmail };
