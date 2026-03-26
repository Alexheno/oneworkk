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
  const desktop   = document.getElementById('win-desktop');
  const todo1     = document.getElementById('demo-todo-1');
  const todo2     = document.getElementById('demo-todo-2');
  const todo3     = document.getElementById('demo-todo-3');
  const chatInput = document.getElementById('demo-chatbar-input');
  const chatSend  = document.getElementById('demo-chatbar-send');
  const chatResp  = document.getElementById('demo-main-resp');

  if (!cursor || !desktop || !todo1) return;

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

  // Type text character by character into a span
  const PLACEHOLDER = 'Demandez quelque chose à Alex...';
  async function typeIn(text, el) {
    el.style.color = 'rgba(255,255,255,0.72)';
    for (let i = 0; i <= text.length; i++) {
      el.textContent = text.slice(0, i);
      await delay(44 + Math.random() * 30);
    }
  }

  // Stream text (AI response)
  async function stream(text, el) {
    for (let i = 0; i <= text.length; i++) {
      el.textContent = text.slice(0, i);
      await delay(18 + Math.random() * 12);
    }
  }

  async function run() {
    // ── Reset ──────────────────────────────────────────────────────────────────
    document.querySelectorAll('.demo-todo-item.checked').forEach(el => el.classList.remove('checked'));
    if (chatInput) { chatInput.textContent = PLACEHOLDER; chatInput.style.color = ''; }
    if (chatResp)  { chatResp.className = 'demo-main-resp'; chatResp.innerHTML = ''; }
    cursor.style.opacity = '0';

    await delay(1400);

    // ── 1. Cursor apparaît ────────────────────────────────────────────────────
    const dr = desktop.getBoundingClientRect();
    moveTo(dr.width * 0.38, dr.height * 0.22, 0);
    cursor.style.opacity = '1';

    await delay(700);

    // ── 2. Se déplace vers la première todo ───────────────────────────────────
    if (todo1) {
      const dot1 = todo1.querySelector('.demo-todo-dot');
      if (dot1) {
        const p = pos(dot1);
        await moveTo(p.x, p.y, 950);
        await delay(380);
        await click(dot1);
        await delay(120);
        todo1.classList.add('checked');
        await delay(650);
      }
    }

    // ── 3. Deuxième todo ──────────────────────────────────────────────────────
    if (todo2) {
      const dot2 = todo2.querySelector('.demo-todo-dot');
      if (dot2) {
        const p = pos(dot2);
        await moveTo(p.x, p.y, 700);
        await delay(320);
        await click(dot2);
        await delay(120);
        todo2.classList.add('checked');
        await delay(550);
      }
    }

    // ── 4. Troisième todo ─────────────────────────────────────────────────────
    if (todo3) {
      const dot3 = todo3.querySelector('.demo-todo-dot');
      if (dot3) {
        const p = pos(dot3);
        await moveTo(p.x, p.y, 650);
        await delay(300);
        await click(dot3);
        await delay(120);
        todo3.classList.add('checked');
        await delay(500);
      }
    }

    // ── 5. Se déplace vers le champ de saisie ────────────────────────────────
    if (chatInput) {
      const p = pos(chatInput);
      await moveTo(p.x - 20, p.y, 800);
      await delay(300);
      await click(null);
      await delay(200);

      // ── 6. Frappe le message ────────────────────────────────────────────────
      await typeIn('Rédige la réponse à Jean-Pierre sur le term sheet', chatInput);
      await delay(380);
    }

    // ── 7. Se déplace vers le bouton envoyer ─────────────────────────────────
    if (chatSend) {
      const p = pos(chatSend);
      await moveTo(p.x, p.y, 500);
      await delay(380);
      await click(chatSend);
      await delay(220);
    }

    // ── 8. Champ se vide, "Alex rédige..." ───────────────────────────────────
    if (chatInput) { chatInput.textContent = ''; chatInput.style.color = ''; }
    if (chatResp) {
      chatResp.className = 'demo-main-resp visible';
      chatResp.innerHTML = '<div class="ww-resp-orb"></div><em style="color:rgba(255,255,255,0.32);font-style:italic">Alex rédige...</em>';
    }

    // Curseur dérive
    await moveTo(dr.width * 0.52, dr.height * 0.58, 1100);
    await delay(1700);

    // ── 9. Réponse IA streamée ────────────────────────────────────────────────
    if (chatResp) {
      chatResp.innerHTML = '<div class="ww-resp-orb"></div><span id="demo-resp-txt"></span>';
      const txtEl = document.getElementById('demo-resp-txt');
      if (txtEl) {
        await stream(
          'Bonjour Jean-Pierre, je valide les conditions du term sheet. Je vous recontacte avant 10h pour finaliser les détails.',
          txtEl
        );
      }
    }

    await delay(4200);

    // ── Fin de cycle ─────────────────────────────────────────────────────────
    cursor.style.opacity = '0';
    await delay(4000);
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
