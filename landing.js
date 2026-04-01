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

    // Hover todo / third card — linger
    const cardTodo = document.getElementById('demo-card-todo');
    if (cardTodo) {
      await moveTo(pos(cardTodo).x, pos(cardTodo).y, 700);
      await delay(900);
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
      // Type into the span
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

      // Clear composer
      if (tmsComposePh) {
        tmsComposePh.textContent = '';
        tmsComposePh.style.color = '';
      }

      // Inject Henri's reply — same format as all Teams messages
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
    await moveTo(dr.width * 0.50, dr.height * 0.45, 700);
    await delay(300);
    cursor.style.opacity = '0';
    await delay(200);

    // ── Black overlay fade-in ────────────────────────────────
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

    // Cursor appears directly near widget knob — no email click
    cursor.style.opacity = '1';
    moveTo(dr.width * 0.38, dr.height * 0.52, 0);
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

    // Switch to Agent IA mode, then type
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
        // Measure agent panel height by temporarily exposing it
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
        // Freeze current height then animate
        wwCard.style.height = wwCard.offsetHeight + 'px';
        wwCard.classList.add('show-agent');
        requestAnimationFrame(() => requestAnimationFrame(() => {
          wwCard.style.height = toH + 'px';
        }));
        // After transition completes, let card grow freely with streamed response
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
    await moveTo(dr.width * 0.42, dr.height * 0.48, 620);
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

      // 1 — Label + barres (Ven au centre, Sam/Dim vides)
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

      // 2 — Légende apps
      await delay(1400);
      addBlock(`
        <div class="ww-divider"></div>
        <div class="ww-rl-item"><div class="ww-rl-dot" style="background:#60C8FF"></div><span class="ww-rl-name">Teams</span><span class="ww-rl-val">2h 48</span></div>
        <div class="ww-rl-item"><div class="ww-rl-dot" style="background:#A78BFA"></div><span class="ww-rl-name">Outlook</span><span class="ww-rl-val">1h 12</span></div>
        <div class="ww-rl-item"><div class="ww-rl-dot" style="background:#F472B6"></div><span class="ww-rl-name">Chrome</span><span class="ww-rl-val">0h 54</span></div>`);

      // 3 — Score ring
      await delay(1300);
      addBlock(`
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
            <div class="ww-score-pct">Score : 75 %</div>
            <div class="ww-score-lbl">PRODUCTIVITÉ DU JOUR</div>
          </div>
        </div>`);

      // 4 — Tout le texte streamé comme une vraie réponse IA
      await delay(1400);

      // Conteneur texte unique
      const streamWrap = document.createElement('div');
      streamWrap.className = 'ww-section ww-stream-block';
      recap.appendChild(streamWrap);
      scrollToBottom();

      // Helpers : type un texte dans un span stylistique, line break instantané
      const typeInto = async (text, cls) => {
        const span = document.createElement('span');
        if (cls) span.className = cls;
        streamWrap.appendChild(span);
        for (let i = 0; i < text.length; i++) {
          span.textContent = text.slice(0, i + 1);
          const c = text[i];
          let ms = 48 + Math.random() * 36;
          if (c === '.') ms += 230;
          if (c === ',') ms += 100;
          if (c === ':') ms += 70;
          if (c === '—') ms += 140;
          scrollToBottom();
          await delay(ms);
        }
      };
      const br = (n = 1) => {
        streamWrap.insertAdjacentHTML('beforeend', '<br>'.repeat(n));
        scrollToBottom();
      };

      await delay(200);
      await typeInto('Réunions du jour', 'ww-st-label');
      br(2);
      await delay(350);

      await typeInto('Stand-up Équipe · 09:00', 'ww-st-title ww-st-green');
      br();
      await typeInto('"Bonne dynamique cette semaine, le sprint avance bien. Marie a remonté un blocage sur l\'API de paiement..."', 'ww-st-quote');
      br();
      await typeInto('Pour demain — Valider les tickets bloquants avec Marie', 'ww-st-todo');
      br(2);
      await delay(500);

      await typeInto('1:1 Jean-Pierre · 11:30', 'ww-st-title ww-st-orange');
      br();
      await typeInto('"Jean-Pierre attend ton retour sur le budget Q2. Il propose de revoir les priorités côté infra..."', 'ww-st-quote');
      br();
      await typeInto('Pour demain — Envoyer réponse à Jean-Pierre avant 10h', 'ww-st-todo');
      br(2);
      await delay(500);

      await typeInto('Revue Produit · 14:00', 'ww-st-title ww-st-purple');
      br();
      await typeInto('"3 nouvelles features validées pour la roadmap Q2. Démo client confirmée pour vendredi..."', 'ww-st-quote');
      br();
      await typeInto('Pour demain — Préparer les slides pour la démo client', 'ww-st-todo');
      br(2);
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
