'use strict';

const { Resend } = require('resend');
const resend = new Resend(process.env.RESEND_API_KEY);

// ─── Template HTML ────────────────────────────────────────────────────────────
function buildWaitlistEmail({ position }) {
    const positionLine = position
        ? `Vous êtes <strong>#${position}</strong> sur la liste.`
        : 'Votre place est confirmée.';

    return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bienvenue sur OneWork</title>
</head>
<body style="margin:0;padding:0;background:#f5f5f7;font-family:-apple-system,BlinkMacSystemFont,'Helvetica Neue',Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">

  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f5f5f7;padding:48px 0 64px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;">

          <!-- LOGO -->
          <tr>
            <td align="center" style="padding-bottom:32px;">
              <table cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="background:linear-gradient(135deg,#818cf8,#22d3ee);border-radius:14px;width:44px;height:44px;text-align:center;vertical-align:middle;">
                    <span style="font-size:22px;line-height:44px;">✦</span>
                  </td>
                  <td style="padding-left:10px;font-size:20px;font-weight:700;color:#1d1d1f;letter-spacing:-0.3px;">OneWork</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- HERO CARD -->
          <tr>
            <td style="border-radius:20px;overflow:hidden;box-shadow:0 4px 32px rgba(0,0,0,0.08);">

              <!-- Gradient header -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="background:linear-gradient(135deg,#0f0f14 0%,#1a1040 50%,#0a1628 100%);padding:52px 48px 44px;text-align:center;border-radius:20px 20px 0 0;">

                    <!-- Badge -->
                    <div style="display:inline-block;background:rgba(129,140,248,0.15);border:1px solid rgba(129,140,248,0.3);border-radius:100px;padding:6px 16px;margin-bottom:28px;">
                      <span style="font-size:12px;font-weight:600;color:#818cf8;letter-spacing:0.08em;text-transform:uppercase;">Accès anticipé confirmé</span>
                    </div>

                    <h1 style="margin:0 0 16px;font-size:36px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;line-height:1.15;">
                      Vous êtes sur la liste. 🎉
                    </h1>
                    <p style="margin:0;font-size:17px;color:rgba(255,255,255,0.6);line-height:1.6;max-width:420px;margin:0 auto;">
                      ${positionLine}<br>
                      Vous serez parmi les <em>premiers</em> à découvrir OneWork.
                    </p>

                    <!-- Position pill -->
                    ${position ? `
                    <div style="margin-top:32px;display:inline-block;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);border-radius:14px;padding:16px 32px;">
                      <div style="font-size:11px;font-weight:600;color:rgba(255,255,255,0.4);letter-spacing:0.1em;text-transform:uppercase;margin-bottom:4px;">Votre position</div>
                      <div style="font-size:40px;font-weight:800;color:#ffffff;letter-spacing:-1px;background:linear-gradient(135deg,#818cf8,#22d3ee);-webkit-background-clip:text;-webkit-text-fill-color:transparent;">#${position}</div>
                    </div>` : ''}

                  </td>
                </tr>

                <!-- White body -->
                <tr>
                  <td style="background:#ffffff;padding:48px 48px 40px;border-radius:0 0 20px 20px;">

                    <!-- What to expect -->
                    <h2 style="margin:0 0 24px;font-size:20px;font-weight:700;color:#1d1d1f;letter-spacing:-0.3px;">Ce qui vous attend</h2>

                    <!-- Feature 1 -->
                    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:16px;">
                      <tr>
                        <td width="44" valign="top">
                          <div style="width:36px;height:36px;background:#f0f0ff;border-radius:10px;text-align:center;line-height:36px;font-size:18px;">🧠</div>
                        </td>
                        <td style="padding-left:14px;vertical-align:top;">
                          <div style="font-size:15px;font-weight:600;color:#1d1d1f;margin-bottom:2px;">Votre journée analysée en 10 secondes</div>
                          <div style="font-size:13px;color:#6e6e73;line-height:1.5;">OneWork lit vos emails, réunions et Teams — et génère votre to-do list du jour automatiquement.</div>
                        </td>
                      </tr>
                    </table>

                    <!-- Feature 2 -->
                    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:16px;">
                      <tr>
                        <td width="44" valign="top">
                          <div style="width:36px;height:36px;background:#f0fff7;border-radius:10px;text-align:center;line-height:36px;font-size:18px;">🔒</div>
                        </td>
                        <td style="padding-left:14px;vertical-align:top;">
                          <div style="font-size:15px;font-weight:600;color:#1d1d1f;margin-bottom:2px;">Vos données ne bougent pas</div>
                          <div style="font-size:13px;color:#6e6e73;line-height:1.5;">Architecture zero-trust. Rien ne transite par nos serveurs. Vous gardez le contrôle total.</div>
                        </td>
                      </tr>
                    </table>

                    <!-- Feature 3 -->
                    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:40px;">
                      <tr>
                        <td width="44" valign="top">
                          <div style="width:36px;height:36px;background:#fff8f0;border-radius:10px;text-align:center;line-height:36px;font-size:18px;">⚡</div>
                        </td>
                        <td style="padding-left:14px;vertical-align:top;">
                          <div style="font-size:15px;font-weight:600;color:#1d1d1f;margin-bottom:2px;">Un widget discret, toujours là</div>
                          <div style="font-size:13px;color:#6e6e73;line-height:1.5;">Survol → dashboard complet. Souris qui part → il disparaît. Jamais gênant, toujours utile.</div>
                        </td>
                      </tr>
                    </table>

                    <!-- Divider -->
                    <hr style="border:none;border-top:1px solid #f0f0f0;margin:0 0 36px;">

                    <!-- CTA -->
                    <div style="text-align:center;">
                      <h3 style="margin:0 0 8px;font-size:17px;font-weight:700;color:#1d1d1f;">La suite ?</h3>
                      <p style="margin:0 0 24px;font-size:14px;color:#6e6e73;line-height:1.6;">
                        Dès que OneWork est prêt, vous recevrez un email avec votre lien de téléchargement en priorité.<br>Gratuit. Sans engagement.
                      </p>
                      <a href="https://onework.app" style="display:inline-block;background:linear-gradient(135deg,#6366f1,#22d3ee);color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:14px 36px;border-radius:980px;letter-spacing:-0.1px;">
                        Voir la démo →
                      </a>
                    </div>

                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="padding-top:32px;text-align:center;">
              <p style="margin:0 0 8px;font-size:12px;color:#adadb8;">
                © 2026 OneWork · Conçu pour ceux qui n'ont pas de temps à perdre.
              </p>
              <p style="margin:0;font-size:12px;color:#adadb8;">
                Vous recevez cet email car vous avez rejoint la liste d'attente OneWork.<br>
                <a href="https://onework.app" style="color:#818cf8;text-decoration:none;">Visiter le site</a>
                &nbsp;·&nbsp;
                <a href="mailto:contact@onework.app" style="color:#818cf8;text-decoration:none;">Nous contacter</a>
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

// ─── Send waitlist confirmation email ─────────────────────────────────────────
async function sendWaitlistEmail(email, position) {
    if (!process.env.RESEND_API_KEY) {
        console.warn('[Email] RESEND_API_KEY manquante — email non envoyé');
        return;
    }

    try {
        await resend.emails.send({
            from:    'OneWork <onboarding@resend.dev>',
            to:      email,
            subject: 'Vous êtes sur la liste ✦ OneWork',
            html:    buildWaitlistEmail({ position }),
        });
        console.log(`[Email] Confirmation envoyée → ${email} (position #${position})`);
    } catch (err) {
        console.error('[Email] Erreur Resend:', err.message);
    }
}

module.exports = { sendWaitlistEmail };
