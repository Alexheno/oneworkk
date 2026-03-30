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
<body style="margin:0;padding:0;background:#030712;font-family:-apple-system,BlinkMacSystemFont,'Helvetica Neue',Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">

  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#030712;padding:48px 20px 64px;">
    <tr>
      <td align="center">
        <table width="580" cellpadding="0" cellspacing="0" border="0" style="max-width:580px;width:100%;">

          <!-- LOGO -->
          <tr>
            <td align="center" style="padding-bottom:48px;">
              <table cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center">
                    <!-- Ring logo -->
                    <div style="width:56px;height:56px;border-radius:50%;background:conic-gradient(from 180deg,#8ECDF8,#6B8EF5,#9B35FF,#F472B6,#FB923C,#8ECDF8);display:inline-block;position:relative;">
                      <div style="position:absolute;top:8px;left:8px;right:8px;bottom:8px;border-radius:50%;background:#030712;"></div>
                    </div>
                    <div style="margin-top:12px;font-size:17px;font-weight:700;color:#ffffff;letter-spacing:-0.3px;">OneWork</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- HERO -->
          <tr>
            <td align="center" style="padding-bottom:12px;">
              <div style="display:inline-block;background:rgba(99,102,241,0.12);border:1px solid rgba(99,102,241,0.25);border-radius:100px;padding:5px 14px;margin-bottom:28px;">
                <span style="font-size:11px;font-weight:600;color:#818cf8;letter-spacing:0.1em;text-transform:uppercase;">Accès anticipé confirmé</span>
              </div>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding-bottom:16px;">
              <h1 style="margin:0;font-size:42px;font-weight:800;letter-spacing:-1.5px;line-height:1.1;color:#ffffff;">
                Vous êtes<br>sur la liste.
              </h1>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding-bottom:40px;">
              <p style="margin:0;font-size:17px;color:rgba(255,255,255,0.45);line-height:1.6;max-width:400px;">
                Vous serez parmi les premiers à découvrir OneWork.<br>
                Nous vous contacterons dès que l'accès est ouvert.
              </p>
            </td>
          </tr>

          <!-- POSITION CARD -->
          ${position ? `
          <tr>
            <td align="center" style="padding-bottom:48px;">
              <table cellpadding="0" cellspacing="0" border="0" style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:20px;overflow:hidden;">
                <tr>
                  <td style="padding:32px 56px;text-align:center;">
                    <div style="font-size:11px;font-weight:600;color:rgba(255,255,255,0.35);letter-spacing:0.12em;text-transform:uppercase;margin-bottom:8px;">Votre position</div>
                    <div style="font-size:56px;font-weight:900;letter-spacing:-2px;background:linear-gradient(135deg,#818cf8,#22d3ee);-webkit-background-clip:text;-webkit-text-fill-color:transparent;color:#818cf8;">#${position}</div>
                    <div style="margin-top:8px;font-size:13px;color:rgba(255,255,255,0.3);">sur la liste d'attente</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>` : ''}

          <!-- DIVIDER -->
          <tr>
            <td style="padding-bottom:40px;">
              <div style="height:1px;background:rgba(255,255,255,0.06);"></div>
            </td>
          </tr>

          <!-- CE QUI VOUS ATTEND -->
          <tr>
            <td style="padding-bottom:28px;">
              <p style="margin:0;font-size:13px;font-weight:600;color:rgba(255,255,255,0.3);letter-spacing:0.1em;text-transform:uppercase;">Ce qui vous attend</p>
            </td>
          </tr>

          <!-- FEATURE 1 -->
          <tr>
            <td style="padding-bottom:16px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);border-radius:16px;">
                <tr>
                  <td style="padding:20px 24px;">
                    <table cellpadding="0" cellspacing="0" border="0" width="100%">
                      <tr>
                        <td width="40" valign="middle">
                          <div style="width:36px;height:36px;border-radius:10px;background:rgba(129,140,248,0.12);text-align:center;line-height:36px;font-size:18px;">🧠</div>
                        </td>
                        <td style="padding-left:16px;vertical-align:middle;">
                          <div style="font-size:15px;font-weight:600;color:#f1f5f9;margin-bottom:3px;">Votre journée analysée en 10 secondes</div>
                          <div style="font-size:13px;color:rgba(255,255,255,0.4);line-height:1.5;">OneWork lit vos emails, réunions et Teams — to-do list générée automatiquement chaque matin.</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- FEATURE 2 -->
          <tr>
            <td style="padding-bottom:16px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);border-radius:16px;">
                <tr>
                  <td style="padding:20px 24px;">
                    <table cellpadding="0" cellspacing="0" border="0" width="100%">
                      <tr>
                        <td width="40" valign="middle">
                          <div style="width:36px;height:36px;border-radius:10px;background:rgba(34,211,238,0.10);text-align:center;line-height:36px;font-size:18px;">⚡</div>
                        </td>
                        <td style="padding-left:16px;vertical-align:middle;">
                          <div style="font-size:15px;font-weight:600;color:#f1f5f9;margin-bottom:3px;">Un widget discret, toujours là</div>
                          <div style="font-size:13px;color:rgba(255,255,255,0.4);line-height:1.5;">Survolez pour ouvrir. Bougez la souris, il disparaît. Jamais gênant, toujours utile.</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- FEATURE 3 -->
          <tr>
            <td style="padding-bottom:48px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);border-radius:16px;">
                <tr>
                  <td style="padding:20px 24px;">
                    <table cellpadding="0" cellspacing="0" border="0" width="100%">
                      <tr>
                        <td width="40" valign="middle">
                          <div style="width:36px;height:36px;border-radius:10px;background:rgba(74,222,128,0.10);text-align:center;line-height:36px;font-size:18px;">🔒</div>
                        </td>
                        <td style="padding-left:16px;vertical-align:middle;">
                          <div style="font-size:15px;font-weight:600;color:#f1f5f9;margin-bottom:3px;">Vos données restent chez vous</div>
                          <div style="font-size:13px;color:rgba(255,255,255,0.4);line-height:1.5;">Architecture zero-trust. Rien ne transite par nos serveurs. Contrôle total.</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- CTA -->
          <tr>
            <td align="center" style="padding-bottom:48px;">
              <a href="https://build-two-cyan.vercel.app" style="display:inline-block;background:linear-gradient(135deg,#6366f1 0%,#22d3ee 100%);color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:15px 40px;border-radius:980px;letter-spacing:-0.1px;">
                Voir OneWork →
              </a>
            </td>
          </tr>

          <!-- DIVIDER -->
          <tr>
            <td style="padding-bottom:28px;">
              <div style="height:1px;background:rgba(255,255,255,0.06);"></div>
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td align="center">
              <p style="margin:0 0 6px;font-size:12px;color:rgba(255,255,255,0.2);">
                © 2026 OneWork · Conçu pour ceux qui n'ont pas de temps à perdre.
              </p>
              <p style="margin:0;font-size:12px;color:rgba(255,255,255,0.2);">
                Vous recevez cet email car vous avez rejoint la liste d'attente.<br>
                <a href="https://build-two-cyan.vercel.app" style="color:#818cf8;text-decoration:none;">Visiter le site</a>
                &nbsp;·&nbsp;
                <a href="mailto:onework.365@hotmail.com" style="color:#818cf8;text-decoration:none;">Nous contacter</a>
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
    if (!process.env.BREVO_API_KEY) {
        console.warn('[Email] BREVO_API_KEY manquante — email non envoyé');
        return;
    }

    try {
        const res = await fetch('https://api.brevo.com/v3/smtp/email', {
            method:  'POST',
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

        if (!res.ok) {
            const err = await res.text();
            console.error('[Email] Brevo error:', res.status, err.slice(0, 200));
            return;
        }
        console.log(`[Email] Confirmation envoyée → ${email} (position #${position})`);
    } catch (err) {
        console.error('[Email] Erreur Brevo:', err.message);
    }
}

module.exports = { sendWaitlistEmail };
