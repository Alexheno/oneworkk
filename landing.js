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

  // Get element center relative to win-desktop
  function pos(el) {
    const dr = desktop.getBoundingClientRect();
    const er = el.getBoundingClientRect();
    return { x: er.left + er.width / 2 - dr.left, y: er.top + er.height / 2 - dr.top };
  }

  function moveTo(x, y, ms = 1200) {
    cursor.style.setProperty('--cdur', ms + 'ms');
    cursor.style.left = x + 'px';
    cursor.style.top = y + 'px';
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
      // Remove all messages except the first one
      while (agentChatReset.children.length > 1) agentChatReset.removeChild(agentChatReset.lastChild);
    }
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
    const dr = desktop.getBoundingClientRect();

    // Cursor appears in dashboard content area
    moveTo(dr.width * 0.48, dr.height * 0.32, 0);
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

    // Hover agenda card — scroll to reveal more events
    const agendaBody = document.getElementById('demo-agenda-body');
    if (cardMeetings && agendaBody) {
      await moveTo(pos(cardMeetings).x, pos(cardMeetings).y + 20, 600);
      await delay(400);
      // Smooth scroll down
      const scrollDown = (target, dur) => new Promise(res => {
        const start = performance.now();
        const from = agendaBody.scrollTop;
        const ease = t => t < 0.5 ? 2*t*t : -1+(4-2*t)*t;
        function step(now) {
          const p = Math.min((now - start) / dur, 1);
          agendaBody.scrollTop = from + (target - from) * ease(p);
          if (p < 1) requestAnimationFrame(step); else res();
        }
        requestAnimationFrame(step);
      });
      await scrollDown(90, 1100);
      await delay(700);
      await scrollDown(0, 600);
      await delay(300);
    }

    // Hover todo / third card — linger + scroll
    const cardTodo = document.getElementById('demo-card-todo');
    const todoBody = document.getElementById('demo-todo-body');
    if (cardTodo) {
      await moveTo(pos(cardTodo).x, pos(cardTodo).y, 700);
      await delay(500);
      if (todoBody) {
        const scrollDown2 = (target, dur) => new Promise(res => {
          const start = performance.now();
          const from = todoBody.scrollTop;
          const ease = t => t < 0.5 ? 2*t*t : -1+(4-2*t)*t;
          function step(now) {
            const p = Math.min((now - start) / dur, 1);
            todoBody.scrollTop = from + (target - from) * ease(p);
            if (p < 1) requestAnimationFrame(step); else res();
          }
          requestAnimationFrame(step);
        });
        await scrollDown2(60, 900);
        await delay(600);
        await scrollDown2(0, 500);
        await delay(300);
      }
    }

    // Drift back to center, breathe
    await moveTo(dr.width * 0.50, dr.height * 0.40, 800);
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

    // ── After projects: click Agent IA directly ──────────────
    const agentIcon = document.getElementById('demo-sb-agent');
    const projViewEnd = document.getElementById('demo-projects-view');
    const agentView = document.getElementById('demo-agent-view');
    if (agentIcon) {
      await moveTo(pos(agentIcon).x, pos(agentIcon).y, 820);
      await delay(280);
      await click(agentIcon);
      document.querySelectorAll('.demo-sb-icon').forEach(el => el.classList.remove('active'));
      agentIcon.classList.add('active');
      if (projViewEnd) { projViewEnd.style.opacity = '0'; projViewEnd.style.display = 'none'; }
      if (agentView) {
        agentView.style.display = 'flex';
        await delay(30);
        agentView.style.opacity = '1';
      }
      await delay(800);
    }

    // ── Type question in Agent IA ──────────────────────────────
    const agentInput = document.getElementById('demo-agent-input');
    const agentSendBtn = document.getElementById('demo-agent-send');
    const agentChat = document.getElementById('demo-agent-chat');
    if (agentInput) {
      await moveTo(pos(agentInput).x, pos(agentInput).y, 700);
      await delay(200);
      await click(null);
      await delay(150);
      agentInput.classList.add('typing');
      agentInput.textContent = '';
      const q = 'Fais-moi un récap de ma journée';
      for (let i = 0; i < q.length; i++) {
        agentInput.textContent = q.slice(0, i + 1);
        await delay(52 + Math.random() * 32);
      }
      agentInput.classList.remove('typing');
      await delay(200);
    }

    // ── Send question ──────────────────────────────────────────
    if (agentSendBtn) {
      await moveTo(pos(agentSendBtn).x, pos(agentSendBtn).y, 380);
      await delay(160);
      await click(agentSendBtn);
    }

    // Add user message bubble
    if (agentChat) {
      const userMsg = document.createElement('div');
      userMsg.className = 'demo-agent-msg demo-agent-msg-user';
      userMsg.innerHTML = '<div class="demo-agent-bubble-user">Fais-moi un récap de ma journée</div>';
      agentChat.appendChild(userMsg);
      if (agentInput) agentInput.textContent = 'Demander à l\'Agent IA...';
      agentChat.scrollTop = agentChat.scrollHeight;
    }

    // ── Thinking dots ──────────────────────────────────────────
    await delay(500);
    let thinkEl = null;
    if (agentChat) {
      const thinkWrap = document.createElement('div');
      thinkWrap.className = 'demo-agent-msg demo-agent-msg-ai';
      thinkWrap.innerHTML = '<img src="morning-ai/desktop-app/logo.svg" width="20" height="20" class="demo-agent-avatar" alt=""><div class="demo-agent-bubble-ai"><div class="demo-thinking"><span></span><span></span><span></span></div></div>';
      agentChat.appendChild(thinkWrap);
      thinkEl = thinkWrap;
      agentChat.scrollTop = agentChat.scrollHeight;
    }
    await delay(1800);

    // ── Stream AI response in the chat ────────────────────────
    if (thinkEl && agentChat) {
      agentChat.removeChild(thinkEl);
    }

    // Create AI response message
    let aiMsgBubble = null;
    if (agentChat) {
      const aiMsgWrap = document.createElement('div');
      aiMsgWrap.className = 'demo-agent-msg demo-agent-msg-ai';
      aiMsgWrap.innerHTML = '<img src="morning-ai/desktop-app/logo.svg" width="20" height="20" class="demo-agent-avatar" alt=""><div class="demo-agent-bubble-ai" id="demo-ai-response-bubble"></div>';
      agentChat.appendChild(aiMsgWrap);
      aiMsgBubble = document.getElementById('demo-ai-response-bubble');
      agentChat.scrollTop = agentChat.scrollHeight;
    }

    if (aiMsgBubble) {
      // Move cursor away while AI generates
      await moveTo(dr.width * 0.42, dr.height * 0.48, 620);
      await delay(400);

      const scrollChat = () => { if (agentChat) agentChat.scrollTop = agentChat.scrollHeight; };

      const addBlock = (html) => {
        const el = document.createElement('div');
        el.className = 'ww-section';
        el.innerHTML = html;
        aiMsgBubble.appendChild(el);
        scrollChat();
      };

      // helper: stream text into existing element
      const typeEl = async (el, text) => {
        for (let i = 0; i < text.length; i++) {
          el.textContent = text.slice(0, i + 1);
          scrollChat();
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
      aiMsgBubble.appendChild(legendWrap);
      scrollChat();
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
      aiMsgBubble.appendChild(scoreWrap);
      scrollChat();
      await delay(200);
      await typeEl(document.getElementById('score-pct-el'), 'Score : 75 %');
      await typeEl(document.getElementById('score-lbl-el'), 'PRODUCTIVITÉ DU JOUR');

      // 4 — Streamed text response
      await delay(1400);
      const streamWrap = document.createElement('div');
      streamWrap.className = 'ww-section ww-stream-block';
      aiMsgBubble.appendChild(streamWrap);
      scrollChat();

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
          scrollChat();
          await delay(ms);
        }
      };
      const br = (n = 1) => {
        streamWrap.insertAdjacentHTML('beforeend', '<br>'.repeat(n));
        scrollChat();
      };
      const addDemain = async (id, taskText, redCheck = false) => {
        const checkCls = redCheck ? 'ww-st-demain-check ww-st-demain-check-red' : 'ww-st-demain-check';
        const block = document.createElement('div');
        block.className = 'ww-st-demain-block';
        block.innerHTML = `<div class="ww-st-demain-label">Pour demain</div><div class="ww-st-demain-row"><div class="${checkCls}"></div><span id="${id}"></span></div>`;
        streamWrap.appendChild(block);
        scrollChat();
        await delay(150);
        await typeEl(document.getElementById(id), taskText);
      };

      await delay(200);
      await typeInto('Réunions du jour', 'ww-st-label');
      br(2);
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

      await typeInto('Super journée Henri, 3 réunions au programme et Jean-Pierre attend ton retour avant 10h.', 'ww-st-summary');
    }

    // ── End of cycle — wait then loop ────────────────────────
    await delay(4000);
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
