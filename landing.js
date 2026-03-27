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

// ─── Two-phase demo sequence ──────────────────────────────────────────────────
function startDemoSequence() {
  const cursor      = document.getElementById('demo-cursor');
  const desktop     = document.getElementById('win-desktop');
  const bgOutlook   = document.getElementById('bg-outlook-window');
  const bgExcel     = document.getElementById('bg-excel-window');
  const widgetEl    = document.getElementById('win-widget-popup');
  const winWindow   = document.getElementById('win-onework');
  const wwTask1     = document.getElementById('ww-task-1');
  const wwTask2     = document.getElementById('ww-task-2');
  const wwChatInput = document.getElementById('ww-chat-input');
  const wwChatSend  = document.getElementById('ww-chat-send');
  const wwResponse  = document.getElementById('ww-response');
  const wwKnob      = document.getElementById('ww-knob');
  const chatInput   = document.getElementById('demo-chatbar-input');
  const chatSend    = document.getElementById('demo-chatbar-send');
  const mainResp    = document.getElementById('demo-main-resp');

  if (!cursor || !desktop || !bgOutlook) return;

  const delay = ms => new Promise(r => setTimeout(r, ms));
  const WW_PH   = 'Demandez à Alex...';
  const MAIN_PH = 'Demandez quelque chose à Alex...';

  // Get element center relative to win-desktop
  function pos(el) {
    const dr = desktop.getBoundingClientRect();
    const er = el.getBoundingClientRect();
    return { x: er.left + er.width / 2 - dr.left, y: er.top + er.height / 2 - dr.top };
  }

  function moveTo(x, y, ms = 700) {
    cursor.style.setProperty('--cdur', ms + 'ms');
    cursor.style.left = x + 'px';
    cursor.style.top  = y + 'px';
    return delay(ms);
  }

  async function click(el) {
    cursor.classList.add('clicking');
    if (el) el.classList.add('demo-hl');
    await delay(130);
    cursor.classList.remove('clicking');
    if (el) setTimeout(() => el.classList.remove('demo-hl'), 200);
  }

  async function typeIn(text, el) {
    el.style.color = 'rgba(255,255,255,0.72)';
    for (let i = 0; i <= text.length; i++) {
      el.textContent = text.slice(0, i);
      await delay(44 + Math.random() * 30);
    }
  }

  async function stream(text, el) {
    for (let i = 0; i <= text.length; i++) {
      el.textContent = text.slice(0, i);
      await delay(18 + Math.random() * 12);
    }
  }

  async function run() {
    // ══════════════════════════════════════════════════════════
    // RESET
    // ══════════════════════════════════════════════════════════
    widgetEl.classList.remove('open');
    if (wwTask1) { wwTask1.classList.remove('checked'); }
    if (wwTask2) { wwTask2.classList.remove('checked'); }
    if (wwChatInput) { wwChatInput.textContent = WW_PH; wwChatInput.style.color = ''; }
    if (wwResponse)  { wwResponse.innerHTML = ''; }

    bgOutlook.classList.remove('fading');
    bgExcel.classList.remove('visible');
    if (winWindow) winWindow.classList.remove('visible', 'expanded');
    if (mainResp)  { mainResp.className = 'demo-main-resp'; mainResp.innerHTML = ''; }
    if (chatInput)   { chatInput.textContent = MAIN_PH; chatInput.style.color = ''; }

    cursor.style.opacity = '0';
    await delay(1200);

    // ══════════════════════════════════════════════════════════
    // PHASE 1 — Outlook + Widget interaction
    // ══════════════════════════════════════════════════════════
    const dr = desktop.getBoundingClientRect();

    // Cursor appears at center of screen
    moveTo(dr.width * 0.50, dr.height * 0.45, 0);
    cursor.style.opacity = '1';
    await delay(700);

    // 1. Move to the knob → click to open widget card
    if (wwKnob) {
      const p = pos(wwKnob);
      await moveTo(p.x, p.y, 950);
      await delay(320);
      await click(wwKnob);
      await delay(180);
      widgetEl.classList.add('open');
      await delay(600);
    }

    // 2. Check task 1 in widget
    if (wwTask1) {
      const dot1 = wwTask1.querySelector('.ww-dot');
      if (dot1) {
        const p = pos(dot1);
        await moveTo(p.x, p.y, 750);
        await delay(320);
        await click(dot1);
        await delay(110);
        wwTask1.classList.add('checked');
        await delay(520);
      }
    }

    // 3. Check task 2 in widget
    if (wwTask2) {
      const dot2 = wwTask2.querySelector('.ww-dot');
      if (dot2) {
        const p = pos(dot2);
        await moveTo(p.x, p.y, 620);
        await delay(280);
        await click(dot2);
        await delay(110);
        wwTask2.classList.add('checked');
        await delay(460);
      }
    }

    // 4. Move to widget chat input, type message
    if (wwChatInput) {
      const p = pos(wwChatInput);
      await moveTo(p.x - 12, p.y, 720);
      await delay(270);
      await click(null);
      await delay(180);
      await typeIn('Résume ma journée', wwChatInput);
      await delay(340);
    }

    // 5. Click send
    if (wwChatSend) {
      const p = pos(wwChatSend);
      await moveTo(p.x, p.y, 480);
      await delay(310);
      await click(wwChatSend);
      await delay(200);
    }

    // 6. Show "Alex analyse..." then stream response
    if (wwChatInput) { wwChatInput.textContent = ''; wwChatInput.style.color = ''; }
    if (wwResponse) {
      wwResponse.innerHTML = '<em style="color:rgba(255,255,255,0.3);font-style:italic;font-size:0.67rem">Alex analyse...</em>';
    }

    // Cursor drifts away
    await moveTo(dr.width * 0.42, dr.height * 0.48, 1000);
    await delay(1600);

    if (wwResponse) {
      wwResponse.innerHTML = '<span id="ww-resp-txt"></span>';
      const wwTxt = document.getElementById('ww-resp-txt');
      if (wwTxt) {
        await stream('3 urgences · Réunion 09h30 Finance · Term sheet JP à signer avant 10h00', wwTxt);
      }
    }
    await delay(2800);

    // ══════════════════════════════════════════════════════════
    // TRANSITION — Widget closes → Excel appears → Window expands
    // ══════════════════════════════════════════════════════════
    widgetEl.classList.remove('open');
    cursor.style.opacity = '0';
    await delay(550);

    // Switch background Outlook → Excel
    bgOutlook.classList.add('fading');
    await delay(300);
    bgExcel.classList.add('visible');
    await delay(500);

    // Show + expand OneWork window (already has bento grid inside)
    if (winWindow) winWindow.classList.add('visible', 'expanded');
    await delay(1000); // let transition animate

    // ══════════════════════════════════════════════════════════
    // PHASE 2 — Excel background + expanded OneWork dashboard
    // ══════════════════════════════════════════════════════════
    cursor.style.opacity = '1';
    moveTo(dr.width * 0.48, dr.height * 0.28, 0);
    await delay(500);

    // Browse dashboard cards
    const cardEmails = document.getElementById('demo-card-emails');
    if (cardEmails) {
      const p = pos(cardEmails);
      await moveTo(p.x, p.y, 900);
      await delay(500);
    }
    const cardTeams = document.getElementById('demo-card-teams');
    if (cardTeams) {
      const p = pos(cardTeams);
      await moveTo(p.x, p.y, 700);
      await delay(420);
    }

    // Move to main chatbar
    if (chatInput) {
      const p = pos(chatInput);
      await moveTo(p.x - 20, p.y, 850);
      await delay(280);
      await click(null);
      await delay(180);
      await typeIn('Identifie les écarts budgétaires dans le fichier Excel', chatInput);
      await delay(360);
    }

    // Click send
    if (chatSend) {
      const p = pos(chatSend);
      await moveTo(p.x, p.y, 460);
      await delay(310);
      await click(chatSend);
      await delay(220);
    }

    // Show thinking state
    if (chatInput) { chatInput.textContent = ''; chatInput.style.color = ''; }
    if (mainResp) {
      mainResp.className = 'demo-main-resp visible';
      mainResp.innerHTML = '<div class="ww-resp-orb"></div><em style="color:rgba(255,255,255,0.32);font-style:italic">Alex analyse le fichier Excel...</em>';
    }

    // Cursor drifts
    await moveTo(dr.width * 0.50, dr.height * 0.58, 1200);
    await delay(2100);

    // Stream AI analysis
    if (mainResp) {
      mainResp.innerHTML = '<div class="ww-resp-orb"></div><span id="demo-resp-txt2"></span>';
      const txt2 = document.getElementById('demo-resp-txt2');
      if (txt2) {
        await stream(
          'Q1 sous-performe de 6.8% · EBITDA à 3.2% vs 17.6% attendu · Anomalie : Marketing +34.1% hors plan (+90k€)',
          txt2
        );
      }
    }

    await delay(4500);

    // ── End of cycle ──────────────────────────────────────────
    cursor.style.opacity = '0';
    await delay(3800);
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
