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
<body style="margin:0;padding:0;background:#f8f7ff;font-family:-apple-system,BlinkMacSystemFont,'Helvetica Neue',Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">

  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f8f7ff;padding:56px 20px 64px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;">

          <!-- LOGO -->
          <tr>
            <td align="center" style="padding-bottom:48px;">
              <div style="display:inline-block;background:linear-gradient(135deg,#8ECDF8 0%,#6B8EF5 22%,#9B35FF 45%,#F472B6 70%,#FB923C 100%);border-radius:50%;padding:6px;width:36px;height:36px;vertical-align:middle;margin-right:10px;box-sizing:border-box;">
                <div style="background:#f8f7ff;border-radius:50%;width:24px;height:24px;"></div>
              </div>
              <span style="font-size:18px;font-weight:700;color:#0f172a;letter-spacing:-0.4px;vertical-align:middle;">OneWork</span>
            </td>
          </tr>

          <!-- BADGE -->
          <tr>
            <td align="center" style="padding-bottom:28px;">
              <div style="display:inline-block;background:rgba(99,102,241,0.08);border:1px solid rgba(99,102,241,0.18);border-radius:100px;padding:7px 18px;">
                <span style="font-size:11px;font-weight:700;color:#6366f1;letter-spacing:0.1em;text-transform:uppercase;">✦ Accès anticipé confirmé</span>
              </div>
            </td>
          </tr>

          <!-- TITRE PRINCIPAL -->
          <tr>
            <td align="center" style="padding-bottom:20px;">
              <h1 style="margin:0;font-size:56px;font-weight:900;color:#0f172a;letter-spacing:-2.5px;line-height:1.0;">
                Vous êtes<br>sur la liste.
              </h1>
            </td>
          </tr>

          <!-- SOUS-TITRE -->
          <tr>
            <td align="center" style="padding-bottom:56px;">
              <p style="margin:0;font-size:16px;color:#64748b;line-height:1.7;text-align:center;">
                Vous serez parmi les premiers à découvrir<br>une nouvelle façon de travailler.<br>
                <span style="color:#94a3b8;font-size:14px;">On vous contacte dès que votre accès est prêt.</span>
              </p>
            </td>
          </tr>

          <!-- DIVIDER -->
          <tr>
            <td style="padding-bottom:32px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr><td style="border-top:1px solid #e2e8f0;font-size:0;line-height:0;">&nbsp;</td></tr>
              </table>
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td align="center">
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
