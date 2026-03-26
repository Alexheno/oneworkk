'use strict';

// ─── Navbar scroll effect ─────────────────────────────────────────────────────
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
  navbar.classList.toggle('scrolled', window.scrollY > 20);
}, { passive: true });

// ─── Scroll reveal ─────────────────────────────────────────────────────────────
const revealObs = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('visible'); revealObs.unobserve(e.target); }
  });
}, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
document.querySelectorAll('.reveal').forEach(el => revealObs.observe(el));

// ─── Demo animation sequence ──────────────────────────────────────────────────
function startDemoSequence() {
  const cursor    = document.getElementById('demo-cursor');
  const popup     = document.getElementById('win-widget-popup');
  const desktop   = document.getElementById('win-desktop');
  const tbItem    = document.querySelector('.win-tb-item.active');
  const inputDisp = document.getElementById('ww-input-display');
  const sendBtn   = document.getElementById('ww-chat-send');
  const respEl    = document.getElementById('ww-response');
  const closeBtn  = document.getElementById('ww-close');

  if (!cursor || !popup || !desktop || !tbItem) return;

  const delay = ms => new Promise(r => setTimeout(r, ms));

  // Get element center relative to win-desktop
  function pos(el) {
    const dr = desktop.getBoundingClientRect();
    const er = el.getBoundingClientRect();
    return { x: er.left + er.width / 2 - dr.left, y: er.top + er.height / 2 - dr.top };
  }

  // Move cursor with given duration
  function moveTo(x, y, ms = 700) {
    cursor.style.setProperty('--cdur', ms + 'ms');
    cursor.style.left = x + 'px';
    cursor.style.top  = y + 'px';
    return delay(ms);
  }

  // Click animation
  async function click(el) {
    cursor.classList.add('clicking');
    if (el) el.classList.add('demo-hl');
    await delay(130);
    cursor.classList.remove('clicking');
    if (el) setTimeout(() => el.classList.remove('demo-hl'), 200);
  }

  // Type text character by character
  async function typeIn(text, el) {
    el.classList.add('typing');
    for (let i = 0; i <= text.length; i++) {
      el.textContent = text.slice(0, i);
      await delay(42 + Math.random() * 28);
    }
  }

  // Stream text (AI response)
  async function stream(text, el) {
    for (let i = 0; i <= text.length; i++) {
      el.textContent = text.slice(0, i);
      await delay(20 + Math.random() * 10);
    }
  }

  async function run() {
    // ── Reset ──────────────────────────────────────────────────────────────────
    popup.classList.remove('open');
    respEl.className = 'ww-response';
    respEl.innerHTML = '';
    inputDisp.textContent = '';
    inputDisp.classList.remove('typing');
    cursor.style.opacity = '0';

    await delay(1500);

    // ── 1. Cursor apparaît en haut-droite de l'écran ──────────────────────────
    const dr = desktop.getBoundingClientRect();
    moveTo(dr.width * 0.62, dr.height * 0.3, 0);   // instant placement
    cursor.style.opacity = '1';

    await delay(700);

    // ── 2. Se déplace vers l'icône OneWork dans la taskbar ────────────────────
    const wp = pos(tbItem);
    await moveTo(wp.x, wp.y, 1000);
    await delay(250);

    // ── 3. Hover glow → click ─────────────────────────────────────────────────
    tbItem.classList.add('demo-hl');
    await delay(350);
    await click(tbItem);
    await delay(300);

    // ── 4. Widget popup s'ouvre ───────────────────────────────────────────────
    popup.classList.add('open');
    await delay(1100);

    // ── 5. Curseur se déplace vers le champ de saisie ─────────────────────────
    const ir = inputDisp.getBoundingClientRect();
    const deskR = desktop.getBoundingClientRect();
    await moveTo(ir.left + 55 - deskR.left, ir.top + ir.height / 2 - deskR.top, 750);
    await delay(350);

    // ── 6. Click dans le champ ────────────────────────────────────────────────
    await click(null);
    await delay(200);

    // ── 7. Frappe le message ──────────────────────────────────────────────────
    await typeIn('Rédige une réponse à Jean-Pierre...', inputDisp);
    await delay(450);

    // ── 8. Se déplace vers le bouton envoyer ──────────────────────────────────
    const sp = pos(sendBtn);
    await moveTo(sp.x, sp.y, 520);
    await delay(500);

    // ── 9. Click envoyer ──────────────────────────────────────────────────────
    await click(sendBtn);
    await delay(250);

    // ── 10. Champ se vide, réponse "Alex rédige..." ────────────────────────────
    inputDisp.textContent = '';
    inputDisp.classList.remove('typing');
    respEl.className = 'ww-response visible';
    respEl.innerHTML = '<div class="ww-resp-orb"></div><em style="color:rgba(255,255,255,0.3);font-style:italic">Alex rédige...</em>';

    // Curseur dérive pendant l'attente
    await moveTo(dr.width * 0.5, dr.height * 0.5, 900);
    await delay(1800);

    // ── 11. Réponse IA streamée ───────────────────────────────────────────────
    respEl.innerHTML = '<div class="ww-resp-orb"></div><span id="ww-resp-txt"></span>';
    const txtEl = document.getElementById('ww-resp-txt');
    if (txtEl) {
      await stream(
        'Bonjour Jean-Pierre, je valide les conditions du term sheet. Je vous recontacte avant 10h pour finaliser les détails.',
        txtEl
      );
    }

    await delay(4000);

    // ── 12. Curseur se déplace vers la croix de fermeture ────────────────────
    const cp = pos(closeBtn);
    await moveTo(cp.x, cp.y, 750);
    await delay(700);
    await click(closeBtn);
    await delay(380);

    // ── 13. Popup se ferme ────────────────────────────────────────────────────
    popup.classList.remove('open');
    await delay(700);
    cursor.style.opacity = '0';

    await delay(5500);

    // ── Boucle ────────────────────────────────────────────────────────────────
    run();
  }

  run();
}

// ─── Laptop tilt → flat + start demo ─────────────────────────────────────────
const laptop = document.getElementById('demo-laptop');
if (laptop) {
  const lo = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting) {
      laptop.classList.add('leveled');
      setTimeout(startDemoSequence, 2200);
      lo.disconnect();
    }
  }, { threshold: 0.22 });
  lo.observe(laptop);
}

// ─── Smooth anchor scroll ─────────────────────────────────────────────────────
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const target = document.querySelector(a.getAttribute('href'));
    if (target) { e.preventDefault(); target.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
  });
});
