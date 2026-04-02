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
let _demoVisible = false;
let _demoResume = null;

function setDemoVisible(v) {
  _demoVisible = v;
  if (v && _demoResume) { const r = _demoResume; _demoResume = null; r(); }
}

function startDemoSequence() {
  const cursor = document.getElementById('demo-cursor');
  const desktop = document.getElementById('win-desktop');
  const bgOutlook = document.getElementById('bg-outlook-window');
  const bgExcel = document.getElementById('bg-excel-window');
  const widgetEl = document.getElementById('win-widget-popup');
  const winWindow = document.getElementById('win-onework');
  const wwTask1 = document.getElementById('ww-task-1');
  const wwTask2 = document.getElementById('ww-task-2');
  const wwTask3 = document.getElementById('ww-task-3');
  const wwTask4 = document.getElementById('ww-task-4');
  const wwAgentPanel = document.getElementById('ww-agent-panel');
  const wwBriefPanel = document.getElementById('ww-brief-panel');
  const wwModeAgent = document.getElementById('ww-mode-agent');
  const wwModeBrief = document.getElementById('ww-mode-brief');
  const wwChatInput = document.getElementById('ww-chat-input');
  const wwChatSend = document.getElementById('ww-chat-send');
  const wwResponse = document.getElementById('ww-response');
  const wwKnob = document.getElementById('ww-knob');
  const chatInput = document.getElementById('demo-chatbar-input');
  const chatSend = document.getElementById('demo-chatbar-send');
  const mainResp = document.getElementById('demo-main-resp');

  if (!cursor || !desktop || !bgOutlook) return;

  // Pause automatically when user scrolls away, resume when they return
  const _rawDelay = ms => new Promise(r => setTimeout(r, ms));
  const delay = ms => _rawDelay(ms).then(() => {
    if (_demoVisible) return;
    return new Promise(r => { _demoResume = r; });
  });
  const WW_PH = 'Demander à l\'Agent IA...';
  const MAIN_PH = 'Demander quelque chose à l\'Agent IA';

  // Get element center in desktop CSS coordinates (accounts for zoom)
  function pos(el) {
    const dr = desktop.getBoundingClientRect();
    const er = el.getBoundingClientRect();
    const zoom = parseFloat(desktop.style.zoom) || 1;
    return {
      x: (er.left + er.width  / 2 - dr.left) / zoom,
      y: (er.top  + er.height / 2 - dr.top)  / zoom
    };
  }

  // Natural bezier-curve movement via requestAnimationFrame
  function moveTo(x, y, ms = 1200) {
    if (ms === 0) {
      cursor.style.left = x + 'px';
      cursor.style.top  = y + 'px';
      return delay(0);
    }
    const startX = parseFloat(cursor.style.left) || x;
    const startY = parseFloat(cursor.style.top)  || y;
    const dx = x - startX, dy = y - startY;
    const dist = Math.hypot(dx, dy) || 1;
    // Slight random perpendicular arc — human cursors never move in straight lines
    const arc  = (Math.random() - 0.5) * Math.min(dist * 0.20, 28);
    const cx   = (startX + x) / 2 + (-dy / dist) * arc;
    const cy   = (startY + y) / 2 + ( dx / dist) * arc;
    // Ease-in-out-cubic
    const ease = t => t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t + 2, 3) / 2;

    cursor.style.transition = 'none';
    return new Promise(resolve => {
      const t0 = performance.now();
      function frame(now) {
        const raw = Math.min((now - t0) / ms, 1);
        const e   = ease(raw);
        cursor.style.left = ((1-e)*(1-e)*startX + 2*(1-e)*e*cx + e*e*x) + 'px';
        cursor.style.top  = ((1-e)*(1-e)*startY + 2*(1-e)*e*cy + e*e*y) + 'px';
        if (raw < 1) { requestAnimationFrame(frame); }
        else {
          cursor.style.left = x + 'px';
          cursor.style.top  = y + 'px';
          cursor.style.transition = '';
          resolve();
        }
      }
      requestAnimationFrame(frame);
    });
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
      el.style.transition = 'transform 1.1s cubic-bezier(0.16, 1, 0.3, 1)';
      el.style.transform = '';
    });
    await delay(1150);
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
    if (wwCardReset) { wwCardReset.classList.remove('show-agent'); wwCardReset.style.height = ''; }
    // Reset Agent IA view
    const agentViewReset = document.getElementById('demo-agent-view');
    if (agentViewReset) { agentViewReset.style.opacity = '0'; agentViewReset.style.display = 'none'; }
    const agentChatReset = document.getElementById('demo-agent-chat');
    if (agentChatReset) {
      agentChatReset.style.display = '';
      while (agentChatReset.children.length > 1) agentChatReset.removeChild(agentChatReset.lastChild);
    }
    // Remove expanded response block from previous cycle
    const prevExpReset = document.getElementById('demo-agent-expanded');
    if (prevExpReset) prevExpReset.remove();
    const agentInputReset = document.getElementById('demo-agent-input');
    if (agentInputReset) agentInputReset.textContent = 'Demander à l\'Agent IA...';
    // Reset scroll positions
    const agendaBodyReset = document.getElementById('demo-agenda-body');
    if (agendaBodyReset) agendaBodyReset.scrollTop = 0;
    const todoBodyReset = document.getElementById('demo-todo-body');
    if (todoBodyReset) todoBodyReset.scrollTop = 0;
    if (wwModeAgent) { wwModeAgent.classList.remove('ww-mode-active'); }
    if (wwModeBrief) { wwModeBrief.classList.add('ww-mode-active'); }
    if (wwChatInput) { wwChatInput.textContent = WW_PH; wwChatInput.style.color = ''; }
    if (wwResponse) { wwResponse.innerHTML = ''; wwResponse.className = 'ww-response'; }
    const wwTitleReset = document.querySelector('.ww-agent-title');
    if (wwTitleReset) { wwTitleReset.style.display = ''; }
    const wwBubbleReset = document.querySelector('#ww-agent-panel .ww-agent-bubble');
    if (wwBubbleReset) {
      wwBubbleReset.style.opacity = '';
      wwBubbleReset.style.maxHeight = '';
      wwBubbleReset.style.padding = '';
      wwBubbleReset.style.margin = '';
    }

    // Excel visible at start, Outlook hidden
    bgOutlook.classList.add('fading');
    if (bgExcel) bgExcel.classList.add('visible');
    // Dashboard stays visible — no taskbar click phase
    if (winWindow) winWindow.classList.add('visible', 'expanded');
    const teamsWinReset = document.getElementById('win-teams-popup');
    if (teamsWinReset) teamsWinReset.classList.remove('visible');
    const tbOneWork = document.getElementById('tb-onework');
    if (tbOneWork) tbOneWork.classList.remove('active');
    // Remove injected reply bubble
    const replyMsgReset = document.getElementById('tms-reply-msg');
    if (replyMsgReset) replyMsgReset.remove();
    // Restore composer placeholder
    const tmsComposePh2 = document.getElementById('tms-compose-ph');
    if (tmsComposePh2) { tmsComposePh2.textContent = 'Répondre à Sarah Martin...'; tmsComposePh2.style.color = ''; }
    if (mainResp) { mainResp.className = 'demo-main-resp'; mainResp.innerHTML = ''; }
    if (chatInput) { chatInput.textContent = MAIN_PH; chatInput.style.color = ''; }
    // Restore home view
    const homeViewR = document.getElementById('demo-home-view');
    const projViewR = document.getElementById('demo-projects-view');
    if (projViewR) { projViewR.style.opacity = '0'; projViewR.style.display = 'none'; }
    if (homeViewR) homeViewR.style.display = 'flex';
    document.querySelectorAll('.demo-sb-icon').forEach((el, i) => { el.classList.toggle('active', i === 0); });

    if (tbOneWork) tbOneWork.classList.add('active');
    cursor.style.opacity = '0';
    await delay(700);

    // ══════════════════════════════════════════════════════════
    // PHASE 1 — Dashboard → Projects
    // ══════════════════════════════════════════════════════════
    const DW   = 1200; // CSS design width (fixed, zoom-independent)
    const DH   = 582;  // CSS design height

    // Cursor appears in dashboard content area
    moveTo(DW * 0.48, DH * 0.32, 0);
    cursor.style.opacity = '1';
    await delay(500);

    // Hover email card — linger
    const cardEmails = document.getElementById('demo-card-emails');
    if (cardEmails) {
      await moveTo(pos(cardEmails).x, pos(cardEmails).y, 780);
      await delay(1100);
    }

    // Hover meetings card — linger
    const cardMeetings = document.getElementById('demo-card-meetings');
    if (cardMeetings) {
      await moveTo(pos(cardMeetings).x, pos(cardMeetings).y, 720);
      await delay(1000);
    }

    // Hover bottom section — scroll Agenda + To-Do simultaneously
    const agendaBody = document.getElementById('demo-agenda-body');
    const todoBody   = document.getElementById('demo-todo-body');
    const cardTodo   = document.getElementById('demo-card-todos');
    if (cardMeetings && agendaBody) {
      // Cursor rests between the two bottom cards
      const midX = (pos(cardMeetings).x + (cardTodo ? pos(cardTodo).x : pos(cardMeetings).x)) / 2;
      const midY = pos(cardMeetings).y + 14;
      await moveTo(midX, midY, 700);
      await delay(400);

      // Scroll both lists simultaneously
      const scrollBoth = (target, dur) => new Promise(res => {
        const start  = performance.now();
        const fromA  = agendaBody ? agendaBody.scrollTop : 0;
        const fromT  = todoBody   ? todoBody.scrollTop   : 0;
        const ease   = t => t < 0.5 ? 2*t*t : -1+(4-2*t)*t;
        function step(now) {
          const p = Math.min((now - start) / dur, 1);
          const e = ease(p);
          if (agendaBody) agendaBody.scrollTop = fromA + (target - fromA) * e;
          if (todoBody)   todoBody.scrollTop   = fromT + (target - fromT) * e;
          if (p < 1) requestAnimationFrame(step); else res();
        }
        requestAnimationFrame(step);
      });

      await scrollBoth(130, 1400);
      await delay(900);
      await scrollBoth(0, 900);
      await delay(300);
    }

    // Drift back to center, breathe
    await moveTo(DW * 0.50, DH * 0.40, 800);
    await delay(800);

    // Click Projects icon in sidebar
    const projIcon = document.querySelector('.demo-sb-icon[title="Projets"]');
    if (projIcon) {
      await moveTo(pos(projIcon).x, pos(projIcon).y, 880);
      await delay(300);
      await click(projIcon);
      // Highlight active sidebar icon
      document.querySelectorAll('.demo-sb-icon').forEach(el => el.classList.remove('active'));
      projIcon.classList.add('active');
      // Swap views
      const homeView = document.getElementById('demo-home-view');
      const projView = document.getElementById('demo-projects-view');
      if (homeView) homeView.style.display = 'none';
      if (projView) {
        projView.style.display = 'flex';
        await delay(30);
        projView.style.opacity = '1';
      }
      await delay(700);
    }

    // Cursor drifts over project rows — linger on each
    const rows = document.querySelectorAll('.demo-project-row');
    if (rows[0]) { await moveTo(pos(rows[0]).x, pos(rows[0]).y, 840); await delay(900); }
    if (rows[1]) { await moveTo(pos(rows[1]).x, pos(rows[1]).y, 700); await delay(800); }
    if (rows[2]) { await moveTo(pos(rows[2]).x, pos(rows[2]).y, 680); await delay(700); }
    if (rows[3]) { await moveTo(pos(rows[3]).x, pos(rows[3]).y, 680); await delay(600); }

    // Stay on projects page
    await delay(2800);

    // ── Return to home view ───────────────────────────────────
    const projView2 = document.getElementById('demo-projects-view');
    const homeView2 = document.getElementById('demo-home-view');
    const homeIcon = document.querySelector('.demo-sb-icon[title="Accueil"]') || document.querySelector('.demo-sb-icon');
    if (homeIcon) {
      await moveTo(pos(homeIcon).x, pos(homeIcon).y, 800);
      await delay(250);
      await click(homeIcon);
    }
    if (projView2) { projView2.style.opacity = '0'; projView2.style.display = 'none'; }
    if (homeView2) homeView2.style.display = 'flex';
    document.querySelectorAll('.demo-sb-icon').forEach((el, i) => { el.classList.toggle('active', i === 0); });
    await delay(700);

    // ── Click Sarah Martin Teams row → Teams window opens ─────
    const tmsRow = document.getElementById('tms-click-row');
    const teamsWin = document.getElementById('win-teams-popup');
    if (tmsRow) {
      await moveTo(pos(tmsRow).x, pos(tmsRow).y, 820);
      await delay(280);
      await click(tmsRow);
      if (teamsWin) teamsWin.classList.add('visible');
      await delay(900);
    }

    // ── Type reply in Teams composer ──────────────────────────
    const tmsComposePh = document.getElementById('tms-compose-ph');
    const tmsSendBtn = document.querySelector('.tms-send-btn');
    if (tmsComposePh) {
      await moveTo(pos(tmsComposePh).x, pos(tmsComposePh).y, 760);
      await delay(260);
      await click(null);
      await delay(180);
      const tmsText = 'Ok je regarde ça tout de suite !';
      tmsComposePh.style.color = '#201F1E';
      for (let i = 0; i <= tmsText.length; i++) {
        tmsComposePh.textContent = tmsText.slice(0, i);
        await delay(42 + Math.random() * 28);
      }
      await delay(340);
    }
    if (tmsSendBtn) {
      await moveTo(pos(tmsSendBtn).x, pos(tmsSendBtn).y, 560);
      await delay(260);
      await click(tmsSendBtn);
      await delay(120);
      if (tmsComposePh) { tmsComposePh.textContent = ''; tmsComposePh.style.color = ''; }
      const msgsArea = document.getElementById('tms-msgs-area');
      if (msgsArea) {
        const bubble = document.createElement('div');
        bubble.className = 'tms-msg tms-msg-appear';
        bubble.id = 'tms-reply-msg';
        bubble.innerHTML = `
          <div class="tms-msg-av" style="background:linear-gradient(135deg,#6264A7,#4B4D8F)">HB</div>
          <div class="tms-msg-content">
            <div class="tms-msg-meta"><span class="tms-msg-name">Henri B.</span><span class="tms-msg-time">09h05</span></div>
            <div class="tms-msg-text">Ok je regarde ça tout de suite !</div>
          </div>`;
        msgsArea.appendChild(bubble);
        msgsArea.scrollTop = msgsArea.scrollHeight;
        await delay(900);
      }
    }

    // ── Cursor drifts away, then everything fades together ────
    await moveTo(DW * 0.50, DH * 0.45, 700);
    await delay(300);
    cursor.style.opacity = '0';
    await delay(200);

    // ── Black overlay fade-in ──────────────────────────────────
    const blackOverlay = document.getElementById('demo-black-overlay');
    if (blackOverlay) {
      blackOverlay.classList.add('fade-in');
      blackOverlay.classList.remove('fade-out');
    }
    await delay(180);

    // Switch scene behind the black screen
    if (teamsWin) teamsWin.classList.remove('visible');
    if (winWindow) winWindow.classList.remove('visible', 'expanded');
    if (tbOneWork) tbOneWork.classList.remove('active');
    bgOutlook.classList.remove('fading');
    if (bgExcel) bgExcel.classList.remove('visible');
    await delay(200);

    // ── Black overlay fade-out → reveal Outlook ───────────────
    if (blackOverlay) {
      blackOverlay.classList.remove('fade-in');
      blackOverlay.classList.add('fade-out');
    }
    await delay(520);

    // ══════════════════════════════════════════════════════════
    // PHASE 2 — Widget interaction → Agent IA recap
    // ══════════════════════════════════════════════════════════

    cursor.style.opacity = '1';
    moveTo(DW * 0.38, DH * 0.52, 0);
    await delay(300);

    // Move near widget knob → hover opens card
    if (wwKnob) {
      const p = pos(wwKnob);
      await moveTo(p.x, p.y - 6, 1100);
      await delay(300);
      widgetEl.classList.add('open');
      await delay(600);
    }

    // Check task 1 → sinks to bottom
    if (wwTask1) {
      const dot1 = wwTask1.querySelector('.ww-dot');
      if (dot1) {
        const p = pos(dot1);
        await moveTo(p.x, p.y, 800);
        await delay(200);
        await click(dot1);
        await delay(80);
        await checkAndSink(wwTask1);
        await delay(700);
      }
    }

    // Check task 2 → sinks to bottom
    if (wwTask2) {
      const dot2 = wwTask2.querySelector('.ww-dot');
      if (dot2) {
        const p = pos(dot2);
        await moveTo(p.x, p.y, 680);
        await delay(160);
        await click(dot2);
        await delay(80);
        await checkAndSink(wwTask2);
        await delay(720);
      }
    }

    // Check task 3 → sinks to bottom
    if (wwTask3) {
      const dot3 = wwTask3.querySelector('.ww-dot');
      if (dot3) {
        const p = pos(dot3);
        await moveTo(p.x, p.y, 680);
        await delay(160);
        await click(dot3);
        await delay(80);
        await checkAndSink(wwTask3);
        await delay(720);
      }
    }

    // Switch to Agent IA mode
    if (wwModeAgent && wwModeBrief && wwAgentPanel) {
      const pAgent = pos(wwModeAgent);
      await moveTo(pAgent.x, pAgent.y, 720);
      await delay(220);
      await click(wwModeAgent);
      await delay(100);
      wwModeBrief.classList.remove('ww-mode-active');
      wwModeAgent.classList.add('ww-mode-active');
      const wwCard = document.querySelector('#win-widget-popup .ww-card');
      if (wwCard) {
        const agentEl = document.getElementById('ww-agent-panel');
        let agentH = 160;
        if (agentEl) {
          agentEl.style.cssText = 'max-height:none!important;overflow:visible!important;position:absolute!important;visibility:hidden!important;pointer-events:none!important';
          agentH = agentEl.scrollHeight || agentEl.offsetHeight || 160;
          agentEl.style.cssText = '';
        }
        const modeBarEl = wwCard.querySelector('.ww-mode-bar');
        const modeBarH = modeBarEl ? modeBarEl.offsetHeight : 36;
        const toH = modeBarH + agentH;
        wwCard.style.height = wwCard.offsetHeight + 'px';
        wwCard.classList.add('show-agent');
        requestAnimationFrame(() => requestAnimationFrame(() => {
          wwCard.style.height = toH + 'px';
        }));
        setTimeout(() => { wwCard.style.height = ''; }, 680);
      }
      await delay(380);
    }
    if (wwChatInput) {
      const p = pos(wwChatInput);
      await moveTo(p.x - 12, p.y, 800);
      await delay(270);
      await click(null);
      await delay(180);
      await typeIn('Fais moi un récap de ma journée', wwChatInput);
      await delay(340);
    }

    // Click send
    if (wwChatSend) {
      const p = pos(wwChatSend);
      await moveTo(p.x, p.y, 600);
      await delay(310);
      await click(wwChatSend);
      await delay(200);
    }

    // Show thinking dots, then inject screen-time visualization
    if (wwChatInput) { wwChatInput.textContent = WW_PH; wwChatInput.style.color = ''; }
    const wwBubble = document.querySelector('#ww-agent-panel .ww-agent-bubble');
    if (wwBubble) {
      wwBubble.style.opacity = '0';
      wwBubble.style.maxHeight = '0';
      wwBubble.style.padding = '0';
      wwBubble.style.margin = '0';
    }
    const wwAgentTitle = document.querySelector('.ww-agent-title');
    if (wwAgentTitle) { wwAgentTitle.style.display = 'none'; }
    if (wwResponse) {
      wwResponse.className = 'ww-response visible';
      wwResponse.innerHTML = '<div class="ww-thinking"><span></span><span></span><span></span></div>';
    }

    // Cursor drifts away while AI thinks
    await moveTo(DW * 0.42, DH * 0.48, 620);
    await delay(1900);

    if (wwResponse) {
      wwResponse.className = 'ww-response visible';
      const recap = document.createElement('div');
      recap.className = 'ww-recap';
      wwResponse.innerHTML = '';
      wwResponse.appendChild(recap);

      const agentContent = document.querySelector('.ww-agent-content');
      const scrollToBottom = () => {
        if (agentContent) agentContent.scrollTop = agentContent.scrollHeight;
      };

      const addBlock = (html) => {
        const el = document.createElement('div');
        el.className = 'ww-section';
        el.innerHTML = html;
        recap.appendChild(el);
        scrollToBottom();
      };

      // helper: stream text into existing element
      const typeEl = async (el, text) => {
        for (let i = 0; i < text.length; i++) {
          el.textContent = text.slice(0, i + 1);
          scrollToBottom();
          await delay(50 + Math.random() * 34);
        }
      };

      // 1 — Bar chart
      addBlock(`
        <div class="ww-total-lbl" style="margin-bottom:6px">Temps d'écran · Aujourd'hui</div>
        <div class="ww-recap-lbl"><span>Lun</span><span>Mar</span><span>Mer</span><span>Jeu</span><span style="color:rgba(255,255,255,0.55);font-weight:600">Ven</span><span>Sam</span><span>Dim</span></div>
        <div class="ww-recap-bars">
          <div class="ww-rb" style="height:45%;background:linear-gradient(180deg,#60C8FF,#3B9EFF);--d:0"></div>
          <div class="ww-rb" style="height:62%;background:linear-gradient(180deg,#4ADDB8,#22B899);--d:1"></div>
          <div class="ww-rb" style="height:55%;background:linear-gradient(180deg,#A78BFA,#7C5FD4);--d:2"></div>
          <div class="ww-rb" style="height:78%;background:linear-gradient(180deg,#FB923C,#F05D1A);--d:3"></div>
          <div class="ww-rb today" style="height:100%;background:linear-gradient(180deg,#F472B6,#9B35FF);--d:4"></div>
          <div class="ww-rb" style="height:3%;background:rgba(255,255,255,0.10);--d:5"></div>
          <div class="ww-rb" style="height:3%;background:rgba(255,255,255,0.10);--d:6"></div>
        </div>`);

      // 2 — Legend
      await delay(1400);
      const legendWrap = document.createElement('div');
      legendWrap.className = 'ww-section';
      legendWrap.innerHTML = `
        <div class="ww-divider"></div>
        <div class="ww-rl-item"><div class="ww-rl-dot" style="background:#60C8FF"></div><span class="ww-rl-name" id="rl-n1"></span><span class="ww-rl-val" id="rl-v1"></span></div>
        <div class="ww-rl-item"><div class="ww-rl-dot" style="background:#A78BFA"></div><span class="ww-rl-name" id="rl-n2"></span><span class="ww-rl-val" id="rl-v2"></span></div>
        <div class="ww-rl-item"><div class="ww-rl-dot" style="background:#F472B6"></div><span class="ww-rl-name" id="rl-n3"></span><span class="ww-rl-val" id="rl-v3"></span></div>`;
      recap.appendChild(legendWrap);
      scrollToBottom();
      await delay(200);
      await typeEl(document.getElementById('rl-n1'), 'Teams');
      await typeEl(document.getElementById('rl-v1'), '2h 48');
      await delay(100);
      await typeEl(document.getElementById('rl-n2'), 'Outlook');
      await typeEl(document.getElementById('rl-v2'), '1h 12');
      await delay(100);
      await typeEl(document.getElementById('rl-n3'), 'Chrome');
      await typeEl(document.getElementById('rl-v3'), '0h 54');

      // 3 — Score
      await delay(1300);
      const scoreWrap = document.createElement('div');
      scoreWrap.className = 'ww-section';
      scoreWrap.innerHTML = `
        <div class="ww-divider"></div>
        <div class="ww-score-ring">
          <svg width="32" height="32" viewBox="0 0 32 32">
            <circle cx="16" cy="16" r="13" fill="none" stroke="rgba(255,255,255,0.07)" stroke-width="3"/>
            <circle cx="16" cy="16" r="13" fill="none" stroke="url(#sg2)" stroke-width="3"
              stroke-dasharray="81.7" stroke-dashoffset="20" stroke-linecap="round" transform="rotate(-90 16 16)"/>
            <defs><linearGradient id="sg2" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stop-color="#6B8EF5"/><stop offset="100%" stop-color="#9B35FF"/>
            </linearGradient></defs>
          </svg>
          <div class="ww-score-info">
            <div class="ww-score-pct" id="score-pct-el"></div>
            <div class="ww-score-lbl" id="score-lbl-el"></div>
          </div>
        </div>`;
      recap.appendChild(scoreWrap);
      scrollToBottom();
      await delay(200);
      await typeEl(document.getElementById('score-pct-el'), 'Score : 75 %');
      await typeEl(document.getElementById('score-lbl-el'), 'PRODUCTIVITÉ DU JOUR');

      // 4 — Streamed text response
      await delay(1400);
      const streamWrap = document.createElement('div');
      streamWrap.className = 'ww-section ww-stream-block';
      recap.appendChild(streamWrap);
      scrollToBottom();

      const typeInto = async (text, cls, fast = false) => {
        const span = document.createElement('span');
        if (cls) span.className = cls;
        streamWrap.appendChild(span);
        for (let i = 0; i < text.length; i++) {
          span.textContent = text.slice(0, i + 1);
          const c = text[i];
          let ms = fast ? (14 + Math.random() * 10) : (34 + Math.random() * 26);
          if (!fast) {
            if (c === '.') ms += 200;
            if (c === ',') ms += 80;
            if (c === ':') ms += 55;
            if (c === '—') ms += 110;
          }
          scrollToBottom();
          await delay(ms);
        }
      };
      const br = (n = 1) => {
        streamWrap.insertAdjacentHTML('beforeend', '<br>'.repeat(n));
        scrollToBottom();
      };
      const addDemain = async (id, taskText, redCheck = false) => {
        const checkCls = redCheck ? 'ww-st-demain-check ww-st-demain-check-red' : 'ww-st-demain-check';
        const block = document.createElement('div');
        block.className = 'ww-st-demain-block';
        block.innerHTML = `<div class="ww-st-demain-label">Pour demain</div><div class="ww-st-demain-row"><div class="${checkCls}"></div><span id="${id}"></span></div>`;
        streamWrap.appendChild(block);
        scrollToBottom();
        await delay(150);
        await typeEl(document.getElementById(id), taskText);
      };

      await delay(200);
      await typeInto('Réunions du jour', 'ww-st-label');
      br();
      streamWrap.insertAdjacentHTML('beforeend', '<div class="ww-st-sep"></div>');
      scrollToBottom();
      br();
      await delay(350);

      await typeInto('Stand-up Équipe · 09:00', 'ww-st-title ww-st-green');
      br();
      await typeInto('"Bonne dynamique cette semaine, le sprint avance bien. Marie a remonté un blocage sur l\'API de paiement..."', 'ww-st-quote', true);
      br();
      await typeInto('Voir le script →', 'ww-st-voir');
      br();
      await addDemain('demain-1', 'Valider les tickets bloquants avec Marie');
      br();
      await delay(500);

      await typeInto('1:1 Jean-Pierre · 11:30', 'ww-st-title ww-st-orange');
      br();
      await typeInto('"Jean-Pierre attend ton retour sur le budget Q2. Il propose de revoir les priorités côté infra..."', 'ww-st-quote', true);
      br();
      await typeInto('Voir le script →', 'ww-st-voir');
      br();
      await addDemain('demain-2', 'Envoyer réponse à Jean-Pierre avant 10h', true);
      br();
      await delay(500);

      await typeInto('Revue Produit · 14:00', 'ww-st-title ww-st-purple');
      br();
      await typeInto('"3 nouvelles features validées pour la roadmap Q2. Démo client confirmée pour vendredi..."', 'ww-st-quote', true);
      br();
      await typeInto('Voir le script →', 'ww-st-voir');
      br();
      await delay(700);

      streamWrap.insertAdjacentHTML('beforeend', '<div class="ww-st-sep"></div>');
      scrollToBottom();
      await delay(200);
      await typeInto('Super journée Henri, 3 réunions au programme et Jean-Pierre attend ton retour avant 10h.', 'ww-st-summary');

      // ── Double-click on visible response text → open dashboard ──
      await delay(1000);
      cursor.style.opacity = '1';
      // Target the visible part of the agent content panel (currently scrolled to show text)
      const agentContentEl = document.querySelector('.ww-agent-content');
      const clickTarget = agentContentEl || wwResponse;
      const respPos = pos(clickTarget);
      await moveTo(respPos.x, respPos.y, 900);
      await delay(260);
      // Double-click
      cursor.classList.add('clicking');
      await delay(80);
      cursor.classList.remove('clicking');
      await delay(110);
      cursor.classList.add('clicking');
      await delay(80);
      cursor.classList.remove('clicking');
      await delay(500);

      // ── Close widget smoothly — let existing CSS transition run ──
      widgetEl.classList.remove('open');

      // Show the OneWork dashboard
      if (winWindow) winWindow.classList.add('visible', 'expanded');
      if (tbOneWork) tbOneWork.classList.add('active');

      // Switch to Agent IA page in dashboard
      const agentViewDB = document.getElementById('demo-agent-view');
      const homeViewDB  = document.getElementById('demo-home-view');
      const projViewDB  = document.getElementById('demo-projects-view');
      const agentChatDB = document.getElementById('demo-agent-chat');
      if (homeViewDB)  { homeViewDB.style.display = 'none'; }
      if (projViewDB)  { projViewDB.style.opacity = '0'; projViewDB.style.display = 'none'; }
      document.querySelectorAll('.demo-sb-icon').forEach(el => el.classList.remove('active'));
      const agentIconDB = document.getElementById('demo-sb-agent');
      if (agentIconDB) agentIconDB.classList.add('active');

      // Replace chat area with full-width expanded response
      if (agentChatDB) {
        // Hide the normal chat — replace it with an expanded content block
        agentChatDB.style.display = 'none';

        // Remove any previous expanded view
        const prevExp = document.getElementById('demo-agent-expanded');
        if (prevExp) prevExp.remove();

        const expandedWrap = document.createElement('div');
        expandedWrap.id = 'demo-agent-expanded';
        expandedWrap.className = 'demo-agent-expanded';

        // Clone the recap with all its streamed content
        const recapClone = recap.cloneNode(true);
        recapClone.querySelectorAll('[id]').forEach(el => el.removeAttribute('id'));
        expandedWrap.appendChild(recapClone);

        // Insert between header and bar (before the bar element)
        const agentBar = document.querySelector('.demo-agent-bar');
        if (agentBar && agentViewDB) {
          agentViewDB.insertBefore(expandedWrap, agentBar);
        } else if (agentViewDB) {
          agentViewDB.appendChild(expandedWrap);
        }
        // Start scrolled to top so bar chart shows first
        expandedWrap.scrollTop = 0;
      }

      if (agentViewDB) {
        agentViewDB.style.display = 'flex';
        await delay(30);
        agentViewDB.style.opacity = '1';
      }

      // Wait for layout to fully settle before measuring bar positions
      await delay(380);

      // ── Hover first 3 bars — show floating day tooltip ───────
      const expEl = document.getElementById('demo-agent-expanded');

      // Tooltip lives on document.body (position:fixed) — never clipped by win-desktop overflow
      let tooltip = document.getElementById('demo-bar-tooltip');
      if (!tooltip) {
        tooltip = document.createElement('div');
        tooltip.id = 'demo-bar-tooltip';
        tooltip.innerHTML = '<div class="demo-bar-tooltip-inner"><div class="demo-bar-tooltip-time" id="dbt-time"></div></div>';
        document.body.appendChild(tooltip);
      }
      const dbtTime = document.getElementById('dbt-time');

      const showTooltip = (barEl, time) => {
        dbtTime.textContent = time;
        tooltip.classList.add('visible');
        // Use viewport coords from the bar element directly
        const br = barEl.getBoundingClientRect();
        const tx = br.left + br.width  / 2;
        const ty = br.top  + br.height / 2;
        const tw = tooltip.offsetWidth  || 62;
        const th = tooltip.offsetHeight || 32;
        tooltip.style.left = (tx - tw / 2) + 'px';
        tooltip.style.top  = (ty - th - 10) + 'px';
      };
      const hideTooltip = () => tooltip.classList.remove('visible');

      const barTimes = ['2h 55', '4h 03', '3h 34'];

      if (expEl) {
        const bars = expEl.querySelectorAll('.ww-rb');
        for (let i = 0; i < 3 && i < bars.length; i++) {
          const bar = bars[i];
          const dr2  = desktop.getBoundingClientRect();
          const br2  = bar.getBoundingClientRect();
          const zoom = parseFloat(desktop.style.zoom) || 1;
          const bx   = (br2.left + br2.width  / 2 - dr2.left) / zoom;
          const by   = (br2.top  + br2.height / 2 - dr2.top)  / zoom;
          await moveTo(bx, by, i === 0 ? 950 : 680);
          // Tooltip appears the instant the cursor lands — use bar element for fixed coords
          showTooltip(bar, barTimes[i]);
          await delay(2400);
          hideTooltip();
          await delay(180);
        }

        // ── Slow scroll to end of response ──
        const expPos = pos(expEl);
        await moveTo(expPos.x, expPos.y, 700);
        await delay(400);

        const scrollEnd = () => new Promise(res => {
          const dur  = 3200;
          const from = expEl.scrollTop;
          const to   = expEl.scrollHeight - expEl.clientHeight;
          if (to <= 0) { res(); return; }
          const start = performance.now();
          const ease  = t => t < 0.5 ? 2*t*t : -1+(4-2*t)*t;
          function step(now) {
            const p = Math.min((now - start) / dur, 1);
            expEl.scrollTop = from + (to - from) * ease(p);
            if (p < 1) requestAnimationFrame(step); else res();
          }
          requestAnimationFrame(step);
        });
        await scrollEnd();
        await delay(1800);
      }
    }

    // ── End of cycle — wait then loop ────────────────────────
    await delay(1500);
    cursor.style.opacity = '0';
    await delay(1800);
    run();
  }

  run();
}

// ─── Laptop tilt → flat + demo pause/resume on visibility ────────────────────
const laptop = document.getElementById('demo-laptop');
if (laptop) {
  let demoStarted = false;
  const lo = new IntersectionObserver((entries) => {
    const visible = entries[0].isIntersecting;
    setDemoVisible(visible);
    if (visible) {
      laptop.classList.add('leveled');
      if (!demoStarted) {
        demoStarted = true;
        setTimeout(startDemoSequence, 300);
      }
    }
  }, { threshold: 0.15 });
  lo.observe(laptop);
}

// ─── Scale demo to always fit hero-demo content width ────────────────────────
(function () {
  const scene   = document.querySelector('.screen-scene');
  const desktop = document.querySelector('.win-desktop');
  if (!scene || !desktop) return;
  function fit() {
    // Use screen-scene (no padding) as the true available width
    const availW = scene.offsetWidth;
    const scale  = availW / 1200;
    desktop.style.zoom = String(scale);
  }
  window.addEventListener('resize', fit);
  // Wait for layout to settle before measuring
  requestAnimationFrame(fit);
})();

// ─── Smooth anchor scroll ─────────────────────────────────────────────────────
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const target = document.querySelector(a.getAttribute('href'));
    if (target) { e.preventDefault(); target.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
  });
});

// ─── Waitlist modal ───────────────────────────────────────────────────────────
const BACKEND = 'https://oneworkk-production.up.railway.app';
const _overlay = document.getElementById('waitlist-overlay');
const _emailInput = document.getElementById('waitlist-email');

function openModal() {
  if (_overlay) { _overlay.style.display = 'flex'; }
  setTimeout(() => _emailInput && _emailInput.focus(), 100);
}

function closeModal() {
  if (_overlay) { _overlay.style.display = 'none'; }
}

if (_overlay) {
  const closeBtn = document.getElementById('waitlist-close');
  if (closeBtn) closeBtn.addEventListener('click', closeModal);
  _overlay.addEventListener('click', e => { if (e.target === _overlay) closeModal(); });

  const submitBtn = document.getElementById('waitlist-submit');
  if (submitBtn) submitBtn.addEventListener('click', submitWaitlist);
  if (_emailInput) {
    _emailInput.addEventListener('keydown', e => { if (e.key === 'Enter') submitWaitlist(); });
    _emailInput.addEventListener('focus', () => { _emailInput.style.borderColor = '#818cf8'; });
    _emailInput.addEventListener('blur', () => { _emailInput.style.borderColor = '#e2e8f0'; });
  }
}

async function submitWaitlist() {
  const email = _emailInput.value.trim();
  const errorEl = document.getElementById('waitlist-error');
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errorEl.textContent = 'Veuillez entrer une adresse email valide.';
    errorEl.style.display = 'block';
    return;
  }
  errorEl.style.display = 'none';
  const btn = document.getElementById('waitlist-submit');
  btn.textContent = 'Inscription...';
  btn.disabled = true;
  try {
    const res = await fetch(BACKEND + '/waitlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    document.getElementById('waitlist-form-view').style.display = 'none';
    document.getElementById('waitlist-success-view').style.display = 'block';
    if (data.position) {
      document.getElementById('modal-position-text').textContent =
        `Vous êtes le n°${data.position} sur la liste. On vous tient au courant !`;
    }
    document.querySelectorAll('.btn-waitlist').forEach(b => {
      b.textContent = '✅ Vous êtes sur la liste !';
      b.disabled = true;
      b.style.cursor = 'default';
    });
    const ctaBtn = document.getElementById('cta-dl-btn');
    const ctaConfirm = document.getElementById('cta-waitlist-confirm');
    if (ctaBtn) ctaBtn.style.display = 'none';
    if (ctaConfirm) ctaConfirm.style.display = 'block';
  } catch (err) {
    console.error('[waitlist] erreur:', err);
    btn.textContent = 'Rejoindre →';
    btn.disabled = false;
    errorEl.textContent = 'Erreur: ' + (err && err.message ? err.message : String(err));
    errorEl.style.display = 'block';
  }
}

document.querySelectorAll('.btn-waitlist').forEach(btn => {
  btn.addEventListener('click', e => { e.preventDefault(); openModal(); });
});
