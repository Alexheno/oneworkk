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
<body style="margin:0;padding:0;background:#f0f0f8;font-family:-apple-system,BlinkMacSystemFont,'Helvetica Neue',Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">

  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f0f0f8;padding:48px 20px 64px;">
    <tr>
      <td align="center">
        <table width="680" cellpadding="0" cellspacing="0" border="0" style="max-width:680px;width:100%;">

          <!-- LOGO NAV -->
          <tr>
            <td align="center" style="padding-bottom:44px;">
              <table cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" valign="middle" style="padding-right:10px;">
                    <!-- Ring logo — matching the site -->
                    <img src="https://build-two-cyan.vercel.app/morning-ai/desktop-app/logo.svg" width="28" height="28" alt="OneWork" style="display:block;border-radius:50%;">
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

                <!-- HERO avec fond dégradé comme le site -->
                <tr>
                  <td align="center" style="background:linear-gradient(160deg,#f8f6ff 0%,#eef2ff 40%,#fdf4ff 100%);padding:56px 56px 48px;border-radius:28px 28px 0 0;">

                    <!-- Ring logo grand -->
                    <img src="https://build-two-cyan.vercel.app/morning-ai/desktop-app/logo.svg" width="72" height="72" alt="" style="display:block;margin:0 auto 28px;border-radius:50%;">

                    <!-- Badge -->
                    <div style="display:inline-block;background:rgba(99,102,241,0.08);border:1px solid rgba(99,102,241,0.2);border-radius:100px;padding:6px 16px;margin-bottom:24px;">
                      <span style="font-size:11px;font-weight:700;color:#6366f1;letter-spacing:0.08em;text-transform:uppercase;">✦ Accès anticipé confirmé</span>
                    </div>

                    <!-- Titre — même style que le site, mot par mot -->
                    <h1 style="margin:0 0 4px;font-size:46px;font-weight:800;color:#0f172a;letter-spacing:-1.5px;line-height:1.1;">
                      Vous êtes
                    </h1>
                    <h1 style="margin:0 0 0;font-size:46px;font-weight:800;letter-spacing:-1.5px;line-height:1.1;">
                      <span style="color:#6366f1;">sur </span><span style="color:#a855f7;">la </span><span style="color:#f97316;">liste.</span>
                    </h1>

                  </td>
                </tr>

                <!-- BODY BLANC -->
                <tr>
                  <td style="background:#ffffff;padding:48px 56px 52px;">

                    <p style="margin:0 0 28px;font-size:12px;font-weight:700;color:#94a3b8;letter-spacing:0.1em;text-transform:uppercase;">Ce qui vous attend</p>

                    <!-- Feature 1 -->
                    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:16px;background:#f8faff;border:1px solid #e8edff;border-radius:16px;">
                      <tr>
                        <td style="padding:20px 24px;">
                          <table cellpadding="0" cellspacing="0" border="0" width="100%">
                            <tr>
                              <td width="44" valign="middle">
                                <div style="width:40px;height:40px;border-radius:12px;background:linear-gradient(135deg,#eef2ff,#e0e7ff);text-align:center;line-height:40px;font-size:20px;">🧠</div>
                              </td>
                              <td style="padding-left:16px;">
                                <div style="font-size:15px;font-weight:700;color:#0f172a;margin-bottom:3px;">Votre journée analysée en 10 secondes</div>
                                <div style="font-size:13px;color:#64748b;line-height:1.55;">OneWork lit vos emails, réunions et Teams — to-do list prioritisée générée chaque matin.</div>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>

                    <!-- Feature 2 -->
                    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:16px;background:#f8faff;border:1px solid #e8edff;border-radius:16px;">
                      <tr>
                        <td style="padding:20px 24px;">
                          <table cellpadding="0" cellspacing="0" border="0" width="100%">
                            <tr>
                              <td width="44" valign="middle">
                                <div style="width:40px;height:40px;border-radius:12px;background:linear-gradient(135deg,#fdf4ff,#f3e8ff);text-align:center;line-height:40px;font-size:20px;">⚡</div>
                              </td>
                              <td style="padding-left:16px;">
                                <div style="font-size:15px;font-weight:700;color:#0f172a;margin-bottom:3px;">Widget discret, toujours accessible</div>
                                <div style="font-size:13px;color:#64748b;line-height:1.55;">Survolez pour ouvrir — To-Do, réunions, agent IA. Bougez la souris, il disparaît.</div>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>

                    <!-- Feature 3 -->
                    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:40px;background:#f8faff;border:1px solid #e8edff;border-radius:16px;">
                      <tr>
                        <td style="padding:20px 24px;">
                          <table cellpadding="0" cellspacing="0" border="0" width="100%">
                            <tr>
                              <td width="44" valign="middle">
                                <div style="width:40px;height:40px;border-radius:12px;background:linear-gradient(135deg,#f0fdf4,#dcfce7);text-align:center;line-height:40px;font-size:20px;">🔒</div>
                              </td>
                              <td style="padding-left:16px;">
                                <div style="font-size:15px;font-weight:700;color:#0f172a;margin-bottom:3px;">Vos données restent chez vous</div>
                                <div style="font-size:13px;color:#64748b;line-height:1.55;">Architecture zero-trust. Rien ne transite par nos serveurs. Contrôle total.</div>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>

                    <!-- CTA -->
                    <table cellpadding="0" cellspacing="0" border="0" width="100%">
                      <tr>
                        <td align="center">
                          <a href="https://build-two-cyan.vercel.app" style="display:inline-block;background:#0f172a;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:16px 48px;border-radius:980px;letter-spacing:-0.2px;">
                            Voir OneWork →
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
                <a href="mailto:onework.365@hotmail.com" style="color:#6366f1;text-decoration:none;">Nous contacter</a>
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
