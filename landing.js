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
  const wwTask3     = document.getElementById('ww-task-3');
  const wwTask4     = document.getElementById('ww-task-4');
  const wwAgentPanel = document.getElementById('ww-agent-panel');
  const wwBriefPanel = document.getElementById('ww-brief-panel');
  const wwModeAgent  = document.getElementById('ww-mode-agent');
  const wwModeBrief  = document.getElementById('ww-mode-brief');
  const wwChatInput = document.getElementById('ww-chat-input');
  const wwChatSend  = document.getElementById('ww-chat-send');
  const wwResponse  = document.getElementById('ww-response');
  const wwKnob      = document.getElementById('ww-knob');
  const chatInput   = document.getElementById('demo-chatbar-input');
  const chatSend    = document.getElementById('demo-chatbar-send');
  const mainResp    = document.getElementById('demo-main-resp');

  if (!cursor || !desktop || !bgOutlook) return;

  const delay = ms => new Promise(r => setTimeout(r, ms));
  const WW_PH   = 'Demandez quelque chose...';
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

  // FLIP: check task + animate sink to bottom
  async function checkAndSink(taskEl) {
    const container = taskEl.parentElement;
    const siblings = [...container.children];
    // First: snapshot positions
    const rects = new Map(siblings.map(el => [el, el.getBoundingClientRect()]));
    // Mark checked + move to last
    taskEl.classList.add('checked');
    container.appendChild(taskEl);
    // Invert: push each element back to its old visual position
    [...container.children].forEach(el => {
      const old = rects.get(el);
      if (!old) return;
      const now = el.getBoundingClientRect();
      const dy = old.top - now.top;
      if (dy === 0) return;
      el.style.transition = 'none';
      el.style.transform = `translateY(${dy}px)`;
    });
    // Force reflow
    container.getBoundingClientRect();
    // Play: animate all to natural position
    [...container.children].forEach(el => {
      el.style.transition = 'transform 0.42s cubic-bezier(0.22, 1, 0.36, 1)';
      el.style.transform = '';
    });
    await delay(450);
    [...container.children].forEach(el => { el.style.transition = ''; });
  }

  async function run() {
    // ══════════════════════════════════════════════════════════
    // RESET
    // ══════════════════════════════════════════════════════════
    widgetEl.classList.remove('open');
    // Restore original task order + clear checked state
    const tasksEl = document.querySelector('#win-widget-popup .ww-tasks');
    [wwTask1, wwTask2, wwTask3, wwTask4].forEach(t => {
      if (!t) return;
      t.classList.remove('checked');
      t.style.transform = '';
      t.style.transition = '';
      if (tasksEl) tasksEl.appendChild(t);
    });
    // Reset to Brief mode
    const wwCardReset = document.querySelector('#win-widget-popup .ww-card');
    if (wwCardReset) wwCardReset.classList.remove('show-agent');
    if (wwModeAgent)  { wwModeAgent.classList.remove('ww-mode-active'); }
    if (wwModeBrief)  { wwModeBrief.classList.add('ww-mode-active'); }
    if (wwChatInput) { wwChatInput.textContent = WW_PH; wwChatInput.style.color = ''; }
    if (wwResponse)  { wwResponse.innerHTML = ''; wwResponse.className = 'ww-response'; }
    const wwBubbleReset = document.querySelector('#ww-agent-panel .ww-agent-bubble');
    if (wwBubbleReset) wwBubbleReset.style.opacity = '';

    bgOutlook.classList.remove('fading');
    bgExcel.classList.remove('visible');
    if (winWindow) winWindow.classList.remove('visible', 'expanded');
    const teamsWinReset = document.getElementById('win-teams-popup');
    if (teamsWinReset) teamsWinReset.classList.remove('visible');
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

    // 1. Move cursor near widget → hover opens card (no click)
    if (wwKnob) {
      const p = pos(wwKnob);
      await moveTo(p.x, p.y - 6, 950);
      await delay(300);
      widgetEl.classList.add('open');
      await delay(600);
    }

    // 2. Check task 1 → sinks to bottom
    if (wwTask1) {
      const dot1 = wwTask1.querySelector('.ww-dot');
      if (dot1) {
        const p = pos(dot1);
        await moveTo(p.x, p.y, 750);
        await delay(320);
        await click(dot1);
        await delay(80);
        await checkAndSink(wwTask1);
        await delay(300);
      }
    }

    // 3. Check task 2 → sinks to bottom
    if (wwTask2) {
      const dot2 = wwTask2.querySelector('.ww-dot');
      if (dot2) {
        const p = pos(dot2);
        await moveTo(p.x, p.y, 600);
        await delay(260);
        await click(dot2);
        await delay(80);
        await checkAndSink(wwTask2);
        await delay(260);
      }
    }

    // 3b. Check task 3 → sinks to bottom
    if (wwTask3) {
      const dot3 = wwTask3.querySelector('.ww-dot');
      if (dot3) {
        const p = pos(dot3);
        await moveTo(p.x, p.y, 560);
        await delay(220);
        await click(dot3);
        await delay(80);
        await checkAndSink(wwTask3);
        await delay(240);
      }
    }

    // 4. Switch to Agent IA mode, then type
    if (wwModeAgent && wwModeBrief && wwAgentPanel) {
      const pAgent = pos(wwModeAgent);
      await moveTo(pAgent.x, pAgent.y, 600);
      await delay(220);
      await click(wwModeAgent);
      await delay(100);
      wwModeBrief.classList.remove('ww-mode-active');
      wwModeAgent.classList.add('ww-mode-active');
      const wwCard = document.querySelector('#win-widget-popup .ww-card');
      if (wwCard) wwCard.classList.add('show-agent');
      await delay(380);
    }
    if (wwChatInput) {
      const p = pos(wwChatInput);
      await moveTo(p.x - 12, p.y, 680);
      await delay(270);
      await click(null);
      await delay(180);
      await typeIn('Récap de ma journée', wwChatInput);
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

    // 6. Show thinking dots, then inject screen-time visualization
    if (wwChatInput) { wwChatInput.textContent = ''; wwChatInput.style.color = ''; }
    const wwBubble = document.querySelector('#ww-agent-panel .ww-agent-bubble');
    if (wwBubble) wwBubble.style.opacity = '0';
    if (wwResponse) {
      wwResponse.className = 'ww-response visible';
      wwResponse.innerHTML = '<div class="ww-thinking"><span></span><span></span><span></span></div>';
    }

    // Cursor drifts away
    await moveTo(dr.width * 0.42, dr.height * 0.48, 900);
    await delay(1900);

    if (wwResponse) {
      wwResponse.className = 'ww-response visible';
      // Inject shell — bars and legend start empty
      wwResponse.innerHTML = `<div class="ww-recap">
  <div class="ww-recap-lbl"><span>8h</span><span>11h</span><span>14h</span><span>17h</span></div>
  <div class="ww-recap-bars" id="ww-bars-container"></div>
  <div class="ww-recap-leg" id="ww-leg-container"></div>
  <p class="ww-recap-sum" id="ww-sum-txt" style="opacity:0;border-top:1px solid rgba(255,255,255,0.06);padding-top:4px;margin:0"></p>
</div>`;

      // Stream bars left → right
      const barsData = [
        {h:15,bg:'#0078d4'},{h:35,bg:'#FB923C'},{h:18,bg:'#0078d4'},
        {h:29,bg:'#FB923C'},{h:10,bg:'#6b7280'},{h:21,bg:'#22c55e'},
        {h:38,bg:'#FB923C'},{h:26,bg:'#a855f7'},{h:23,bg:'#a855f7'},{h:13,bg:'#0078d4'}
      ];
      const barsEl = document.getElementById('ww-bars-container');
      if (barsEl) {
        for (const b of barsData) {
          const d = document.createElement('div');
          d.className = 'ww-rb';
          d.style.cssText = `height:${b.h}px;background:${b.bg};--d:0`;
          barsEl.appendChild(d);
          await delay(72);
        }
      }

      // Legend items appear one by one
      const legData = [
        {bg:'#FB923C',name:'Réunions',val:'2h 15'},
        {bg:'#0078d4',name:'Emails',   val:'1h 40'},
        {bg:'#a855f7',name:'Teams',    val:'1h 05'},
        {bg:'#22c55e',name:'Documents',val:'0h 45'}
      ];
      const legEl = document.getElementById('ww-leg-container');
      if (legEl) {
        for (const l of legData) {
          const div = document.createElement('div');
          div.className = 'ww-rl-item';
          div.style.cssText = 'animation:recap-in 0.25s ease both';
          div.innerHTML = `<span class="ww-rl-dot" style="background:${l.bg}"></span><span class="ww-rl-name">${l.name}</span><span class="ww-rl-val">${l.val}</span>`;
          legEl.appendChild(div);
          await delay(160);
        }
      }

      // Stream summary text char by char
      const sumEl = document.getElementById('ww-sum-txt');
      if (sumEl) {
        sumEl.style.opacity = '1';
        await stream('Journée chargée — 2h15 en réunions, 3 urgences traitées. Score : 78 %, 4 tâches sur 5 complétées.', sumEl);
      }
    }
    await delay(4000);

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
    const teamsWin = document.getElementById('win-teams-popup');
    cursor.style.opacity = '1';
    moveTo(dr.width * 0.48, dr.height * 0.28, 0);
    await delay(500);

    // Browse email card
    const cardEmails = document.getElementById('demo-card-emails');
    if (cardEmails) {
      const p = pos(cardEmails);
      await moveTo(p.x, p.y, 850);
      await delay(550);
    }

    // Browse meetings card
    const cardMeetings = document.getElementById('demo-card-meetings');
    if (cardMeetings) {
      const p = pos(cardMeetings);
      await moveTo(p.x, p.y, 700);
      await delay(420);
    }

    // Move to Teams card, click the urgent message row
    const tmsClickRow = document.getElementById('tms-click-row');
    if (tmsClickRow) {
      const p = pos(tmsClickRow);
      await moveTo(p.x, p.y, 750);
      await delay(380);
      await click(tmsClickRow);
      await delay(180);
      // Open Teams window
      if (teamsWin) { teamsWin.classList.add('visible'); }
      await delay(900);
    }

    // Cursor browses Teams conversation
    cursor.style.opacity = '1';
    const tmsUrgentMsg = document.getElementById('tms-urgent-msg');
    if (tmsUrgentMsg) {
      const p = pos(tmsUrgentMsg);
      await moveTo(p.x, p.y - 10, 900);
      await delay(1400);
    }

    // Cursor moves to composer
    const tmsPh = document.getElementById('tms-compose-ph');
    if (tmsPh) {
      const p = pos(tmsPh);
      await moveTo(p.x - 20, p.y, 700);
      await delay(500);
      await click(null);
      await delay(300);
    }

    // Hover over send button
    const tmsSend = document.querySelector('.tms-send-btn');
    if (tmsSend) {
      const p = pos(tmsSend);
      await moveTo(p.x, p.y, 600);
      await delay(600);
    }

    await delay(2000);

    // ── End of cycle ──────────────────────────────────────────
    cursor.style.opacity = '0';
    if (teamsWin) { teamsWin.classList.remove('visible'); }
    await delay(3200);
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
